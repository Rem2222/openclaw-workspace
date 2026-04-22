"""Rate limiting — Stage 9."""

import time
from collections import defaultdict


class RateLimiter:
    """Rate limiting: N сообщений в минуту, M в час."""

    def __init__(self, per_minute: int = 20, per_hour: int = 100) -> None:
        self._per_minute = per_minute
        self._per_hour = per_hour
        self._timestamps: dict[str, list[float]] = defaultdict(list)

    def _cleanup(self, user_id: str) -> None:
        now = time.time()
        cutoff = now - 3600  # keep last hour only
        self._timestamps[user_id] = [
            ts for ts in self._timestamps[user_id] if ts > cutoff
        ]

    def is_allowed(self, user_id: str) -> tuple[bool, str]:
        self._cleanup(user_id)
        now = time.time()
        msgs = self._timestamps[user_id]

        # Check per-minute
        recent_minute = [ts for ts in msgs if ts > now - 60]
        if len(recent_minute) >= self._per_minute:
            return False, f"Лимит: {self._per_minute} сообщений в минуту. Подождите немного."

        # Check per-hour
        if len(msgs) >= self._per_hour:
            return False, f"Лимит: {self._per_hour} сообщений в час. Попробуйте позже."

        return True, ""

    def record(self, user_id: str) -> None:
        self._timestamps[user_id].append(time.time())

    def get_counts(self, user_id: str) -> tuple[int, int]:
        """Return (per_minute_count, per_hour_count)."""
        self._cleanup(user_id)
        now = time.time()
        minute_count = sum(1 for ts in self._timestamps[user_id] if ts > now - 60)
        return minute_count, len(self._timestamps[user_id])
