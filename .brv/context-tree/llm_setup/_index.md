---
children_hash: f742a95ef09fc7697f3073c40fa9232fbf068714454f904544239b28f5cf9262
compression_ratio: 0.5194690265486726
condensation_order: 2
covers: [context.md, jawl_debugging/_index.md, model_switching_issues.md, ollama_local/_index.md]
covers_token_total: 1130
summary_level: d2
token_count: 587
type: summary
---
<think>The user wants me to create a structural summary at level d2 (topic level) from the provided child entries about JAWL debugging. Looking at the context tree structure, level d2 appears to be the topic level (like jawl_debugging/, ollama_local/, etc.).

The child entries provided are:
1. context.md - Domain overview for llm_setup
2. jawl_debugging/_index.md - Summary of JAWL debugging topic
3. model_switching_issues.md - Model switching problem documentation
4. ollama_local/_index.md - Summary of ollama_local topic

I need to create a d2 level summary that:
- Condenses child entries into a structural overview
- Preserves key facts, relationships, and patterns
- References child entry names
- Target compression: ~20-30% of input token count
- PRESERVES entity names, file paths, API signatures, architectural decisions, key relationships
- DISCARDS verbose examples, repeated explanations, secondary detail, conversational filler

Let me create a concise summary that integrates all these entries into a coherent d2-level document.
</think>

# LLM Setup

Domain covering local LLM configuration, debugging, and operational issues.

## Topics

### jawl_debugging

JAWL agent debugging session (2026-04-26) covering critical fixes and operational rules.

**Critical Fixes:**
- SOUL.md tool call format: nested `{"thoughts": "...", "actions": [{"tool_name": "...", "parameters": {...}]}`
- Dashboard reads `system.log` (not startup_error.log)

**Configuration:** ticks=12, detailed_ticks=3, tick_action_max_chars=1000, max_tokens=1200

**Entry Point:** `python src/main.py` (not jawl.py)

**Qdrant Lock Cleanup:** `/home/rem/JAWL/src/utils/local/data/vector_db/.lock` before start

**Telegram:** Bot @Jawl_Jinx_bot, chat_id 386235337

→ See: `jawl_agent_debugging_session.md`, `jawl_debugging_session_2026_04_26.md`

### ollama_local

Local Ollama setup with working model configuration and subagent reliability issues.

**Working:** qwen2.5:7b via direct query

**Not Available:** qwen3.5:27b

**Known Issues:** Subagent interface hangs; vision models unreliable through subagent

→ See: `ollama_local_configuration.md`

### model_switching_issues

Gateway restart resets primary model to default instead of preserving configured model. Neko API requires correct format: `claude-opus-4-6[1m]` (brackets for context window), not hyphens.