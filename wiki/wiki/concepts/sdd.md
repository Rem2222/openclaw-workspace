---
title: SDD — Spec-Driven Development
type: concept
created: 2026-04-06
updated: 2026-04-06
tags: [SDD, разработка, спецификации, AI, Kiro, Spec-kit, Tessl, OpenSpec]
related: [[llm-wiki]], [[rag]], [[kiro]], [[spec-kit]], [[tessl]], [[openspec]]
---

# SDD — Spec-Driven Development

**Spec-Driven Development** — подход к разработке, где спецификация является первичным артефактом, а код генерируется из неё.

## Три уровня SDD

| Уровень | Описание | Инструменты |
|---------|---------|-------------|
| **Spec-first** | Сначала пишешь спецификацию, потом код | Все инструменты |
| **Spec-anchored** | Спецификация остаётся после разработки — для поддержки и эволюции | Tessl, OpenSpec |
| **Spec-as-source** | Спецификация — единственный файл для редактирования; код генерируется | Tessl (future) |

## Ключевые принципы

1. **Single Source of Truth (SSOT)** — спецификация единственный источник требований
2. **Constraint-Driven** — AI работает в рамках спецификации
3. **Traceability** — каждый код trace-тся к конкретному пункту спецификации

## Инструменты SDD

### [[kiro|Kiro]] (kiro.dev)
**Самый лёгкий** из трёх SDD-инструментов. spec-first, VS Code-based.

Workflow: Requirements → Design → Tasks

- Requirements: User Stories (формат "As a... When... Then...")
- Design: структурированный markdown-документ
- Tasks: чеклист с trace-back к requirements

Память (steering): product.md, structure.md, tech.md

### [[spec-kit|Spec-kit]] (GitHub)
CLI-инструмент от GitHub. Наиболее кастомизируемый.

Workflow: Constitution → Specify → Plan → Tasks

- **Constitution** — высокоуровневые принципы (аналог rules-файла)
- Spec хранится в workspace рядом с кодом
- Heavy use чеклистов для отслеживания уточнений и нарушений constitution

### [[tessl|Tessl Framework]]
CLI + MCP server. **Единственный**, кто явно стремится к spec-anchored и spec-as-source.

- Spec = primary artifact
- Код помечается `// GENERATED FROM SPEC - DO NOT EDIT`
- 1:1 mapping spec → code file
- Currently в private beta

### [[openspec|OpenSpec]] (Fission AI)
**OpenSpec** — наиболее популярный SDD-фреймворк по версии сообщества.

Философия: fluid, iterative, easy, brownfield-friendly, scalable.

Workflow:
1. `/opsx:new <feature>` — создаёт папку change
2. `/opsx:ff` — генерирует proposal.md, specs/, design.md, tasks.md
3. `/opsx:apply` — применяет таски
4. `/opsx:archive` — архивирует и обновляет specs

Поддерживает 20+ AI-ассистентов: Claude Code, Cursor, Copilot, Windsurf, RooCode, Cline, Amazon Q, Codex и др.

**Установка:**
```bash
npm install -g @fission-ai/openspec@latest
openspec init
```

## SDD vs Vibe Coding

| Vibe Coding | SDD |
|------------|-----|
| Интуитивный, быстрый | Структурированный, документированный |
| 0 → 1 прототипы | 1 → n итерации |
| Код быстро генерируется | Код стабилен и документирован |
| Сложно масштабировать | Легко масштабировать |

## SDD для 1С

SDD подход особенно актуален для 1С:
- Сложные конфигурации требуют документации
- Spec-файлы могут хранить требования к модулям
- Traceability помогает при аудите доработок
- Brownfield-friendly подход OpenSpec позволяет добавлять SDD инкрементально

## Источники

- [Martin Fowler: Understanding Spec-Driven-Development](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [OpenSpec](https://openspec.pro/)
- [Kiro](https://kiro.dev/)
- [Spec-kit на GitHub](https://github.com/github/spec-kit)
- [Tessl](https://docs.tessl.io/)
