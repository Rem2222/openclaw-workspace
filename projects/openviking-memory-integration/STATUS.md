# OpenViking Memory Integration — Статус проекта

**Дата обновления:** 2026-03-20 15:24 MSK
**Статус:** В активной разработке

---

## 📋 Резюме

Веб-интерфейс для OpenViking Memory на базе Gradio 6.0 для семантического поиска и просмотра ресурсов памяти.

---

## ✅ Готово (Completed)

### Backend (FastAPI)
- [x] API сервер на порту 8000
- [x] Эндпоинт `/search` — семантический поиск
- [x] Эндпоинт `/tree` — иерархия ресурсов с lazy loading
- [x] Эндпоинт `/resource/{uri}` — загрузка контента L0/L1/L2
- [x] Эндпоинт `/health` — health check

### Frontend (Gradio 6.0)
- [x] Вкладка "Поиск" — поисковая форма с фильтрами
- [x] Вкладка "Ресурсы" — дерево с lazy loading
- [x] Вкладка "Инфо" — информация о сервисе
- [x] Просмотрщик ресурсов с табами L0/L1/L2
- [x] Lazy loading для дерева и контента
- [x] Колонка "Уровень" (Scope) в таблице поиска
- [x] Форматирование Score (научная нотация)
- [x] Тёмная тема для дерева и таблицы
- [x] Отключение редактирования ячеек (`interactive=False`)
- [x] Async wrapper для `.then()` handler

---

## 🔄 В работе (In Progress)

### Клик по ноде дерева
**Проблема:** Клик по ноде дерева ничего не делает

**Текущее состояние:**
- JS функция `openResourceFromTree(uri)` создаёт CustomEvent
- Обработчик CustomEvent только пишет `console.log`
- Нет связи с Python `open_resource_viewer(uri)`

**План исправления:**
1. Создать скрытый `gr.Textbox(visible=False)` для хранения URI
2. JS `openResourceFromTree` меняет значение Textbox через Gradio JS API
3. `.change()` на Textbox вызывает `open_resource_viewer`

---

## 🐛 Диагностика (2026-03-20 19:20)

### Проблема: OpenAI API недоступен
**Симптом:** `RuntimeError: OpenAI API error: Connection error`

**Причина:** OpenViking использует OpenAI для эмбеддингов, но API недоступен.

**Влияние:**
- Семантический поиск не работает
- Генерация L0/L1 через OpenAI недоступна

**Возможные решения:**
1. Настроить `OPENAI_API_KEY` с работающим ключом
2. Использовать локальные эмбеддеры (SentenceTransformers)
3. Проверить подключение к интернету

---

### Проблема: Блокировка векторной БД (решено)
**Симптом:** `IO error: lock /home/rem/.openviking/workspace/vectordb/context/store/LOCK`

**Причина:** Frontend (запущен с 17:18) уже использует векторную базу. Попытка запустить бэкенд вызвала конфликт.

**Решение:** Архитектура не предусматривает отдельный бэкенд — frontend обращается к OpenViking напрямую. Бэкенд остановлен.

---

### Статус серверов (2026-03-20 19:22)
| Сервер | Статус |
|--------|--------|
| Ollama | 🔴 DOWN |
| Backend | 🟢 UP |
| Frontend | 🟢 UP |
| OpenMOSS | 🟢 UP |
| MissionControl | 🟢 UP |

**Строки кода:**
- Line 518: `openResourceFromTree` function
- Line 566: Обработчик CustomEvent

---

## ⏳ Осталось (Pending)

### Синхронизация дерева с таблицей
**Задача:** Клик по строке таблицы должен:
1. Открыть ресурс в viewer
2. Развернуть путь в дереве
3. Выделить ноду голубым цветом

**Текущее состояние:**
- Часть 1 работает (viewer открывается)
- Часть 2-3 не реализована

