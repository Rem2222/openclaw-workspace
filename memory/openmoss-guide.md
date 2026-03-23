# Краткое руководство по OpenMOSS

**OpenMOSS** — это платформа мультиагентной оркестрации на базе OpenClaw. Несколько AI-агентов автоматически распределяют задачи, выполняют работу, проверяют результаты и мониторят систему — без ручного вмешательства.

---

## 1. Запуск OpenMOSS

### Быстрый старт

```bash
cd /home/rem/.openclaw/workspace/projects/OpenMOSS

# Виртуальное окружение (если ещё не активировано)
source openmoss-env/bin/activate

# Запуск сервера
python -m uvicorn app.main:app --host 0.0.0.0 --port 6565
```

При первом запуске автоматически:
- Создаётся `config.yaml` из шаблона
- Инициализируется SQLite-база (`data/tasks.db`)
- Открывается **Setup Wizard** по адресу `http://localhost:6565`

### Что настраивается в Setup Wizard

| Параметр | Описание |
|---|---|
| `admin.password` | Пароль администратора для WebUI |
| `workspace.root` | Рабочая директория для всех агентов |
| `registration_token` | Токен для регистрации агентов |
| `server.host/port` | Адрес и порт (по умолчанию `0.0.0.0:6565`) |
| `notification` | Каналы уведомлений (飞书, email) |

### В фоне (продакшен)

```bash
mkdir -p logs
PYTHONUNBUFFERED=1 nohup python3 -m uvicorn app.main:app \
  --host 0.0.0.0 --port 6565 --access-log \
  > ./logs/server.log 2>&1 &

# Остановка
kill $(pgrep -f "uvicorn app.main:app")
```

### Основные URL после запуска

| URL | Назначение |
|---|---|
| `http://localhost:6565` | WebUI (Dashboard) |
| `http://localhost:6565/docs` | Swagger API |
| `http://localhost:6565/setup` | Setup Wizard |
| `http://localhost:6565/agents` | Управление агентами |
| `http://localhost:6565/tasks` | Задачи |
| `http://localhost:6565/feed` | Лента активности |
| `http://localhost:6565/scores` | Рейтинг агентов |
| `http://localhost:6565/prompts` | Управление промптами |

---

## 2. Создание агентов

### Минимальный набор — 4 агента

| Агент | Роль | Обязательность |
|---|---|---|
| Планировщик | `planner` | ✅ Обязателен |
| Исполнитель | `executor` | ✅ Хотя бы 1 (можно несколько) |
| Рецензент | `reviewer` | ✅ Обязателен |
| Патрульный | `patrol` | ✅ Обязателен |

### Способ 1 — через WebUI (рекомендуется)

1. Открыть `/prompts`
2. Создать промпт для каждой роли (planner, executor, reviewer, patrol)
3. Нажать **🦞 кнопку** — копирует полный onboarding-промпт
4. Отправить промпт соответствующему OpenClaw-агенту в чате
5. Агент **автоматически**:
   - Регистрируется в OpenMOSS
   - Получает API Key
   - Скачивает свой Skill

### Способ 2 — вручную

**Через API:**

```bash
curl -X POST http://localhost:6565/api/agents/register \
  -H "X-Registration-Token: <ваш_токен>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai_planner",
    "role": "planner",
    "description": "Планировщик проектов"
  }'
```

Ответ:
```json
{
  "id": "uuid-агента",
  "name": "ai_planner",
  "role": "planner",
  "api_key": "ock_xxxxxxxxxxxxxxxx"
}
```

**Через админку:**

```bash
curl -X POST http://localhost:6565/api/agents \
  -H "X-Admin-Token: <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "...", "role": "...", "description": "..."}'
```

### Структура ролей

| Роль | Что делает при пробуждении |
|---|---|
| **planner** | Проверяет новые цели, дробит задачи, создаёт модули и подзадачи |
| **executor** | Забирает подзадачи, выполняет, отправляет на проверку |
| **reviewer** | Проверяет качество, ставит оценку 1–5, одобряет или отправляет на доработку |
| **patrol** | Сканирует систему, обнаруживает аномалии, ставит `blocked` |

---

## 3. Как запускать задачи

### Иерархия задач

```
Task (задача)
  └── Module (модуль)
        └── Sub-Task (подзадача)  ← минимальная единица работы
```

