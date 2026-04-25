---
created: 2026-04-25
tags:
  - ai-agents
  - autonomous
  - python
  - memory
type: tool
---

# JAWL (Just Another Workflow Library)

**GitHub:** github.com/th0r3nt/JAWL

Автономный AI агент фреймворк с infinite ReAct loop.

## Ключевые фичи

- **Infinite ReAct loop** — бесконечный цикл reasoning → action → observation
- **Memory:** локальный SQLite + Qdrant vector DB
- **Event-driven heartbeat** — непрерывный monitoring цикл
- **4-level Gatekeeper** — L0/L1/L2/L3 контроль доступа к действиям
- **API key rotation** — автоматическая смена ключей
- **SOLID архитектура** — L0-L3 слои разделены

## Архитектура

| Level | Назначение |
|-------|-----------|
| L0 | Чистая память, нет действий |
| L1 | Read-only, анализ данных |
| L2 | Ограниченные действия (запросы) |
| L3 | Полный доступ (опасные операции) |

## Для чего подходит

- Автономные агенты которые долго работают
- Агенты с памятью на годы
- Сложные многошаговые workflow

## Статус

[[status.todo]]

## Заметки

- Использует ReAct (Reasoning + Acting) паттерн
- Qdrant требует额外的 установки (Docker)
- Gatekeeper предотвращает неконтролируемые действия

## Заметки

- Использует ReAct (Reasoning + Acting) паттерн
- Qdrant требует额外的 установки (Docker)
- Gatekeeper предотвращает неконтролируемые действия
