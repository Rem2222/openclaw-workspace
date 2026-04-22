"""Tool indicator messages — show bot activity to the user."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

TOOL_MESSAGES: dict[str, str] = {
    "thinking": "🧠 Думаю...",
    "searching": "🔍 Ищу...",
    "coding": "💻 Пишу код...",
    "reading": "📖 Читаю...",
    "file_processing": "📎 Обрабатываю файл...",
    "done": "✅",
}

# Mapping from tool name patterns to indicator types
_TOOL_INDICATOR_MAP: dict[str, str] = {
    "ddg_search": "searching",
    "browser_navigate": "searching",
    "browser_click": "searching",
    "read": "reading",
    "write": "coding",
    "edit": "coding",
    "exec": "coding",
}


def get_indicator_for_tool(tool_name: str) -> str:
    """Return indicator type for a given tool name."""
    return _TOOL_INDICATOR_MAP.get(tool_name, "thinking")


def parse_sse_line(line: str) -> Optional[dict[str, Any]]:
    """Parse a single SSE ``data:`` line into a dict.

    Returns *None* for blank lines, ``[DONE]``, or malformed JSON.
    """
    if not line or not line.startswith("data: "):
        return None
    payload = line[len("data: "):]
    if payload.strip() == "[DONE]":
        return {"type": "done"}
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return None


async def send_indicator(
    chat_id: str,
    indicator_type: str,
    message_id: Optional[int] = None,
    *,
    send_func=None,
    edit_func=None,
) -> Optional[int]:
    """Send or update an indicator message.

    Args:
        chat_id: Target chat identifier.
        indicator_type: Key from :data:`TOOL_MESSAGES`.
        message_id: Existing message id to edit, or *None* to send new.
        send_func: Async callable(chat_id, text) -> message_id.
        edit_func: Async callable(chat_id, message_id, text) -> None.

    Returns:
        The message_id of the indicator message (new or existing).
    """
    text = TOOL_MESSAGES.get(indicator_type, TOOL_MESSAGES["thinking"])

    if message_id is not None and edit_func is not None:
        try:
            await edit_func(chat_id, message_id, text)
        except Exception:
            logger.warning("Failed to edit indicator %s in %s", message_id, chat_id)
        return message_id

    if send_func is not None:
        try:
            return await send_func(chat_id, text)
        except Exception:
            logger.warning("Failed to send indicator to %s", chat_id)
    return None


async def delete_indicator(
    chat_id: str,
    message_id: int,
    *,
    delete_func=None,
) -> None:
    """Remove an indicator message."""
    if delete_func is None:
        return
    try:
        await delete_func(chat_id, message_id)
    except Exception:
        logger.warning("Failed to delete indicator %s in %s", message_id, chat_id)
