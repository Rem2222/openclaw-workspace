# Этап 9: Редизайн — План задач

**Design:** `docs/plans/2026-04-01-redesign-design.md`
**Дата:** 2026-04-01

---

## Task 1: Layout + Sidebar (20-25 мин)

**Файл:** `src/components/Layout.jsx`, `src/index.css`

1. Подключить `nekocode-landing.css` в `src/index.css`:
   ```css
   @import './styles/nekocode-landing.css';
   ```

2. Переписать `Layout.jsx`:
   - HTML структура: `.app-layout > .sidebar + .app-main`
   - Sidebar: `.sidebar > .sidebar-header(.sidebar-logo) + .sidebar-nav + .sidebar-footer`
   - Nav items: `.nav-item` с иконками
   - Footer: `.theme-toggle` + `.account-dropdown`
   - Mobile: `.mobile-header` + `.sidebar-overlay` (пока disabled)

3. Удалить лишнее из `App.css` — только если относится к Layout

4. **Verify:** Sidebar отображается корректно, навигация работает

---

## Task 2: Agents + Sessions + Subagents (25-30 мин)

**Файлы:** `Agents.jsx`, `Sessions.jsx`, `Subagents.jsx`

1. **Agents.jsx**:
   - Обёртка: `.page > .page-header(.page-title) + .card`
   - Таблица: `.table > thead > tr > th | tbody > tr > td`
   - Badges: `.badge-success`, `.badge-danger`
   - Кнопки: `.btn.btn-ghost`

2. **Sessions.jsx** — аналогично

3. **Subagents.jsx** — аналогично

4. **Verify:** Страницы выглядят как в nekocode дизайне

---

## Task 3: Tasks + Cron + ActivityFeed (25-30 мин)

**Файлы:** `Tasks.jsx`, `Cron.jsx`, `ActivityFeed.jsx`

1. **Tasks.jsx**:
   - Task items: `.card` или `.section-box`
   - Progress/status: `.badge-warning`, `.badge-info`
   - Empty state: `.empty-state`

2. **Cron.jsx**:
   - Список задач cron: `.card` + `.table`
   - Status dots: `.status-dot`

3. **ActivityFeed.jsx**:
   - Feed items: `.card` или `.section-box`
   - Timestamps: `.mono`

4. **Verify:** Все компоненты используют новые стили

---

## Task 4: Approvals + StatusIndicator + Финал (15-20 мин)

**Файлы:** `Approvals.jsx`, `StatusIndicator.jsx`

1. **Approvals.jsx**:
   - Approvals list: `.card` + `.table`
   - Actions: `.btn.btn-primary`, `.btn.btn-danger`
   - Modals: `.modal-overlay > .modal-box`

2. **StatusIndicator.jsx**:
   - Position: fixed bottom-right
   - Style: `.card` с stat-card
   - Colors: `.status-dot--success/danger`

3. **Финальная проверка:**
   - Убедиться что все страницы используют `.page`
   - Проверить что нет orphan старых стилей
   - Удалить неиспользуемые CSS классы из App.css (опционально)

4. **Verify:** Весь UI консистентен, дизайн как у nekocode.app

---

## Выполнение

**Subagent-driven mode:** Запустить 4 subagent-а (по одному на Task), каждый работает параллельно.

**Manual mode:** Роман выполняет задачи сам по этому плану.

---

## Время

| Task | Время |
|------|-------|
| 1 (Layout) | 20-25 мин |
| 2 (Agents/Sessions/Subagents) | 25-30 мин |
| 3 (Tasks/Cron/Activity) | 25-30 мин |
| 4 (Approvals/StatusIndicator) | 15-20 мин |
| **Итого** | **~1.5 часа** |
