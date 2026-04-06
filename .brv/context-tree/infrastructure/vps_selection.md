# VPS Selection for OpenClaw (2026-04-04)

## Tested Providers (accessible from Russia)

| Provider | Access | Location | Price | Notes |
|----------|--------|----------|-------|-------|
| Hetzner | ❌ Blocked | EU | €4.49/mo | |
| DigitalOcean | ❌ Blocked | EU | ~$12/mo | |
| Contabo | ❌ Blocked | France | €10/mo | |
| Vultr | ⚠️ API 200, SSH timeout | EU | ~$6/mo | |
| OVHcloud | ❌ Blocked | EU | ~€4/mo | |
| Gcore | ✅ 200, registration blocked from RU | Frankfurt | €3.25/mo | |
| Alexhost | ✅ 200 | Moldova/Netherlands | €10/mo | Recommended |
| FlokiNET | ✅ 200 | Iceland | ~$70/mo | Expensive |
| Koara | ⚠️ IP from Belize, Anthropic blocked | Belize/UAE | 639₽/mo | NOT Germany as claimed |
| Webhost1 | ✅ 200, but IP in Moscow | Russia (AS44094) | 340₽/mo | Claims Netherlands |

## Contabo VPS - Selected

- **IP:** 81.17.100.103 (France)
- **Config:** Cloud VPS 10 SSD — 4 CPU, 8GB RAM, 150GB SSD
- **OpenClaw:** v2026.4.2, Node.js v22.22.2
- **Gateway:** port 18789, HTTPS with self-signed cert
- **Swap:** 4GB, Firewall: UFW (22, 18789 open)

## API Availability from VPS

- ✅ Anthropic API
- ✅ OpenRouter
- ✅ GitHub
- ✅ npm
- ❌ Neko API

## Lessons Learned

1. **OpenClaw TLS config path:** `gateway.tls.enabled`, `gateway.tls.certPath`, `gateway.tls.keyPath` (NOT `gateway.https`)
2. **Gateway bind:** `--bind lan` flag overrides config; correct systemd syntax needed
3. **Koara IP真相:** Belize (IQWeb FZ-LLC, UAE), not Germany. Anthropic API blocked.
4. **Webhost1真相:** Claims Netherlands, but IP is in Moscow (AS44094)
5. **Pairing required:** VPS gateway shows "pairing needed" — process TBD

## Gateway Config Template

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "controlUi": { "allowedOrigins": ["*"] },
    "auth": { "mode": "token", "token": "<TOKEN>" },
    "tls": {
      "enabled": true,
      "certPath": "/etc/openclaw/ssl/cert.pem",
      "keyPath": "/etc/openclaw/ssl/key.pem"
    }
  }
}
```

---
*Consolidated: 2026-04-05*
