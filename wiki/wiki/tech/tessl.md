---
title: Tessl Framework
type: tool
url: https://docs.tessl.io
created: 2026-04-06
updated: 2026-04-06
tags: [SDD, MCP, CLI, spec-anchored, beta]
related: [[sdd]], [[kiro]], [[spec-kit]], [[openspec]], [[mcp]]
---

# Tessl Framework

**Docs:** [docs.tessl.io](https://docs.tessl.io)
**Status:** Private beta

CLI + MCP server для Spec-Driven Development. **Единственный** инструмент, который явно стремится к spec-anchored и spec-as-source уровням SDD.

## Workflow

Spec → Code (generated)

## Ключевые особенности

- **Spec-as-source** — спецификация primary artifact
- Код генерируется из spec с пометкой:
  ```
  // GENERATED FROM SPEC - DO NOT EDIT
  ```
- **1:1 mapping** — один spec = один code file
- CLI command также работает как **MCP server**
- Currently в private beta

## Уровни SDD в Tessl

| Уровень | Поддержка |
|---------|-----------|
| Spec-first | ✅ |
| Spec-anchored | ✅ |
| Spec-as-source | ✅ (future) |

## Когда использовать

- Максимальная автоматизация
- Долгосрочная поддержка кода через spec
- Интеграция с MCP-совместимыми IDE (Cursor, Claude Code, etc.)

## Статус

> ⚠️ Tessl currently in private beta. Требуется запрос на доступ.

## Установка (когда будет доступно)

```bash
npm install -g tessl
tessl init
```

## См. также

- [[sdd]] — обзор Spec-Driven Development
- [[kiro]] — spec-first only
- [[spec-kit]] — GitHub-версия
- [[openspec]] — наиболее популярный
- [[mcp]] — Model Context Protocol (Tessl работает как MCP server)
