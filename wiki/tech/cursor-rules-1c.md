# cursor_rules_1c

**GitHub:** github.com/comol/cursor_rules_1c  
**Назначение:** Rules, agents, skills и commands для vibe coding 1С в Cursor IDE

## Структура

```
.cursor/
├── agents/           # 11 AI-агентов
│   ├── analytic.md        # Бизнес-аналитик (PRD, ТЗ, спецификации)
│   ├── architect.md       # Архитектор решений
│   ├── arch-reviewer.md   # Ревьюер архитектуры
│   ├── code-reviewer.md   # Ревьюер кода
│   ├── developer.md       # Разработчик
│   ├── doc-writer.md     # Технический писатель
│   ├── error-fixer.md     # Исправление ошибок
│   ├── metadata-manager.md # Субагент: управление метаданными ⭐
│   ├── performance-optimizer.md # Оптимизация производительности
│   ├── planner.md         # Планировщик задач
│   ├── refactoring.md     # Рефакторинг
│   └── tester.md          # Тестирование
│
├── rules/            # Правила и стандарты
│   ├── project_rules.mdc      # Основные правила проекта (alwaysApply)
│   ├── user_rules.mdc         # Пользовательские правила (alwaysApply)
│   ├── mcp-tools.mdc          # Справочник MCP-инструментов
│   ├── sdd-integrations.mdc  # ⭐ SDD-интеграции
│   ├── anti-patterns.mdc      # Антипаттерны
│   ├── form_module_rules.mdc  # Правила модулей форм
│   ├── forms_add.mdc          # Создание форм
│   ├── integrations_add.mdc   # Интеграции
│   ├── refactor_add.mdc       # Рефакторинг
│   └── getconfigfiles.mdc     # Выгрузка конфигурации
│
├── skills/           # Специализированные навыки
│   ├── 1c-metadata-manage/    # ⭐ Диспетчерский навык (17 доменов, 30+ PowerShell)
│   ├── img-grid-analysis/     # Анализ изображений
│   ├── mermaid-diagrams/      # Mermaid-диаграммы
│   └── powershell-windows/    # PowerShell на Windows
│
└── commands/         # Команды
    ├── deploy_and_test.md     # Развёртывание и тестирование
    └── getconfigfiles.md      # Выгрузка конфигурации
```

## SDD-интеграции

cursor_rules_1c поддерживает **несколько SDD-фреймворков**:

### Поддерживаемые фреймворки

| Фреймворк | Тип | Описание | Обнаружение |
|-----------|-----|----------|-------------|
| **cursor-memory-bank** | Файловый | Управление контекстом | Папка `memory-bank/` |
| **OpenSpec** | Файловый | Спецификации и предложения | Папка `openspec/specs/` |
| **spec-kit** | Файловый | Архитектурные ограничения | Файлы `spec.md`, `constitution.md` |
| **TaskMaster** | MCP-сервер | AI-управление задачами | MCP `user-task-master-ai` |

### Как работает

В `rules/sdd-integrations.mdc`:

1. Cursor проверяет наличие SDD-фреймворков в проекте
2. Если найден — активирует соответствующие правила
3. Агент может создавать/читать specs через единый интерфейс

### Для OpenSpec

Если в проекте есть `openspec/specs/`:
- Агенты используют OpenSpec workflow
- `/opsx:propose` работает через агент

## Агенты (11 шт)

| Агент | Назначение |
|-------|------------|
| `1c-developer` | Основной разработчик |
| `1c-architect` | Архитектор |
| `1c-analytic` | Бизнес-аналитик (PRD, ТЗ) |
| `1c-code-reviewer` | Ревью кода с confidence scoring |
| `1c-arch-reviewer` | Ревью архитектуры |
| `1c-error-fixer` | Исправление ошибок |
| `1c-refactoring` | Рефакторинг |
| `1c-performance-optimizer` | Оптимизация производительности |
| `1c-doc-writer` | Техническая документация |
| `1c-planner` | Планирование и декомпозиция |
| `1c-tester` | Разработка тестов |

