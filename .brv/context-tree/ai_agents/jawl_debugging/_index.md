---
children_hash: bd04867d8bbbea674c0eea5a12c9ef307a9bbe8fe8484f0b1b5968c878622a66
compression_ratio: 0.5778635778635779
condensation_order: 1
covers: [context.md, soul_md_format_bug_fix.md, soul_md_tool_call_bug_fix.md]
covers_token_total: 777
summary_level: d1
token_count: 449
type: summary
---
<think>The user wants me to create a structural summary at level d1 (domain level) from the provided child entries about jawl_debugging. I need to condense the information while preserving key facts, relationships, and patterns.

Key information to preserve:
- JAWL (Джинкс) is a Telegram chatbot agent
- Main bug fix: SOUL.md format corrected from {name, parameters} to {thoughts, actions} structure with tool_name field
- Entry point: python src/main.py
- Qdrant vector DB with lock path
- Start script: start-safe.sh
- AiogramMessages for Telegram integration
- Related topic: ollama_local_configuration

I should create a clean structural summary that references the child entry names for drill-down.</think>

# ai_agents/jawl_debugging

JAWL (Джинкс) is a Telegram chatbot agent with SOUL.md-based configuration and Qdrant vector DB backend.

## Architecture
- **Entry Point:** `python src/main.py` (NOT `jawl.py` which requires TTY)
- **Start Script:** `/home/rem/JAWL/scripts/start-safe.sh`
- **Telegram Integration:** AiogramMessages library
- **Vector DB:** Qdrant (lock at `/home/rem/JAWL/src/utils/local/data/vector_db/.lock`)

## Core Bug Fix
**SOUL.md tool_call format** corrected from old `{name, parameters}` to new `{thoughts, actions}` structure:
- OLD: `{"name": "send_message", ...}`
- NEW: `{"thoughts": "...", "actions": [{"tool_name": "AiogramMessages.send_message", ...}]}`

See `soul_md_format_bug_fix.md` and `soul_md_tool_call_bug_fix.md` for full details.

## Configuration Context
- SOUL.md location: `src/l3_agent/prompt/personality/`
- Context settings: `ticks=12`, `detailed_ticks=3`, `max_tokens=1200`
- Owner: Rem (chat_id: 386235337)
- Dashboard logs: `system.log`

## Related Topics
- `llm_setup/ollama_local/ollama_local_configuration.md` — LLM backend for JAWL