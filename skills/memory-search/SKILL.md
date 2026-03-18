# SKILL: memory-search

Универсальный поиск по памяти OpenClaw с поддержкой различных движков.

## Описание

Скилл предоставляет единую точку входа для поиска по памяти с возможностью выбора движка:
- **file** — файловый поиск (FTS + векторный в OpenClaw)
- **openviking** — семантический поиск через OpenViking
- **hybrid** — комбинация обоих движков

## Когда использовать

- Когда нужно найти информацию в памяти OpenClaw
- Когда нужно использовать семантический поиск через OpenViking
- Когда нужно комбинировать результаты из разных источников

## Инструменты

### 1. `memory_search` — Универсальный поиск по памяти

Выполняет поиск по памяти с выбором движка.

```bash
# Файловый поиск (по умолчанию)
memory_search "как меня зовут"
memory_search "как меня зовут" --engine file

# Семантический поиск через OpenViking
memory_search "как меня зовут" --engine openviking

# Гибридный поиск
memory_search "как меня зовут" --engine hybrid
```

**Аргументы:**
- `query` — Запрос для поиска (обязательно)
- `--engine <engine>` — Движок поиска: `file`, `openviking`, `hybrid` (по умолчанию: `file`)
- `--max-results <n>` — Максимальное количество результатов (по умолчанию: 10)
- `--min-score <n>` — Минимальный score результата (по умолчанию: 0.3)

**Возвращает:** Список результатов поиска с URI/путь, score и кратким описанием

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY_SEARCH                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ROUTING LAYER                            │  │
│  │  --engine file    → OpenClaw Memory Search           │  │
│  │  --engine openviking → OpenViking Semantic Search    │  │
│  │  --engine hybrid  → Both + Merge                     │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│         ┌─────────────┴─────────────┐                      │
│         ▼                           ▼                      │
│  ┌──────────────┐           ┌──────────────┐              │
│  │  OpenClaw    │           │   OpenViking │              │
│  │  Memory      │           │   Semantic   │              │
│  │  Search      │           │   Search     │              │
│  │  (FTS/Vector)│           │   (ov_search)│              │
│  └──────┬───────┘           └──────┬───────┘              │
│         │                         │                       │
│         ▼                         ▼                       │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │  memory/         │     │  ~/.openviking/  │           │
│  │  *.md files      │     │  workspace/      │           │
│  │  SQLite FTS      │     │  viking/         │           │
│  │  LanceDB Vector  │     │  resources/      │           │
│  └──────────────────┘     └──────────────────┘           │
│                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Примеры использования

### Файловый поиск (OpenClaw)

```bash
# Быстрый поиск по памяти
memory_search "настройки базы" --max-results 5

# Поиск с минимальным score
memory_search "апдейт конфигурации" --min-score 0.5
```

### Семантический поиск (OpenViking)

```bash
# Поиск по смыслу через OpenViking
memory_search "как меня зовут" --engine openviking --max-results 3

# Поиск по темам
memory_search "программирование 1С" --engine openviking
```

### Гибридный поиск

```bash
# Комбинированный поиск из обоих источников
memory_search "настройки базы" --engine hybrid --max-results 10
```

## Формат результатов

### Файловый поиск (OpenClaw)

```json
[
  {
    "path": "memory/2026-03-17-1.md",
    "score": 0.85,
    "snippet": "...настройки базы данных..."
  }
]
```

### Семантический поиск (OpenViking)

```json
[
  {
    "uri": "viking://resources/memory-abc123",
    "score": 0.92,
    "abstract": "Личная информация о Романе..."
  }
]
```

### Гибридный поиск

```json
[
  {
    "source": "openviking",
    "uri": "viking://resources/memory-abc123",
    "score": 0.92,
    "abstract": "..."
  },
  {
    "source": "file",
    "path": "memory/2026-03-17-1.md",
    "score": 0.85,
    "snippet": "..."
  }
]
```

## Конфигурация

Опциональный файл: `~/.openclaw/config/memory-search.json`

```json
{
  "defaultEngine": "file",
  "maxResults": 10,
  "minScore": 0.3,
  "hybrid": {
    "weightOpenViking": 1.2,
    "weightFile": 1.0,
    "deduplicate": true
  }
}
```

## Зависимости

- OpenClaw с memory search (`openclaw memory search`)
- OpenViking скилл (`~/.openclaw/skills/openviking-memory/`)

## Ошибки и troubleshooting

### Ошибка: "OpenViking not available"

**Решение:** Проверить что OpenViking установлен:
```bash
source ~/.openviking/venv/bin/activate
python3 -c "import openviking"
```

### Ошибка: "No results found"

**Решение:** Попробовать другой движок или снизить min-score:
```bash
memory_search "запрос" --engine openviking --min-score 0.1
```

## Интеграция с существующими инструментами

Этот скилл расширяет возможности существующей команды `openclaw memory search`:

```bash
# Существующая команда (файловый поиск)
openclaw memory search "запрос"

# Новый инструмент с выбором движка
memory_search "запрос" --engine file        # То же самое
memory_search "запрос" --engine openviking  # Семантический поиск
memory_search "запрос" --engine hybrid      # Оба источника
```

## Автор

Создан: 2026-03-17  
Автор: Roman (Romul)  
Версия: 1.0.0
