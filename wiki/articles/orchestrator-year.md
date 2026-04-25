---
created: 2026-04-25
tags:
  - ai-agents
  - orchestration
  - architecture
  - article
type: article
---

# Год Оркестраторов (2026)

**Источник:** adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/

Adam (adamdotdev) — AI developer.

## О чём статья

Обзор тренда 2026 года — агенты-оркестраторы становятся основным паттерном:

- **Orchestrator agent** — центральный агент который координирует специализированных
- **Specialized sub-agents** — агенты на конкретные задачи (research, coding, testing)
- **Memory sharing** — общая память между агентами
- **Task decomposition** — разбиение сложной задачи на подзадачи

## Ключевые паттерны

### 1. Hierarchical Orchestration
```
Orchestrator (главный)
├── Researcher (поиск информации)
├── Coder (написание кода)
├── Reviewer (проверка кода)
└── Tester (тестирование)
```

### 2. Shared Memory Model
- Централизованный vector store
- Каждый агент пишет туда результаты
- Другие агенты читают из него

### 3. Message Passing
- Агенты общаются через очередь сообщений
- Не прямое API, а асинхронное

## Примеры в нашем контексте

- **Dashboard** — мониторит subagent-ы, собирает результаты, показывает статистику
- **JAWL** — L0-L3 gatekeeper с централизованной памятью
- **Superpowers** — spec-first, subagent-driven development

## Статус

[[status.toread]]

## Источник

[[links-from-sessions]]
