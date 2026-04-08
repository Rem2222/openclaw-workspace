---
title: Spec-kit
type: tool
url: https://github.com/github/spec-kit
created: 2026-04-06
updated: 2026-04-06
tags: [SDD, GitHub, CLI, AI coding]
related: [[sdd]], [[kiro]], [[tessl]], [[openspec]]
---

# Spec-kit

**GitHub:** [github/spec-kit](https://github.com/github/spec-kit)

CLI-инструмент для Spec-Driven Development от GitHub. Наиболее кастомизируемый из трёх.

## Workflow

```
Constitution → Specify → Plan → Tasks
```

## Структура артефактов

| Этап | Описание |
|------|---------|
| **Constitution** | Высокоуровневые принципы — "immutable rules" для каждого изменения |
| **Specify** | Детализация требований |
| **Plan** | Планирование реализации |
| **Tasks** | Чеклист с чекбоксами |

## Ключевые особенности

- **Constitution** — мощный rules-файл, применяется к каждому workflow step
- Heavy use **чеклистов** для отслеживания:
  - User clarifications needed
  - Constitution violations
  - Research tasks
- Spec-файлы создаются **рядом с кодом** в workspace
- Генерирует **ветку** для каждой spec

## Когда использовать

- Команды с устоявшимися правилами архитектуры
- Проекты требующие строгого compliance
- Brownfield (но есть нюансы — see below)

## Ограничения

- Spec-kit остаётся по сути **spec-first**, не spec-anchored
- Каждая spec = одна ветка = lifetime изменения, не lifetime фичи
- [Discussion на GitHub](https://github.com/github/spec-kit/discussions/152) о путанице

## Установка

```bash
# Через GitHub CLI или напрямую
gh extension install github/spec-kit
```

## См. также

- [[sdd]] — обзор Spec-Driven Development
- [[kiro]] — более лёгкий SDD-инструмент
- [[tessl]] — spec-anchored подход
- [[openspec]] — наиболее популярный фреймворк
