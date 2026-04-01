# План внедрения Beads в Superpowers

Дата: 2026-03-31
Статус: Draft

---

## Обзор

**Цель:** Интегрировать Beads (терминальный инструмент управления задачами) в workflow Superpowers для улучшения отслеживания задач и прогресса.

**Что такое Beads:** CLI-инструмент для управления задачами с командами:
- `bd create` — создание задач
- `bd ready` — получение готовых задач
- `bd update` — обновление статуса задач
- `bd dep add` — добавление зависимостей
- `bd compact` — компактирование истории

---

## Текущая Архитектура Superpowers

### Phase 1: Brainstorming
Исследование, вопросы, дизайн

### Phase 2: Writing Plans
Создание плана с задачами в формате:
```markdown
## Task 1: <title>
- Detail 1
- Detail 2

### Tests
- Test 1
- Test 2
```

### Phase 3: Subagent-Driven Development
- `sessions_spawn` implementer → выполнение задачи
- `sessions_spawn` spec-reviewer → проверка соответствия спецификации
- `sessions_spawn` code-quality reviewer → проверка качества

### Phase 4: Systematic Debugging
Отладка проблем

### Phase 5: Finishing a Branch
Финальная проверка, merge/PR

---

## Workflow Agents (feature-dev)

### Planner Agent
**Текущее:** Выводит `STORIES_JSON` с массивом user stories
```json
{
  "STORIES_JSON": [
    {
      "id": "US-001",
      "title": "...",
      "description": "...",
      "acceptanceCriteria": [...]
    }
  ]
}
```

### Developer Agent
**Текущее:** Выполняет одну story из `progress-{{run_id}}.txt`

### Verifier Agent
**Текущее:** Проверяет работу, выводит `STATUS: done` или `STATUS: retry`

---

## План Интеграции Beads

### Изменения для Planner Agent

**Файл:** `~/.openclaw/workspaces/workflows/feature-dev/agents/planner/AGENTS.md`

**Текущее поведение:**
- Создаёт массив user stories в `STORIES_JSON`

**Новое поведение:**
- Использует `bd create` для создания каждой задачи
- Возвращает `STORIES_JSON` как обычно (для обратной совместимости)

**Пример команды:**
```bash
bd create --title "US-001: Add database schema" --description "Create users table with id, email, created_at columns" --status todo
```

**Модификация AGENTS.md:**
```markdown
## Output Format

Your output MUST include these KEY: VALUE lines:

```
STATUS: done
REPO: /path/to/repo
BRANCH: feature-branch-name
STORIES_JSON: [...]
BEADS_CREATED: US-001, US-002, US-003
```

**After generating STORIES_JSON, also run:**
```bash
for each story:
  bd create --title "<story-id>: <title>" --description "<story-description>" --status todo
```

**BEADS_CREATED** lists all story IDs that were created in Beads.
```

---

### Изменения для Developer Agent

**Файл:** `~/.openclaw/workspaces/workflows/feature-dev/agents/developer/AGENTS.md`

**Текущее поведение:**
- Читает задачу из `progress-{{run_id}}.txt`

**Новое поведение:**
- Использует `bd ready` для получения следующей задачи
- Обновляет статус через `bd update`

**Пример команд:**
```bash
# Получить следующую задачу
bd ready --status todo --output json

# Обновить статус на в процессе
bd update <story-id> --status in-progress

# Закрыть задачу после завершения
bd update <story-id> --status done --notes "Implementation complete, tests pass"
```

**Модификация AGENTS.md:**
```markdown
### Each Session

1. **Get next story using Beads:**
   ```bash
   bd ready --status todo --output json | jq -r '.[0].id'
   ```
   This returns the next story ID to work on.

2. **Update story status to in-progress:**
   ```bash
   bd update <story-id> --status in-progress
   ```

3. Read `progress-{{run_id}}.txt` — especially the **Codebase Patterns** section
4. Check the branch, pull latest
5. Implement the story described in your task input
6. Run quality checks (`npm run build`, typecheck, etc.)
7. Commit: `feat: <story-id> - <story-title>`
8. **Update story status to done:**
   ```bash
   bd update <story-id> --status done --notes "Implementation complete"
   ```
9. Update `progress-{{run_id}}.txt` by rewriting the entire file
10. Update **Codebase Patterns** if you found reusable patterns
```

---

### Изменения для Verifier Agent

**Файл:** `~/.openclaw/workspaces/workflows/feature-dev/agents/verifier/AGENTS.md`

**Текущее поведение:**
- Проверяет работу, выводит `STATUS: done` или `STATUS: retry`

**Новое поведение:**
- После успешной проверки: `bd update <story-id> --status verified`
- При отклонении: `bd update <story-id> --status needs-work --notes "<issues>"`

**Модификация AGENTS.md:**
```markdown
## Output Format

If everything checks out:
```
STATUS: done
VERIFIED: What you confirmed (list each criterion checked)
```

Then run:
```bash
bd update <story-id> --status verified
```

If issues found:
```
STATUS: retry
ISSUES:
- Specific issue 1
- Specific issue 2
```

Then run:
```bash
bd update <story-id> --status needs-work --notes "<issues list>"
```
```

---

## Команды Beads для Superpowers

### Статусы задач (статус-машина)

```
todo → in-progress → done → verified → (merged)
              ↓
         needs-work → in-progress
```

### Примеры использования

**Создание задачи (Planner):**
```bash
bd create \
  --title "US-001: Add users table" \
  --description "Create users table with id, email, created_at columns" \
  --status todo \
  --labels backend,database
```

