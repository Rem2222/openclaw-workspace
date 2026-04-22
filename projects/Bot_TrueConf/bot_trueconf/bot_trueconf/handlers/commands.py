"""Command handlers for TrueConf bot — /help, /status, /clear."""

from __future__ import annotations

from dataclasses import dataclass, field

COMMANDS: dict[str, str] = {
    "/help": "Показать справку",
    "/status": "Показать статус бота",
    "/clear": "Очистить историю сессии",
}


@dataclass
class SessionStore:
    """Simple in-memory session state tracker."""

    _active_sessions: set[str] = field(default_factory=set)

    def register(self, user_id: str) -> None:
        self._active_sessions.add(user_id)

    def is_active(self, user_id: str) -> bool:
        return user_id in self._active_sessions

    def clear(self, user_id: str) -> None:
        self._active_sessions.discard(user_id)


def _build_help_text() -> str:
    """Return formatted help text listing all commands."""
    lines = ["Доступные команды:\n"]
    for cmd, desc in COMMANDS.items():
        lines.append(f"• {cmd} — {desc}")
    return "\n".join(lines)


async def handle_help() -> str:
    """Handle /help command."""
    return _build_help_text()


async def handle_status(user_id: str, store: SessionStore) -> str:
    """Handle /status command."""
    status = "активна" if store.is_active(user_id) else "нет сессии"
    return f"Статус бота: онлайн\nВаша сессия: {status}"


async def handle_clear(user_id: str, store: SessionStore) -> str:
    """Handle /clear command."""
    store.clear(user_id)
    return "История сессии очищена."


async def dispatch_command(
    command: str,
    user_id: str,
    store: SessionStore,
) -> str | None:
    """Route a command string to the appropriate handler.

    Returns ``None`` if *command* is not a recognised bot command.
    """
    handlers = {
        "/help": lambda: handle_help(),
        "/status": lambda: handle_status(user_id, store),
        "/clear": lambda: handle_clear(user_id, store),
    }
    handler = handlers.get(command)
    if handler is None:
        return None
    return await handler()
