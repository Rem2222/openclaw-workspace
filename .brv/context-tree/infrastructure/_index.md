---
children_hash: 921fb52b14afa780a25d4c00a0db1cb5a184bf9099547e1a8377b979a63172b3
compression_ratio: 0.42961165048543687
condensation_order: 2
covers: [monitoring/_index.md, telegram_bot/_index.md]
covers_token_total: 412
summary_level: d2
token_count: 177
type: summary
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