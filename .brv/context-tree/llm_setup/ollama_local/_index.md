---
children_hash: 504ce0df308a95fed2162c90666a299bb1f79e82569c073af8837ab08f23d791
compression_ratio: 0.38935574229691877
condensation_order: 1
covers: [context.md, ollama_local_configuration.md]
covers_token_total: 357
summary_level: d1
token_count: 139
type: summary
---
# Topic: ollama_local

## Overview
Ollama local LLM setup with working model configuration and known subagent interface reliability issues.

## Working Configuration
- **Model**: qwen2.5:7b confirmed working via direct query
- **Unavailable**: qwen3.5:27b not available in local installation

## Known Issues
- **Subagent hangs**: Queries through subagent interface hang while direct queries work
- **Vision models**: Unreliable through subagent interface

## Child Entries
- `ollama_local_configuration.md` — Detailed model status and issue documentation