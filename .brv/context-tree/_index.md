---
children_hash: e38b5ca64b38ae080d9e2a2504381a0bf4a945c91342c9eed7dcc1562de70878
compression_ratio: 0.321570357300397
condensation_order: 3
covers: [ai_agents/_index.md, facts/_index.md, game_development/_index.md, infrastructure/_index.md, llm_setup/_index.md, one_c_development/_index.md]
covers_token_total: 2267
summary_level: d3
token_count: 729
type: summary
---
<think>The user wants me to create a structural summary at level d1 (domain level) from the provided knowledge entries. Looking at the context tree structure provided in the system prompt, d1 would be the domain level.

The child entries contain:
1. ai_agents/_index.md - Domain for AI agent projects with subtopic jawl_debugging
2. facts/_index.md - Domain for personal information
3. game_development/_index.md - Domain for game dev bug fixes
4. infrastructure/_index.md - Domain for infrastructure
5. llm_setup/_index.md - Domain for LLM setup with jawl_debugging, ollama_local, model_switching_issues
6. one_c_development/_index.md - Domain for 1C development

These are all domain-level summaries (_index.md files). I need to create a d1 summary that condenses all these domains into an overview while preserving key facts and relationships.

Key facts to preserve:
- ai_agents: JAWL Telegram chatbot, SOUL.md config, Qdrant vector DB
- facts: personal info domain for Roman (1C programmer learning vibecoding)
- game_development: campfire lighting bug fix
- infrastructure: server monitoring, Telegram bot, VPS selection, dashboard development
- llm_setup: JAWL debugging, Ollama local config, model switching issues
- one_c_development: HTTP response parsing for 1C

I need to create a clean structural summary at the domain level that references these entries.</think>

# AI Agents Domain

Domain for AI agent projects, debugging sessions, and configuration of local LLM setups.

## Core Components

### JAWL (Джинкс)
Telegram chatbot agent with SOUL.md configuration and Qdrant vector database backend.

**Architecture:**
- Entry point: `python src/main.py` via `start-safe.sh` at `/home/rem/JAWL/scripts/`
- Telegram integration: AiogramMessages library
- Vector DB: Qdrant (lock file at `vector_db/.lock`)

**Debugging Session (2026-04-26):**
- SOUL.md tool call format: nested `{"thoughts": "...", "actions": [{"tool_name": "...", "parameters": {...}]}`
- Dashboard reads `system.log`, not `startup_error.log`
- Configuration: ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200
- Qdrant lock cleanup required before start

**Bug fixes:**
- `soul_md_format_bug_fix.md` — SOUL.md format corrected to `{thoughts, actions}` structure
- `soul_md_tool_call_bug_fix.md` — tool_call parameters mapped to `tool_name` field

### Ollama Local Configuration
Local LLM setup. Working: `qwen2.5:7b` via direct query. Not available: `qwen3.5:27b`. Subagent interface has reliability issues; vision models unreliable through subagent.

### Model Switching Issues
Gateway restart resets primary model to default. Neko API format: `claude-opus-4-6[1m]` (brackets for context window).

## Related Domains
- `infrastructure/` — Telegram bot configuration, server monitoring
- `llm_setup/` — LLM backend setup and debugging
- `facts/personal/` — User profile for Roman (1C programmer learning vibecoding)