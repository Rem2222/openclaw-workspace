---
title: JAWL Agent Debugging Session
summary: 'JAWL agent debugging: SOUL.md tool call format fix, context settings, startup commands, and Telegram integration'
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-26T19:36:15.480Z'
updatedAt: '2026-04-26T19:36:15.480Z'
---
## Reason
Document JAWL agent debugging session with bug fixes and configuration

## Raw Concept
**Task:**
Document JAWL (Джинкс/Dasha) agent debugging session

**Changes:**
- Fixed SOUL.md incorrect tool call format
- Replaced old format with nested actions format from FUNCTION_CALL.md
- Context settings validated and kept as-is

**Files:**
- /home/rem/JAWL/src/l3_agent/prompt/personality/SOUL.md
- /home/rem/JAWL/src/utils/local/data/vector_db/.lock

**Flow:**
Bug identified -> Correct format located in FUNCTION_CALL.md -> SOUL.md updated -> Context validated

**Timestamp:** 2026-04-26

**Author:** Rem

## Narrative
### Structure
JAWL is a local LLM agent (Джинкс/Dasha) running via Python src/main.py

### Dependencies
Requires correct tool call format from FUNCTION_CALL.md, needs Qdrant lock file cleanup

### Highlights
Tool call format: {"thoughts": "...", "actions": [{"tool_name": "AiogramMessages.send_message", "parameters": {...}}]}

### Rules
Rule 1: Use nested actions format NOT flat {"name": "...", "parameters": {...}} format
Rule 2: Run via python src/main.py (jawl.py requires TTY)
Rule 3: Clean Qdrant lock file before start to prevent crashes
Rule 4: Dashboard reads system.log (NOT startup_error.log)

### Examples
Start command: python src/main.py
Telegram tool: AiogramMessages.send_message
Chat ID: 386235337

## Facts
- **agent_name**: JAWL agent name is Джинкс/Dasha [project]
- **context_settings**: Context ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200 [project]
- **startup_command**: Run JAWL via python src/main.py (not jawl.py) [convention]
- **qdrant_lock_issue**: Qdrant lock file at /home/rem/JAWL/src/utils/local/data/vector_db/.lock causes crashes [project]
- **dashboard_log_source**: Dashboard reads from system.log (fixed from startup_error.log) [project]
- **telegram_chat_id**: Rem's Telegram chat_id: 386235337 [personal]
