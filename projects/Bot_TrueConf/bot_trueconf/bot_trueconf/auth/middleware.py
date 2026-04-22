"""Auth middleware — Stage 9."""

from .session import SessionStore
from .rate_limiter import RateLimiter

_session_store = SessionStore()
_rate_limiter = RateLimiter()


def get_session_store() -> SessionStore:
    return _session_store


def get_rate_limiter() -> RateLimiter:
    return _rate_limiter


async def auth_and_rate_limit(email: str, user_id: str) -> str | None:
    """
    1. Проверить email в ALLOWED_EMAILS
    2. Проверить rate limit
    3. Вернуть None если всё ок, иначе текст ошибки
    """
    if not _session_store.is_allowed(email):
        return "Доступ запрещён. Обратитесь к администратору."

    _session_store.get_or_create(user_id, email)

    allowed, message = _rate_limiter.is_allowed(user_id)
    if not allowed:
        return message

    return None
