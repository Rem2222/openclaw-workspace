# TODO — OpenClaw Dashboard

## Этап 1: Аналитика требований ✅
- [x] Обсудить задачу с пользователем
- [x] Создать спецификацию
- [x] SPEC.md создан
- [x] Пользователь подтвердил SPEC.md

## Этап 2: Планирование разработки ✅
- [x] Декомпозиция задачи
- [x] План разработки
- [x] Определены типы агентов
- [x] Определение зависимостей
- [x] Оценка времени

## Этап 3: Написание ТЗ ✅
- [x] ТЗ для Backend
- [x] ТЗ для Frontend
- [x] ТЗ для UI
- [x] ТЗ для интеграции
- [x] Чек-листы
- [x] Компоненты Frontend (Layout, Agents, Tasks, Sessions, Cron, ActivityFeed, Approvals, GatewaySelector)

## Этап 4: Ревью ТЗ ✅
- [x] Ревью
- [x] Исправления
- [x] GatewaySelector.jsx добавлен
- [x] Vite proxy конфигурация добавлена
- [x] GatewayClient улучшён (retry, timeout)

## Этап 5: Разработка — Backend ✅
- [x] Инициализация проекта
- [x] Настройка Express
- [x] API клиент для Gateway
- [x] Endpoints для агентов
- [x] Endpoints для задач
- [x] Endpoints для сессий
- [x] Endpoints для cron
- [x] Endpoints для activity
- [x] Endpoints для approvals

## Этап 6: Разработка — Frontend ✅
- [x] Инициализация React + Vite
- [x] Настройка Tailwind
- [x] Компонент Agents
- [x] Компонент Tasks (Kanban)
- [x] Компонент Sessions
- [x] Компонент Cron
- [x] Компонент ActivityFeed
- [x] Компонент Approvals
- [x] Компонент GatewaySelector
- [x] Роутинг
- [x] Интеграция с API

## Этап 7: Тестирование ⏳
- [ ] Тестирование Backend
- [ ] Тестирование Frontend
- [ ] Интеграционное тестирование
- [ ] UI/UX проверка

## Этап 9: Backend интеграция ⏳
- [x] Реальные данные из Gateway для Tasks/Cron/Approvals
- [ ] WebSocket для real-time обновлений
  - [x] Backend: socket.io установлен
  - [x] WebSocket сервер настроен
  - [ ] Frontend: исправить подключение (показывает Offline) ⚠️
- [ ] Activity endpoint — реальные данные вместо заглушки ⚠️

## Этап 10: Deploy ⏳
- [ ] Production build Frontend
- [ ] Настройка сервера для статики
- [ ] Задеплоить на сервер

---

## 📝 БАГИ И ДОРАБОТКИ (новые)

### UI/UX
- [ ] **Расширенное инфо в закладках** — добавить больше деталей
- [ ] **Gateway и Token** — понять нужны ли кнопки для смены Gateway/токена
- [ ] **Белый экран при переключении** — Chrome: интерфейс исчезает на секунду при смене вкладок

### Approvals
- [ ] **Что такое Approvals** — определить функционал и логику работы

### Activity
- [ ] **Протестировать вкладку Activity** — похоже она не работает

### Sessions
- [x] **Субагенты в сессиях** — ✅ проверка на `:subagent:` в key, отображаются в таблице
- [x] **Выделение субагентов** — ✅ визуально выделены (иконка 🔧, жёлтый цвет, фоновое выделение)

### Subagents
- [x] **Отдельная страница "Субагенты"** — ✅ создан Subagents.jsx, роут /subagents, пункт меню
- [x] **Backend endpoint /api/subagents** — ✅ routes/subagents.js с list и kill
- [x] **Counts для субагентов** — ✅ добавлен в CountsContext
