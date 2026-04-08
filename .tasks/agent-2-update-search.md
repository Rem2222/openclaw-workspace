# Агент 2: Обновить openviking-search.js

**Цель:** Переписать скилл на HTTP API вместо Python client.

## Зависимости
⏳ **Ждёт завершения Агента 1** (HTTP клиент)

## Подэтапы

### 2.1 Прочитать текущий код
- [ ] Читать `skills/openviking-search/openviking-search.js`
- [ ] Понять структуру и логику

### 2.2 Интегрировать HTTP клиент
- [ ] Import `openviking-http.js`
- [ ] Заменить Python client вызовы

### 2.3 Добавить режим `semantic`
- [ ] Флаг `--semantic` для CLI
- [ ] Вызов HTTP search вместо text search

### 2.4 Поддержать оба режима
- [ ] `text` — текущий fuzzy поиск
- [ ] `semantic` — через OpenViking

### 2.5 Тестирование
- [ ] `node openviking-search.js search "ollama"`
- [ ] `node openviking-search.js search "ollama" --semantic`

## Критерий завершения
Оба режима работают.
