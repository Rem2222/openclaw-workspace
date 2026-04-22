"""Tests for file handlers."""

import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bot_trueconf.handlers.files import (
    MAX_FILE_SIZE,
    _extension_from_url,
    _validate_file,
    download_and_upload,
    extract_agent_files,
    handle_agent_file_response,
)


# --- Unit tests ---

class TestExtensionFromUrl:
    def test_png(self):
        assert _extension_from_url("https://example.com/img.png") == ".png"

    def test_no_extension(self):
        assert _extension_from_url("https://example.com/file") == ""

    def test_uppercase(self):
        assert _extension_from_url("https://x.com/a.JPEG") == ".jpeg"


class TestValidateFile:
    def test_valid_png(self):
        assert _validate_file(".png", 100) is None

    def test_invalid_ext(self):
        assert _validate_file(".exe", 100) is not None

    def test_too_large(self):
        assert _validate_file(".png", MAX_FILE_SIZE + 1) is not None


class TestExtractAgentFiles:
    def test_no_files(self):
        text, files = extract_agent_files("Hello world")
        assert text == "Hello world"
        assert files == []

    def test_single_file(self):
        b64 = base64.b64encode(b"test content").decode()
        raw = f'Hello\n<<<OPENCLAW_FILE name="test.pdf" mime="application/pdf">>>\n{b64}\n<<<END_OPENCLAW_FILE>>>\nDone'
        text, files = extract_agent_files(raw)
        assert len(files) == 1
        assert files[0][0] == "test.pdf"
        assert "[файл отправлен: test.pdf]" in text
        assert b64 not in text

    def test_invalid_base64_skipped(self):
        raw = '<<<OPENCLAW_FILE name="bad.txt" mime="text/plain">>>\nnot-valid-base64!!!\n<<<END_OPENCLAW_FILE>>>'
        text, files = extract_agent_files(raw)
        assert len(files) == 0

    def test_missing_close_marker(self):
        b64 = base64.b64encode(b"data").decode()
        raw = f'<<<OPENCLAW_FILE name="a.png" mime="image/png">>>\n{b64}'
        text, files = extract_agent_files(raw)
        assert len(files) == 1

    def test_multiple_files(self):
        b64_1 = base64.b64encode(b"file1").decode()
        b64_2 = base64.b64encode(b"file2").decode()
        raw = (
            f'<<<OPENCLAW_FILE name="a.pdf" mime="application/pdf">>>\n{b64_1}\n<<<END_OPENCLAW_FILE>>>'
            f' and '
            f'<<<OPENCLAW_FILE name="b.txt" mime="text/plain">>>\n{b64_2}\n<<<END_OPENCLAW_FILE>>>'
        )
        text, files = extract_agent_files(raw)
        assert len(files) == 2


class TestHandleAgentFileResponse:
    @pytest.mark.asyncio
    async def test_no_files_passthrough(self):
        result = await handle_agent_file_response("Hello", "user1")
        assert result == "Hello"

    @pytest.mark.asyncio
    async def test_file_sent_via_callable(self):
        b64 = base64.b64encode(b"hello").decode()
        raw = f'<<<OPENCLAW_FILE name="doc.pdf" mime="application/pdf">>>\n{b64}\n<<<END_OPENCLAW_FILE>>>'
        mock_send = AsyncMock()
        result = await handle_agent_file_response(raw, "user1", send_file_callable=mock_send)
        assert mock_send.called
        assert "[файл отправлен" in result

    @pytest.mark.asyncio
    async def test_temp_file_cleaned(self):
        b64 = base64.b64encode(b"data").decode()
        raw = f'<<<OPENCLAW_FILE name="x.txt" mime="text/plain">>>\n{b64}\n<<<END_OPENCLAW_FILE>>>'
        sent_paths = []

        async def capture_send(path, user_id, **kw):
            sent_paths.append(path)

        await handle_agent_file_response(raw, "u1", send_file_callable=capture_send)
        import os
        assert not os.path.exists(sent_paths[0])


class TestDownloadAndUpload:
    @pytest.mark.asyncio
    async def test_unsupported_format(self):
        client = MagicMock(spec=["_request"])
        result = await download_and_upload("https://x.com/file.exe", "u1", client)
        assert "не поддерживается" in result.lower() or "Формат" in result

    @pytest.mark.asyncio
    async def test_download_failure(self):
        client = MagicMock(spec=["_request"])
        with patch("bot_trueconf.handlers.files.httpx.AsyncClient") as MockCls:
            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(side_effect=Exception("network error"))
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            MockCls.return_value = mock_instance
            result = await download_and_upload("https://x.com/f.png", "u1", client)
            assert "Не удалось скачать" in result
