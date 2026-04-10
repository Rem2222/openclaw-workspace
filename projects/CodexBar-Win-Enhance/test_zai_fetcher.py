"""Unit tests for ZaiDataFetcher — tested independently of tkinter."""
import json
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from io import BytesIO

sys.path.insert(0, os.path.dirname(__file__))

# Stub customtkinter so codexbar.py can be imported in headless mode
import types
ctk = types.ModuleType("customtkinter")
ctk.CTkToplevel = type("CTkToplevel", (), {"__init__": lambda *a, **kw: None})
ctk.CTkImage = type("CTkImage", (), {"__init__": lambda *a, **kw: None})
ctk.CTkFrame = type("CTkFrame", (), {"__init__": lambda *a, **kw: None})
ctk.CTkLabel = type("CTkLabel", (), {"__init__": lambda *a, **kw: None})
ctk.CTkButton = type("CTkButton", (), {"__init__": lambda *a, **kw: None})
ctk.CTkProgressBar = type("CTkProgressBar", (), {"__init__": lambda *a, **kw: None})
ctk.CTkEntry = type("CTkEntry", (), {"__init__": lambda *a, **kw: None})
ctk.CTkToplevel = type("CTkToplevel", (), {"__init__": lambda *a, **kw: None})
ctk.set_appearance_mode = lambda *a: None
sys.modules["customtkinter"] = ctk

from codexbar import ZaiDataFetcher


class TestZaiEmptyStructure(unittest.TestCase):
    def test_empty_returns_dict(self):
        d = ZaiDataFetcher._empty()
        self.assertIsInstance(d, dict)

    def test_empty_has_required_keys(self):
        d = ZaiDataFetcher._empty()
        required = [
            "provider", "plan", "updated", "source", "session_used_pct",
            "session_reset", "weekly_used_pct", "weekly_reset", "cost_today",
            "cost_today_tokens", "cost_30d", "cost_30d_tokens", "model",
            "error", "available",
        ]
        for key in required:
            self.assertIn(key, d, f"Missing key: {key}")

    def test_empty_defaults(self):
        d = ZaiDataFetcher._empty()
        self.assertEqual(d["provider"], "Z.AI")
        self.assertIsNone(d["error"])
        self.assertFalse(d["available"])


class TestZaiFetchNoToken(unittest.TestCase):
    def test_returns_error_when_no_token(self):
        with patch.dict(os.environ, {}, clear=True):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertEqual(d["error"], "ZAI_API_TOKEN not set")
            self.assertFalse(d["available"])


def _make_response(body, status=200):
    """Create a mock urllib response."""
    resp = MagicMock()
    resp.read.return_value = json.dumps(body).encode()
    resp.__enter__ = lambda s: s
    resp.__exit__ = MagicMock(return_value=False)
    return resp


class TestZaiFetchSuccess(unittest.TestCase):
    @patch("codexbar.urlopen")
    def test_fetch_success_with_quota(self, mock_urlopen):
        mock_urlopen.return_value = _make_response({
            "quota": 1000,
            "used": 350,
            "remaining": 650,
            "reset_date": "2026-04-11T00:00:00Z",
        })
        with patch.dict(os.environ, {"ZAI_API_TOKEN": "test-key"}):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertTrue(d["available"])
            self.assertEqual(d["source"], "api")
            self.assertEqual(d["session_used_pct"], 35)
            self.assertIsNone(d["error"])

    @patch("codexbar.urlopen")
    def test_fetch_success_quota_100pct(self, mock_urlopen):
        mock_urlopen.return_value = _make_response({
            "quota": 100,
            "used": 100,
            "remaining": 0,
        })
        with patch.dict(os.environ, {"ZAI_API_TOKEN": "test-key"}):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertEqual(d["session_used_pct"], 100)


class TestZaiFetchAuthError(unittest.TestCase):
    @patch("codexbar.urlopen")
    def test_fetch_401(self, mock_urlopen):
        from urllib.error import HTTPError
        err = HTTPError("url", 401, "Unauthorized", {}, None)
        mock_urlopen.side_effect = err

        with patch.dict(os.environ, {"ZAI_API_TOKEN": "bad-key"}):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertTrue(d["available"])  # token was set
            self.assertEqual(d["error"], "API request failed")
            self.assertEqual(d["source"], "none")


class TestZaiFetchTimeout(unittest.TestCase):
    @patch("codexbar.urlopen")
    def test_fetch_timeout(self, mock_urlopen):
        mock_urlopen.side_effect = TimeoutError("timed out")

        with patch.dict(os.environ, {"ZAI_API_TOKEN": "test-key"}):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertEqual(d["error"], "API request failed")


class TestZaiFetchBadJson(unittest.TestCase):
    @patch("codexbar.urlopen")
    def test_fetch_bad_json(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = b"not json at all"
        resp.__enter__ = lambda s: s
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp

        with patch.dict(os.environ, {"ZAI_API_TOKEN": "test-key"}):
            f = ZaiDataFetcher()
            d = f.fetch()
            self.assertEqual(d["error"], "API request failed")


if __name__ == "__main__":
    unittest.main()
