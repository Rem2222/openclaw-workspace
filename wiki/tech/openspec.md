# OpenSpec

**OpenSpec** — легковесный, open-source (MIT) SDD-фреймворк от Fission-AI.

## Philosophy

```
fluid not rigid
iterative not waterfall
easy not complex
built for brownfield not just greenfield
scalable from personal projects to enterprises
```

## Установка

```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init
```

## Workflow

```
/opsx:propose → Review Artifacts → /opsx:apply → Run Tests → /opsx:archive
                (Human reviewing AI-generated specs)
```

### 1. /opsx:propose — Начать изменение

Генерирует 4 артефакта:

| Артефакт | Фаза SDD | Содержимое |
|----------|----------|-------------|
| proposal.md | WHY | Зачем мы это делаем |
| specs/ | WHAT | Требования и acceptance scenarios (WHEN/THEN) |
| design.md | HOW | Технический подход, архитектура |
| tasks.md | Checklist | Атомарный чеклист реализации |

### 2. Review Artifacts

Человек ревьюит сгенерированные артефакты. Нет жёстких gates — можно редактировать в любой момент.

### 3. /opsx:apply — Выполнить таски

AI выполняет таски по одной. Читает только один таск и релевантный spec-контекст → меньше галлюцинаций.

### 4. Verification

Автоматические тесты подтверждают соответствие acceptance criteria.

### 5. /opsx:archive

Архивирует в `openspec/changes/archive/` с timestamp.

## Преимущества над другими SDD

| Аспект | OpenSpec | Spec-kit | Kiro |
|--------|----------|----------|------|
| Open Source | MIT | MIT | Proprietary |
| Lock-in | None (20+ assistants) | Limited | VS Code + Claude |
| Learning Curve | Very low (3 commands) | Higher | Medium |
| Brownfield | ✅ | ❌ | ❌ |
| Не требует MCP | ✅ | ❌ | ❌ |

## Для 1С

OpenSpec можно использовать для:
1. Структурирования фич перед кодом
2. Документирования принятых решений
3. Командной работы (Specs + Archives как единый источник)

## Ссылки

- [openspec.pro](https://openspec.pro)
- [github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [docs.openspec.dev](https://docs.openspec.dev)
