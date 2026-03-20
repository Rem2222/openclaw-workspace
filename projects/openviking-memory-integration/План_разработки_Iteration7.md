# План разработки Итерация 7 — Веб-интерфейс для OpenViking Memory

**Дата создания:** 2026-03-20  
**Автор:** Romul  
**Версия:** 1.0.0  
**Статус:** Готов к реализации  

---

## 📁 1. Структура проекта

### 1.1 Полный путь к проекту
```
/home/rem/.openclaw/workspace/projects/openviking-memory-integration/
```

### 1.2 Дерево файлов
```
openviking-memory-integration/
├── web-interface/
│   ├── main.py                    # Точка входа
│   ├── config.py                  # Конфигурация
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── app.py                 # FastAPI приложение
│   │   ├── routes.py              # API маршруты
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── openviking_service.py
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── request.py
│   │       └── response.py
│   ├── frontend/
│   │   ├── __init__.py
│   │   └── gradio_app.py          # Gradio UI
│   └── tests/
│       ├── __init__.py
│       └── test_api.py
├── requirements-web.txt
├── run_web.sh
├── SPEC_Iteration7.md
└── План_разработки_Iteration7.md
```

---

## 🔌 2. API Эндпоинты (FastAPI)

### 2.1 Базовый URL
```
http://localhost:7860/api
```

---

### 2.2 GET /api/health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-20T12:00:00Z",
  "openviking": "connected"
}
```

---

### 2.3 GET /api/search

**Query Parameters:**
| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| query | string | "" | Ключевые слова |
| date_from | string | null | Дата от (YYYY-MM-DD) |
| date_to | string | null | Дата до (YYYY-MM-DD) |
| category | string | null | Категория |
| pattern | string | null | Regex для имени |
| top_k | int | 10 | Лимит (1-100) |

**Request:**
```bash
GET http://localhost:7860/api/search?query=интеграция&date_from=2026-03-01&top_k=5
```

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

---

### 2.4 GET /api/resource/{uri}

**Path Parameters:**
- `uri` (string): URI ресурса

**Query Parameters:**
- `level` (string): "L0", "L1" или "L2" (default: "L0")

**Request:**
```bash
GET http://localhost:7860/api/resource/viking%3A%2F%2Fresources%2Fmemory.md?level=L1
```

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

---

### 2.5 GET /api/tree

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

### 2.6 POST /api/chat (будущее)

**Request:**
```json
{
  "question": "Что мы обсуждали про интеграцию?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Ответ...",
  "sources": [
    {"uri": "viking://...", "name": "memory.md", "relevance": 0.92}
  ]
}
```

---

## 🎨 3. Компоненты Gradio Интерфейса

### 3.1 Основная структура

```python
import gradio as gr

