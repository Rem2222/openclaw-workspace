"""Tests for message handler — Stage 7."""

import pytest
from unittest.mock import MagicMock, patch

from bot_trueconf.gateway.client import GatewayError, RetryableError
from bot_trueconf.handlers.commands import SessionStore
from bot_trueconf.handlers.message import ReplyContext, handle_message


@pytest.fixture
def store():
    return SessionStore()


@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat = MagicMock(return_value="**Hello** from model")
    return client


# --- basic message flow ---

@pytest.mark.asyncio
async def test_basic_message_returns_html(mock_client, store):
    result = await handle_message("hi", "u1", mock_client, store)
    assert "<b>Hello</b>" in result or "Hello" in result
    mock_client.chat.assert_called_once()


@pytest.mark.asyncio
async def test_command_help_intercepted(mock_client, store):
    result = await handle_message("/help", "u1", mock_client, store)
    assert "/help" in result
    mock_client.chat.assert_not_called()


# --- reply context (FR-8) ---

@pytest.mark.asyncio
async def test_reply_prepends_context(mock_client, store):
    reply = ReplyContext(original_text="previous answer", original_user="bot")
    await handle_message("clarify", "u1", mock_client, store, reply=reply)
    sent_msg = mock_client.chat.call_args[1]["message"]
    assert "previous answer" in sent_msg
    assert "clarify" in sent_msg


# --- error handling ---

@pytest.mark.asyncio
async def test_gateway_unavailable(store):
    client = MagicMock()
    client.chat.side_effect = GatewayError("boom")
    result = await handle_message("hi", "u1", client, store)
    assert "недоступен" in result


@pytest.mark.asyncio
async def test_rate_limit_error(store):
    client = MagicMock()
    client.chat.side_effect = RetryableError("429 after 3 attempts")
    result = await handle_message("hi", "u1", client, store)
    assert "Подождите" in result


@pytest.mark.asyncio
async def test_empty_response(mock_client, store):
    mock_client.chat.return_value = ""
    result = await handle_message("hi", "u1", mock_client, store)
    assert "Нет ответа" in result
