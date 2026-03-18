# SKILL: memory-get

Чтение контента из памяти OpenClaw с поддержкой файлов и OpenViking URI.

## Описание

Скилл предоставляет единую точку входа для чтения контента из разных источников памяти:
- **Файлы** — чтение markdown файлов из `memory/`
- **OpenViking URI** — чтение контента через семантическую память OpenViking

## Когда использовать

- Когда нужно прочитать конкретный файл из памяти
- Когда нужно прочитать контент по OpenViking URI
- Когда нужно получить контент на разных уровнях детализации (abstract, overview, read)

## Инструменты

### 1. `memory_get` — Чтение контента

Читает контент из файла или OpenViking URI.

```bash
# Чтение файла
memory_get "memory/2026-03-17.md"

# Чтение OpenViking URI
memory_get "viking://resources/memory-abc123" --level overview
memory_get "viking://resources/memory-abc123/memory-abc123.md" --level read
```

**Аргументы:**
- `path` — Путь к файлу или OpenViking URI (обязательно)
- `--level <level>` — Уровень чтения для OpenViking: `abstract`, `overview`, `read` (по умолчанию: `overview`)
- `--from <line>` — Начальная строка для чтения файла (по умолчанию: начало)
- `--limit <lines>` — Количество строк для чтения (по умолчанию: все)

**Возвращает:** Контент файла или OpenViking ресурса

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      MEMORY_GET                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ROUTING LAYER                            │  │
│  │  Если path начинается с "viking://" → OpenViking     │  │
│  │  Иначе → Файл                                        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│         ┌─────────────┴─────────────┐                      │
│         ▼                           ▼                      │
│  ┌──────────────┐           ┌──────────────┐              │
│  │  File Read   │           │  OpenViking  │              │
│  │  (read file) │           │  (ov_read)   │              │
│  └──────┬───────┘           └──────┬───────┘              │
│         │                         │                       │
│         ▼                         ▼                       │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │  memory/         │     │  ~/.openviking/  │           │
│  │  *.md files      │     │  workspace/      │           │
│  │  workspace/      │     │  viking/         │           │
│  └──────────────────┘     └──────────────────┘           │
│                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Уровни чтения OpenViking

| Уровень | Описание | Работает с |
|---------|----------|------------|
| `abstract` (L0) | Краткое резюме | Только папки |
| `overview` (L1) | Обзор содержимого | Только папки |
| `read` (L2) | Полный контент | Только файлы |

## Примеры использования

### Чтение файлов

```bash
# Читать файл полностью
memory_get "memory/2026-03-17.md"

# Читать с определённой строки
memory_get "memory/2026-03-17.md" --from 10

# Читать ограниченный диапазон
memory_get "memory/2026-03-17.md" --from 10 --limit 50
```

### Чтение OpenViking URI

```bash
# Читать обзор папки (L1)
memory_get "viking://resources/memory-abc123" --level overview

# Читать полный файл (L2)
memory_get "viking://resources/memory-abc123/memory-abc123.md" --level read

# Читать абстракт (L0)
memory_get "viking://resources/memory-abc123" --level abstract
```

## Формат URI

### Файловые пути

```bash
# Относительный путь
memory/2026-03-17.md

# Абсолютный путь
/home/rem/.openclaw/workspace/memory/2026-03-17.md

# Путь в workspace
workspace/memory/2026-03-17.md
```

### OpenViking URI

```bash
# Папка (для abstract/overview)
viking://resources/memory-abc123

# Файл (для read)
viking://resources/memory-abc123/memory-abc123.md
```

## Зависимости

- OpenClaw
- OpenViking скилл (`~/.openclaw/skills/openviking-memory/`)

## Ошибки и troubleshooting

### Ошибка: "File not found"

**Решение:** Проверить путь к файлу:
```bash
ls -la memory/2026-03-17.md
```

### Ошибка: "OpenViking not available"

**Решение:** Проверить что OpenViking установлен:
```bash
source ~/.openviking/venv/bin/activate
python3 -c "import openviking"
```

### Ошибка: "Invalid URI format"

**Решение:** Проверить формат URI:
- Для папок: `viking://resources/memory-xxx`
- Для файлов: `viking://resources/memory-xxx/memory-xxx.md`

## Интеграция с существующими инструментами

Этот скилл расширяет возможности чтения файлов:

```bash
# Существующий способ (только файлы)
cat memory/2026-03-17.md

# Новый инструмент (файлы + OpenViking)
memory_get "memory/2026-03-17.md"              # Файл
memory_get "viking://resources/abc123" --level overview  # OpenViking
```

## Автор

Создан: 2026-03-17  
Автор: Roman (Romul)  
Версия: 1.0.0
