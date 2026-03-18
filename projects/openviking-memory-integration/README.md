# Проект: OpenViking Memory Integration

## 📋 Вводная информация

### Цель
Использовать OpenViking как семантическую долгосрочную память для OpenClaw вместо простых текстовых файлов.

### Обнаруженное решение

**VikingBot** — готовое решение, OpenClaw-подобный бот, построенный на OpenViking:

```
VikingBot = OpenViking (память) + Nanobot (ядро) + Agent Tools (инструменты)
```

#### Ключевые возможности VikingBot:

| Функция | Описание |
|---------|----------|
| **Дуальная память** | Локальная (`~/.openviking/data/`) + серверный режим |
| **8 инструментов OpenViking** | `read`, `list`, `search`, `add_resource`, `grep`, `glob`, `user_memory_search`, `memory_commit` |
| **Трёхуровневый доступ** | L0 (abstract), L1 (overview), L2 (full content) |
| **Авто-сохранение** | Сессии автоматически сохраняются в OpenViking через hooks |
| **Готовые каналы** | Telegram, Discord, Slack, WhatsApp, Feishu, DingTalk, QQ, Email |

## 🏗️ Архитектура VikingBot

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIKINGBOT GATEWAY                         │
│                      Port: 18790                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Console Web UI (http://localhost:18791)                   ││
│  │  - Dashboard, Config, Sessions, Workspace                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Nanobot Core (Agent)                                      ││
│  │  - Model: configurable (OpenRouter, OpenAI, etc.)          ││
│  │  - Tools: 8 OpenViking tools + standard tools              ││
│  │  - Hooks: OpenVikingCompactHook (auto-save sessions)       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Channels: Console, Telegram, Discord, Slack, WhatsApp...       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
             ┌──────────────────────────────┐
             │     VIKINGCLIENT (Bridge)    │
             │  - AsyncHTTPClient wrapper   │
             │  - Session management        │
             │  - Multi-tenant support      │
             └──────────────┬───────────────┘
                            │
                            ▼
         ┌──────────────────────────────┐
         │      OPENVIKING STORAGE      │
         │   ~/.openviking/workspace/   │
         │   - viking/resources/        │
         │   - context.db (vector)      │
         └──────────────────────────────┘
```

## 🛠️ 8 Инструментов OpenViking в VikingBot

### 1. `openviking_read` — Чтение ресурсов

```python
await client.read_content(uri, level="abstract")  # L0
await client.read_content(uri, level="overview")  # L1  
await client.read_content(uri, level="read")      # L2
```

**Уровни чтения:**
- `abstract` — L0: ~100 токенов (краткое резюме)
- `overview` — L1: ~2000 токенов (обзор с навигацией)
- `read` — L2: полный контент

### 2. `openviking_list` — Список ресурсов

```python
await client.list_resources(path="viking://resources/", recursive=False)
```

### 3. `openviking_search` — Семантический поиск

```python
result = await client.search(query, target_uri="")
# Returns: {"memories": [...], "resources": [...], "skills": [...], "total": N}
```

### 4. `openviking_add_resource` — Добавление ресурсов

```python
result = await client.add_resource(path, description)
# path: URL или локальный путь
# Returns: {"root_uri": "viking://resources/xxx"}
```

### 5. `openviking_grep` — Поиск по регуляркам

```python
result = await client.grep(uri, pattern, case_insensitive=False)
# Returns: {"matches": [...], "count": N}
```

### 6. `openviking_glob` — Поиск по glob-паттернам

```python
result = await client.glob(pattern="**/*.md", uri="viking://resources/")
# Returns: {"matches": [...], "count": N}
```

### 7. `user_memory_search` — Поиск в памяти пользователя

```python
results = await client.search_user_memory(query, user_id)
# Searches in: viking://user/{user_id}/memories/
```

### 8. `openviking_memory_commit` — Сохранение сессии

```python
await client.commit(session_id, messages, user_id)
# messages: [{"role": "user|assistant", "content": "..."}]
```

## 📊 Архитектура данных OpenViking

### Структура URI

```
viking://resources/<resource_id>/          # Внешние ресурсы (файлы, URL)
viking://user/<user_id>/memories/          # Память пользователя
viking://agent/<agent_space>/memories/     # Память агента
viking://agent/<agent_space>/skills/       # Скиллы агента
viking://session/<session_id>/             # Сессии
```

### Уровни контента

| Уровень | Описание | Токенов | Файл | Использование |
|---------|----------|---------|------|---------------|
| **L0 (Abstract)** | Краткое резюме | ~100 | `.context/abstract.txt` | Быстрый поиск, preview |
| **L1 (Overview)** | Обзор с навигацией | ~2000 | `.context/overview.txt` | Контекст для ответов |
| **L2 (Full)** | Полный контент | variable | `<filename>.md` | Детальное чтение |

### Пример структуры ресурса

```
viking://resources/abc123/
├── resource.md              # L2: Полный контент
├── .context/
│   ├── abstract.txt        # L0: Краткое резюме
│   └── overview.txt        # L1: Обзор с навигацией
└── .embeddings/
    └── context.db          # Векторные эмбеддинги
```

## 🔌 VikingClient API

### Инициализация

```python
from vikingbot.openviking_mount.ov_server import VikingClient

# Создание клиента
client = await VikingClient.create(agent_id="default")

# Использование
result = await client.search("query")
result = await client.read_content(uri, level="abstract")
await client.commit(session_id, messages, user_id)

# Закрытие
await client.close()
```

### Ключевые методы

```python
class VikingClient:
    async def search(query, target_uri="") -> dict
    async def read_content(uri, level="abstract") -> str
    async def list_resources(path, recursive=False) -> list
    async def add_resource(path, description) -> dict
    async def grep(uri, pattern, case_insensitive=False) -> dict
    async def glob(pattern, uri=None) -> dict
    async def search_user_memory(query, user_id) -> list
    async def commit(session_id, messages, user_id) -> dict
    async def close()
```

## 🎯 Стратегия интеграции в OpenClaw

### Вариант A: Прямая интеграция OpenViking API

**Плюсы:**
- Минимальная зависимость от VikingBot
- Полный контроль над интеграцией
- Можно использовать только OpenViking как хранилище

**Минусы:**
- Нужно писать скилл с нуля
- Нет готовых каналов связи

**Реализация:**
```python
# ~/.openclaw/skills/openviking-memory/lib/openviking_client.py
import openviking as ov

class OpenVikingMemory:
    def __init__(self, workspace="~/.openviking/workspace"):
        self.client = ov.OpenViking(path=workspace)
        self.client.initialize()
    
    def store(self, text, metadata={}):
        # Добавить ресурс в OpenViking
        result = self.client.add_resource(path=f"md://{metadata.get('id')}", content=text)
        return result.get('root_uri')
    
    def search(self, query, top_k=5):
        # Семантический поиск
        results = self.client.find(query, limit=top_k)
        return results
    
    def get(self, uri, level="overview"):
        # Чтение по уровню
        if level == "abstract":
            return self.client.abstract(uri)
        elif level == "overview":
            return self.client.overview(uri)
        else:
            return self.client.read(uri)
```

### Вариант B: Использовать VikingBot как отдельную систему

**Плюсы:**
- Готовое решение "из коробки"
- Каналы связи (Telegram, Discord, etc.)
- Web UI для управления

**Минусы:**
- Запуск отдельного сервиса
- Синхронизация с OpenClaw

**Архитектура:**
```
OpenClaw Session ──┬──> Сохраняет контекст в OpenViking
                   │
                   └──> Читает из OpenViking через API
                          
VikingBot Gateway ──┬──> Авто-сохранение сессий
                   └──> Чат-бот с памятью
```

### Вариант C: Гибридный подход (рекомендуется)

**Использовать OpenViking напрямую в OpenClaw + VikingBot параллельно:**

1. **OpenClaw** — основной интерфейс, использует OpenViking через Python API
2. **VikingBot** — дополнительный чат-бот с готовыми каналами
3. **Общий workspace** — `~/.openviking/workspace`

## 📝 План реализации

### Шаг 1: Тестирование VikingBot (30 минут)

```bash
# Активировать окружение
source ~/.openviking/venv/bin/activate

# Установить VikingBot
pip install -U "openviking[bot]"

# Запустить gateway
vikingbot gateway

# Открыть Console: http://localhost:18791
# Настроить провайдеры (OpenRouter или Ollama)

# Тестировать чат
vikingbot chat -m "Привет, как дела?"
```

### Шаг 2: Создать скилл `openviking-memory` для OpenClaw (1 час)

```
~/.openclaw/skills/openviking-memory/
├── SKILL.md
├── lib/
│   └── openviking_client.py
└── scripts/
    ├── store-context.sh
    └── search-context.sh
```

### Шаг 3: Интегрировать с `memory_search` и `memory_get` (1 час)

- Добавить опцию `--engine openviking|file|hybrid`
- Сохранить обратную совместимость

### Шаг 4: Настроить авто-сохранение (30 минут)

- При каждом heartbeat: архивировать день
- При закрытии сессии: сохранять контекст

## ✅ Чеклист готовности

### Текущее состояние
- [x] OpenViking установлен (v0.2.6)
- [x] Конфигурация создана (`~/.openviking/ov.conf`)
- [x] Ollama работает с моделями
- [x] VikingBot документация изучена
- [x] VikingClient API понятен
- [x] VikingBot установлен
- [x] VikingBot gateway запущен
- [x] Конфигурация обновлена
- [x] OpenViking Python API протестирован

### Создан скилл `openviking-memory`
- [x] SKILL.md создан
- [x] lib/openviking_client.py создан
- [x] scripts/ov_store создан и работает
- [x] scripts/ov_list создан и работает
- [x] scripts/ov_read создан
- [x] scripts/ov_search создан
- [ ] scripts/ov_search протестирован (проблема с блокировкой)

### Для тестирования
- [ ] VikingBot gateway настроен
- [ ] Провайдеры настроены
- [ ] Авто-сохранение протестировано

### Для интеграции
- [ ] Скилл `openviking-memory` полностью работает
- [ ] `memory_search` интегрирован
- [ ] `memory_get` интегрирован
- [ ] Авто-сохранение настроено

## 🚨 Текущий статус: ПАУЗА

**Приостановлен:** 2026-03-17 13:50 MSK

**Причина:** Проблема с блокировкой векторной базы

```
IO error: lock /home/rem/.openviking/workspace/vectordb/context/store/LOCK
```

VikingBot gateway удерживает блокировку на базе данных, и скрипты не могут получить доступ к поиску.

**Варианты решения:**

1. **Остановить VikingBot gateway** — освободит блокировку
2. **Использовать VikingBot как шлюз** — отправлять запросы через API
3. **Использовать общий клиент (Singleton)** — сложная синхронизация

**Рекомендация:**
- Для тестирования: Остановить gateway
- Для продакшена: Использовать VikingBot как шлюз

## 📚 Ресурсы

- **GitHub OpenViking**: https://github.com/volcengine/OpenViking
- **Документация**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/docs/en/`
- **VikingBot README**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/bot/README.md`
- **OpenViking Tools**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/bot/vikingbot/agent/tools/ov_file.py`
- **OpenViking Hooks**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/bot/vikingbot/hooks/builtins/openviking_hooks.py`
- **VikingClient**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/bot/vikingbot/openviking_mount/ov_server.py`
- **Локальный репозиторий**: `/home/rem/.openclaw/workspace/Down/OpenViking-main`

## 🚀 Быстрый старт

```bash
# 1. Активировать окружение OpenViking
source ~/.openviking/venv/bin/activate

# 2. Установить VikingBot
pip install -U "openviking[bot]"

# 3. Запустить VikingBot gateway
vikingbot gateway

# 4. Открыть Console Web UI
# http://localhost:18791

# 5. Настроить провайдеры
# Через Console Web UI → Config
# Или редактировать ~/.openviking/ov.conf

# 6. Тестировать чат
vikingbot chat -m "Привет, как дела?"

# 7. Проверить авто-сохранение
vikingbot chat -m "Запомни что меня зовут Роман"
vikingbot chat -m "Как меня зовут?"
```

---

**Дата создания**: 2026-03-17  
**Последнее обновление**: 2026-03-17 13:50 MSK  
**Статус**: ⏸️ ПАУЗА — проблема с блокировкой векторной базы  
**Приоритет**: Высокий
