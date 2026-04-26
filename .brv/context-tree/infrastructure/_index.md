---
tags: []
keywords: []
importance: 53
recency: 1
maturity: draft
accessCount: 1
---
## Infrastructure

Operational infrastructure components for OpenClaw ecosystem.

### Monitoring
Server monitoring via `server-monitor/check-servers.py` on 15-minute cron cycle. Monitors 5 servers (typically 3 UP). HEARTBEAT interval: 1 hour (changed from 5 min on 2026-03-15).

**See:** `monitoring/server_monitoring_configuration.md`

### Telegram Bot
Telegram bot integration using Cloudflare Quick Tunnel for webhook communication. Currently operational with temporary tunnel URL.

**Architecture:** Telegram API → Cloudflare Tunnel → OpenClaw webhook endpoint

**Production Gap:** Permanent tunnel URL required before production deployment.

**See:** `telegram_bot/openclaw_telegram_bot_configuration.md`

### VPS Selection
VPS provider comparison for OpenClaw deployment accessible from Russia. Selected Contabo VPS (France, 4 CPU/8GB/150GB SSD). Key lesson: TLS config uses `gateway.tls.*` not `gateway.https`.

**See:** `vps_selection.md`

### Dashboard Development
OpenClaw Dashboard (React+Express) major refactoring. Performance improved 10-15x by unifying polling. Security fix for command injection (CWE-78). Superpowers workflow integrated with Beads task tracking.

**See:** `dashboard_development.md`