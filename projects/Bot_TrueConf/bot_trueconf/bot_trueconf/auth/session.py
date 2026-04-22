"""Session store for authorized users — Stage 9."""

from dataclasses import dataclass, field
import time
from typing import Optional


@dataclass
class UserSession:
    user_id: str
    email: str
    created_at: float = field(default_factory=time.time)
    message_count: int = 0
    last_message_at: float = 0.0


class SessionStore:
    """In-memory хранилище сессий пользователей."""

    ALLOWED_EMAILS = [
        "skogorev@team.trueconf.com",
        "skogorev@demo.trueconf.com",
    ]

    def __init__(self) -> None:
        self._sessions: dict[str, UserSession] = {}

    def is_allowed(self, email: str) -> bool:
        return email.lower() in self.ALLOWED_EMAILS

    def get_or_create(self, user_id: str, email: str) -> UserSession:
        if user_id in self._sessions:
            return self._sessions[user_id]
        session = UserSession(user_id=user_id, email=email)
        self._sessions[user_id] = session
        return session

    def record_message(self, user_id: str) -> None:
        session = self._sessions.get(user_id)
        if session is None:
            return
        session.message_count += 1
        session.last_message_at = time.time()

    def get_stats(self, user_id: str) -> dict:
        session = self._sessions.get(user_id)
        if session is None:
            return {}
        return {
            "user_id": session.user_id,
            "email": session.email,
            "message_count": session.message_count,
            "last_message_at": session.last_message_at,
            "created_at": session.created_at,
        }
