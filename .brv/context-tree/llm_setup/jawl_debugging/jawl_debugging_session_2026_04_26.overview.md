<think>The user wants me to produce a structured overview of this knowledge document about a JAWL debugging session. I need to follow the format requirements:

1. Key points (3-7 bullet points)
2. Structure / sections summary
3. Notable entities, patterns, or decisions
4. Keep under 1500 tokens
5. Use markdown formatting
6. Output only the overview - no preamble

Let me organize the information from the document.

Key points:
1. Critical bug fix: SOUL.md had wrong tool_call format (was using `{"name": "send_message"}` instead of `{"thoughts":...,"actions":[{"tool_name":...}]}`)
2. Dashboard log path changed from startup_error.log to system.log
3. Entry point clarification: python src/main.py (NOT jawl.py - jawl.py requires TTY and fails with nohup)
4. Configuration parameters: ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200
5. Key file paths and lock file location
6. Bot username: @Jawl_Jinx_bot
7. Rem's Telegram chat_id: 386235337

Structure summary:
- The document has sections for Raw Concept, Narrative, and Facts
- Covers bug fixes, configuration, file paths, and conventions

Notable entities:
- JAWL (Джинкс) agent
- SOUL.md file
- start-safe.sh script
- Qdrant lock file
- Bot: @Jawl_Jinx_bot
- Chat ID: 386235337

Let me format this nicely in markdown.
</think>

## JAWL Debugging Session 2026-04-26

### Key Points

- **Critical SOUL.md bug fixed**: tool_call format was wrong. Used `{"name": "send_message"}` instead of correct `{"thoughts":..., "actions": [{"tool_name": ...}]}`
- **Entry point clarified**: Use `python src/main.py` — NOT `jawl.py` (jawl.py requires TTY and fails with nohup)
- **Dashboard log path changed**: `startup_error.log` → `system.log`
- **Config parameters**: ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200
- **Key file paths**: SOUL.md (`/home/rem/JAWL/src/l3_agent/prompt/personality/`), start-safe.sh script, Qdrant lock at `vector_db/.lock`
- **Bot identity**: @Jawl_Jinx_bot, Rem's Telegram chat_id: 386235337

### Structure / Sections Summary

1. **Raw Concept** — Task overview, changes made, file paths, debug flow (Debug → Fix → Test → Deploy)
2. **Narrative** — Bug details, entry point examples, operational highlights
3. **Facts** — Structured key-value pairs for config, conventions, and project parameters

### Notable Entities & Decisions

| Entity | Details |
|--------|---------|
| JAWL agent | Also called "Джинкс" (Jinx) |
| SOUL.md | Personality file with wrong tool_call format — fixed |
| Entry point | `python src/main.py` (convention established) |
| Bot | @Jawl_Jinx_bot |
| Qdrant lock | `/home/rem/JAWL/src/utils/local/data/vector_db/.lock` |

**Pattern identified**: Wrong regex `{"name":\s*"send_message"` vs correct `{"thoughts":.*"actions":\[{"tool_name":`