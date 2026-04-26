---
children_hash: 90c84027cf02075f9ed79c9a0c0a51b95816ad9eef8be8abc6c726bd46188868
compression_ratio: 0.5013404825737265
condensation_order: 1
covers: [context.md, jawl_agent_debugging_session.md, jawl_debugging_session_2026_04_26.md]
covers_token_total: 1119
summary_level: d1
token_count: 561
type: summary
---
<think>The user wants me to create a structural summary at level d1 (domain level) from the provided child entries about jawl_debugging. Let me analyze the content and create a concise summary that preserves key facts, architectural decisions, and relationships while referencing entry names for drill-down.

Key information to preserve:
1. JAWL agent is a local LLM agent (Джинкс/Dasha)
2. Critical bug fix: SOUL.md tool call format was incorrect
3. Correct format: nested actions with thoughts + actions array with tool_name
4. Entry point: python src/main.py (NOT jawl.py)
5. Qdrant lock file causes crashes
6. Config parameters: ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200
7. Telegram integration details
8. Dashboard reads system.log (not startup_error.log)

Let me create a structured summary that references the child entries.
</think>

# JAWL Debugging

Domain covering JAWL local LLM agent debugging, configuration fixes, and Telegram integration.

## Overview
JAWL (Джинкс/Dasha) is a local LLM agent running via Python. Debugging session covered critical bug fixes, configuration validation, and operational patterns.

## Key Fixes

**SOUL.md Tool Call Format (critical)**
- Wrong format: `{"name": "send_message", "parameters": {...}}`
- Correct format: `{"thoughts": "...", "actions": [{"tool_name": "...", "parameters": {...}}]}`

**Dashboard Log Source**
- Now reads `system.log` instead of `startup_error.log`

## Configuration Parameters
- ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200

## Operational Rules
- Entry point: `python src/main.py` (NOT `jawl.py` - requires TTY)
- Clean Qdrant lock file before start to prevent crashes
- Lock path: `/home/rem/JAWL/src/utils/local/data/vector_db/.lock`
- Telegram tool: `AiogramMessages.send_message`

## Key Files
- SOUL.md: tool call configuration
- FUNCTION_CALL.md: reference for correct format
- start-safe.sh: startup script

## Personal
- Telegram chat_id: 386235337
- Bot username: @Jawl_Jinx_bot

## Child Entry Reference
- `jawl_agent_debugging_session.md` - Full session with patterns, rules, examples
- `jawl_debugging_session_2026_04_26.md` - Detailed format specs and config params
- `context.md` - Topic overview