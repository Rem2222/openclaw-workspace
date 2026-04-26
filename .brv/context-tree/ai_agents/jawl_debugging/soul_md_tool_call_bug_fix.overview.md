<think>The user wants me to produce a structured overview of this knowledge document about a tool call bug fix. I need to include key points, structure summary, and notable entities/patterns while keeping it under 1500 tokens.
</think>

## Overview: SOUL.md Tool Call Bug Fix

**Purpose:** Document JAWL agent debugging session and critical bug fix for tool_call format

### Key Points

- **Bug:** SOUL.md used wrong tool_call structure `{name, parameters}`
- **Fix:** Correct format is `{thoughts, actions}` with `tool_name` inside actions array
- **Location:** `/home/rem/JAWL/src/l3_agent/prompt/personality/SOUL.md`
- **Start script:** `/home/rem/JAWL/scripts/start-safe.sh` (runs `python src/main.py`, NOT `jawl.py`)
- **Dependencies:** Qdrant vector DB (locked at `vector_db/.lock`), Telegram via AiogramMessages
- **Owner:** Rem (chat_id: 386235337)

### Pattern Comparison

**OLD (incorrect):**
```
{ "name": "send_message", "parameters": {...} }
```

**CORRECT:**
```
{ "thoughts": "...", "actions": [{ "tool_name": "AiogramMessages.send_message" }] }
```

### Configuration

- **Context:** ticks=12, detailed_ticks=3, max_tokens=1200
- **Logging:** Dashboard to system.log

### Related Files

- SOUL.md (personality config)
- start-safe.sh (launcher script)
- src/main.py (proper entry point)
- src/utils/local/data/vector_db/.lock (Qdrant lock file)