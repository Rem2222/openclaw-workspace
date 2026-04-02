# Стили из nekocode.app

## Источник
https://nekocode.app/assets/globals-Rdtf4H4H.css

## Описание
Полная UI библиотека с дизайн-токенами и компонентами:
- **CSS-переменные:** `--bg`, `--accent`, `--text`, `--surface`, `--border`, `--danger`, `--success`, `--warning` и другие
- **Тёмная тема (Catppuccin Mocha):** `html` без класса light
- **Светлая тема:** класс `.light` на html
- **Компоненты:** `.app-layout`, `.sidebar`, `.sidebar-logo`, `.nav-item`, `.nav-item--active`, `.card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input`, `.label`, `.table`, `.modal-overlay`, `.modal-box`, `.section-box`, `.stat-card`, `.badge`, `.badge-success`, `.badge-danger`, `.dropdown`, `.auth-screen`, `.auth-box`, и многие другие
- **Иконки:** Lucide Icons (SVG)
- **Шрифт:** JetBrains Mono

## Как использовать
Импортировать в `index.css` или `main.jsx`:
```css
@import './styles/nekocode-landing.css';
```

Или скопировать нужные классы и переменные в свой CSS.

## Дизайн-токены (dark theme)
```css
--bg: #1e1e2e
--bg-alt: #181825
--crust: #11111b
--surface: #313244
--surface-1: #45475a
--accent: #89b4fa
--text: #cdd6f4
--text-muted: #a6adc8
--danger: #f38ba8
--success: #a6e3a1
--warning: #f9e2af
```

## Референс для перестройки дизайна Dashboard
Этот CSS можно использовать как референс для создания аналогичного UI для OpenClaw Dashboard.
Цель — перенести текущий Tailwind-based дизайн на стили из этой библиотеки (или написать похожие).

## Задача
Добавить в план разработки этап: **"Этап X: Редизайн интерфейса по мотивам nekocode.app"**
