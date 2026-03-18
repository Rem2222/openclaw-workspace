# OpenViking — Техническая информация

## 📁 Структура файлов

### Основные файлы проекта
```
~/.openclaw/workspace/
├── ОВ/                          # Проектная папка
│   ├── PROJECT.md              # Обзор проекта
│   └── TECH.md                 # Этот файл
├── skills/
│   ├── openviking-search/
│   │   ├── openviking-http.js  # HTTP клиент
│   │   ├── openviking-search.js # Поиск
│   │   └── openviking-agent.js # Обёртка для agent
│   └── openviking-store/
│       └── openviking-store.js # Хранение
└── .claw/rules/
    └── openviking-semantic.rule.md # Правило (не используется)
```

---

## 🔧 Настройки

### OpenViking Server

**Порт:** `1933`  
**Оллama порт:** `11434`

**Конфигурация:** `~/.openviking/ov.conf`
```json
{
  "embedding": {
    "dense": {
      "api_base": "http://localhost:11434/v1",
      "api_key": "ollama",
      "provider": "openai",
      "dimension": 768,
      "model": "nomic-embed-text"
    }
  }
}
```

### Модели

| Тип | Модель | Димензии | Источник |
|-----|--------|----------|----------|
| Embedding | nomic-embed-text | 768 | ollama |
| Overview | qwen2.5:7b | - | ollama |

---

## 🛠 Команды

### Загрузка файла
```bash
cd ~/.openclaw/workspace
node skills/openviking-search/openviking-http.js add MEMORY.md
```

### Семантический поиск
```bash
node skills/openviking-search/openviking-http.js search "ollama настройка"
```

### Поиск через openviking-search.js
```bash
# Комбинированный поиск
node skills/openviking-search/openviking-search.js search "ollama"

# Только семантический
node skills/openviking-search/openviking-search.js search "ollama" --semantic

# Только текстовый
node skills/openviking-search/openviking-search.js search "ollama" --text
```

### Хранение с загрузкой в OpenViking
```bash
node skills/openviking-store/openviking-store.js daily "Заголовок" "Текст" --viking
```

### Agent режим
```bash
node skills/openviking-search/openviking-agent.js "ollama настройка"
```

---

## 📡 HTTP API Endpoints

### Загрузка файла
```bash
curl -X POST http://localhost:1933/api/v1/resources/temp_upload \
  -F "file=@MEMORY.md;type=text/markdown"
```

### Добавление ресурса
```bash
curl -X POST http://localhost:1933/api/v1/resources \
  -H "Content-Type: application/json" \
  -d '{"temp_path":"...","path":"viking://resources/MEMORY.md","wait":true}'
```

### Поиск
```bash
curl -X POST http://localhost:1933/api/v1/search/search \
  -H "Content-Type: application/json" \
  -d '{"query":"ollama настройка","limit":5}'
```

### Просмотр директории
```bash
curl "http://localhost:1933/api/v1/fs/ls?uri=viking://resources"
```

---

## 📊 Загруженные данные

### HIGH priority (60 файлов)
- MEMORY.md
- memory/*.md (59 файлов)

### MEDIUM priority (8 файлов)
- SOUL.md
- USER.md
- AGENTS.md
- IDENTITY.md
- TOOLS.md
- .learnings/LEARNINGS.md
- .learnings/ERRORS.md
- .learnings/FEATURE_REQUESTS.md

### LOW priority (15 файлов)
- skills/*/SKILL.md (15 файлов)

**Всего:** 83 файла

---

## 🔍 Resource URIs

### MEMORY.md
`resource://1773702475449`

### SOUL.md
`resource://1773702676143`

### USER.md
`resource://1773702680842`

### AGENTS.md
`resource://1773702684379`

### IDENTITY.md
`resource://1773702687635`

### TOOLS.md
`resource://1773702690902`

---

## 🐛 Известные проблемы

### 1. node-llama-cpp не установлен
memory_search не работает локально — требуется платный API или node-llama-cpp.

**Решение:** Использовать OpenViking для семантического поиска.

### 2. openviking-store.js требует --viking
Данные не добавляются в OpenViking автоматически.

**Решение:** Добавить флаг `--viking` или изменить код.

### 3. Нет авто-вызова при "вспомни"
Нужно вызывать openviking-agent.js вручную.

**Решение:** Настроить триггеры или использовать exec.

---

## 📚 Документация

- OpenViking: https://www.openviking.ai/docs
- OpenClaw: https://docs.openclaw.ai

---

*Этот файл обновляется по мере развития проекта.*
