---
children_hash: d2c374dca16f6968a1b76f0fc896e7d3d58ee3d064c7d264ff2706eeadab2bff
compression_ratio: 0.760655737704918
condensation_order: 2
covers: [context.md, jawl_debugging/_index.md]
covers_token_total: 610
summary_level: d2
token_count: 464
type: summary
---
<think>The user wants me to create a structural summary at level d1 (domain level) from the provided child entries about ai_agents domain and its subtopic jawl_debugging. I need to condense the information while preserving key facts, relationships, and patterns.

Let me analyze the child entries:

1. **ai_agents/context.md** - Contains the domain purpose, scope, and usage
2. **ai_agents/jawl_debugging/_index.md** - Summary of child entries under jawl_debugging

The domain is about AI agent projects, debugging sessions, and configuration. The jawl_debugging topic contains information about JAWL (Джинкс), a Telegram chatbot agent with SOUL.md-based configuration and Qdrant vector DB backend.

Key facts to preserve:
- JAWL (Джинкс) is a Telegram chatbot agent
- Entry point: `python src/main.py`
- Start script: `/home/rem/JAWL/scripts/start-safe.sh`
- Telegram integration: AiogramMessages library
- Vector DB: Qdrant
- SOUL.md format corrected with thoughts/actions structure
- Related topics: ollama_local_configuration

I need to create a d1 summary that references the child entries and preserves the structural overview.

Let me create a clean structural summary.
</think>

# ai_agents

Domain for AI agent projects, debugging sessions, and configuration.

## Subtopics

### jawl_debugging

JAWL (Джинкс) — Telegram chatbot with SOUL.md configuration and Qdrant vector DB.

**Architecture:**
- Entry point: `python src/main.py` (via `start-safe.sh` at `/home/rem/JAWL/scripts/`)
- Telegram: AiogramMessages library
- Vector DB: Qdrant (lock at `vector_db/.lock`)

**Bug fixes documented:**
- `soul_md_format_bug_fix.md` — SOUL.md format corrected to `{thoughts, actions}` structure
- `soul_md_tool_call_bug_fix.md` — tool_call parameters mapped to proper `tool_name` field

**Related:**
- `llm_setup/ollama_local/` — LLM backend configuration