# OpenClaw Dashboard — Статус проекта

**Обновлено:** 2026-04-01
**Версия:** 1.0

---

## ✅ Что сделано

### Архитектура
- [x] Backend (Express + Socket.io) на порту 3000
- [x] Frontend (React + Vite) на порту 5173
- [x] Проксирование /api, /health, /socket.io через Vite
- [x] Beads (Dolt) для учёта задач
- [x] Superpowers workflow для subagent-ов

### Страницы
- [x] **Agents** — список агентов с статусами
- [x] **Sessions** — список сессий с сортировкой, фильтром, удалением
- [x] **Subagents** — список subagent-сессий с проектами
- [x] **Tasks** — Kanban доска (open/in_progress/done)
- [x] **Cron** — список cron задач
- [x] **Activity Feed** — лента событий
- [x] **Approvals** — очередь подтверждений
- [x] **Settings** — GatewaySelector
- [x] **Monitor** — мониторинг активной сессии проекта

### Проекты (Projects)
- [x] Страница Projects с группировкой по проектам
- [x] Фильтрация по статусу и приоритету
- [x] Сортировка по колонкам
- [x] Раскрываемые строки с деталями
- [x] Навигация на Монитор проекта
- [x] Навигация на Сессию с подсветкой
- [x] Кнопка "+ Новый проект" (создаёт задачу + спавнит Superpowers)
- [x] Кнопка "Архивировать" (закрывает все задачи проекта)

### Интеграции
- [x] /api/spawn — спавн сессии через Gateway API
- [x] /api/issues — список задач из Beads
- [x] /api/issues/session-task-map — маппинг сессий к задачам
- [x] /api/issues/sessions — регистрация сессии за задачей
- [x] /api/sessions — список сессий (читает из файлов)
- [x] /api/subagents — список subagent-ов (читает из sessions.json)
- [x] /api/command — выполнение shell команд (bd)

### Superpowers Workflow
- [x] При спавне subagent автоматически: `bd update <id> --claim`
- [x] При завершении subagent автоматически: `bd update <id> --status done`
- [x] Лейбл subagent содержит `bd:<issue_id>` для связи
- [x] Все новые задачи создаются с префиксом `[Dashboard]`

### UI/UX
- [x] Дизайн-система Catppuccin (nekocode-landing.css)
- [x] Dark/Light темы
- [x] Mobile responsive (hamburger menu)
- [x] Сортировка таблиц
- [x] Фильтрация данных
- [x] Empty states

### Доступ извне
- [x] Pinggy tunnel для доступа с телефона/другой сети

---

## 🔄 Что осталось сделать

### Высокий приоритет (P1)
- [x] **workspace-ywz:** Убрать выпадающий список сессий из Монитора ✅
- [x] **workspace-d1f:** Projects — при нажатии Монитор фильтр не устанавливается ✅
- [x] **workspace-ha2:** Убрать кнопку Архивировать из Проектов ✅
- [x] **workspace-k1r:** Projects — в меню добавить Сессия/Агент ✅
- [x] **workspace-wu4:** Сессии/Субагенты — клик на проект открывает Монитор ✅
- [ ] **Протестировать полный цикл (end-to-end):**
  1. Создать новую задачу через Projects → "+ Новый проект"
  2. Должен заспавниться subagent с Superpowers
  3. Subagent должен привязаться к задаче
  4. Monitor должен показать активность
  5. После завершения задача должна закрыться автоматически

### Средний приоритет (P2)
- [ ] **workspace-o4f:** Исследовать торможение при переключении закладок

### Низкий приоритет
- [ ] Добавить логирование в Backend для отладки
- [ ] Добавить WebSocket для realtime обновлений (вместо polling)
- [ ] Добавить документацию API в README

---

## 🐛 Известные проблемы

1. **Backend перезапуск** — при изменении кода нужно ручное перезапускание
2. **Pinggy tunnel** — бесплатная версия сбрасывается каждые 60 мин
3. **sessions.json** — парсинг зависит от формата файла (может сломаться при обновлениях OpenClaw)
4. **Сессии без проекта** — задачи без префикса `[Dashboard]` не привязываются к проекту

---

## 📊 Метрики

| Метрика | Значение |
|---------|----------|
| Коммитов | 25+ |
| Страниц | 9 |
| Frontend файлов | 15+ |
| Backend routes | 10+ |
| Subagent tasks | 8 (все закрыты) |

---

## 🔗 Ссылки

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Git:** https://github.com/Rem2222/openclaw-workspace (ветка main)

---

## 📝 Заметки

### Как работает создание нового проекта
1. Пользователь нажимает "+ Новый проект" в Projects
2. Форма отправляет POST /api/spawn с данными
3. Backend вызывает GatewayClient.spawnSession()
4. Создаётся Beads задача с лейблом `bd:<id>`
5. Subagent спавнится и автоматически привязывается к задаче

### Как работает мониторинг
1. В Projects нажимаем "📊 Монитор" напротив проекта
2. Открывается /monitor?project=Dashboard
3. Monitor загружает:
   - sessions из /api/sessions (фильтрует по project)
   - issues из /api/issues (фильтрует по project)
   - session-task-map для связи сессий и задач
4. Показывается активность: сессии, задачи, таймлайн

### Superpowers Label Format
```
bd:workspace-xxx → парсится как [Dashboard] Task N
```
Subagent-ы получают лейбл `bd:<issue_id>` и автоматически:
1. При старте: `bd update <id> --claim`
2. При завершении: `bd update <id> --status done`
