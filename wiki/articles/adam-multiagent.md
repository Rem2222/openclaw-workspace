---
created: 2026-04-25
tags:
  - x-com
  - multi-agent
  - architecture
type: article
---

# Adam о Multi-agent архитектурах

**Twitter/X:** x.com/adamdotdev/status/1973732040718860563

Adam (adamdotdev) — AI developer, автор статей про multi-agent системы.

## О чём

Статья/тред про архитектуру multi-agent систем:
- Когда использовать нескольких агентов
- Как они взаимодействуют между собой
- Проблемы координации агентов
- Memory sharing между агентами

## Ключевые идеи (из тренда)

1. **Разделение ответственности** — отдельный агент на отдельную задачу
2. **Общий контекст** — агенты должны шарить память/контекст
3. **Иерархия** — orchestrator agent координирует специализированных
4. **Коммуникация** — message queue vs direct call

## Наш контекст

Роман изучает оркестратор-подход. JAWL использует похожую модель (L0-L3 gatekeeper).

Мы делали Dashboard как orchestrator который запускает subagent-ов и собирает результаты.

## Статус

[[status.toread]]

## Источник

[[links-from-sessions]]
