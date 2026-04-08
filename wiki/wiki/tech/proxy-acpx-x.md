---
title: proxy-acpx-x
type: tool
author: clonn
created: 2026-04-06
updated: 2026-04-06
tags: [OpenClaw, Anthropic, billing, proxy, Claude Code]
related: [[openclaw-billing-proxy]], [[llm-wiki]]
---

# proxy-acpx-x

**GitHub:** [clonn/proxy-acpx-x](https://github.com/clonn/proxy-acpx-x)
**npm:** [proxy-acpx-x](https://npmjs.com/package/proxy-acpx-x)

Альтернативный прокси для подключения OpenClaw к Claude Code subscription. В отличие от [openclaw-billing-proxy](/wiki/tech/openclaw-billing-proxy), работает через OpenAI-совместимый интерфейс.

## Схема работы

```
OpenClaw → HTTP → proxy-acpx-server (:52088) → Claude Code CLI → Anthropic API
```

## Установка

```bash
# 1. Claude Code авторизация
claude auth login

# 2. Установка и запуск прокси
npm install -g proxy-acpx-x
proxy-acpx-server -d  # -d = в фоне, слушает 127.0.0.1:52088

# 3. Настройка OpenClaw
openclaw config set models.mode "merge"
openclaw config set models.providers.claude-local.api "openai-completions"
openclaw config set models.providers.claude-local.baseUrl "http://127.0.0.1:52088/v1"
openclaw config set models.providers.claude-local.apiKey "sk-dummy-key"
openclaw config set models.providers.claude-local.models '[{"id":"claude-code-proxy","name":"Claude Code Proxy"}]' --strict-json

# 4. Выбор модели
openclaw models set claude-local/claude-code-proxy
openclaw models status
```

## Особенности

- OpenAI-совместимый API (стандартный `/v1/completions`)
- Поддерживает Codex CLI и Gemini CLI как бэкенды
- Простая настройка через openclaw config
- Запуск в фоне с флагом `-d`

## Сравнение с openclaw-billing-proxy

| | proxy-acpx-x | openclaw-billing-proxy |
|---|---|---|
| Интерфейс | OpenAI-compatible | Прямой API proxy |
| Настройка | Через openclaw config | Ручное изменение baseUrl |
| Поддержка | Codex CLI, Gemini CLI | Только Claude Code |
| Автор | clonn | zacdcook |

## См. также

- [[openclaw-billing-proxy]] — альтернативный прокси от zacdcook
- [GitHub: clonn/proxy-acpx-x](https://github.com/clonn/proxy-acpx-x)
- [npm: proxy-acpx-x](https://npmjs.com/package/proxy-acpx-x)
