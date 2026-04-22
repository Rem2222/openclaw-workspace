"""Tests for auth, session store, rate limiting — Stage 9."""

import asyncio
import time

from bot_trueconf.auth.session import SessionStore, UserSession
from bot_trueconf.auth.rate_limiter import RateLimiter
from bot_trueconf.auth.middleware import auth_and_rate_limit, get_session_store, get_rate_limiter


class TestSessionStore:
    def setup_method(self):
        self.store = SessionStore()

    def test_allowed_emails(self):
        assert self.store.is_allowed("skogorev@team.trueconf.com") is True
        assert self.store.is_allowed("skogorev@demo.trueconf.com") is True

    def test_denied_email(self):
        assert self.store.is_allowed("random@example.com") is False

    def test_case_insensitive(self):
        assert self.store.is_allowed("Skogorev@Team.TrueConf.com") is True

    def test_get_or_create(self):
        s = self.store.get_or_create("u1", "skogorev@team.trueconf.com")
        assert isinstance(s, UserSession)
        assert s.user_id == "u1"
        # Same user returns same session
        s2 = self.store.get_or_create("u1", "skogorev@team.trueconf.com")
        assert s2 is s

    def test_record_message(self):
        self.store.get_or_create("u1", "skogorev@team.trueconf.com")
        self.store.record_message("u1")
        self.store.record_message("u1")
        stats = self.store.get_stats("u1")
        assert stats["message_count"] == 2
        assert stats["last_message_at"] > 0

    def test_stats_missing_user(self):
        assert self.store.get_stats("nobody") == {}


class TestRateLimiter:
    def test_under_limit(self):
        rl = RateLimiter(per_minute=3, per_hour=10)
        rl.record("u1")
        rl.record("u1")
        allowed, _ = rl.is_allowed("u1")
        assert allowed is True  # 2 recorded, 3rd is still ok

    def test_over_minute_limit(self):
        rl = RateLimiter(per_minute=2, per_hour=100)
        rl.record("u1")
        rl.record("u1")
        allowed, msg = rl.is_allowed("u1")
        assert allowed is False
        assert "минуту" in msg

    def test_over_hour_limit(self):
        rl = RateLimiter(per_minute=100, per_hour=2)
        rl.record("u1")
        rl.record("u1")
        allowed, msg = rl.is_allowed("u1")
        assert allowed is False
        assert "час" in msg

    def test_separate_users(self):
        rl = RateLimiter(per_minute=1, per_hour=100)
        rl.record("u1")
        allowed1, _ = rl.is_allowed("u1")
        allowed2, _ = rl.is_allowed("u2")
        assert allowed1 is False
        assert allowed2 is True

    def test_get_counts(self):
        rl = RateLimiter(per_minute=20, per_hour=100)
        rl.record("u1")
        rl.record("u1")
        minute, hour = rl.get_counts("u1")
        assert minute == 2
        assert hour == 2


class TestMiddleware:
    def setup_method(self):
        # Reset globals for each test
        import bot_trueconf.auth.middleware as mw
        mw._session_store = SessionStore()
        mw._rate_limiter = RateLimiter()

    def test_denied_email(self):
        result = asyncio.get_event_loop().run_until_complete(
            auth_and_rate_limit("evil@example.com", "u1")
        )
        assert result == "Доступ запрещён. Обратитесь к администратору."

    def test_allowed_email(self):
        result = asyncio.get_event_loop().run_until_complete(
            auth_and_rate_limit("skogorev@team.trueconf.com", "u1")
        )
        assert result is None

    def test_rate_limited(self):
        import bot_trueconf.auth.middleware as mw
        mw._rate_limiter = RateLimiter(per_minute=1, per_hour=100)
        asyncio.get_event_loop().run_until_complete(
            auth_and_rate_limit("skogorev@team.trueconf.com", "u1")
        )
        # Record one to hit limit
        mw._rate_limiter.record("u1")
        result = asyncio.get_event_loop().run_until_complete(
            auth_and_rate_limit("skogorev@team.trueconf.com", "u1")
        )
        assert result is not None
        assert "Лимит" in result