### UI/UX улучшения
- [ ] Highlight ноды дерева при клике на таблицу
- [ ] Expand путь в дереве при клике на таблицу
- [ ] Бreadcrumb навигация в дереве
- [ ] Поиск в дереве (filter nodes)
- [ ] Контекстное меню для нод

---

## 📊 Технические детали

### Архитектура
```
┌─────────────────────────────────────────────────────┐
│              Frontend (Gradio 6.0)                  │
│              Порт: 7860                             │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Поиск       │  │  Ресурсы     │  │  Инфо     │ │
│  │  (Tab 0)     │  │  (Tab 1)     │  │  (Tab 2)  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│         │                │                              │
│         └────────────────┼─────────────────────────────┘ │
│                          │                                 │
│                  ┌───────▼────────┐                       │
│                  │ Viewer (L0/1/2)│                       │
│                  └────────────────┘                       │
└──────────────────────────────────────────────────────────┘
                          │
                          │ HTTP
                          │
┌─────────────────────────▼────────────────────────────────┐
│                 Backend (FastAPI)                        │
│                 Порт: 8000                              │
│                                                         │
│  /search        — Семантический поиск                   │
│  /tree          — Дерево ресурсов                       │
│  /resource/{id} — Контент L0/L1/L2                     │
│  /health        — Health check                          │
└──────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼────────────────────────────────┐
│              OpenViking API                              │
└──────────────────────────────────────────────────────────┘
```

### Stack
- **Frontend:** Gradio 6.0, Pandas, HTML/CSS/JS
- **Backend:** FastAPI, httpx
- **API:** OpenViking Memory API

### Файлы проекта
```
projects/openviking-memory-integration/
├── web-interface/
│   ├── frontend/
│   │   └── main.py          # Gradio frontend
│   └── backend/
│       └── main.py          # FastAPI backend
├── docs/
│   └── API.md               # API документация
└── README.md
```

### Основные функции

#### Frontend (`main.py`)
- `perform_search()` — поиск ресурсов
- `load_tree()` — загрузка дерева
- `load_subtree()` — lazy loading папок
- `open_resource_viewer()` — открытие viewer
- `load_resource_content()` — загрузка контента
- `generate_tree_html()` — генерация HTML дерева

#### Backend
- `GET /search` — поиск по query
- `GET /tree` — иерархия ресурсов
- `GET /resource/{uri}` — контент ресурса
- `GET /health` — health check

---

## 🐛 Известные баги

### 1. Клик по ноде дерева не работает
**Симптом:** Клик по файлу в дереве ничего не делает
**Статус:** В процессе исправления
**Причина:** Нет связи между JS и Python обработчиками

### 2. Синхронизация дерева с таблицей
**Симптом:** Клик по строке таблицы не разворачивает путь в дереве
**Статус:** Планируется
**Причина:** Не реализовано

---

## 📝 Планы

### Ближайшие
- [ ] Исправить клик по ноде дерева
- [ ] Добавить синхронизацию дерева с таблицей
- [ ] Добавить highlight ноды при клике на таблицу

### Дальнейшие
- [ ] Бreadcrumb навигация
- [ ] Поиск в дереве
- [ ] Контекстное меню
- [ ] Экспорт ресурсов
- [ ] Сравнение ресурсов

---

## 🔧 Команды

### Запуск
```bash
# Backend
/home/rem/.openviking/venv/bin/python /home/rem/.openclaw/workspace/projects/openviking-memory-integration/web-interface/backend/main.py

# Frontend
/home/rem/.openviking/venv/bin/python /home/rem/.openclaw/workspace/projects/openviking-memory-integration/web-interface/frontend/main.py
```

### Проверка
```bash
# Health check
curl http://localhost:8000/api/health

# Поиск
curl "http://localhost:8000/api/search?query=test&limit=5"

# Дерево
curl "http://localhost:8000/api/tree?path=viking://resources/"
```

---

*Последнее обновление: 2026-03-20 15:24 MSK*