**Получение задачи (Developer):**
```bash
# Получить следующую задачу со статусом todo
bd ready --status todo --output json

# Получить все задачи в порядке приоритета
bd ready --status todo,in-progress --sort priority
```

**Обновление задачи (Developer/Verifier):**
```bash
# Developer начинает работу
bd update US-001 --status in-progress

# Developer завершает работу
bd update US-001 --status done --notes "Implementation complete, tests pass"

# Verifier подтверждает
bd update US-001 --status verified

# Verifier находит проблемы
bd update US-001 --status needs-work --notes "Tests fail: user validation missing"
```

**Добавление зависимостей:**
```bash
# US-002 зависит от US-001
bd dep add US-002 US-001
```

**Компактирование истории:**
```bash
bd compact --older-than 7d
```

---

## Модификации SKILL.md для Superpowers

**Файл:** `~/.openclaw/workspace/skills/superpowers/SKILL.md`

Добавить секцию после "Phase 2: Writing Plans":

```markdown
---

## Beads Integration (Optional)

When Beads is available, use it for task tracking:

### Commands Reference

| Команда | Описание |
|---------|----------|
| `bd create` | Создать задачу |
| `bd ready` | Получить готовую задачу |
| `bd update` | Обновить статус задачи |
| `bd dep add` | Добавить зависимость |
| `bd compact` | Компактировать историю |

### Статус-машина

```
todo → in-progress → done → verified
              ↓
         needs-work
```

### Пример использования в Superpowers

**Planner создаёт задачи:**
```bash
bd create --title "US-001: Add users table" --status todo
```

**Developer получает задачу:**
```bash
bd ready --status todo --output json
```

**Developer обновляет статус:**
```bash
bd update US-001 --status in-progress
bd update US-001 --status done
```

**Verifier подтверждает:**
```bash
bd update US-001 --status verified
```
```

---

## Пошаговый План Внедрения

### Шаг 1: Установка Beads

**Системная установка (один раз):**
```bash
# Вариант 1: Install script (рекомендуется)
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# Вариант 2: Через npm
npm install -g @beads/bd

# Вариант 3: Через Homebrew (macOS)
brew install beads

# Вариант 4: Через Go
# go install github.com/steveyegge/beads/cmd/bd@latest
```

**Инициализация в проекте:**
```bash
cd your-project
bd init
```

**Проверка установки:**
```bash
bd --version
which bd
```

### Шаг 2: Обновить Planner AGENTS.md
- Добавить секцию о создании задач через `bd create`
- Добавить `BEADS_CREATED` в вывод

### Шаг 3: Обновить Developer AGENTS.md
- Добавить `bd ready` для получения задач
- Добавить `bd update` для обновления статуса

### Шаг 4: Обновить Verifier AGENTS.md
- Добавить `bd update` для подтверждения/отклонения

### Шаг 5: Обновить Superpowers SKILL.md
- Добавить документацию о Beads
- Добавить примеры команд

### Шаг 6: Тестирование
- Запустить тестовый workflow
- Проверить создание задач
- Проверить обновление статусов

---

## Чеклист Внедрения

- [ ] Шаг 1: Установка Beads
- [ ] Шаг 2: Обновить Planner AGENTS.md
- [ ] Шаг 3: Обновить Developer AGENTS.md
- [ ] Шаг 4: Обновить Verifier AGENTS.md
- [ ] Шаг 5: Обновить Superpowers SKILL.md
- [ ] Шаг 6: Тестирование

---

## Риски и Ограничения

1. **Beads может не быть установлен** — нужно проверить доступность
2. **Обратная совместимость** — сохранить работу с `STORIES_JSON` и `progress.txt`
3. **Конкуренция задач** — несколько developer агентов могут получить одну задачу
4. **Откат при ошибках** — что делать с задачами в Beads при откате workflow?

---

## Следующие Шаги

1. Проверить доступность Beads (`which bd`)
2. Если доступно — применить модификации к AGENTS.md файлам
3. Если недоступно — найти альтернативный источник или подождать
4. Протестировать на тестовом workflow
5. Задокументировать изменения

---

## Примечания

- Beads интегрируется **опционально** — workflow должен работать без него
- `STORIES_JSON` сохраняется для обратной совместимости
- `progress.txt` остаётся основным источником состояния workflow
- Beads используется как **дополнительный** инструмент для трекинга

---

## 📝 Важное примечание о командах Beads

**Оригинальные команды Beads (из документации):**

```bash
# Создание задачи
bd create "Title" -p 0  # -p для priority (0=P0, 1=P1, ...)

# Получить готовые задачи
bd ready --json  # JSON формат

# Claim задачи
bd update <id> --claim  # атомарно устанавливает assignee + in_progress

# Закрыть задачу
bd close <id> "message"

# Зависимости
bd dep add <child> <parent>  # child блокируется parent

# Показать детали
bd show <id>

# Компактирование
bd prime
```

**Статусы Beads:**
- `open` — новая задача
- `in_progress` — в работе (после `--claim`)
- `closed` — закрыта

**Параметры задачи:**
- `-p <priority>` — приоритет (0=P0, 1=P1, 2=P2, ...)
- `-d <description>` — описание
- `-t <type>` — тип (task, bug, feature, ...)

**Примеры для Superpowers:**

```bash
# Planner создаёт задачи
bd create "US-001: Add users table" -p 1 -d "Create users table with id, email, created_at"

# Developer получает и claim задачу
bd ready --json | jq -r '.[0].id' | xargs -I {} bd update {} --claim

# Developer закрывает задачу
bd close bd-a1b2 "Implementation complete, tests pass"

# Verifier показывает детали
bd show bd-a1b2
```
