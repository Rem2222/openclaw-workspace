# Отчёт архитектурного ревью — Iteration 7

**Проект:** OpenViking Web UI  
**Дата ревью:** 2026-03-20  
**Ревьюер:** Romul (architect-reviewer)  

---

## 📋 Резюме

| Параметр | Значение |
|----------|----------|
| **Вердикт** | ✅ **APPROVE** (с рекомендациями) |
| **Готовность к реализации** | Высокая |
| **Риски** | Низкие |
| **Рекомендуемые правки** | 2 минорные |

---

## 1. Согласованность SPEC, Плана и ТЗ

### 1.1 Ключевые параметры

| Параметр | SPEC | ТЗ | План | Статус |
|----------|------|-----|------|--------|
| Цель | Веб-интерфейс для OpenViking | Веб-интерфейс для OpenViking | Веб-интерфейс для OpenViking | ✅ |
| Технологии | FastAPI + Gradio 3 | FastAPI + Gradio 3.50+ | FastAPI + Gradio 3.50+ | ✅ |
| Порт | 7860 | 7860 | 7860 | ✅ |
| Доступ | Локальный, без auth | Локальный, без auth | 127.0.0.1:7860 | ✅ |
| MVP scope | FR-1, FR-2, FR-3 | FR-1, FR-2, FR-3 | FR-1, FR-2, FR-3 | ✅ |

### 1.2 Найденные расхождения

**⚠️ Минорное расхождение #1:** Параметр `top_k` в FR-1

- **SPEC:** Не упомянут как отдельный фильтр (только в сценарии)
- **ТЗ:** Добавлен как фильтр с дефолтом `10`
- **Рекомендация:** Добавить `top_k` в SPEC как фильтр поиска

---

## 2. Корректность архитектуры

### 2.1 Архитектурная схема

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER                                   │
│                 http://localhost:7860                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   GRADIO 3 UI                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Search Tab  │  │Resources Tab│  │  Chat Tab    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                            │
│                   Port: 7860                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Routes                                                 ││
│  │  - GET  /api/search                                     ││
│  │  - GET  /api/resource/{uri}                             ││
│  │  - GET  /api/tree                                       ││
│  │  - GET  /api/health                                     ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│             OPENVIKING CLIENT                                │
│  ~/.openclaw/skills/openviking-memory/lib/                  │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│             OPENVIKING STORAGE                               │
│            ~/.openviking/workspace/                         │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Оценка архитектуры

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Разделение слоёв | ✅ | Чёткое разделение UI/API/Service |
| Локальный доступ | ✅ | 127.0.0.1:7860 без auth |
| Технологии | ✅ | FastAPI + Gradio — адекватный выбор для MVP |
| Порт 7860 | ✅ | Стандартный порт Gradio |
| Кэширование | ⚠️ | Упомянуто, но не детализировано |

**⚠️ Рекомендация #1:** Детализировать механизм кэширования в `OpenVikingService` для достижения целевых показателей производительности.

---

## 3. Полнота API спецификации

### 3.1 Эндпоинты

| Эндпоинт | Метод | SPEC | ТЗ | План | Pydantic модели | Статус |
|----------|-------|------|-----|------|-----------------|--------|
| `/api/health` | GET | ❌ | ✅ | ✅ | ✅ | ✅ Добавлен |
| `/api/search` | GET | ✅ | ✅ | ✅ | ✅ | ✅ Полная |
| `/api/resource/{uri}` | GET | ✅ | ✅ | ✅ | ✅ | ✅ Полная |
| `/api/tree` | GET | ✅ | ✅ | ✅ | ✅ | ✅ Полная |
| `/api/chat` | POST | ✅ | ✅ | ✅ | ✅ | ✅ Будущее |

### 3.2 Pydantic модели

**Request модели:**
```python
class SearchRequest(BaseModel):
    query: str = ""
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    category: Optional[str] = None
    pattern: Optional[str] = None
    top_k: int = 10

class GetResourceRequest(BaseModel):
    uri: str
    level: str = "L0"  # L0, L1, L2
```

**Response модели:**
```python
class Resource(BaseModel):
    uri: str
    name: str
    date: str
    category: Optional[str]
    abstract: str
    score: float

class SearchResponse(BaseModel):
    success: bool
    total: int
    resources: List[Resource]

class ResourceResponse(BaseModel):
    success: bool
    uri: str
    name: str
    level: str
    content: str
    metadata: Dict

class TreeNode(BaseModel):
    name: str
    type: str  # "file" или "directory"
    path: str
    size: Optional[int]
    date: Optional[str]
    children: Optional[List[TreeNode]]

class TreeResponse(BaseModel):
    success: bool
    path: str
    children: List[TreeNode]

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    openviking: str
```

**Оценка:** ✅ **Полная** спецификация с корректными моделями

---

## 4. Adequateness UI компонентов

### 4.1 Компоненты Gradio

| Вкладка | Компоненты | Оценка |
|---------|------------|--------|
| **Search** | Textbox, DatePicker (x2), Dropdown, Button, Dataframe | ✅ Адекватно |
| **Resources** | Textbox, Button, JSON viewer | ⚠️ JSON неидеален для дерева |
| **Chat** | Chatbot, Textbox, Button | ✅ Для MVP |
| **Viewer** | Tabs (x3), Textbox (x3), Markdown | ✅ Адекватно |

