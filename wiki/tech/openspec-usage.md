# OpenSpec: Практическое руководство

**Версия:** 1.2.0  
**Установка:** `npm install -g @fission-ai/openspec@latest`  
**Требования:** Node.js 20.19.0+

## Быстрый старт

### 1. Установка и инициализация

```bash
# Установка
npm install -g @fission-ai/openspec@latest

# Перейти в проект
cd your-project

# Инициализация (указать инструмент)
openspec init --tools cursor
# Доступные: cursor, claude, windsurf, cline, github-copilot и др. (20+)

# Или для всех инструментов
openspec init --tools all
```

### 2. Структура проекта

После инициализации создаётся:

```
project/
├── openspec/
│   ├── specs/              # Source of truth (как система работает)
│   │   └── <domain>/
│   │       └── spec.md
│   ├── changes/            # Предложения изменений
│   │   └── <change-name>/
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── tasks.md
│   │       └── specs/
│   │           └── <domain>/
│   │               └── spec.md    # Delta specs
│   └── config.yaml
└── .cursor/               # Cursor rules и skills
```

## Workflow

### Default (core profile)

```
/opsx:propose → /opsx:apply → /opsx:archive
```

### Expanded (custom workflow)

```
/opsx:new → /opsx:ff (или /opsx:continue) → /opsx:apply → /opsx:verify → /opsx:archive
```

## Команды

### /opsx:propose "название"

Создаёт change и все артефакты:

```bash
# Пример
/opsx:propose add-dark-mode
```

Генерирует:
- `proposal.md` — зачем и что
- `specs/` — delta specs (ADDED/MODIFIED/REMOVED)
- `design.md` — технический подход
- `tasks.md` — чеклист реализации

### /opsx:apply

Выполняет таски по порядку. AI читает только один таск и релевантный контекст → меньше галлюцинаций.

### /opsx:archive

Архивирует:
- ADDED requirements → добавляются в main specs
- MODIFIED requirements → заменяют существующие
- REMOVED requirements → удаляются

Change folder → `openspec/changes/archive/<date>-<name>/`

### CLI команды

```bash
openspec list              # Активные changes
openspec show <name>       # Детали change
openspec validate <name>    # Валидация
openspec view              # Dashboard
openspec update            # Обновить после апгрейда
```

## Delta Specs (ключевая концепция)

Delta specs показывают изменения относительно текущих specs:

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes.
(Previously: 60 minutes)

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

## Пример: Dark Mode

### Шаг 1: Предложить

```
You: /opsx:propose add-dark-mode

AI: Created openspec/changes/add-dark-mode/
 ✓ proposal.md — why we're doing this, what's changing
 ✓ specs/ — requirements and scenarios
 ✓ design.md — technical approach
 ✓ tasks.md — implementation checklist
 Ready for implementation!
```

### Шаг 2: Ревью артефактов

Человек проверяет и редактирует proposal.md, specs/, design.md, tasks.md.

### Шаг 3: Применить

```
You: /opsx:apply

AI: Working through tasks...
 ✓ 1.1 Created ThemeContext with light/dark state
 ✓ 1.2 Added CSS custom properties
 ✓ 1.3 Implemented localStorage persistence
 ✓ 2.1 Created ThemeToggle component
 All tasks complete!
```

### Шаг 4: Архивировать

```
You: /opsx:archive

AI: Archiving add-dark-mode...
 ✓ Merged specs into openspec/specs/ui/spec.md
 ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/
 Done!
```

## Для 1С проектов

### Как использовать

1. **Инициализация в папке с кодом 1С:**
   ```bash
   cd ~/1c-projects/my-erp
   openspec init --tools cursor
   ```

2. **Предложить изменение:**
   ```
   /opsx:propose add-inventory-tracking
   ```

3. **В proposal.md описать:**
   - Зачем нужно
   - Какие метаданные затрагиваются
   - Какие объекты добавляются

4. **В design.md:**
   - Структура объектов метаданных
   - Подписки, регистры, реквизиты
   - Интеграции с другими подсистемами

5. **В tasks.md:**
   - Создать объекты метаданных
   - Написать модули
   - Добавить права
   - Обновить состав подсистемы

### Преимущества для 1С

| Аспект | Без OpenSpec | С OpenSpec |
|--------|-------------|------------|
| Контекст | Теряется в чате | Хранится в spec |
| Регрессии | Частые | Trace-тся через delta |
| Онбординг | Долгий | Новый разработчик читает specs |
| Изменения | Хаотичные | Документированные |

## Сравнение с другими SDD

| Инструмент | Сложность | Lock-in | Brownfield |
|-----------|-----------|---------|------------|
| OpenSpec | Низкая | Нет | ✅ |
| Spec-kit | Высокая | GitHub | ❌ |
| Kiro | Средняя | VS Code + Claude | ❌ |
| Tessl | Средняя | Нет | ❌ |

## Лучшие модели

OpenSpec лучше работает с high-reasoning моделями:
- **Рекомендует:** Opus 4.5, GPT 5.2
- **Минимум:** Sonnet 4.5, GLM-5

## Телеметрия

OpenSpec собирает анонимную статистику (только имена команд).

Отключить:
```bash
export OPENSPEC_TELEMETRY=0
# или
export DO_NOT_TRACK=1
```

## Ссылки

- [openspec.pro](https://openspec.pro)
- [GitHub](https://github.com/Fission-AI/OpenSpec)
- [Docs](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md)
- [Discord](https://discord.gg/YctCnvvshC)
