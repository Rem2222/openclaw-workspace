# Beads + Superpowers Integration Plan

## 1. Обзор интеграции

**Идея:** Заменить файлы `docs/plans/*.md` и `progress-{{run_id}}.txt` на Beads (Dolt-backed task tracker), сохранив структуру фаз и TDD-процесс Superpowers.

**Суть подхода:**
- Каждая задача из плана = Beads task (`bd create`)
- Детальное описание остаётся в markdown-файле (как сейчас), Beads хранит краткую сводку + ссылку на файл
- Subagent получает задачу через `bd ready` / `bd show` вместо чтения файла
- Прогресс отслеживается через `bd update --claim` / `bd close`

**Схема замены:**

| Старое | Новое |
|--------|-------|
| `docs/plans/YYYY-MM-DD-<feature>.md` | `bd create` + файл как external reference |
| `progress-{{run_id}}.txt` | Beads statuses |
| sessions_spawn с текстом из файла | sessions_spawn с `bd show <id>` + файл |

---

## 2. Изменения по фазам

### Фаза 1: Brainstorming — **БЕЗ ИЗМЕНЕНИЙ**
Дизайн-документ по-прежнему пишется в `docs/plans/YYYY-MM-DD-<topic>-design.md`. Beads не участвует.

### Фаза 2: Writing Plans — **ИЗМЕНЕНИЕ**

**Было:**
- Создаётся `docs/plans/YYYY-MM-DD-<feature>.md` с заголовком, архитектурой, списком задач
- Каждая задача — блок `### Task N` с файлами, шагами (test→fail→implement→pass→commit)

**Стало:**
1. Создаётся файл `docs/plans/YYYY-MM-DD-<feature>.md` (тот же формат)
2. Для **каждой задачи** из плана выполняется:
   ```
   bd create -p <priority> "<краткое описание>" -d "<ссылка на файл#task-N>"
   ```
3. Привязка зависимостей: `bd dep add <parent_id> <child_id>` для последовательных задач

**Компромисс:** Beads description слишком мал для детального описания задачи. Решение — в description кладём:
```
[TASK-N] <one-line summary>
File: docs/plans/YYYY-MM-DD-<feature>.md#task-N
```

### Фаза 3: Subagent-Driven Development — **ИЗМЕНЕНИЕ**

**Было:**
```
sessions_spawn implementer → task text из файла plan
sessions_spawn spec-reviewer → plan file path
sessions_spawn code-quality reviewer → git diff
```

**Стало:**
1. **Implementer subagent** получает задачу через Beads:
   ```
   # subagent выполняет внутри себя:
   bd ready                    # получить задачу с приоритетом
   bd update --claim <id>      # взять в работу (open → in_progress)
   bd show <id>                # получить details (краткое описание + ссылка на файл)
   # затем читает файл docs/plans/...#task-N для полного контекста
   ```

2. **Spec-reviewer subagent** — без изменений (использует `bd show <id>` + diff)

3. **Code-quality reviewer** — без изменений

4. После завершения задачи:
   ```
   bd close <id>               # in_progress → closed
   ```

**Передача контекста в subagent:** Subagent prompt меняется с "вот текст задачи" на "выполни `bd ready && bd show <id>` и работай". Внутри subagent умеет делать exec.

### Фаза 4: Debugging — **БЕЗ ИЗМЕНЕНИЙ**
Отдельный workflow, не связан с plan-файлами. При необходимости можно создать debug task в Beads.

### Фаза 5: Finishing Branch — **БЕЗ ИЗМЕНЕНИЙ**
Финальный ревью и merge остаются без изменений.

---

## 3. Команды Beads для каждого шага

### Фаза 2: Writing Plans

```bash
# Создать задачу (одна на каждый Task N из плана)
bd create -p 1 "feat/auth: implement JWT middleware for /api routes"
   -d "[TASK-1] JWT middleware | File: docs/plans/2026-04-01-auth-design.md#task-1"

bd create -p 2 "feat/auth: add login endpoint with bcrypt"
   -d "[TASK-2] Login endpoint | File: docs/plans/2026-04-01-auth-design.md#task-2"

# Привязать зависимости (если задачи зависят друг от друга)
bd dep add <task1_id> <task2_id>
```

