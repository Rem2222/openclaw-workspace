# ТЗ_Iteration7.md — Техническое задание на разработку веб-интерфейса для OpenViking Memory

**Версия:** 1.0.0  
**Дата создания:** 2026-03-20  
**Автор:** Romul  
**Статус:** Готово к реализации  

---

## 1. Введение

### 1.1 Описание системы

Веб-интерфейс для OpenViking Memory — это локальный веб-сервис, предоставляющий интуитивный графический интерфейс для исследования, поиска и чтения информации, сохранённой в семантической памяти OpenViking.

### 1.2 Предназначение документа

Данный документ является полным техническим заданием на разработку Итерации 7 проекта OpenViking Memory Integration.

### 1.3 Определения и аббревиатуры

| Термин | Описание |
|--------|----------|
| **OpenViking** | Система семантической памяти на базе LLM |
| **L0/L1/L2** | Уровни детализации контента (abstract/overview/full) |
| **URI** | Идентификатор ресурса в формате `viking://resources/...` |
| **MVP** | Минимально жизнеспособный продукт |

---

## 2. Цели проекта

### 2.1 Основная цель

Создать веб-интерфейс, позволяющий пользователю легко исследовать и читать информацию из OpenViking без знания низкоуровневого API.

### 2.2 Критерии успеха

| Критерий | Метрика | Как измерить |
|----------|---------|-------------|
| **Функциональность** | 100% требований реализовано | Чек-лист |
| **Простота** | Пользователь находит информацию без инструкций | Тестирование |
| **Скорость поиска** | < 2 сек | Замер времени |
| **Скорость чтения L0** | < 500 мс | Замер времени |
| **Скорость чтения L1** | < 1 сек | Замер времени |
| **Скорость чтения L2** | < 2 сек | Замер времени |

---

## 3. Область применения

### 3.1 В scope (MVP)

| ID | Название | Приоритет |
|----|----------|----------|
| **FR-1** | Поиск с фильтрами | High |
| **FR-2** | Просмотр L0/L1/L2 | High |
| **FR-3** | Дерево ресурсов | Medium |

### 3.2 Из scope

| ID | Название | Будущая итерация |
|----|----------|------------------|
| **FR-4** | Интерактивный режим | Итерация 8 |
| **FR-5** | Статистика | Итерация 8 |

---

## 4. Требования

### 4.1 Функциональные требования

#### FR-1: Поиск с фильтрами

**Описание:** Пользователь может искать информацию с фильтрами.

**Фильтры:**

| Фильтр | Тип | По умолчанию | Пример |
|--------|-----|--------------|--------|
| **Запрос** | Text | `""` | `"интеграция"` |
| **Дата от** | Date | `null` | `2026-03-01` |
| **Дата до** | Date | Сегодня | `2026-03-20` |
| **Категория** | Text | `"Все"` | `"integration"` |
| **Шаблон** | Regex | `null` | `"memory-.*"` |
| **Лимит** | Integer | `10` | `20` |

**Сценарий:**
```
1. Открывается http://localhost:7860
2. Вкладка "Search"
3. Ввод "интеграция"
4. Фильтр "Дата от" = 2026-03-01
5. Кнопка "Найти"
6. Список ресурсов с датами и описаниями
7. Клик на результат
8. Панель просмотра с вкладками L0/L1/L2
```

**Входные данные:**
```python
def perform_search(
    query: str = "",
    date_from: Optional[date] = None,
    date_to: Optional[date] = date.today(),
    category: str = "Все",
    pattern: Optional[str] = None,
    top_k: int = 10
) -> SearchResults
```

**Выходные данные:**
```python
class SearchResults:
    total: int
    resources: List[Resource]
    
class Resource:
    uri: str  # "viking://resources/memory-abc123.md"
    name: str
    date: str
    category: str
    abstract: str
    score: float  # 0.95
```

**Приоритет:** High

---

#### FR-2: Просмотр уровней L0/L1/L2 во вкладках

**Уровни детализации:**

| Уровень | Имя вкладки | Описание | Время загрузки | Файл |
|---------|-------------|----------|----------------|------|
| **L0** | `Abstract` | Краткое резюме | < 500 мс | `.context/abstract.txt` |
| **L1** | `Overview` | Обзор с навигацией | < 1 сек | `.context/overview.txt` |
| **L2** | `Full` | Полный контент | < 2 сек | `*.md` |

**Сценарий:**
```
1. Пользователь находит ресурс через поиск
2. Кликает на ресурс
3. Открывается панель просмотра
4. По умолчанию открыта вкладка "Abstract"
5. Переключение на "Overview" для деталей
6. Переключение на "Full" для полного текста
```

