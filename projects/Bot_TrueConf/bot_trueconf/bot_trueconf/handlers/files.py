"""File handlers — download (user → Gateway) and upload (Gateway → user)."""

from __future__ import annotations

import base64
import logging
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import httpx

from ..gateway.client import GatewayClient, GatewayError, RetryableError

logger = logging.getLogger(__name__)

# Limits & config
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
SUPPORTED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp",  # images
    ".pdf", ".txt", ".docx",                    # documents
}
MIME_MAP: dict[str, str] = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# Agent file response markers (FR-15)
_FILE_MARKER_OPEN = re.compile(
    r"<<<OPENCLAW_FILE\s+name=\"([^\"]+)\"\s+mime=\"([^\"]+)\">>>",
)
_FILE_MARKER_CLOSE = "<<<END_OPENCLAW_FILE>>>"

# Error messages
_ERR_TOO_LARGE = "Файл больше 10 MB."
_ERR_FORMAT = "Формат файла не поддерживается."
_ERR_DOWNLOAD = "Не удалось скачать файл."
_ERR_UPLOAD = "Не удалось отправить файл."


def _extension_from_url(url: str) -> str:
    """Extract lowercase extension from URL path."""
    from urllib.parse import urlparse
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    return ext


def _validate_file(ext: str, size: int) -> Optional[str]:
    """Return error message if file is invalid, None if OK."""
    if ext not in SUPPORTED_EXTENSIONS:
        return _ERR_FORMAT
    if size > MAX_FILE_SIZE:
        return _ERR_TOO_LARGE
    return None


async def download_and_upload(
    user_file_url: str,
    user_id: str,
    client: GatewayClient,
) -> str:
    """Download file from user, send to Gateway via /v1/responses.

    1. Download file from TrueConf URL
    2. Validate extension & size
    3. Encode to base64
    4. Send via /v1/responses (supports input_file/input_image)
    5. Return text response
    """
    ext = _extension_from_url(user_file_url)

    # 1. Download
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            dl_resp = await http.get(user_file_url, follow_redirects=True)
            dl_resp.raise_for_status()
    except (httpx.HTTPError, Exception) as exc:
        logger.warning("Failed to download %s: %s", user_file_url, exc)
        return _ERR_DOWNLOAD

    data = dl_resp.content
    error = _validate_file(ext, len(data))
    if error:
        return error

    # 2. base64
    b64 = base64.b64encode(data).decode("ascii")
    mime = MIME_MAP.get(ext, "application/octet-stream")

    # 3. Determine input type
    is_image = ext in {".png", ".jpg", ".jpeg", ".gif", ".webp"}

    # 4. Send via /v1/responses
    session_key = f"trueconf_{user_id}"

    if is_image:
        input_item = {
            "type": "input_image",
            "image_url": f"data:{mime};base64,{b64}",
        }
    else:
        input_item = {
            "type": "input_file",
            "file_data": f"data:{mime};base64,{b64}",
        }

    payload = {
        "model": "openclaw",
        "input": [input_item],
        "stream": False,
    }

    try:
        resp_raw = client._request(
            "POST", "/v1/responses", payload, session_key,
        )
        result = resp_raw.json()
        # Extract text from responses API output
        output = result.get("output", [])
        texts = []
        for item in output:
            if isinstance(item, dict) and item.get("type") == "message":
                for content in item.get("content", []):
                    if isinstance(content, dict) and content.get("type") == "output_text":
                        texts.append(content.get("text", ""))
        return "\n".join(texts) if texts else str(result)
    except (RetryableError, GatewayError) as exc:
        logger.exception("Gateway error for file upload from %s: %s", user_id, exc)
        return _ERR_UPLOAD
    except Exception as exc:
        logger.exception("Unexpected error for file from %s: %s", user_id, exc)
        return _ERR_UPLOAD


def extract_agent_files(response_text: str) -> tuple[str, list[tuple[str, str, str]]]:
    """Parse OPENCLAW_FILE markers from agent response.

    Returns:
        (cleaned_text, files) where files is list of (filename, mime, base64_data).
    """
    files: list[tuple[str, str, str]] = []
    cleaned = response_text

    # Find all file blocks
    pos = 0
    parts = []
    while pos < len(cleaned):
        match = _FILE_MARKER_OPEN.search(cleaned, pos)
        if not match:
            parts.append(cleaned[pos:])
            break

        # Text before marker
        parts.append(cleaned[pos:match.start()])

        filename = match.group(1)
        mime = match.group(2)
        content_start = match.end()

        # Find closing marker
        close_idx = cleaned.find(_FILE_MARKER_CLOSE, content_start)
        if close_idx == -1:
            # No closing marker — treat rest as content
            b64_data = cleaned[content_start:].strip()
            pos = len(cleaned)
        else:
            b64_data = cleaned[content_start:close_idx].strip()
            pos = close_idx + len(_FILE_MARKER_CLOSE)

        # Validate base64
        try:
            base64.b64decode(b64_data, validate=True)
            files.append((filename, mime, b64_data))
        except Exception:
            logger.warning("Invalid base64 in OPENCLAW_FILE block for %s", filename)

        parts.append(f"[файл отправлен: {filename}]")

    return "".join(parts), files


async def handle_agent_file_response(
    response_text: str,
    user_id: str,
    *,
    send_file_callable=None,
) -> str:
    """Handle agent response containing file markers.

    1. Parse OPENCLAW_FILE blocks
    2. Decode & save to temp files
    3. Send via provided callable (TrueConf bot API)
    4. Return cleaned text (markers replaced with [файл отправлен])
    """
    cleaned_text, files = extract_agent_files(response_text)

    if not files:
        return cleaned_text

    if send_file_callable is None:
        logger.warning("No send_file_callable provided, files will not be sent")
        return cleaned_text

    for filename, mime, b64_data in files:
        try:
            raw = base64.b64decode(b64_data)
            ext = Path(filename).suffix.lower() or ".bin"
            tmp_dir = Path(tempfile.gettempdir()) / "trueconf_bot" / "out"
            tmp_dir.mkdir(parents=True, exist_ok=True)
            tmp_path = tmp_dir / f"{uuid.uuid4().hex}{ext}"

            tmp_path.write_bytes(raw)

            try:
                await send_file_callable(str(tmp_path), user_id, filename=filename)
            finally:
                tmp_path.unlink(missing_ok=True)

        except Exception:
            logger.exception("Failed to send file %s to user %s", filename, user_id)

    return cleaned_text
