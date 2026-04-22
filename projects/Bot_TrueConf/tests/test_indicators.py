"""Tests for tool indicators (stage 10)."""

from __future__ import annotations

import pytest

from bot_trueconf.handlers.indicators import (
    TOOL_MESSAGES,
    get_indicator_for_tool,
    parse_sse_line,
    send_indicator,
    delete_indicator,
)


# ---------------------------------------------------------------------------
# parse_sse_line
# ---------------------------------------------------------------------------

class TestParseSseLine:
    def test_blank_line(self):
        assert parse_sse_line("") is None

    def test_done_signal(self):
        assert parse_sse_line("data: [DONE]") == {"type": "done"}

    def test_tool_call(self):
        raw = 'data: {"type": "tool_call", "name": "ddg_search", "params": {"query": "test"}}'
        result = parse_sse_line(raw)
        assert result is not None
        assert result["type"] == "tool_call"
        assert result["name"] == "ddg_search"
        assert result["params"]["query"] == "test"

    def test_content_event(self):
        raw = 'data: {"type": "content", "text": "hello"}'
        result = parse_sse_line(raw)
        assert result == {"type": "content", "text": "hello"}

    def test_malformed_json(self):
        result = parse_sse_line("data: {not json}")
        assert result is None

    def test_non_data_prefix(self):
        assert parse_sse_line("event: ping") is None


# ---------------------------------------------------------------------------
# get_indicator_for_tool
# ---------------------------------------------------------------------------

class TestGetIndicatorForTool:
    def test_search(self):
        assert get_indicator_for_tool("ddg_search") == "searching"

    def test_coding(self):
        assert get_indicator_for_tool("exec") == "coding"

    def test_reading(self):
        assert get_indicator_for_tool("read") == "reading"

    def test_unknown_defaults_thinking(self):
        assert get_indicator_for_tool("unknown_tool") == "thinking"


# ---------------------------------------------------------------------------
# send_indicator
# ---------------------------------------------------------------------------

class TestSendIndicator:
    @pytest.mark.asyncio
    async def test_send_new(self):
        sent = []
        async def fake_send(chat_id, text):
            sent.append((chat_id, text))
            return 42

        mid = await send_indicator("chat1", "thinking", send_func=fake_send)
        assert mid == 42
        assert sent == [("chat1", "🧠 Думаю...")]

    @pytest.mark.asyncio
    async def test_edit_existing(self):
        edited = []
        async def fake_edit(chat_id, message_id, text):
            edited.append((chat_id, message_id, text))

        mid = await send_indicator(
            "chat1", "searching", message_id=10, edit_func=fake_edit
        )
        assert mid == 10
        assert edited == [("chat1", 10, "🔍 Ищу...")]

    @pytest.mark.asyncio
    async def test_no_funcs_returns_none(self):
        mid = await send_indicator("chat1", "coding")
        assert mid is None


# ---------------------------------------------------------------------------
# delete_indicator
# ---------------------------------------------------------------------------

class TestDeleteIndicator:
    @pytest.mark.asyncio
    async def test_delete_called(self):
        deleted = []
        async def fake_delete(chat_id, message_id):
            deleted.append((chat_id, message_id))

        await delete_indicator("c1", 5, delete_func=fake_delete)
        assert deleted == [("c1", 5)]

    @pytest.mark.asyncio
    async def test_no_func_is_noop(self):
        await delete_indicator("c1", 5)  # should not raise