**Технические требования:**
- Ленивая загрузка L1/L2
- Кэширование в памяти сессии
- Индикатор загрузки
- Кнопка копирования

**Приоритет:** High

---

#### FR-3: Дерево ресурсов

**Описание:** Навигация по иерархии ресурсов.

**Функции:**
- Отображение папок и файлов
- Сворачивание/разворачивание веток
- Кликабельные файлы
- Иконки для папок и файлов
- Метаданные (размер, дата)

**Пример структуры:**
```
viking://resources/
-- memory-abc123/
    -- memory-abc123.md
    -- .context/
        -- abstract.txt
        -- overview.txt
```

**Входные данные:**
```python
def get_tree(path: str = "viking://resources/") -> TreeResponse
```

**Выходные данные:**
```python
class TreeResponse:
    path: str
    children: List[TreeNode]
    
class TreeNode:
    name: str
    type: str  # "file" или "directory"
    path: str
    size: Optional[int]
    date: Optional[str]
    children: Optional[List[TreeNode]]
```

**Ограничения:**
- Макс. глубина: 10 уровней
- Макс. узлов на уровень: 100
- Время загрузки: < 1 сек

**Приоритет:** Medium

---

### 4.2 Нефункциональные требования

#### NFR-1: Архитектура

Сервис должен быть отдельным от основного OpenClaw.

#### NFR-2: Стек технологий

| Компонент | Технология | Версия |
|-----------|------------|--------|
| **Backend** | FastAPI | 0.104+ |
| **Frontend** | Gradio | 3.50+ |
| **Runtime** | Python | 3.10+ |
| **Web Server** | Uvicorn | 0.24+ |

**requirements-web.txt:**
```
fastapi==0.104.1
uvicorn==0.24.0
gradio==3.50.2
httpx==0.25.2
pydantic==2.5.0
python-multipart==0.0.6
```

#### NFR-3: Безопасность

Только локальный доступ (`127.0.0.1:7860`), без аутентификации.

#### NFR-4: Производительность

| Операция | Время отклика |
|----------|---------------|
| **Поиск** | < 2 сек |
| **Чтение L0** | < 500 мс |
| **Чтение L1** | < 1 сек |
| **Чтение L2** | < 2 сек |
| **Загрузка дерева** | < 1 сек |

**Требования к ресурсам:**
- CPU: 1 ядро (мин), 2 ядра (рекомендовано)
- RAM: 512 МБ (мин), 1 ГБ (рекомендовано)
- Диск: 1 ГБ (мин), 5 ГБ (рекомендовано)

#### NFR-5: Интеграция

Использовать существующий Python-клиент:
```python
OPENVIKING_CLIENT_PATH = "/home/rem/.openclaw/workspace/.openclaw/skills/openviking-memory/lib"
```

---

## 5. Архитектура системы

### 5.1 Общая схема

```
+------------------------------------------------------------------+
|                        BROWSER                                    |
|                   http://localhost:7860                          |
+------------------------------------------------------------------+
                          |
                          v
+------------------------------------------------------------------+
|                      GRADIO 3 UI                                  |
|  +----------------+  +----------------+  +----------------+       |
|  |  Search Tab    |  |Resources Tab |  |  Chat Tab      |       |
|  +-------+--------+  +-------+--------+  +----------------+       |
|          |                    |                                     |
|  +-------v-------------------v---------------------------------+   |
|  |              Viewer Panel (L0/L1/L2)                        |   |
|  +-------------------------------------------------------------+   |
+------------------------------------------------------------------+
                          |
                          v
+------------------------------------------------------------------+
|                      FASTAPI BACKEND                              |
|  +-------------------------------------------------------------+ |
|  |  Routes: GET /api/search, /api/resource/{uri}, /api/tree    | |
|  +-------------------------------------------------------------+ |
|  |  Services: OpenVikingService                                | |
|  +-------------------------------------------------------------+ |
+------------------------------------------------------------------+
                          |
                          v
+------------------------------------------------------------------+
|                  OPENVIKING CLIENT                                |
+------------------------------------------------------------------+
                          |
                          v
+------------------------------------------------------------------+
|                  OPENVIKING STORAGE                               |
|                 ~/.openviking/workspace/                         |
+------------------------------------------------------------------+
```

### 5.2 Компоненты

#### 5.2.1 Gradio UI

