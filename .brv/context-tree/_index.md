---
children_hash: 7bc4298025cfba1eb2471ca4693f82785565772247ba119767178ef9a12f5d71
compression_ratio: 0.4130962004850445
condensation_order: 3
covers: [facts/_index.md, game_development/_index.md, infrastructure/_index.md, llm_setup/_index.md, one_c_development/_index.md]
covers_token_total: 1237
summary_level: d3
token_count: 511
type: summary
---
# Context Tree Overview

Knowledge base organized into 5 domains covering personal facts, game development, infrastructure, LLM setup, and 1C development.

## facts/
Personal information and preferences for **Roman**, a 1C programmer learning vibecoding methodology.

**Key Entry:** `personal/user_profile.md` — Complete profile with profession and learning objectives

---

## game_development/
Bug fixes for game rendering systems.

**Key Fix:** Campfire Survival lighting bug (2026-03-27) — Replaced GeometryMask with 4 positioned darkness rectangles to resolve full-screen blue rendering at depth 200.

**Pattern:** Rendering bugs resolved by simplifying geometry masking to overlay rectangles.

**See:** `bug_fixes/campfire_survival_lighting_bug.md`

---

## infrastructure/
Operational components for OpenClaw ecosystem.

### monitoring/
Server monitoring via `server-monitor/check-servers.py` on 15-minute cron. Monitors 5 servers. HEARTBEAT: 1 hour (changed from 5 min on 2026-03-15).

**See:** `monitoring/server_monitoring_configuration.md`

### telegram_bot/
Telegram integration using Cloudflare Quick Tunnel. Architecture: Telegram API → Cloudflare Tunnel → OpenClaw webhook.

**Gap:** Permanent tunnel URL required for production.

**See:** `telegram_bot/openclaw_telegram_bot_configuration.md`

---

## llm_setup/
Local LLM configuration and troubleshooting.

**Working:** qwen2.5:7b (confirmed via direct query)
**Unavailable:** qwen2.5:27b

**Known Issues:** Subagent interface hangs; vision models unreliable through subagent.

**See:** `ollama_local/ollama_local_configuration.md`

---

## one_c_development/
1C:Enterprise platform development patterns.

### http_response_parsing/
**Key Methods:**
- `ПолучитьСтрокуИзДвоичныхДанных()` — reliable body extraction
- `ПрочитатьJSON()` — JSON parsing
- `ZipReader` — gzip decompression

**Avoid:** `HTTPОтвет.ПолучитьТелоКакСтроку()` — unreliable

**Source:** AIChat EPF (`C:\Users\rem\AIChat-build\AIChat.epf`)

**See:** `http_response_parsing/http_response_parsing_in_1c.md`