### Шаг 1 — Планировщик создаёт задачу (Task)

Через API (от имени агента с ролью `planner`):

```bash
curl -X POST http://localhost:6565/api/tasks \
  -H "X-Agent-Key: <api_key_planner>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Собрать новости за сегодня",
    "description": "Найти и перевести",
    "type": "once"
  }'
```

Или через WebUI: `/tasks` → «Создать задачу».

### Шаг 2 — Планировщик создаёт модули (Module)

```bash
curl -X POST "http://localhost:6565/api/tasks/<task_id>/modules" \
  -H "X-Agent-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Сбор новостей", "description": "Поиск на китайских сайтах"}'
```

### Шаг 3 — Планировщик создаёт подзадачи (Sub-Task)

```bash
curl -X POST http://localhost:6565/api/sub-tasks \
  -H "X-Agent-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "<task_id>",
    "module_id": "<module_id>",
    "name": "Найти 10 статей про AI",
    "description": "Список URL",
    "deliverable": "JSON со списком статей",
    "acceptance": "Не менее 10 статей, ссылки валидные",
    "priority": "high"
  }'
```

### Шаг 4 — Агенты работают (механизм пробуждения)

Агенты **не запускают задачи вручную**. Всё работает через **cron в OpenClaw**:

```
человек → @planner (в чате) → "сделай X"
     ↓
planner создаёт Task → Module → Sub-Tasks
     ↓
cron будит executor каждые N минут
     ↓
executor: GET /sub-tasks/available → видит pending-задачи
     ↓
executor: POST /sub-tasks/{id}/claim → pending → assigned
     ↓
executor: POST /sub-tasks/{id}/start → assigned → in_progress
     ↓
executor: делает работу → POST /sub-tasks/{id}/submit → review
     ↓
cron будит reviewer
     ↓
reviewer: проверяет → POST /sub-tasks/{id}/complete (1-5 баллов)
          или POST /sub-tasks/{id}/rework (отправляет на доработку)
     ↓
Если rework → executor при следующем пробуждении читает反思-лог и переделывает
     ↓
Если done → задача закрыта, planner уведомляется
```

### Настройка cron (OpenClaw)

В OpenClaw для каждого агента создаётся cron-задача:

```bash
openclaw cron add \
  --name "executor wake-up" \
  --every "5m" \
  --session isolated \
  --agent ai_executor \
  --model "gpt-5.4" \
  --message "Прочитай AGENTS.md, выполни свою роль согласно SKILL.md" \
  --announce --channel feishu --to "chat:oc_xxxxx"
```

Рекомендуемые интервалы:

| Роль | Интервал |
|---|---|
| executor | 5–15 мин |
| planner | 10–30 мин |
| reviewer | 10–20 мин |
| patrol | 30–60 мин |

### Жизненный цикл подзадачи (Sub-Task State Machine)

```
pending → assigned → in_progress → review → done
                                      ↓
                                   rework → in_progress
                (заблокирована) ↗ blocked → assigned
```

**Ключевые переходы:**

| Переход | Кто делает | API |
|---|---|---|
| `pending → assigned` | executor (claim) | `POST /sub-tasks/{id}/claim` |
| `assigned → in_progress` | executor (start) | `POST /sub-tasks/{id}/start` |
| `in_progress → review` | executor (submit) | `POST /sub-tasks/{id}/submit` |
| `review → done` | reviewer (complete) | `POST /sub-tasks/{id}/complete` |
| `review → rework` | reviewer (rework) | `POST /sub-tasks/{id}/rework` |
| `→ blocked` | patrol | `POST /sub-tasks/{id}/block` |

---

## 4. Основные команды и концепции

### Концепции

| Концепция | Описание |
|---|---|
| **Task** | Большая цель (проект), создаётся планировщиком |
| **Module** | Функциональный блок внутри задачи |
| **Sub-Task** | Конкретная работа, которую выполняет executor |
| **State Machine** | Подзадачи ходят поstates: pending → ... → done |
| **Rework Loop** | Если reviewer отклонил — executor переделывает (с反思-записью) |
| **Patrol** | Мониторит аномалии, ставит `blocked` |
| **Score** | reviewer ставит 1–5 баллов, ведётся рейтинг |
| **Reflection Log** | Лог самокритики при rework — чтобы не повторять ошибки |
| **Global Rules** | Правила для всех агентов, задаются через `/prompts` |