```python
import gradio as gr

with gr.Blocks(title="OpenViking Memory", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# OpenViking Memory")
    
    with gr.Tabs():
        with gr.Tab("Search"):
            # Search components
            pass
        with gr.Tab("Resources"):
            # Tree components
            pass
        with gr.Tab("Chat"):
            # Chat placeholder
            pass
```

#### 5.2.2 FastAPI Backend

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="OpenViking Memory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routes import router
app.include_router(router)
```

#### 5.2.3 OpenVikingService

```python
class OpenVikingService:
    def __init__(self):
        self.client = OpenVikingClient()
        self._cache = {}
    
    async def search(self, query: str, **filters) -> List[Resource]:
        pass
    
    async def get_resource(self, uri: str, level: str = "L0") -> ResourceContent:
        cache_key = f"{uri}:{level}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        content = await self.client.read(uri, level=level)
        self._cache[cache_key] = content
        return content
    
    async def get_tree(self, path: str = "viking://resources/") -> TreeResponse:
        pass
```

---

## 6. API Спецификация

### 6.1 Базовая информация

| Параметр | Значение |
|----------|----------|
| **Base URL** | `http://localhost:7860/api` |
| **Content-Type** | `application/json` |
| **Authentication** | None |

### 6.2 GET /api/health

**Request:**
```bash
GET http://localhost:7860/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-20T12:00:00Z",
  "openviking": "connected"
}
```

### 6.3 GET /api/search

**Request:**
```bash
GET http://localhost:7860/api/search?query=интеграция&date_from=2026-03-01&top_k=5
```

**Query Parameters:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `query` | string | `""` | Ключевые слова |
| `date_from` | string | `null` | Дата от (YYYY-MM-DD) |
| `date_to` | string | `null` | Дата до |
| `category` | string | `null` | Категория |
| `pattern` | string | `null` | Regex |
| `top_k` | integer | `10` | Лимит (1-100) |

**Response:**
```json
{
  "success": true,
  "total": 5,
  "resources": [
    {
      "uri": "viking://resources/memory-abc123.md",
      "name": "memory-abc123.md",
      "date": "2026-03-15T10:30:00",
      "category": "integration",
      "abstract": "Обсуждение интеграции...",
      "score": 0.95
    }
  ]
}
```

### 6.4 GET /api/resource/{uri}

**Request:**
```bash
GET http://localhost:7860/api/resource/viking%3A%2F%2Fresources%2Fmemory.md?level=L1
```

**Parameters:**
- `uri` (path): URI ресурса
- `level` (query): "L0", "L1" или "L2" (default: "L0")

**Response:**
```json
{
  "success": true,
  "uri": "viking://resources/memory.md",
  "name": "memory.md",
  "level": "L1",
  "content": "# Заголовок\n\nКонтент...",
  "metadata": {
    "date": "2026-03-15T10:30:00",
    "category": "integration",
    "size": 2048
  }
}
```

### 6.5 GET /api/tree

**Request:**
```bash
GET http://localhost:7860/api/tree?path=viking%3A%2F%2Fresources%2F
```

**Query Parameters:**
- `path` (string): Путь к папке (default: "viking://resources/")

**Response:**
```json
{
  "success": true,
  "path": "viking://resources/",
  "children": [
    {
      "name": "memory-abc123",
      "type": "directory",
      "path": "viking://resources/memory-abc123/",
      "children": [...]
    },
    {
      "name": "memory-def456.md",
      "type": "file",
      "path": "viking://resources/memory-def456.md",
      "size": 1536,
      "date": "2026-03-14T14:20:00"
    }
  ]
}
```

---

## 7. Пользовательский интерфейс

### 7.1 Вкладка Search

```python
with gr.Tab("Search"):
    with gr.Row():
        with gr.Column(scale=3):
            search_query = gr.Textbox(
                label="Запрос",
                placeholder="Введите ключевые слова..."
            )
        with gr.Column(scale=1):
            search_date_from = gr.DatePicker(label="Дата от")
        with gr.Column(scale=1):
            search_date_to = gr.DatePicker(
                label="Дата до", 
                value=date.today()
            )
    
    with gr.Row():
        search_category = gr.Dropdown(
            label="Категория",
            choices=["Все", "integration", "development"],
            value="Все",
            allow_custom_value=True
        )
        search_pattern = gr.Textbox(
            label="Шаблон (regex)",
            placeholder="pattern.*"
        )
    
    search_button = gr.Button("Найти", variant="primary", size="lg")
    search_count = gr.Markdown("Результатов: 0")
    
    search_results = gr.Dataframe(
        headers=["URI", "Название", "Дата", "Категория", "Abstract"],
        datatype=["str", "str", "str", "str", "str"],
        wrap=True,
        row_count=10
    )
```

