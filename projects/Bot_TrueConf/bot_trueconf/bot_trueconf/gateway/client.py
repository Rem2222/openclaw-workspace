"""Gateway HTTP client for OpenClaw /v1/chat/completions."""

import json
import time
import logging
from typing import Generator, Optional

import httpx

logger = logging.getLogger(__name__)

# Retryable HTTP status codes
_RETRYABLE = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_BACKOFF_BASE = 2  # seconds


class GatewayError(Exception):
    """Base error for Gateway client."""


class AuthError(GatewayError):
    """401 — invalid or missing token."""


class RetryableError(GatewayError):
    """429/5xx — caller may retry."""


class GatewayClient:
    """Async-less HTTP client for OpenClaw Gateway /v1/chat/completions.

    Supports sync and streaming modes with automatic retry on 429/5xx.

    Args:
        base_url: Gateway URL, e.g. ``http://localhost:4200``.
        token: Bearer token (gateway.auth.token).
        timeout: HTTP timeout in seconds (default 120).
        max_retries: How many times to retry on 429/5xx (default 3).
    """

    def __init__(
        self,
        base_url: str,
        token: str,
        timeout: int = 120,
        max_retries: int = _MAX_RETRIES,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self.max_retries = max_retries

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def chat(
        self,
        message: str,
        session_key: str,
        *,
        model: str = "openclaw",
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Send a chat message and return the full text response.

        Args:
            message: User message text.
            session_key: Session identifier, e.g. ``trueconf_123``.
            model: Agent target (default ``openclaw``).
            max_tokens: Optional max_tokens override.
            system_prompt: Optional system message prepended to the conversation.

        Returns:
            The assistant's text response.

        Raises:
            AuthError: On 401 responses.
            RetryableError: When retries are exhausted.
        """
        messages = self._build_messages(message, system_prompt)
        payload: dict = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        resp = self._request("POST", "/v1/chat/completions", payload, session_key)
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    def chat_stream(
        self,
        message: str,
        session_key: str,
        *,
        model: str = "openclaw",
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """Send a chat message and yield response chunks as they arrive.

        Args:
            message: User message text.
            session_key: Session identifier.
            model: Agent target (default ``openclaw``).
            max_tokens: Optional max_tokens override.
            system_prompt: Optional system message.

        Yields:
            Text chunks from the streaming response.

        Raises:
            AuthError: On 401 responses.
            RetryableError: When retries are exhausted.
        """
        messages = self._build_messages(message, system_prompt)
        payload: dict = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        resp = self._request(
            "POST", "/v1/chat/completions", payload, session_key, stream=True
        )

        for line in resp.iter_lines():
            if not line or not line.startswith("data: "):
                continue
            data_str = line[len("data: "):]
            if data_str.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
                delta = chunk["choices"][0].get("delta", {})
                content = delta.get("content")
                if content:
                    yield content
            except (json.JSONDecodeError, KeyError, IndexError):
                logger.warning("Malformed SSE chunk: %s", line[:200])
                continue

    def chat_stream_raw(
        self,
        message: str,
        session_key: str,
        *,
        model: str = "openclaw",
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """Like :meth:`chat_stream` but yields raw SSE lines for full parsing.

        This allows callers to inspect ``tool_call`` events embedded in the
        SSE stream that :meth:`chat_stream` would skip.

        Yields:
            Raw SSE line strings (including ``data: `` prefix).
        """
        messages = self._build_messages(message, system_prompt)
        payload: dict = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        resp = self._request(
            "POST", "/v1/chat/completions", payload, session_key, stream=True
        )

        for line in resp.iter_lines():
            if line:
                yield line

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _build_messages(
        message: str, system_prompt: Optional[str]
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        return messages

    def _headers(self, session_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "x-openclaw-session-key": session_key,
        }

    def _request(
        self,
        method: str,
        path: str,
        payload: dict,
        session_key: str,
        *,
        stream: bool = False,
    ) -> httpx.Response:
        url = f"{self.base_url}{path}"
        headers = self._headers(session_key)
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = httpx.request(
                    method,
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout,
                )
            except httpx.HTTPError as exc:
                last_exc = exc
                logger.warning("HTTP error (attempt %d/%d): %s", attempt, self.max_retries, exc)
                self._backoff(attempt)
                continue

            if resp.status_code == 401:
                raise AuthError(f"Authentication failed: {resp.text}")

            if resp.status_code not in _RETRYABLE:
                resp.raise_for_status()
                return resp

            retry_after = resp.headers.get("Retry-After")
            logger.warning(
                "Retryable %d (attempt %d/%d) retry_after=%s",
                resp.status_code, attempt, self.max_retries, retry_after,
            )
            if attempt < self.max_retries:
                self._backoff(attempt, retry_after=retry_after)
                continue
            raise RetryableError(
                f"Request failed with {resp.status_code} after {self.max_retries} attempts"
            )

        # All retries exhausted due to connection errors
        raise RetryableError(
            f"Connection failed after {self.max_retries} attempts"
        ) from last_exc

    @staticmethod
    def _backoff(attempt: int, *, retry_after: Optional[str] = None) -> None:
        if retry_after:
            try:
                wait = float(retry_after)
            except ValueError:
                wait = _BACKOFF_BASE ** attempt
        else:
            wait = _BACKOFF_BASE ** attempt
        time.sleep(wait)
