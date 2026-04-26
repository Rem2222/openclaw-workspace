---
title: SOUL.md Tool Call Bug Fix
summary: JAWL SOUL.md tool_call format corrected from old {name, parameters} to new {thoughts, actions} structure with tool_name field
tags: []
related: [llm_setup/ollama_local/ollama_local_configuration.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-26T19:36:49.891Z'
updatedAt: '2026-04-26T19:36:49.891Z'
---
## Reason
Document JAWL critical bug fix for tool_call format

## Raw Concept
**Task:**
Document JAWL agent debugging session and critical bug fix

**Changes:**
- Fixed SOUL.md tool_call format from wrong structure to correct AiogramMessages format

**Files:**
- /home/rem/JAWL/src/l3_agent/prompt/personality/SOUL.md
- /home/rem/JAWL/scripts/start-safe.sh

**Flow:**
Launch start-safe.sh -> runs python src/main.py (NOT jawl.py - requires TTY) -> initializes Qdrant vector DB

**Timestamp:** 2026-04-26

**Patterns:**
- `\{\s*"name":\s*"send_message"` - OLD incorrect tool_call format
- `\{\s*"thoughts":\s*".*",\s*"actions":\s*\[\s*\{\s*"tool_name":\s*"AiogramMessages\.send_message"` - CORRECT tool_call format with tool_name in actions array

## Narrative
### Structure
JAWL (Джинкс) agent configuration stored in SOUL.md at src/l3_agent/prompt/personality/

### Dependencies
Requires Qdrant vector DB (lock at /home/rem/JAWL/src/utils/local/data/vector_db/.lock), Telegram bot via AiogramMessages

### Highlights
Context settings: ticks=12, detailed_ticks=3, max_tokens=1200. Dashboard logs to system.log. Owner Rem chat_id: 386235337

### Examples
Start command: /home/rem/JAWL/scripts/start-safe.sh
Entry point: python src/main.py (jawl.py requires TTY)