**Event Handler:**
```python
async def perform_search(query, date_from, date_to, category, pattern):
    import httpx
    params = {"query": query, "top_k": 20}
    if date_from: params["date_from"] = str(date_from)
    if date_to: params["date_to"] = str(date_to)
    if category and category != "Все": params["category"] = category
    if pattern: params["pattern"] = pattern
    
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:7860/api/search", params=params)
    
    data = resp.json()
    table = [[r["uri"], r["name"], r["date"], r.get("category", "-"), r["abstract"]]
             for r in data["resources"]]
    return f"**Результатов:** {data['total']}", table

search_button.click(
    fn=perform_search,
    inputs=[search_query, search_date_from, search_date_to, search_category, search_pattern],
    outputs=[search_count, search_results]
)
```

### 7.2 Вкладка Resources

```python
with gr.Tab("Resources"):
    tree_root_path = gr.Textbox(
        label="Корневая папка",
        value="viking://resources/"
    )
    load_tree_button = gr.Button("Загрузить дерево")
    tree_display = gr.JSON(label="Дерево ресурсов", value={})
```

**Event Handler:**
```python
async def load_tree(path):
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:7860/api/tree", params={"path": path})
    return resp.json()

load_tree_button.click(fn=load_tree, inputs=[tree_root_path], outputs=[tree_display])
```

### 7.3 Панель просмотра L0/L1/L2

```python
with gr.Column(visible=False, id="viewer_panel"):
    gr.Markdown("## Просмотрщик ресурса")
    resource_metadata = gr.Markdown("Загрузка...")
    
    with gr.Tabs():
        with gr.Tab("Abstract (L0)"):
            l0_content = gr.Textbox(lines=10, interactive=False, show_copy_button=True)
        with gr.Tab("Overview (L1)"):
            l1_content = gr.Textbox(lines=25, interactive=False, show_copy_button=True)
        with gr.Tab("Full (L2)"):
            l2_content = gr.Textbox(lines=40, interactive=False, show_copy_button=True)
    
    close_viewer_button = gr.Button("Закрыть")
```

**Event Handler:**
```python
async def load_resource(uri, level):
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:7860/api/resource/{uri}", params={"level": level})
    return resp.json()["content"]

async def open_viewer(uri):
    l0 = await load_resource(uri, "L0")
    l1 = await load_resource(uri, "L1")
    l2 = await load_resource(uri, "L2")
    return f"URI: `{uri}`", l0, l1, l2

search_results.select(
    fn=lambda row: open_viewer(row[0]),
    inputs=[search_results],
    outputs=[resource_metadata, l0_content, l1_content, l2_content]
)
```

---

## 8. Интеграция с OpenViking

### 8.1 Использование клиента

```python
import sys
import os

WORKSPACE_DIR = "/home/rem/.openclaw/workspace"
OPENVIKING_CLIENT_PATH = os.path.join(WORKSPACE_DIR, ".openclaw/skills/openviking-memory/lib")
sys.path.insert(0, OPENVIKING_CLIENT_PATH)

from openviking_client import OpenVikingClient

client = OpenVikingClient()

# Хранение
await client.store(content="Текст", metadata={"category": "integration"})

# Поиск
results = await client.search(query="интеграция", top_k=10)

# Чтение
content = await client.read(uri="viking://resources/memory.md", level="L0")
```

### 8.2 Обработка ошибок

