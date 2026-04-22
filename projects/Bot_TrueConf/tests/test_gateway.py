"""Tests for GatewayClient (stage 6A)."""

import json
import pytest
from unittest.mock import patch, MagicMock

from bot_trueconf.gateway.client import GatewayClient, AuthError, RetryableError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _client() -> GatewayClient:
    return GatewayClient("http://localhost:4200", "test-token", timeout=5, max_retries=2)


def _ok_response(body: dict, status_code: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.headers = {}
    resp.json.return_value = body
    resp.text = json.dumps(body)
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Test: sync chat
# ---------------------------------------------------------------------------

class TestSyncChat:
    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_basic(self, mock_req):
        mock_req.return_value = _ok_response({
            "choices": [{"message": {"content": "Привет!"}}]
        })
        result = _client().chat("привет", session_key="trueconf_123")
        assert result == "Привет!"

        # Verify request shape
        call_kwargs = mock_req.call_args
        assert call_kwargs[1]["json"]["stream"] is False
        assert call_kwargs[1]["json"]["messages"][-1]["content"] == "привет"
        assert call_kwargs[1]["headers"]["x-openclaw-session-key"] == "trueconf_123"

    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_system_prompt(self, mock_req):
        mock_req.return_value = _ok_response({
            "choices": [{"message": {"content": "ok"}}]
        })
        _client().chat("test", session_key="s", system_prompt="be helpful")
        msgs = mock_req.call_args[1]["json"]["messages"]
        assert msgs[0]["role"] == "system"
        assert len(msgs) == 2


# ---------------------------------------------------------------------------
# Test: stream chat
# ---------------------------------------------------------------------------

class TestStreamChat:
    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_basic(self, mock_req):
        sse_lines = [
            'data: {"choices":[{"delta":{"content":"Hi"}}]}',
            'data: {"choices":[{"delta":{"content":" there"}}]}',
            "data: [DONE]",
        ]
        resp = MagicMock()
        resp.status_code = 200
        resp.headers = {}
        resp.raise_for_status = MagicMock()
        resp.iter_lines.return_value = sse_lines
        mock_req.return_value = resp

        chunks = list(_client().chat_stream("hello", session_key="trueconf_1"))
        assert chunks == ["Hi", " there"]
        call_kwargs = mock_req.call_args[1]
        assert call_kwargs["json"]["stream"] is True


# ---------------------------------------------------------------------------
# Test: error handling
# ---------------------------------------------------------------------------

class TestErrorHandling:
    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_401_raises_auth_error(self, mock_req):
        mock_req.return_value = _ok_response({"error": "unauthorized"}, status_code=401)
        with pytest.raises(AuthError):
            _client().chat("hi", session_key="s")

    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_500_retries_then_raises(self, mock_req):
        mock_req.return_value = _ok_response({"error": "oops"}, status_code=500)
        with pytest.raises(RetryableError):
            _client().chat("hi", session_key="s")
        assert mock_req.call_count == 2  # max_retries=2

    @patch("bot_trueconf.gateway.client.httpx.request")
    def test_connection_error_retries(self, mock_req):
        import httpx
        mock_req.side_effect = httpx.ConnectError("refused")
        with pytest.raises(RetryableError):
            _client().chat("hi", session_key="s")
        assert mock_req.call_count == 2
