# OpenViking Integration Task

**Created:** 2026-03-17  
**Status:** In Progress  
**Current Stage:** 0

---

## Обзор

Цель: Интегрировать семантический поиск через OpenViking + Ollama в OpenClaw.

---

## Этапы

### Этап 0: Исследование и тестирование (CURRENT)

**Цель:** Подтвердить работоспособность OpenViking через HTTP API.

**Сделано:**
- [x] Проверил OpenViking configuration (`ov.conf`)
- [x] Убедился что ollama запущен на `:11434`
- [x] Убедился что embedding работает (`nomic-embed-text`, 768 dims)
- [x] Запустил OpenViking server на `:1933`
- [x] Исследовал HTTP API через `openapi.json`
- [x] Нашёл endpoints:
  - `POST /api/v1/resources/temp_upload` — временная загрузка файла
  - `POST /api/v1/resources` — добавление ресурса
  - `POST /api/v1/search/search` — семантический поиск
- [x] Тест загрузки через curl multipart:
  ```bash
  curl -X POST http://localhost:1933/api/v1/resources/temp_upload \
    -F "file=@MEMORY.md;type=text/markdown"
  ```
- [x] Тест добавления ресурса:
  ```bash
  curl -X POST http://localhost:1933/api/v1/resources \
    -H "Content-Type: application/json" \
    -d '{"temp_path":"...","path":"viking://resources/MEMORY.md","wait":true}'
  ```
- [x] Тест поиска:
  ```bash
  curl -X POST http://localhost:1933/api/v1/search/search \
    -H "Content-Type: application/json" \
    -d '{"query":"ollama настройка","limit":5}'
  ```
- [x] Получил 7 результатов — **РАБОТАЕТ!**

**Осталось:**
- [ ] Создать чистый HTTP клиент на Node.js

**Критерий завершения:** Подтверждено что HTTP API работает, есть пример успешного поиска.

---

### Этап 1: Создать HTTP клиент на Node.js

**Цель:** Создать `openviking-http.js` — чистый HTTP клиент для работы с OpenViking.

**Сделать:**
- [ ] Создать файл `skills/openviking-search/openviking-http.js`
- [ ] Реализовать функции:
  - `addResource(filePath)` — загрузить файл через multipart
  - `search(query, limit=10)` — семантический поиск
  - `formatResults(results)` — форматирование вывода
- [ ] CLI интерфейс:
  - `node openviking-http.js add <file>`
  - `node openviking-http.js search <query>`
- [ ] Тест:
  - Загрузить MEMORY.md
  - Найти "ollama настройка"
  - Убедиться что работает

**Ожидаемый результат:**
```bash
$ node openviking-http.js add /path/MEMORY.md
Resource added: viking://resources/MEMORY.md

$ node openviking-http.js search "ollama настройка"
🔍 Найдено: 10 результатов
  [1] viking://resources/MEMORY.md (score: 0.85)
      ...ollama...nomic-embed-text...
```

**Критерий завершения:** Команды `add` и `search` работают из CLI.

---

### Этап 2: Обновить `openviking-search.js`

**Цель:** Переписать скилл на HTTP API вместо Python client.

**Сделать:**
- [ ] Прочитать текущий `openviking-search.js`
- [ ] Заменить Python client на HTTP client (`openviking-http.js`)
- [ ] Обновить функцию `search()` для использования HTTP API
- [ ] Поддержать режимы:
  - `semantic` — семантический поиск через OpenViking
  - `text` — текстовый fuzzy поиск (текущий)
- [ ] CLI интерфейс:
  - `node openviking-search.js search "query"` — текстовый
  - `node openviking-search.js search "query" --semantic` — семантический
- [ ] Тест обоих режимов

**Ожидаемый результат:**
```bash
# Текстовый поиск (fuzzy)
$ node openviking-search.js search "ollama"
🔍 Найдено: 10 совпадений

# Семантический поиск
$ node openviking-search.js search "ollama" --semantic
🔍 Найдено: 15 совпадений (semantic)
```

**Критерий завершения:** Оба режима поиска работают.

---

### Этап 3: Обновить `openviking-store.js`

**Цель:** Добавить загрузку в OpenViking при сохранении.

**Сделать:**
- [ ] Прочитать текущий `openviking-store.js`
- [ ] Добавить опцию `--viking` для загрузки в OpenViking
- [ ] После сохранения в файл — автоматически загрузить через HTTP API
- [ ] CLI интерфейс:
  - `node openviking-store.js daily "title" "content" --viking`
- [ ] Тест:
  - Создать тестовую запись с `--viking`
  - Проверить что она загружена в OpenViking
  - Найти через поиск

**Ожидаемый результат:**
```bash
$ node openviking-store.js daily "Тест" "Текст" --viking
Сохранено в дневник
Загружено в OpenViking: viking://resources/2026-03-17/test.md
```

**Критерий завершения:** Записи с `--viking` доступны через поиск.

---

### Этап 4: Интеграция в OpenClaw

**Цель:** Автоматический вызов семантического поиска при вопросах о памяти.

**Подход:** Гибридный (Вариант А)
- `memory_search` остаётся как есть (для текста)
- `openviking-agent.js` вызывается через `exec` при паттернах "вспомни"

**Сделать:**
- [x] Создать правило в `.claw/rules/openviking-semantic.rule.md`
- [x] Создать `openviking-agent.js` — обёртка для agentSearch
- [x] Обновить `openviking-search.js` для поддержки режима "agent"
- [ ] Тест через OpenClaw:
  - Спросить "вспомни что я говорил про ollama"
  - Проверить что используется семантический поиск

**Ожидаемый результат:**
```
User: вспомни что я говорил про ollama

Agent: (автоматически использует семантический поиск)
Из памяти:
- 2026-02-23: Настройка ollama с nomic-embed-text...
- 2026-03-14: Проверка embedding модели...
```

**Критерий завершения:** OpenClaw автоматически использует семантический поиск при вопросах о памяти.

---

## Глобальная проверка

**Сделать после всех этапов:**
- [ ] Загрузить все файлы из `memory/` в OpenViking
- [ ] Протестировать поиск по разным темам:
  - "ollama настройка"
  - "git бэкап"
  - "Telegram бот"
  - "1С разработка"
- [ ] Сравнить результаты текстового и семантического поиска
- [ ] Записать результаты в `.learnings/openviking-integration.md`

---

## Статус

| Этап | Статус | Дата | Примечание |
|------|--------|------|------------|
| 0 | ✅ Done | 2026-03-17 | HTTP API подтверждён |
| 1 | ✅ Done | 2026-03-17 | HTTP клиент создан |
| 2 | ✅ Done | 2026-03-17 | openviking-search.js обновлён |
| 3 | ✅ Done | 2026-03-17 | openviking-store.js готов |
| 4 | ⏳ Current | 2026-03-17 | openviking-agent.js создан |

---

## Notes

### Технические детали

**OpenViking config:**
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

**HTTP Endpoints:**
- `POST /api/v1/resources/temp_upload` — multipart/form-data, field: `file`
- `POST /api/v1/resources` — JSON: `{temp_path, path, mime_type, wait}`
- `POST /api/v1/search/search` — JSON: `{query, limit, score_threshold}`

**Проблемы:**
- Python client конфликтует с server за доступ к векторной базе
- Решение: использовать только HTTP API

---

*Этот файл обновляется после каждого этапа.*