## Субагент metadata-manager

**Главная фича** — изоляция сложных задач:

- Создание, редактирование, валидация объектов конфигурации
- Формы, СКД, MXL, роли, EPF/ERF, расширения
- Запускается в отдельном контекстном окне

**Когда использовать:**
- Сложные задачи → `/metadata-manager` (субагент)
- Простые запросы → агент напрямую

## MCP-инструменты

### Поиск и документация
- `docsearch` — поиск в документации платформы
- `codesearch` — поиск в коде
- `templatesearch` — семантический поиск шаблонов (2000+)
- `helpsearch` — объекты метаданных

### Код и ревью
- `syntaxcheck` — синтаксический контроль BSL
- `check_1c_code` — проверка кода
- `review_1c_code` — code review

### Метаданные
- `search_metadata` — поиск метаданных
- `business_search` — семантический поиск

### Память
- `remember` — сохранить заметку
- `recall` — поиск по заметкам

## Навык 1c-metadata-manage

**17 доменов** в одном диспетчерском навыке:

| Домен | Документ | Описание |
|-------|----------|----------|
| Метаданные | meta-manage.md | Справочники, документы, регистры |
| Формы | form-manage.md | Управляемые формы |
| СКД | skd-manage.md | Отчёты, наборы данных |
| Макеты | mxl-manage.md | Печатные формы |
| Роли | role-manage.md | Права доступа, RLS |
| EPF/ERF | epf-manage.md | Внешние обработки |
| БСП | bsp-manage.md | Регистрация в БСП |
| CF | cf-manage.md | Конфигурация |
| CFE | cfe-manage.md | Расширения |
| БД | db-manage.md | Реестр, создание, запуск |
| Подсистемы | subsystem-manage.md | Подсистемы |
| Интерфейс | interface-manage.md | Командный интерфейс |
| Макеты объектов | template-manage.md | Макеты объектов |
| Справка | help-manage.md | Help.xml |
| Паттерны БСП | ssl-patterns.md | БСП/SSL паттерны |
| Оптимизация | query-optimization.md | Запросы |
| Инструменты данных | data-tools.md | MCP для данных |

**30+ PowerShell-инструментов** в `tools/`

## Антипаттерны

В `anti-patterns.mdc`:

| Уровень | Примеры |
|---------|---------|
| Критические | Запросы в цикле, точечная нотация, подзапросы в SELECT |
| Высокие | Фильтр WHERE на вирт. таблицах, лишние серверные вызовы |
| Средние | Отсутствие кэширования, O(n²) алгоритмы |

## Установка

```bash
# Скопировать в проект
cd your-1c-project
git init  # если нет git
git clone https://github.com/comol/cursor_rules_1c .cursor

# Создать infobasesettings.md
echo "Путь к базе: C:\Users\...\InfoBase" > infobasesettings.md
echo "URL публикации: http://localhost/MyBase/ru/" >> infobasesettings.md

# Настроить MCP-серверы (vibecoding1c.ru)
```

## Для чего это нужно

1. **Структурированный подход** — агенты分工 специализированных задач
2. **SDD-интеграция** — можно использовать OpenSpec или spec-kit
3. **MCP-инструменты** — поиск по коду, документации, шаблонам
4. **17 доменов метаданных** — покрывает все аспекты 1С
5. **Антипаттерны** — избегание типичных ошибок

## Ссылки

- [GitHub: cursor_rules_1c](https://github.com/comol/cursor_rules_1c)
- [Telegram: comol_it_does_matter](https://t.me/comol_it_does_matter)
- [Telegram: yellow_ai_vibe](https://t.me/yellow_ai_vibe)
- [vibecoding1c.ru](https://vibecoding1c.ru/)