```python
from openviking_client import OpenVikingError, ResourceNotFoundError

try:
    content = await client.read(uri=uri, level=level)
except ResourceNotFoundError as e:
    logger.error(f"Resource not found: {uri}")
    raise HTTPException(status_code=404, detail=str(e))
except OpenVikingError as e:
    logger.error(f"OpenViking error: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

**Типы ошибок:**

| Исключение | HTTP Status | Описание |
|------------|-------------|----------|
| `ResourceNotFoundError` | 404 | Ресурс не найден |
| `OpenVikingError` | 500 | Общая ошибка OpenViking |
| `ValueError` | 400 | Неверные параметры |

---

## 9. План разработки

### 9.1 Этап 1: Бэкенд (FastAPI) — 2 часа

| Задача | Время | Файл |
|--------|-------|------|
| Создать структуру проекта | 15 мин | CLI |
| Настроить config.py | 15 мин | `config.py` |
| Реализовать OpenVikingService | 20 мин | `backend/services/openviking_service.py` |
| Создать модели Request/Response | 15 мин | `backend/models/*.py` |
| Реализовать API маршруты | 30 мин | `backend/routes.py` |
| Создать FastAPI приложение | 15 мин | `backend/app.py` |
| Тестирование бэкенда | 30 мин | `tests/test_api.py` |

### 9.2 Этап 2: Фронтенд (Gradio) — 2 часа

| Задача | Время | Файл |
|--------|-------|------|
| Базовый Gradio интерфейс | 15 мин | `frontend/gradio_app.py` |
| Вкладка Search с фильтрами | 45 мин | `frontend/gradio_app.py` |
| Вкладка Resources с деревом | 30 мин | `frontend/gradio_app.py` |
| Панель просмотра L0/L1/L2 | 30 мин | `frontend/gradio_app.py` |
| Вкладка Chat (заглушка) | 15 мин | `frontend/gradio_app.py` |
| Стилизация | 15 мин | `frontend/gradio_app.py` |

### 9.3 Этап 3: Интеграция — 1 час

| Задача | Время |
|--------|-------|
| main.py — точка входа | 15 мин |
| requirements-web.txt | 10 мин |
| run_web.sh | 5 мин |
| Тестирование интеграции | 30 мин |

**Итого:** ~5.5 часов

---

## 10. Критерии приёмки

### 10.1 Функциональные критерии

- [ ] FR-1: Поиск с фильтрами работает
- [ ] FR-2: Просмотр L0/L1/L2 работает
- [ ] FR-3: Дерево ресурсов работает

### 10.2 Критерии производительности

- [ ] Поиск < 2 сек
- [ ] Чтение L0 < 500 мс
- [ ] Чтение L1 < 1 сек
- [ ] Чтение L2 < 2 сек

### 10.3 Тестовые сценарии

**Сценарий 1: Поиск информации**
```
1. Открыть http://localhost:7860
2. Перейти на вкладку "Search"
3. Ввести "интеграция" в поле "Запрос"
4. Установить "Дата от" = 2026-03-01
5. Нажать "Найти"
6. Проверить: появились результаты в таблице
7. Кликнуть на строку результата
8. Проверить: открылась панель просмотра с вкладками
```

**Ожидаемый результат:** Информация найдена за < 2 сек.

**Сценарий 2: Навигация по дереву**
```
1. Перейти на вкладку "Resources"
2. Нажать "Загрузить дерево"
3. Проверить: отобразилась структура JSON
```

**Ожидаемый результат:** Дерево загружено за < 1 сек.

**Сценарий 3: Просмотр уровней**
```
1. Найти ресурс через поиск
2. Открыть ресурс
3. Переключиться на вкладку "Overview (L1)"
4. Проверить: контент загрузился без перезагрузки страницы
```

**Ожидаемый результат:** L0 < 500ms, L1 < 1s, L2 < 2s

---

## 11. Риски и смягчение

| Риск | Вероятность | Влияние | Метод смягчения |
|------|-------------|---------|----------------|
| OpenViking блокирует базу | Средняя | Высокое | Остановить VikingBot gateway |
| Gradio 3 устарел | Высокая | Низкое | Использовать Gradio 4 |
| Медленный поиск | Средняя | Высокое | Добавить кэширование |
| CORS ошибки | Средняя | Низкое | Проверить middleware |
| ModuleNotFoundError | Низкая | Низкое | Проверить sys.path |

---

## 12. Структура проекта

```
/home/rem/.openclaw/workspace/projects/openviking-memory-integration/
-- web-interface/
    -- main.py
    -- config.py
    -- backend/
        -- __init__.py
        -- app.py
        -- routes.py
        -- services/
            -- __init__.py
            -- openviking_service.py
        -- models/
            -- __init__.py
            -- request.py
            -- response.py
    -- frontend/
        -- __init__.py
        -- gradio_app.py
    -- tests/
        -- __init__.py
        -- test_api.py
-- requirements-web.txt
-- run_web.sh
-- SPEC_Iteration7.md
-- План_разработки_Iteration7.md
-- ТЗ_Iteration7.md
```

---

## 13. Запуск

### 13.1 Установка зависимостей

```bash
pip install -r requirements-web.txt
```

### 13.2 Запуск через Python

```bash
cd /home/rem/.openclaw/workspace/projects/openviking-memory-integration/web-interface
python main.py
```

### 13.3 Запуск через uvicorn

```bash
chmod +x run_web.sh
./run_web.sh
```

### 13.4 Доступ

| Компонент | URL |
|-----------|-----|
| Gradio UI | http://localhost:7860 |
| FastAPI Docs | http://localhost:7860/docs |
| Health Check | http://localhost:7860/api/health |

---

**Конец технического задания.**