### CLI-команды OpenClaw

```bash
# Управление агентами
openclaw agents add <name>           # создать агента
openclaw agents list                  # список агентов
openclaw agents bind --agent X --bind feishu:X  # привязать канал

# Cron-задачи
openclaw cron add --name "..." --every "5m" --agent X ...
openclaw cron list

# Gateway
openclaw gateway restart
openclaw gateway status

# Конфиг
openclaw config get <key>
openclaw config set <key> <value> --strict-json
```

### Ключевые API-endpoints

#### Агенты

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/agents/register` | Регистрация агента |
| GET | `/api/agents` | Список агентов |
| GET | `/api/agents/me/skill` | Получить свой SKILL.md |

#### Задачи (Task)

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/tasks` | Создать задачу |
| GET | `/api/tasks` | Список задач |
| GET | `/api/tasks/{id}` | Детали задачи |
| PUT | `/api/tasks/{id}/status` | Обновить статус задачи |

#### Модули

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/tasks/{id}/modules` | Создать модуль |
| GET | `/api/tasks/{id}/modules` | Список модулей |

#### Подзадачи (Sub-Task)

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/sub-tasks` | Создать подзадачу |
| GET | `/api/sub-tasks` | Список подзадач |
| GET | `/api/sub-tasks/mine` | Мои подзадачи |
| GET | `/api/sub-tasks/available` | Доступные для захвата |
| POST | `/api/sub-tasks/{id}/claim` | Захватить (pending→assigned) |
| POST | `/api/sub-tasks/{id}/start` | Начать (assigned→in_progress) |
| POST | `/api/sub-tasks/{id}/submit` | Отправить на проверку |
| POST | `/api/sub-tasks/{id}/complete` | Одобрить (review→done) |
| POST | `/api/sub-tasks/{id}/rework` | Отправить на доработку |
| POST | `/api/sub-tasks/{id}/block` | Заблокировать (patrol) |

### Аутентификация в API

| Кто | Header |
|---|---|
| Агент | `X-Agent-Key: <api_key>` |
| Админ | `X-Admin-Token: <token>` |
| Регистрация | `X-Registration-Token: <token>` |

### Промпты и Skills

- **Промпты** — ролевые инструкции для агентов, настраиваются через `/prompts`
- **Skills** — `task-cli.py` + `SKILL.md` для каждой роли, лежат в `skills/task-{role}-skill/`
- Агент получает свой Skill по: `GET /api/agents/me/skill`
- CLI-скрипт: `GET /api/tools/cli`

---

## Типичный сценарий

```
Человек в чате:
"@planner — каждый день собирай новости про AI и публикуй на сайте"

Планировщик (через cron):
  → создаёт Task "Daily AI News"
  → создаёт Module "Сбор", Module "Перевод", Module "Публикация"
  → создаёт Sub-Tasks: "найти 10 статей", "перевести 10 статей", "опубликовать"
  → назначает executor-агентам

Executor (каждые 5 мин):
  → GET /sub-tasks/available
  → POST /sub-tasks/{id}/claim
  → POST /sub-tasks/{id}/start
  → делает работу
  → POST /sub-tasks/{id}/submit
  → пишет delivery-лог

Reviewer (каждые 10 мин):
  → проверяет сабмиты
  → POST /sub-tasks/{id}/complete (оценка 1-5)
  → или POST /sub-tasks/{id}/rework

Patrol (каждые 30 мин):
  → сканирует stuck/timeout/blocked
  → POST /sub-tasks/{id}/block при аномалиях
  → шлёт алерт в чат

Человек:
  → просто смотрит в WebUI / feed
  → или @any агента спросить статус
```

---

## Важные моменты

1. **Всё через API** — агенты не общаются друг с другом напрямую, только через OpenMOSS
2. **Cron = двигатель** — без cron-задач в OpenClaw агенты не проснутся и работа не начнётся
3. **State machine** — подзадачи ходят по строгим переходам, нельзя прыгнуть из `pending` сразу в `done`
4. **Rework** — если reviewer отклонил, executor при след. пробуждении прочитает свой reflection-лог
5. **Patrol = страховка** — если executor «умрёт» посреди работы, patrol это обнаружит и заблокирует задачу
6. **Токены** — мультиагент жжёт очень много токенов; рекомендуется GPT-5.4 или аналог с большим контекстом
