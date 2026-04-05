# Vibe Coding Workflow

**SKILL:** vibe-coding-workflow на ClawHub  
**Автор:** вероятно Cline/Cursor community  
**Тип:** 5-phase structured workflow для AI-assisted development

## Overview

Структурированный 5-phase workflow от идеи до работающего продукта:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
     ↓         ↓         ↓         ↓         ↓
Requirements → Architecture → Code Gen → Debug → Iteration
```

## 5 Фаз

### Phase 1: Requirements
**Цель:** Vague idea → structured requirements doc

Steps:
1. **Clarify the Idea** — понять кто, что, проблема
2. **Technology Selection** — 2-3 опции с pros/cons
3. **Structured Confirmation** — заполнить template

**Template:**
| Field | Content |
|-------|---------|
| System background | |
| Goal of this build | |
| Users & use cases | |
| Inputs / outputs | |
| Boundaries & constraints | |
| Error handling approach | |
| Acceptance criteria | |

### Phase 2: Architecture
**Цель:** Структура проекта, data flow, interface contracts

Outputs:
- Directory structure (file level)
- One-sentence responsibility per file
- **Mermaid flowchart** data flow
- Interface contracts (function names, params, return types)
- Weakest point in design

**No implementation code** — только interfaces и structure.

### Phase 3: Code Generation
**Цель:** Module-by-module implementation

**Key rule:** Один модуль за раз!

Generation order:
1. Foundation (utilities, data models, storage)
2. Business logic
3. UI layer / external adapters

After each module: verify import + key functions callable.

### Phase 4: Debugging
**Цель:** Collaborative problem solving

Steps:
1. Gather full context (error text, steps, expected vs actual)
2. Explain error (plain language, 1-3 likely causes)
3. Step-by-step fix (user reports after each step)
4. Summary (Problem / Cause / Fix)

If unresolved after 3+ rounds → suggest new conversation.

### Phase 5: Iteration
**Цель:** Re-enter correct phase for each change type

| Scenario | Entry |
|----------|-------|
| New feature | Phase 1 |
| Performance/UX issue | Phase 4 |
| Messy code structure | Phase 2 |

## Global Principles

1. **You execute, user decides** — end each phase with summary + items awaiting confirmation
2. **Context is first-class** — never guess, actively request info
3. **Preserve artifacts** — all outputs as Markdown
4. **Tool separation** — conversation for discussion, code editing for files
5. **Phase gate** — completion checklist as only criterion for moving forward

## Сравнение: Vibe Coding Workflow vs SDD

| Аспект | Vibe Coding Workflow | SDD (OpenSpec) |
|--------|---------------------|----------------|
| **Фокус** | Полный цикл idea → production | Spec-first, spec-anchored |
| **Структура** | 5 фаз, чёткие gate | 3-5 артефактов на change |
| **Итерации** | Phase 5 определяет re-entry | proposal → apply → archive |
| **Документация** | Requirements + Architecture docs | Delta specs, proposals |
| **Контроль** | User decides after each phase | AI-driven с human review |
| **Сложность** | Medium | Low (OpenSpec) to High (Spec-kit) |

## Когда что использовать

| Сценарий | Рекомендация |
|----------|--------------|
| Новый проект с нуля | Vibe Coding Workflow |
| Добавление фичи в существующий | Vibe Coding Workflow → Phase 1 |
| Крупный проект с командой | SDD (OpenSpec/spec-kit) |
| Нужна спека как source of truth | SDD |
| Быстрые прототипы | Без структуры или Vibe Coding Workflow |
| Исправление багов | Vibe Coding Workflow → Phase 4 |

## Ключевые отличия от SDD

**Vibe Coding Workflow:**
- **Human-in-the-loop** после каждой фазы
- **Requirements doc** как primary artifact
- **Architecture** отдельной фазой
- **No spec-anchored** — docs остаются, но не становятся source of truth

**SDD:**
- **Spec-first** — всё начинается со спецификации
- **Delta specs** — изменения трекаются
- **Spec-anchored** (Tessl) — spec становится primary artifact
- **AI-driven** — меньше human intervention

## Источники

- [ClaHub: vibe-coding-workflow](https://clawhub.ai/skills/vibe-coding-workflow)
