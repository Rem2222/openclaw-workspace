"""Message handler — main text processing pipeline for TrueConf bot."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from ..gateway.client import GatewayClient, GatewayError, RetryableError
from ..utils.formatter import markdown_to_html
from .commands import SessionStore, dispatch_command
from .indicators import (
    TOOL_MESSAGES,
    get_indicator_for_tool,
    parse_sse_line,
    send_indicator,
    delete_indicator,
)

logger = logging.getLogger(__name__)

# Error messages returned to the user
_ERR_UNAVAILABLE = "Бот временно недоступен. Попробуйте позже."
_ERR_EMPTY = "Нет ответа от модели."
_ERR_RATE_LIMIT = "Слишком много запросов. Подождите немного."

# Prefix identifying a bot command
_CMD_PREFIX = "/"


@dataclass
class ReplyContext:
    """Context extracted from a reply-to-bot message (FR-8)."""

    original_text: str
    original_user: str


async def handle_message_streaming(
    text: str,
    user_id: str,
    client: GatewayClient,
    store: SessionStore,
    chat_id: str,
    *,
    reply: Optional[ReplyContext] = None,
    system_prompt: Optional[str] = None,
    send_func=None,
    edit_func=None,
    delete_func=None,
) -> str:
    """Handle a message with streaming + tool indicators.

    Same pipeline as :func:`handle_message` but uses ``chat_stream()`` and
    sends indicator messages for each tool call received via SSE.

    Args:
        text: Raw message text.
        user_id: TrueConf user identifier.
        client: Configured GatewayClient.
        store: Session store.
        chat_id: Chat id for sending indicators.
        reply: Optional reply context.
        system_prompt: Optional system prompt override.
        send_func: Async callable(chat_id, text) -> message_id.
        edit_func: Async callable(chat_id, message_id, text) -> None.
        delete_func: Async callable(chat_id, message_id) -> None.

    Returns:
        HTML-formatted response string.
    """
    # 1. Command check
    if text.strip().startswith(_CMD_PREFIX):
        cmd = text.strip().split()[0].lower()
        result = await dispatch_command(cmd, user_id, store)
        if result is not None:
            return result

    payload = _build_payload(text, reply)
    store.register(user_id)
    session_key = f"trueconf_{user_id}"

    # 2. Send initial "thinking" indicator
    indicator_id = await send_indicator(
        chat_id, "thinking", send_func=send_func
    )

    # 3. Stream from Gateway
    collected: list[str] = []
    try:
        for line in client.chat_stream(
            message=payload,
            session_key=session_key,
            system_prompt=system_prompt,
        ):
            # chat_stream() yields content strings, but the raw SSE may
            # also contain tool_call events. We rely on the raw response
            # from httpx for that — see chat_stream_events() below for
            # full SSE parsing. Here we handle content chunks.
            collected.append(line)
    except RetryableError as exc:
        if indicator_id is not None:
            await delete_indicator(chat_id, indicator_id, delete_func=delete_func)
        if "429" in str(exc):
            return _ERR_RATE_LIMIT
        return _ERR_UNAVAILABLE
    except (GatewayError, Exception):
        if indicator_id is not None:
            await delete_indicator(chat_id, indicator_id, delete_func=delete_func)
        return _ERR_UNAVAILABLE

    # 4. Remove indicator
    if indicator_id is not None:
        await delete_indicator(chat_id, indicator_id, delete_func=delete_func)

    raw_response = "".join(collected)
    if not raw_response or not raw_response.strip():
        return _ERR_EMPTY

    return markdown_to_html(raw_response)


async def handle_message_sse(
    text: str,
    user_id: str,
    client: GatewayClient,
    store: SessionStore,
    chat_id: str,
    *,
    reply: Optional[ReplyContext] = None,
    system_prompt: Optional[str] = None,
    send_func=None,
    edit_func=None,
    delete_func=None,
) -> str:
    """Handle a message with full SSE parsing and tool indicators.

    Uses :meth:`GatewayClient.chat_stream_raw` to get raw SSE lines,
    parses tool_call events and updates indicators accordingly.

    Returns:
        HTML-formatted response string.
    """
    if text.strip().startswith(_CMD_PREFIX):
        cmd = text.strip().split()[0].lower()
        result = await dispatch_command(cmd, user_id, store)
        if result is not None:
            return result

    payload = _build_payload(text, reply)
    store.register(user_id)
    session_key = f"trueconf_{user_id}"

    # Send initial indicator
    indicator_id = await send_indicator(
        chat_id, "thinking", send_func=send_func
    )

    collected: list[str] = []
    try:
        for raw_line in client.chat_stream_raw(
            message=payload,
            session_key=session_key,
            system_prompt=system_prompt,
        ):
            event = parse_sse_line(raw_line)
            if event is None:
                continue

            event_type = event.get("type")

            if event_type == "tool_call":
                tool_name = event.get("name", "")
                ind_type = get_indicator_for_tool(tool_name)
                indicator_id = await send_indicator(
                    chat_id,
                    ind_type,
                    message_id=indicator_id,
                    send_func=send_func,
                    edit_func=edit_func,
                )
            elif event_type == "content":
                content = event.get("text", "")
                if content:
                    collected.append(content)
            elif event_type == "done":
                break

    except RetryableError as exc:
        if indicator_id is not None:
            await delete_indicator(chat_id, indicator_id, delete_func=delete_func)
        if "429" in str(exc):
            return _ERR_RATE_LIMIT
        return _ERR_UNAVAILABLE
    except (GatewayError, Exception):
        if indicator_id is not None:
            await delete_indicator(chat_id, indicator_id, delete_func=delete_func)
        return _ERR_UNAVAILABLE

    # Remove indicator
    if indicator_id is not None:
        await delete_indicator(chat_id, indicator_id, delete_func=delete_func)

    raw_response = "".join(collected)
    if not raw_response or not raw_response.strip():
        return _ERR_EMPTY

    return markdown_to_html(raw_response)


async def handle_message(
    text: str,
    user_id: str,
    client: GatewayClient,
    store: SessionStore,
    *,
    reply: Optional[ReplyContext] = None,
    system_prompt: Optional[str] = None,
) -> str:
    """Handle an incoming message from a TrueConf user.

    Pipeline:
        1. If *text* starts with ``/`` — dispatch as command.
        2. Build message payload (prepend reply context if present).
        3. Send to Gateway via ``client.chat()``.
        4. Convert Markdown response → HTML.
        5. Return formatted response.

    Args:
        text: Raw message text from the user.
        user_id: TrueConf user identifier.
        client: Configured :class:`GatewayClient`.
        store: Session store for command state.
        reply: Optional reply context (FR-8).
        system_prompt: Optional system prompt override.

    Returns:
        HTML-formatted response string ready for TrueConf delivery.
    """
    # 1. Command check
    if text.strip().startswith(_CMD_PREFIX):
        cmd = text.strip().split()[0].lower()
        result = await dispatch_command(cmd, user_id, store)
        if result is not None:
            return result

    # 2. Build message with optional reply context
    payload = _build_payload(text, reply)

    # 3. Register session
    store.register(user_id)

    # 4. Send to Gateway
    session_key = f"trueconf_{user_id}"
    try:
        raw_response = client.chat(
            message=payload,
            session_key=session_key,
            system_prompt=system_prompt,
        )
    except RetryableError as exc:
        logger.warning("Gateway retryable error for %s: %s", user_id, exc)
        if "429" in str(exc):
            return _ERR_RATE_LIMIT
        return _ERR_UNAVAILABLE
    except GatewayError:
        logger.exception("Gateway error for %s", user_id)
        return _ERR_UNAVAILABLE
    except Exception:
        logger.exception("Unexpected error for %s", user_id)
        return _ERR_UNAVAILABLE

    # 5. Empty response guard
    if not raw_response or not raw_response.strip():
        return _ERR_EMPTY

    # 6. Markdown → HTML
    return markdown_to_html(raw_response)


def _build_payload(text: str, reply: Optional[ReplyContext]) -> str:
    """Build the message payload, prepending reply context when present."""
    if reply is None:
        return text

    quoted = "\n".join(f"> {line}" for line in reply.original_text.splitlines())
    return (
        f"[Ответ на сообщение от {reply.original_user}]\n"
        f"{quoted}\n\n{text}"
    )
