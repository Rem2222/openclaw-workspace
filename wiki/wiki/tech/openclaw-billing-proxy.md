---
title: OpenClaw Billing Proxy
type: tool
author: zacdcook
created: 2026-04-06
updated: 2026-04-06
tags: [OpenClaw, Anthropic, billing, proxy, Claude Code]
related: [[llm-wiki]]
---

# OpenClaw Billing Proxy

**GitHub:** [zacdcook/openclaw-billing-proxy](https://github.com/zacdcook/openclaw-billing-proxy)

Прокси-сервер, который позволяет OpenClaw использовать API Anthropic через подписку Claude Max/Pro вместо Extra Usage billing.

## Контекст

После 4 апреля 2026 Anthropic отключили subscription billing для сторонних инструментов. Все запросы от OpenClaw теперь тарифицируются как Extra Usage.

Этот прокси встаёт между OpenClaw и Anthropic API, подставляя billing identifier Claude Code.

## Как работает

```
OpenClaw → Proxy (127.0.0.1:18801) → Anthropic API
```

**Исходящие (request):**
1. **Billing Header** — вставляет 84-символьный billing identifier Claude Code в system prompt
2. **Token Swap** — заменяет токен OpenClaw на OAuth токен Claude Code
3. **Sanitization** — заменяет trigger phrases, которые Anthropic детектит в стриминговом классификаторе

**Входящие (response):**
4. **Reverse Mapping** — восстанавливает оригинальные названия инструментов и пути файлов

## Триггеры{detected by Anthropic}

Anthropic детектит第三-party инструменты по паттернам:

| Паттерн | Пример |
|---------|--------|
| Название платформы | `OpenClaw`, `openclaw` |
| Session management | `sessions_spawn`, `sessions_list`, `sessions_history`, ... |
| Heartbeat ack | `HEARTBEAT_OK` |
| Self-declaration | `running inside` + название платформы |

## Установка

```bash
# 1. Claude Code
npm install -g @anthropic-ai/claude-code
claude auth login  # нужен Max или Pro аккаунт

# 2. Прокси
git clone https://github.com/zacdcook/openclaw-billing-proxy
cd openclaw-blogging-proxy
node setup.js
node proxy.js

# 3. Конфиг OpenClaw
# В ~/.openclaw/openclaw.json:
# "baseUrl": "http://127.0.0.1:18801"

# 4. Рестарт gateway
openclaw gateway restart
```

## Конфиг (config.json)

```json
{
  "port": 18801,
  "credentialsPath": "~/.claude/.credentials.json",
  "replacements": [
    ["OpenClaw", "OCPlatform"],
    ["sessions_spawn", "create_task"],
    ...
  ],
  "reverseMap": [
    ["OCPlatform", "OpenClaw"],
    ...
  ]
}
```

## Ограничения

- OAuth токен Claude Code истекает каждые ~24 часа
- Нужна подписка Claude Max или Pro
- При обнаружении новых `sessions_*` инструментов — добавлять в replacements/reverseMap

## Риски и этика

> ⚠️ Использование этого прокси может нарушать Terms of Service Anthropic. Расчёт на свой страх и риск.

## См. также

- [GitHub: zacdcook/openclaw-billing-proxy](https://github.com/zacdcook/openclaw-billing-proxy)
- [[llm-wiki]] — куда это добавлено
