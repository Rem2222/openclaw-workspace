---
title: JAWL Debugging Session 2026-04-26
summary: 'JAWL debugging session: critical SOUL.md tool_call format bug, entry point clarification, config params, and key file paths'
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-26T19:36:58.678Z'
updatedAt: '2026-04-26T19:36:58.678Z'
---
## Reason
Document JAWL agent debugging session with critical bug fix

## Raw Concept
**Task:**
JAWL (Джинкс) agent debugging session

**Changes:**
- Fixed SOUL.md tool_call format: wrong format vs correct format
- Dashboard log changed from startup_error.log to system.log

**Files:**
- /home/rem/JAWL/src/l3_agent/prompt/personality/SOUL.md
- /home/rem/JAWL/scripts/start-safe.sh
- /home/rem/JAWL/src/utils/local/data/vector_db/.lock

**Flow:**
Debug -> Fix -> Test -> Deploy

**Timestamp:** 2026-04-26

**Patterns:**
- `\{"name":\s*"send_message"` - Wrong tool_call format in SOUL.md
- `\{"thoughts":.*"actions":\[\{"tool_name":` - Correct tool_call format

## Narrative
### Structure
JAWL agent debugging notes covering bug fixes, configuration parameters, and operational details

### Highlights
Critical bug: SOUL.md tool_call was using wrong format. Correct format requires thoughts + actions array with tool_name field.

### Examples
Entry point: python src/main.py (NOT jawl.py - requires TTY, fails with nohup). Start script: /home/rem/JAWL/scripts/start-safe.sh

## Facts
- **entry_point**: JAWL entry point is python src/main.py (NOT jawl.py) [convention]
- **entry_point**: jawl.py requires TTY and fails with nohup [convention]
- **soul_md_format**: SOUL.md correct tool_call format: {thoughts, actions: [{tool_name, parameters}]} [project]
- **config_params**: Config: ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200 [project]
- **qdrant_lock_path**: Qdrant lock path: /home/rem/JAWL/src/utils/local/data/vector_db/.lock [project]
- **rem_chat_id**: Rem Telegram chat_id: 386235337 [personal]
- **bot_username**: Bot username: @Jawl_Jinx_bot [project]