with gr.Blocks(title="OpenViking Memory", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 OpenViking Memory")
    
    with gr.Tabs():
        with gr.Tab("🔍 Search"):
            # Search components
            pass
        with gr.Tab("📁 Resources"):
            # Tree components
            pass
        with gr.Tab("💬 Chat"):
            # Chat components
            pass
```

---

### 3.2 Вкладка Search

```python
with gr.Tab("🔍 Search"):
    # Filters row
    with gr.Row():
        with gr.Column(scale=3):
            search_query = gr.Textbox(
                label="🔎 Запрос",
                placeholder="Введите ключевые слова..."
            )
        with gr.Column(scale=1):
            search_date_from = gr.DatePicker(label="📅 Дата от")
        with gr.Column(scale=1):
            search_date_to = gr.DatePicker(
                label="📅 Дата до", 
                value=date.today()
            )
    
    with gr.Row():
        search_category = gr.Dropdown(
            label="🏷️ Категория",
            choices=["Все", "integration", "development"],
            value="Все",
            allow_custom_value=True
        )
        search_pattern = gr.Textbox(
            label="🔤 Шаблон (regex)",
            placeholder="pattern.*"
        )
    
    search_button = gr.Button("🔍 Найти", variant="primary", size="lg")
    search_count = gr.Markdown("Результатов: 0")
    
    # Results table
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

---

### 3.3 Вкладка Resources

```python
with gr.Tab("📁 Resources"):
    tree_root_path = gr.Textbox(
        label="📂 Корневая папка",
        value="viking://resources/"
    )
    load_tree_button = gr.Button("🔄 Загрузить дерево")
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

---

### 3.4 Панель просмотра L0/L1/L2

```python
# Viewer panel (initially hidden)
with gr.Column(visible=False, id="viewer_panel"):
    gr.Markdown("## 📖 Просмотрщик ресурса")
    resource_metadata = gr.Markdown("Загрузка...")
    
    with gr.Tabs():
        with gr.Tab("📝 Abstract (L0)"):
            l0_content = gr.Textbox(lines=10, interactive=False, show_copy_button=True)
        with gr.Tab("📋 Overview (L1)"):
            l1_content = gr.Textbox(lines=25, interactive=False, show_copy_button=True)
        with gr.Tab("📄 Full (L2)"):
            l2_content = gr.Textbox(lines=40, interactive=False, show_copy_button=True)
    
    close_viewer_button = gr.Button("✖ Закрыть")
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

# Trigger on row selection
search_results.select(
    fn=lambda row: open_viewer(row[0]),
    inputs=[search_results],
    outputs=[resource_metadata, l0_content, l1_content, l2_content]
)
```

---

### 3.5 Вкладка Chat (будущее)

```python
with gr.Tab("💬 Chat"):
    chatbot_component = gr.Chatbot(
        label="OpenViking Assistant",
        height=400,
        avatar_images=(None, "🤖")
    )
    with gr.Row():
        chat_input = gr.Textbox(
            label="Вопрос",
            placeholder="Задайте вопрос...",
            lines=2
        )
        chat_send_button = gr.Button("➤ Отправить")
    chat_clear_button = gr.Button("🗑 Очистить")
```

---

## 📋 4. Последовательность задач

### Этап 1: Бэкенд (FastAPI) — 2 часа

| Задача | Время | Файл |
|--------|-------|------|
| Создать структуру проекта | 15 мин | CLI |
| Настроить config.py | 15 мин | `config.py` |
| Реализовать OpenVikingService | 20 мин | `backend/services/openviking_service.py` |
| Создать модели Request/Response | 15 мин | `backend/models/*.py` |
| Реализовать API маршруты | 30 мин | `backend/routes.py` |
| Создать FastAPI приложение | 15 мин | `backend/app.py` |
| Тестирование бэкенда | 30 мин | `tests/test_api.py` |

---

### Этап 2: Фронтенд (Gradio) — 2 часа

| Задача | Время | Файл |
|--------|-------|------|
| Базовый Gradio интерфейс | 15 мин | `frontend/gradio_app.py` |
| Вкладка Search с фильтрами | 45 мин | `frontend/gradio_app.py` |
| Вкладка Resources с деревом | 30 мин | `frontend/gradio_app.py` |
| Панель просмотра L0/L1/L2 | 30 мин | `frontend/gradio_app.py` |
| Вкладка Chat (заглушка) | 15 мин | `frontend/gradio_app.py` |
| Стилизация | 15 мин | `frontend/gradio_app.py` |

---

### Этап 3: Интеграция — 1 час

| Задача | Время |
|--------|-------|
| main.py — точка входа | 15 мин |
| requirements-web.txt | 10 мин |
| run_web.sh | 5 мин |
| Тестирование интеграции | 30 мин |

---

## 🧪 5. Тестовые сценарии

### Сценарий 1: Поиск информации

```python
# 1. Открыть http://localhost:7860
# 2. Перейти на вкладку "Search"
# 3. Ввести "интеграция" в поле "Запрос"
# 4. Установить "Дата от" = 2026-03-01
# 5. Нажать "Найти"
# 6. Проверить: появились результаты в таблице
# 7. Кликнуть на строку результата
# 8. Проверить: открылась панель просмотра с вкладками
```

**Ожидаемый результат:** Информация найдена за < 2 сек.

---

### Сценарий 2: Навигация по дереву

```python
# 1. Перейти на вкладку "Resources"
# 2. Нажать "Загрузить дерево"
# 3. Проверить: отобразилась структура JSON
# 4. Расширить ветку в JSON viewer
# 5. Проверить: видны файлы и папки
```

**Ожидаемый результат:** Дерево загружено за < 1 сек.

---

### Сценарий 3: Просмотр уровней

```python
# 1. Найти ресурс через поиск
# 2. Открыть ресурс
# 3. Переключиться на вкладку "Overview (L1)"
# 4. Проверить: контент загрузился без перезагрузки страницы
# 5. Переключиться на "Full (L2)"
# 6. Проверить: полный текст доступен
```

**Ожидаемый результат:** L0 < 500ms, L1 < 1s, L2 < 2s

---

## 🚀 6. Рекомендации по запуску

### 6.1 Установка зависимостей

**Файл:** `requirements-web.txt`

```txt
fastapi==0.104.1
uvicorn==0.24.0
gradio==3.50.2
httpx==0.25.2
pydantic==2.5.0
python-multipart==0.0.6
```

**Установка:**
```bash
pip install -r requirements-web.txt
```

---

### 6.2 Запуск через uvicorn

**Файл:** `run_web.sh`

```bash
#!/bin/bash

cd /home/rem/.openclaw/workspace/projects/openviking-memory-integration/web-interface

# Запуск бэкенда
uvicorn backend.app:app \
    --host 127.0.0.1 \
    --port 7860 \
    --reload \
    --log-level info
```

**Запуск:**
```bash
chmod +x run_web.sh
./run_web.sh
```

---

### 6.3 Запуск через Python

**Файл:** `main.py`

```python
import sys
import os

# Добавить путь к проекту
PROJECT_DIR = "/home/rem/.openclaw/workspace/projects/openviking-memory-integration/web-interface"
sys.path.insert(0, PROJECT_DIR)

from backend.app import app
from frontend.gradio_app import create_gradio_app

def main():
    """Запускает Gradio интерфейс."""
    demo = create_gradio_app()
    demo.launch(server_name="127.0.0.1", server_port=7860)

if __name__ == "__main__":
    main()
```

**Запуск:**
```bash
python main.py
```

---

### 6.4 Доступ к сервису

| Компонент | URL |
|-----------|-----|
| Gradio UI | http://localhost:7860 |
| FastAPI Docs | http://localhost:7860/docs |
| Health Check | http://localhost:7860/api/health |

---

## 📝 7. Ключевые файлы (шаблоны)

### `config.py`
```python
import os
import sys
from datetime import date

WORKSPACE_DIR = "/home/rem/.openclaw/workspace"
OPENVIKING_CLIENT_PATH = os.path.join(WORKSPACE_DIR, ".openclaw/skills/openviking-memory/lib")
sys.path.insert(0, OPENVIKING_CLIENT_PATH)

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 7860
OPENVIKING_WORKSPACE = os.path.expanduser("~/.openviking/workspace")
DEFAULT_TOP_K = 10
```

### `backend/app.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(title="OpenViking Memory API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

app.include_router(router)

@app.get("/")
async def root():
    return {"message": "OpenViking Memory API", "docs": "/docs"}
```

### `backend/routes.py` (сокращённо)
```python
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from .services.openviking_service import OpenVikingService
from .models.response import SearchResponse, ResourceResponse, TreeResponse, HealthResponse
from datetime import datetime

router = APIRouter(prefix="/api")
ov_service = OpenVikingService()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", timestamp=datetime.utcnow().isoformat() + "Z")

@router.get("/search", response_model=SearchResponse)
async def search(query: str = "", date_from: Optional[str] = None, top_k: int = 10):
    resources = await ov_service.search(query=query, date_from=date_from, top_k=top_k)
    return SearchResponse(success=True, total=len(resources), resources=[...])

@router.get("/resource/{uri:path}", response_model=ResourceResponse)
async def get_resource(uri: str, level: str = "L0"):
    resource = await ov_service.get_resource(uri, level)
    return ResourceResponse(success=True, uri=uri, content=resource["content"], ...)

@router.get("/tree", response_model=TreeResponse)
async def get_tree(path: str = "viking://resources/"):
    tree = await ov_service.get_tree(path)
    return TreeResponse(**tree)
```

---

## ⚠️ 8. Возможные проблемы и решения

| Проблема | Решение |
|----------|--------|
| OpenViking блокирует базу | Остановить VikingBot gateway перед запуском |
| ModuleNotFoundError | Проверить sys.path и добавить путь к openviking_client |
| CORS ошибки | Проверить middleware в backend/app.py |
| Медленный поиск | Добавить кэширование в OpenVikingService |

---

## 📊 9. Оценка времени

| Этап | Время |
|------|-------|
| Бэкенд (FastAPI) | 2 часа |
| Фронтенд (Gradio) | 2 часа |
| Интеграция | 1 час |
| Тестирование | 0.5 часа |
| **Итого** | **~5.5 часов** |

---

**Конец плана.**
