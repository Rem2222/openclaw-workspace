---
children_hash: 8c6e0677cf355a7625b1cb8de5d08d5651e33ae316654ceab5b57ae26ff3ac49
compression_ratio: 0.2640845070422535
condensation_order: 1
covers: [server_monitoring_configuration.md]
covers_token_total: 284
summary_level: d1
token_count: 75
type: summary
---
## Infrastructure Monitoring

Server monitoring via `server-monitor/check-servers.py` executed by cron every 15 minutes, monitoring 5 servers (typically 3 UP).

**Key Configuration:**
- HEARTBEAT interval: 1 hour (changed from 5 min on 2026-03-15)

**See also:** `server_monitoring_configuration.md`