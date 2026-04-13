# Linear Skill — Работа с Linear API

## Назначение

Этот скилл позволяет любому агенту работать с Linear (создавать проекты, задачи, обновления, прикреплять файлы).

## Конфигурация

**API endpoint:** `https://api.linear.app/graphql`

**Auth token:** `lin_api_64ssmuFiW5KjeTX8pmiG83nFiCma02PSa5R2oL1k`

**Team ID:** `43e2e0cc-5bbf-401b-8d72-a7f3b58ed9f5`

---

## Использование

### Пример: создать проект

```javascript
const linear = require('linear');
const result = await linear.projectCreate("Новый проект", "Описание");
```

### Пример: создать задачу

```javascript
const result = await linear.issueCreate({
  projectId: "project-id",
  title: "Название задачи",
  body: "Описание задачи",
  milestoneId: "milestone-id"  // опционально
});
```

---

## Функции

### Проекты

#### `projectList()`
Список всех проектов.

**Returns:** `{ projects: [{ id, name, description, state }] }`

#### `projectCreate(name, description?)`
Создать новый проект.

**Args:**
- `name` (string) — название проекта
- `description` (string, optional) — описание

**Returns:** `{ id, name, identifier }`

#### `projectGet(id)`
Получить информацию о проекте.

**Args:**
- `id` (string) — ID проекта

**Returns:** `{ id, name, description, milestones, issues }`

---

### Milestones (Этапы)

#### `milestoneCreate(projectId, name)`
Создать milestone (этап) в проекте.

**Args:**
- `projectId` (string) — ID проекта
- `name` (string) — название этапа

**Returns:** `{ id, name, projectId }`

#### `milestoneList(projectId)`
Список milestone в проекте.

**Args:**
- `projectId` (string) — ID проекта

**Returns:** `{ milestones: [{ id, name, status }] }`

---

### Project Updates (Обновления проекта)

#### `projectUpdateCreate(projectId, body, health)`
Создать Project Update — регулярный статус по проекту.

**Args:**
- `projectId` (string) — ID проекта
- `body` (string) — текст обновления
- `health` (string) — статус: `"onTrack"` | `"atRisk"` | `"offTrack"`

**Returns:** `{ id, url, health }`

**Пример body:**
```
## Этап 3: ТЗ ✓

### Что сделано:
- Написано ТЗ для этапа Backend
- Определены 5 задач

### Следующий этап:
- Ревью ТЗ

### Риски:
- Нет
```

---

### Issues (Задачи)

#### `issueCreate(options)`
Создать задачу.

**Args:**
- `projectId` (string) — ID проекта
- `title` (string) — название
- `body` (string, optional) — описание
- `milestoneId` (string, optional) — ID milestone
- `priority` (number, optional) — приоритет 0-4

**Returns:** `{ id, identifier, title, state }`

#### `issueUpdate(id, state)`
Обновить статус задачи.

**Args:**
- `id` (string) — ID задачи
- `state` (string) — новый статус:
  - `"Backlog"` — не начата
  - `"Todo"` — запланирована
  - `"In Progress"` — в работе
  - `"Done"` — выполнена
  - `"Canceled"` — отменена
  - `"Duplicate"` — дубликат

**Returns:** `{ success, issue }`

#### `issueGet(id)`
Получить задачу.

**Args:**
- `id` (string) — ID задачи

**Returns:** `{ id, title, body, state, assignee }`

#### `issueAddComment(id, body)`
Добавить комментарий к задаче.

**Args:**
- `id` (string) — ID задачи
- `body` (string) — текст комментария

**Returns:** `{ id, body, createdAt }`

---

### Attachments (Вложения/файлы)

#### `attachmentCreate(issueId, title, url, subtitle?)`
Прикрепить файл к задаче.

**Args:**
- `issueId` (string) — ID задачи
- `title` (string) — название файла (например "ТЗ.md")
- `url` (string) — URL файла (путь в workspace)
- `subtitle` (string, optional) — описание

**Returns:** `{ id, title, url }`

---

### Комментарии (проверка новых)

#### `checkRecentComments(minutes?)`
Проверить комменты за последние N минут. Используется для cron-задач.

**CLI:** `python3 linear_api.py check-comments [minutes]`

**Returns:** 
```json
{
  "comments": [
    {
      "id": "...",
      "body": "текст комментария",
      "createdAt": "2026-04-13T...",
      "issue": { "id": "...", "identifier": "REM-26", "title": "...", "url": "..." },
      "actor": { "name": "Роман", "email": "..." }
    }
  ],
  "checked_at": "2026-04-13T...",
  "since": "2026-04-13T..."
}
```

**Пример использования в cron:**
```bash
python3 linear_api.py check-comments 2
```

#### `checkCommentsForIssue(issueId, sinceMinutes?)`
Проверить комменты на конкретной задаче за последние N минут.

**CLI:** `python3 linear_api.py check-issue-comments <issue_id> [minutes]`

**Returns:** `{ issue: {identifier, title}, comments: [...] }`

---

## Workflow (рабочий процесс)

### Запуск нового проекта:

1. `projectCreate(name)` → получить `projectId`
2. `milestoneCreate(projectId, "Аналитика")`
3. `milestoneCreate(projectId, "Планирование")`
4. ... создать все этапы
5. `issueCreate(projectId, "Описание задачи", { milestoneId })`
6. `projectUpdateCreate(projectId, body, "onTrack")` — первый update

### После завершения этапа:

1. `projectUpdateCreate(projectId, body, health)` — новый update
2. `issueUpdate(id, "Done")` — закрыть задачу этапа
3. `attachmentCreate(id, "ТЗ.md", "/path/to/file")` — прикрепить результат

---

## Важные IDs

**Team:** `43e2e0cc-5bbf-401b-8d72-a7f3b58ed9f5` ("REMs team")

**Workflow states:**
- Backlog: `92a1d96d-2b34-448f-b52e-7f3a905d6390`
- Todo: `8c4211ec-5753-427a-8536-db31e30dca6a`
- In Progress: `TODO: find ID`
- Done: `23467882-e7ff-496e-99d4-928b8083d9d5`
- Canceled: `TODO: find ID`
- Duplicate: `TODO: find ID`

**Примечание:** Некоторые state IDs нужно получить через UI (Workflow settings) — API не всегда возвращает все states.

---

## Notes

- Все функции возвращают JSON
- При ошибках — текстовое описание
- Linear GraphQL API: https://api.linear.app/graphql
- Documentation: https://docs.linear.app/reference