# Этап 9: Редизайн интерфейса (nekocode.app)

**Дата:** 2026-04-01
**Статус:** Design Approved → Planning

---

## 1. Цель

Перестроить UI Dashboard согласно стилям nekocode.app. Полная замена дизайн-системы на компоненты из `src/styles/nekocode-landing.css`.

---

## 2. Референс дизайна

**Источник:** `src/styles/nekocode-landing.css` (Catppuccin Mocha/Latte)

### Цветовая схема (dark mode)
| Token | Значение | Использование |
|-------|----------|---------------|
| `--bg` | `#1e1e2e` | Фон приложения |
| `--bg-alt` | `#181825` | Альтернативный фон |
| `--crust` | `#11111b` | Самая тёмная (sidebar footer) |
| `--surface` | `#313244` | Карточки, панели |
| `--surface-1` | `#45475a` | Hover states |
| `--accent` | `#89b4fa` | Активные элементы, ссылки |
| `--text` | `#cdd6f4` | Основной текст |
| `--text-muted` | `#a6adc8` | Вторичный текст |
| `--border` | `#45475a` | Границы |
| `--danger` | `#f38ba8` | Опасность/ошибки |
| `--success` | `#a6e3a1` | Успех |
| `--warning` | `#f9e2af` | Предупреждения |

### Типографика
- **Шрифт:** JetBrains Mono, Fira Code, Consolas, monospace
- **Размер:** 16px base
- **Начертание:** `font-weight: 600` для заголовков

### Border-radius
- `--radius: 5px` — универсальный радиус

### Layout
- `--sidebar-width: 260px` — фиксированный sidebar
- Content area: `padding: 24px 32px`

---

## 3. Компоненты для замены

### Sidebar (Layout.jsx)
```
.sidebar (fixed, 260px)
  .sidebar-header
    .sidebar-logo
  .sidebar-nav
    .nav-item [.nav-item--active]
    .nav-section-label
  .sidebar-footer
    .theme-toggle
    .account-dropdown
```

### Страницы (Agents, Tasks, Sessions, etc.)
```
.page
  .page-header
    .page-title
    .page-desc
  .card / .section-box
  .data-table-wrapper
    .data-table-toolbar
    .table
    .data-table-pagination
```

### UI примитивы
```
.btn [.btn-primary, .btn-ghost, .btn-danger]
.input / .label / .form-field
.badge [.badge-success, .badge-danger, .badge-warning, .badge-info]
.dropdown [.dropdown-trigger, .dropdown-panel, .dropdown-option]
.status-dot [.status-dot--success, .status-dot--danger]
.modal [.modal-overlay, .modal-box, .modal-header, .modal-footer]
.stat-card
.empty-state
.mono (inline code)
```

---

## 4. Структура задач

### Task 1: Подключение CSS и Layout
- Подключить `nekocode-landing.css` в `index.css`
- Переписать `Layout.jsx` — sidebar, theme-toggle, navigation
- Обновить `App.css` — удалить старые стили layout

### Task 2: Базовые компоненты
- Agents.jsx — стилизация карточек и таблицы
- Sessions.jsx
- Subagents.jsx

### Task 3: Продвинутые компоненты
- Tasks.jsx
- Cron.jsx
- ActivityFeed.jsx

### Task 4: Доработки
- Approvals.jsx
- StatusIndicator — стилизация статус-бара
- Финальная проверка的一致性

---

## 5. Технические детали

**Файлы для изменения:**
- `src/index.css` — импорт nekocode-landing.css
- `src/App.css` — удалить/перенести layout стили
- `src/components/Layout.jsx` — sidebar + navigation
- `src/components/Agents.jsx` — cards + table
- `src/components/Sessions.jsx`
- `src/components/Subagents.jsx`
- `src/components/Tasks.jsx`
- `src/components/Cron.jsx`
- `src/components/ActivityFeed.jsx`
- `src/components/Approvals.jsx`
- `src/components/StatusIndicator.jsx`

**Без изменения логики** — только CSS/styling.

---

## 6. Acceptance Criteria

- [ ] Sidebar выглядит как в nekocode (logo, nav-items, theme-toggle)
- [ ] Все страницы используют .page, .card, .btn, .table классы
- [ ] Цветовая схема — Catppuccin Mocha
- [ ] Адаптивность sidebar (mobile-header для мобильных)
- [ ] Theme-toggle работает (dark/light)
- [ ] Нет старых Tailwind-классов в компонентах
