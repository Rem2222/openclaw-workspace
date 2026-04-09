---
title: "Heisenberg Team"
description: "Production-ready OpenClaw multi-agent team template with 8 agents"
tags: [openclaw, multi-agent, heisenberg, automation]
related: [[openclaw]]
---

# Heisenberg Team

**URL:** https://github.com/ai-operacionka/heisenberg-team-GPT

## Что это

Production-ready шаблон мультиагентной команды на OpenClaw. 8 AI-агентов работают как команда. Вдохновлён персонажами Breaking Bad.

## Агенты

| Агент | Роль | Модель |
|-------|------|--------|
| 🧪 Heisenberg | Босс-координатор | Opus |
| 💼 Saul Goodman | Продюсер | Sonnet |
| 👨🔬 Walter White | Tech Lead | Sonnet |
| 🎯 Jesse Pinkman | Marketing | Sonnet |
| 💰 Skyler White | Finance | Sonnet |
| 🔫 Hank Schrader | Security | Sonnet |
| 🎯 Gus Fring | Kaizen/Goals | Sonnet |
| 👥 Salamanca Twins | Research | Sonnet |

## Фичи

- **34 встроенных скилла** — PDF, XLSX, research, security audits, code review
- **Board-First протокол** — задачи сохраняются в файлах, не теряются при крашах
- **Self-healing** — health checks, watchdogs, автоматическая очистка сессий
- **Setup wizard** — 5 минут на настройку
- **SQLite + vector search** — память агентов
- **Telegram-ready** — бот для коммуникации

## Сравнение с конкурентами

| | Heisenberg Team | AutoGPT | CrewAI | MetaGPT |
|--|-----------------|---------|--------|---------|
| Setup | 5 мин wizard | Manual YAML | Python code | Python code |
| Crash recovery | File-based ✅ | In-memory ❌ | In-memory ❌ | In-memory ❌ |
| Agent coordination | Board + sessions_send | Shared memory | Sequential/hierarchical | SOP-based |
| Self-healing | Built-in ✅ | ❌ | ❌ | ❌ |
| Skills library | 34 ready-to-use | Plugin ecosystem | Build your own | Build your own |
| Personality | SOUL.md per agent | Generic | Role description | Role description |
| Memory | SQLite + vectors | Vector DB | Short-term only | Shared memory |
| Monitoring | Heartbeat + health checks | Logs only | Logs only | Logs only |

## Board-First протокол

Задачи хранятся в файлах, а не в памяти. Если агент упадёт — задача не теряется.

```
User → Heisenberg (boss) → sessions_send → Specialists
                                    ↓
                              Team Board (file-based)
```

## Self-healing

- Cron-based health checks
- Watchdogs для зависших сессий
- Автоматическая очистка сессий
- Данные пользователей используют `{{PLACEHOLDER}}` формат

## Требования

- Node.js 18+
- OpenClaw (npm install -g openclaw)
- Telegram bot token (опционально)
- RAM: 2 GB minimum, 4 GB recommended (для 8 агентов)

## Статус

⏳ На рассмотрении — нужно протестировать
