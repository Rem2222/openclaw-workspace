---
children_hash: 61007304f505500783c06db0213d0bc2fbbe2fb70261c771ee7a82ab6819f41c
compression_ratio: 0.47653429602888087
condensation_order: 2
covers: [context.md, ollama_local/_index.md]
covers_token_total: 277
summary_level: d2
token_count: 132
type: summary
---
# Domain: llm_setup

## Purpose
Local LLM configuration and troubleshooting for development environment.

## Topics

### ollama_local
Local Ollama setup with working configuration and known reliability issues.

**Working**: qwen2.5:7b confirmed via direct query
**Unavailable**: qwen2.5:27b not in local installation

**Known Issues**:
- Subagent interface hangs (direct queries work)
- Vision models unreliable through subagent

**Child Entries**:
- `ollama_local/ollama_local_configuration.md` — Model status and issue details