### Фаза 3: Subagent-Driven Development

```bash
# Implementer: получить следующую задачу
bd ready                     # показывает доступные задачи, удобно для выбора
bd update --claim <id>       # open → in_progress

# Spec-reviewer: проверить что сделано
bd show <id>                 # посмотреть details задачи
git log --oneline            # для определения commit range

# Code-quality reviewer: посмотреть diff
git diff <sha1>..<sha2>      # стандартный git diff

# После завершения задачи
bd close <id>                # in_progress → closed

# Полезные команды для мониторинга
bd list                      # все задачи текущей ветки
bd show                      # текущая задача
```

### Статус-маппинг

| Superpowers | Beads | Команда |
|-------------|-------|---------|
| todo | open | `bd create` |
| in_progress | in_progress | `bd update --claim <id>` |
| done/verified | closed | `bd close <id>` |

---

## 4. Пример Workflow

```
Роман: "Давай добавим авторизацию в проект"

→ Фаза 1 (Brainstorming)
  Рисуем дизайн, согласуем с Романом
  → docs/plans/2026-04-01-auth-design.md

→ Фаза 2 (Writing Plans)
  Пишем план в docs/plans/2026-04-01-auth-implementation.md
  Задачи: TASK-1 (JWT middleware), TASK-2 (login endpoint), TASK-3 (logout)

  Для каждой задачи:
    $ bd create -p 1 "[TASK-1] JWT middleware | File: ...#task-1"
    $ bd create -p 2 "[TASK-2] Login endpoint | File: ...#task-2"
    $ bd create -p 3 "[TASK-3] Logout endpoint | File: ...#task-3"
    $ bd dep add <task1> <task2>    # task-2 depends on task-1
    $ bd dep add <task2> <task-3>   # task-3 depends on task-2

  $ bd list
  # ID        PRIORITY  STATUS  DESCRIPTION
  # abc123    1         open    [TASK-1] JWT middleware
  # def456    2         open    [TASK-2] Login endpoint
  # ghi789    3         open    [TASK-3] Logout endpoint

→ Фаза 3 (Subagent-Driven Development)

  --- Task 1 ---
  $ bd update --claim abc123     # взяли задачу 1
  Subagent-Implementer:
    $ bd show abc123
    → "[TASK-1] JWT middleware | File: docs/plans/...md#task-1"
    → Читает секцию #task-1 из файла (полный контекст)
    → TDD: пишет тест → fail → реализация → pass → commit
    → bd close abc123

  Subagent-Spec-Reviewer:
    $ bd show abc123
    → git diff base..HEAD
    → PASS/FAIL

  Subagent-Quality-Reviewer:
    → git diff base..HEAD
    → approve/issues

  --- Task 2 ---
  $ bd ready                      # следующая доступная задача
  $ bd update --claim def456
  ... (повторяется для каждой задачи)

→ Фаза 5 (Finishing)
  Все задачи закрыты → финальный ревью → merge опции
```

---

## 5. Что сохраняем из старого

| Что | Почему не меняется |
|-----|-------------------|
| Фаза 1 (Brainstorming) | Дизайн-мышление, согласование с Романом — это про людей, не про таски |
| Формат `docs/plans/*.md` | Детальные планы с шагами слишком объёмны для Beads description |
| TDD-процесс | Тесты первыми, минимальная реализация, YAGNI — core Superpowers |
| Spec-reviewer + Code-quality reviewer | Двухэтапный ревью критичен для качества |
| Фаза 4 (Debugging) | Систематический подход к debug — не зависит от task tracking |
| Фаза 5 (Finishing) | Ветвление и merge — не про таски |
| Сессии `sessions_spawn` | Subagent dispatch остаётся, меняется только source данных |
| Файл `SOUL.md`, `AGENTS.md`, `USER.md` | Персона и память — не относятся к task tracking |

---

## 6. Риски и ограничения

### Риск 1: Beads ещё не установлен
**Проблема:** Beads нет в системе (`npm list -g @beads/bd` — empty).
**Решение:** Установка через `npm install -g @beads/bd`. Требует Dolt (SQLite-подобная БД).
**Митигация:** Процесс внедрения начинается только после успешной установки и тестового прогона.

