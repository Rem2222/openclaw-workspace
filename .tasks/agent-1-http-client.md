# Агент 1: HTTP клиент для OpenViking

**Цель:** Создать работающий HTTP клиент на Node.js для взаимодействия с OpenViking.

## Подэтапы

### 1.1 Создать структуру файла
- [ ] Создать `skills/openviking-search/openviking-http.js`
- [ ] Добавить конфиг (HOST, PORT)
- [ ] Добавить HTTP helper

### 1.2 Реализовать `addResource()`
- [ ] Мultipart upload через `fetch` или `exec curl`
- [ ] Добавление ресурса через JSON API
- [ ] Возврат URI ресурса

### 1.3 Реализовать `search()`
- [ ] POST запрос к `/api/v1/search/search`
- [ ] Параметры: query, limit, score_threshold
- [ ] Парсинг ответа

### 1.4 Реализовать `formatResults()`
- [ ] Красивый вывод результатов
- [ ] Поддержка score, uri, snippet

### 1.5 CLI интерфейс
- [ ] Команда `add <file>`
- [ ] Команда `search <query>`
- [ ] Обработка ошибок

### 1.6 Тестирование
- [ ] `node openviking-http.js add MEMORY.md`
- [ ] `node openviking-http.js search "ollama"`
- [ ] Проверка вывода

## Файлы для работы
- Создать: `skills/openviking-search/openviking-http.js`
- Читать: `.tasks/openviking-integration.md` (этап 1)

## Критерий завершения
Обе команды работают из CLI:
```bash
$ node openviking-http.js add MEMORY.md
$ node openviking-http.js search "ollama"
```

## Отчёт о статусе
Записывать прогресс в `.tasks/agent-1-status.md` после каждого подэтапа:
```
Подэтап 1.1: ✅ Done
Подэтап 1.2: ⏳ In Progress (50%)
Подэтап 1.3: ⏸ Pending
```
