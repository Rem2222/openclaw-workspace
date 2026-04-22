"""Tests for command handlers — Stage 7."""

import pytest

from bot_trueconf.handlers.commands import (
    COMMANDS,
    SessionStore,
    dispatch_command,
    handle_clear,
    handle_help,
    handle_status,
)


@pytest.fixture
def store():
    return SessionStore()


# --- handle_help ---

@pytest.mark.asyncio
async def test_help_lists_all_commands():
    result = await handle_help()
    for cmd in COMMANDS:
        assert cmd in result


@pytest.mark.asyncio
async def test_help_contains_descriptions():
    result = await handle_help()
    for cmd, desc in COMMANDS.items():
        assert desc in result


# --- handle_status ---

@pytest.mark.asyncio
async def test_status_no_session(store):
    result = await handle_status("user1", store)
    assert "нет сессии" in result
    assert "онлайн" in result


@pytest.mark.asyncio
async def test_status_active_session(store):
    store.register("user1")
    result = await handle_status("user1", store)
    assert "активна" in result


# --- handle_clear ---

@pytest.mark.asyncio
async def test_clear_removes_session(store):
    store.register("user1")
    result = await handle_clear("user1", store)
    assert "очищена" in result
    assert not store.is_active("user1")


# --- dispatch_command ---

@pytest.mark.asyncio
async def test_dispatch_known_command(store):
    result = await dispatch_command("/help", "u", store)
    assert result is not None
    assert "/help" in result


@pytest.mark.asyncio
async def test_dispatch_unknown_returns_none(store):
    result = await dispatch_command("/unknown", "u", store)
    assert result is None
