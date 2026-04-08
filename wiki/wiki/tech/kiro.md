---
title: Kiro
type: tool
url: https://kiro.dev
created: 2026-04-06
updated: 2026-04-06
tags: [SDD, VS Code, AI coding, spec-first]
related: [[sdd]], [[spec-kit]], [[tessl]], [[openspec]]
---

# Kiro

**URL:** [kiro.dev](https://kiro.dev)

Самый лёгкий (lightweight) SDD-инструмент. VS Code-based.

## Workflow

```
Requirements → Design → Tasks
```

## Структура артефактов

| Этап | Формат | Описание |
|------|--------|---------|
| **Requirements** | User Stories | "As a... When... Then..." с acceptance criteria |
| **Design** | Markdown секции | Структурированное описание дизайна |
| **Tasks** | Чеклист | Таски с trace-back к requirement numbers |

## Особенности

- Spec-first only (не spec-anchored)
- VS Code extension
- Steering (memory bank): product.md, structure.md, tech.md
- Простой workflow для небольших задач

## Когда использовать

- Быстрые таски где не нужен heavy-weight процесс
- Greenfield проекты
- Когда не требуется долгосрочная поддержка spec

## См. также

- [[sdd]] — обзор Spec-Driven Development
- [[spec-kit]] — GitHub-версия SDD
- [[tessl]] — spec-anchored подход
- [[openspec]] — наиболее популярный фреймворк