### Риск 2: Один description field
**Проблема:** Beads description ограничен; детальные шаги задачи туда не влезут.
**Решение:** Description = краткая сводка + ссылка на файл. Subagent читает файл по ссылке.
**Альтернатива:** Использовать `bd update <id> -d` для обновления description между фазами.

### Риск 3: Subagent имеет exec, но Beads должен быть доступен в PATH
**Проблема:** Subagent выполняет `bd ...` через exec. Beads должен быть в PATH.
**Решение:** Проверить что `bd` доступен через `which bd` или использовать полный путь `$(npm root -g)/@beads/bd/bin/bd`.

### Риск 4: Dolt-бэкенд — лишняя зависимость
**Проблема:** Beads использует Dolt (версионируемую SQL БД). Это дополнительный сервис.
**Решение:** Beads можно запускать в single-user mode без Dolt (SQLite fallback). Проверить в документации Beads.
**Митигация:** На старте проверить: `bd doctor` или `bd init`.

### Риск 5: Потеря информации при закрытии задачи
**Проблема:** `bd close` архивирует задачу. Может потеряться связь с commit SHAs.
**Решение:** Subagent report должен включать commit SHA перед `bd close`. Ревьюеры используют git log.

### Ограничение 1: Нет встроенного TDD
Beads — generic task tracker. TDD-процесс живёт в subagent prompts, не в Beads.

### Ограничение 2: Нет встроенного code review workflow
Beндь服务质量 reviewer dispatch — это Superpowers-логика, Beads только статусы меняет.

### Ограничение 3: Один subagent за раз
`bd update --claim` не блокирует задачу для других subagent в parallel. Если запустить два subagent на одну задачу — будет race condition. При текущем sequential подходе Superpowers это не проблема.

---

## 7. Чеклист внедрения

### Pre-flight (сделать до внедрения)
- [ ] Установить Beads: `npm install -g @beads/bd`
- [ ] Проверить `which bd` или путь к бинарю
- [ ] Проверить `bd doctor` или `bd init` — работает ли Dolt/SQLite backend
- [ ] Тестовый create/read/close cycle в тестовой директории
- [ ] Понять лимит size description: сколько символов влезает?

### Skill-изменения (фаза 1: Writing Plans)
- [ ] Обновить `references/writing-plans.md`: добавить `bd create` после создания файла плана
- [ ] Добавить в SKILL.md секцию "Using Beads instead of plan files" (опционально)

### Skill-изменения (фаза 2: Subagent Development)
- [ ] Обновить `references/subagent-development.md`: заменить "читать из файла" на "bd ready && bd show"
- [ ] Обновить prompt templates для implementer/spec-reviewer
- [ ] Добавить `bd update --claim` после получения задачи
- [ ] Добавить `bd close` после завершения

### Skill-изменения (фаза 3: Finishing)
- [ ] Проверить что финальный ревью не зависит от Beads
- [ ] Добавить `bd list` для демонстрации прогресса перед финишем

### Тестирование
- [ ] Пройти полный цикл на тестовой задаче: brainstorm → plan → 1 task → finish
- [ ] Проверить: subagent действительно получает задачу через Beads
- [ ] Проверить: `bd list` показывает корректные статусы
- [ ] Проверить: spec-reviewer работает с git diff + bd show

### Ретро и итерация
- [ ] Собрать фидбек: удобно ли видеть прогресс через `bd list`?
- [ ] Понять, нужен ли `progress-{{run_id}}.txt` как supplement или Beads достаточно
- [ ] Рассмотреть алиасы/скрипты для упрощения `bd` команд (например, `bd next` → ready + claim)

---

## Резюме

Beads заменяет **storage layer** Superpowers:
- `docs/plans/*.md` → остаются как source of truth для детальных планов, Beads ссылается на них
- `progress-{{run_id}}.txt` → заменяется на `bd list` / `bd show`
- Subagent получает задачу через `bd show <id>` + читает секцию из файла

**Core workflow (TDD, spec-review, quality-review, phases)** — без изменений.

Главный компромисс: детальное описание задачи остаётся в markdown, Beads хранит только "pointer" (ID, title, priority, file link). Это не недостаток — это правильное разделение concerns: task tracker управляет статусами, файлы хранят контент.