**⚠️ Рекомендация #2:** Для дерева ресурсов JSON viewer — не оптимальное решение.

**Альтернативы:**
1. `gr.Tree` (если доступно в Gradio 3)
2. Кастомный HTML компонент с использованием `gr.HTML`
3. Использовать `gr.Dataset` с иерархическим отображением

**Пример улучшения:**
```python
# Вместо gr.JSON использовать кастомный компонент
def format_tree(node, level=0):
    indent = "  " * level
    icon = "📁" if node["type"] == "directory" else "📄"
    result = f"{indent}{icon} {node['name']}"
    if node.get("children"):
        for child in node["children"]:
            result += "\n" + format_tree(child, level + 1)
    return result

# В UI
tree_display = gr.Textbox(
    label="Дерево ресурсов",
    lines=30,
    interactive=False,
    show_copy_button=True
)
```

---

## 5. Риски и критерии приёмки

### 5.1 Риски

| Риск | Вероятность | Влияние | Митигация | Статус |
|------|-------------|---------|------------|--------|
| OpenViking блокирует базу | Средняя | Высокое | Остановить VikingBot | ✅ Описано |
| Gradio 3 устарел | Высокая | Низкое | Использовать Gradio 4 | ✅ Описано |
| Медленный поиск | Средняя | Высокое | Кэширование | ⚠️ Требует детализации |
| CORS ошибки | Средняя | Низкое | Middleware | ✅ Описано |
| ModuleNotFoundError | Низкая | Низкое | sys.path | ✅ Описано |

### 5.2 Критерии приёмки

| Критерий | SPEC | ТЗ | План | Статус |
|----------|------|-----|------|--------|
| FR-1: Поиск с фильтрами | ✅ | ✅ | ✅ | ✅ Полная |
| FR-2: Просмотр L0/L1/L2 | ✅ | ✅ | ✅ | ✅ Полная |
| FR-3: Дерево ресурсов | ✅ | ✅ | ✅ | ✅ Полная |
| L0 < 500ms | ✅ | ✅ | ✅ | ✅ Полная |
| L1 < 1s | ✅ | ✅ | ✅ | ✅ Полная |
| L2 < 2s | ✅ | ✅ | ✅ | ✅ Полная |
| Поиск < 2s | ✅ | ✅ | ✅ | ✅ Полная |
| Дерево < 1s | ✅ | ✅ | ✅ | ✅ Полная |

**Оценка:** ✅ **Полные** критерии приёмки

---

## 6. Соответствие требованиям пользователя

| Требование | Реализовано | Статус |
|------------|-------------|--------|
| Без auth | ✅ 127.0.0.1:7860 | ✅ |
| MVP подход | ✅ FR-1, FR-2, FR-3 | ✅ |
| FastAPI | ✅ 0.104+ | ✅ |
| Gradio | ✅ 3.50+ | ✅ |
| Локальный доступ | ✅ 127.0.0.1 | ✅ |

**Оценка:** ✅ **Полное соответствие**

---

## 📋 ИТОГОВЫЙ ВЕРДИКТ

### ✅ **APPROVE** (с рекомендациями)

**Проект готов к реализации.** Документация полна, архитектура корректна, API спецификация детализирована.

### Рекомендации для бэкенд-разработчика

1. **Кэширование:** Реализовать простой LRU кэш в `OpenVikingService`:
```python
from functools import lru_cache

class OpenVikingService:
    def __init__(self):
        self.client = OpenVikingClient()
        self._cache = {}
    
    async def get_resource(self, uri: str, level: str = "L0") -> ResourceContent:
        cache_key = f"{uri}:{level}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        content = await self.client.read(uri, level=level)
        self._cache[cache_key] = content
        return content
```

2. **Health check:** Убедиться, что `/api/health` возвращает статус подключения к OpenViking

3. **Error handling:** Добавить детальную обработку ошибок с логированием

### Рекомендации для фронтенд-разработчика

1. **Дерево ресурсов:** Рассмотреть альтернативу JSON viewer (см. раздел 4.1)

2. **Ленивая загрузка:** Реализовать lazy loading для вкладок L1/L2:
```python
# Загружать только L0 по умолчанию
async def open_viewer(uri):
    l0 = await load_resource(uri, "L0")
    return f"URI: `{uri}`", l0, "", ""  # L1/L2 загрузятся по запросу
```

3. **Индикатор загрузки:** Добавить `gr.Progress()` для визуализации загрузки

### Необходимые правки перед реализацией

1. **SPEC:** Добавить `top_k` как фильтр в FR-1 (1 строка)
2. **ТЗ:** Уточнить механизм кэширования в OpenVikingService (2-3 строки)

---

## 📊 Статус по компонентам

| Компонент | Статус | Готовность |
|-----------|--------|------------|
| SPEC | ✅ | 100% |
| ТЗ | ✅ | 100% |
| План | ✅ | 100% |
| Архитектура | ✅ | 100% |
| API спецификация | ✅ | 100% |
| UI компоненты | ⚠️ | 95% |

---

**Дата создания отчёта:** 2026-03-20  
**Версия:** 1.0.0  
**Статус:** Готово к реализации
