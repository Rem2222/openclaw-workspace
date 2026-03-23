# Chrome/Chromium Issues Affecting OpenClaw Web Interface

> Дата сбора: 2026-03-24
> Источник: GitHub API (openclaw/openclaw)

---

## 🔴 Открытые проблемы

### 1. #47979 — Control UI Dashboard v2 freezes on Chrome 146 (works fine in Firefox)
**Статус:** Open | **Дата:** 2026-03-16 | **Автор:** tavomed

**Описание:**
Control UI (Dashboard v2) **полностью замораживается в Chrome 146** — страница загружается, WebSocket подключается, но UI не отвечает. Firefox 148 работает идеально.

**Симптомы:**
- WebSocket подключается (`webchat connected`)
- RPC-вызовы `chat.list` и `chat.history` **не отправляются** — JS-поток заблокирован
- Невозможно кликнуть, прокрутить, открыть DevTools
- Быстрые циклы disconnect/reconnect WebSocket (коды 1001/1006)

**Окружение:**
- OpenClaw: 2026.3.13 (61d171a)
- Chrome: 146.0.7680.76 (macOS, Apple Silicon)
- Firefox: 148.0.2 ✅
- macOS 15.3

**Что исключено (Chrome-специфичное):**
- ✅ Режим инкогнито — всё равно замерзает
- ✅ Расширения отключены (`--disable-extensions`) — всё равно замерзает
- ✅ GPU отключён (`--disable-gpu`) — всё равно замерзает
- ✅ Чистый профиль Chrome (`--user-data-dir=/tmp/...`) — всё равно замерзает
- ✅ Очистка кэша, localStorage, service workers — всё равно замерзает
- ✅ Перезапуск gateway — всё равно замерзает
- ✅ Обрезанные большие сессии — всё равно замерзает
- ✅ Целостность JS-бандла — верифицирована

**Анализ:**
- Dashboard v2 (#41503) вышел в 2026.3.12
- Chrome 146 вышел 10 марта с изменениями Skia, WebML и V8
- Замерзание происходит во время **initial Lit shadow DOM render** — до загрузки данных
- Подозрение: регрессия Chrome 146 в рендеринге custom elements / shadow DOM, которую триггерит Dashboard v2
- Firefox 148 работает без проблем

**Workaround:** Использовать Firefox для Control UI, пока проблема не решена.

---

### 2. #44107 — Two Independent Control UI Blank/Freeze Issues
**Статус:** Open | **Дата:** 2026-03-12 | **Автор:** zianai | **Метки:** bug, regression

**OpenClaw:** 2026.3.8 | **Chrome:** 145.0.7632.162 | **macOS:** 26.1

#### Bug 1: Chrome-расширения с `<all_urls>` ломают module script → blank page

**Что происходит:** Установленное Chrome-расширение (например, Doubao AI Assistant) с `document_start` content script на `<all_urls>` инжектирует `preinject.js` в `http://127.0.0.1`, **корrupting JS environment** до загрузки Lit-компонента.

**Почему:** `<script type="module" crossorigin>` загружается в CORS-режиме. `document_start` content script может **silently abort** module evaluation без каких-либо console errors.

**Как подтвердить:** Отключить расширение → страница рендерится нормально.

**Workaround:** Открыть dashboard в Incognito-окне (расширения отключены) или удалить проблемное расширение.

#### Bug 2: Control UI замерзает при загрузке большой сессии

**Что происходит:** После устранения Bug 1, Control UI работает, но при загрузке сессии с 84+ сообщениями (~156 KB, включая `thinking` блоки) Chrome показывает **"1 page unresponsive"** и замирает.

**Корневая причина:** `chat.history` RPC возвращает **все сообщения одним payload**. Фронтенд рендерит их **синхронно** на main thread. Большие `thinking` блоки и tool call/result пары блокируют рендерер достаточно долго, чтобы Chrome пометил вкладку как unresponsive.

**Workaround:** Удалить/переименовать большой файл сессии → dashboard открывается нормально.

---

### 3. #49776 — WebUI Dashboard page freezes, unresponsive after static resources load
**Статус:** Open | **Дата:** ~2026-03 | **Автор:** songroad78

**Описание:** WebUI загружает HTML и статику (JS/CSS возвращают HTTP 200), но страница **замерзает и не отвечает**. TUI при этом работает нормально.

**Окружение:**
- OpenClaw: 2026.3.13
- Chrome/Edge на Windows 11
- Gateway: loopback (127.0.0.1:18789)

---

## 💬 Комментарии из #47979 (от команды OpenClaw)

**Ryce:**
> Dashboard freeze on Chrome 146 specifically points to a Chrome-side regression (likely related to their new renderer changes in 146), but the dashboard should handle it gracefully. The Control UI is likely hitting a memory leak or infinite re-render loop that Chrome 146 exposes but Firefox doesn't. Check Chrome DevTools Performance tab during the freeze.

**OpenClawCom:**
> `#45541` fixes repeated `chat.history` reloads during live tool-result events, but this report says Chrome freezes **before** any `chat.list`/`chat.history` RPC is sent. That points to a lockup in the **initial post-connect render path**, not the tool-event storm fixed by `#45541`.

---

## 📊 Сводная таблица

| Issue | Chrome версия | Проблема | Фундаментальная причина | Workaround |
|-------|-------------|----------|------------------------|------------|
| #47979 | 146 | Dashboard v2 freeze | Lit shadow DOM + Chrome 146 regression | Firefox |
| #44107 Bug1 | 145 | Blank page | `<all_urls>` extension content script | Incognito |
| #44107 Bug2 | 145 | Page unresponsive | Sync render of 84+ msg session | Trim session file |
| #49776 | 146? | Freeze after static load | Unknown (TUI works) | Unknown |

---

## 🔗 Источники

- https://github.com/openclaw/openclaw/issues/47979
- https://github.com/openclaw/openclaw/issues/44107
- https://github.com/openclaw/openclaw/issues/49776

---

## 💡 Выводы для Романа

1. **Если веб-интерфейс тормозит в Chrome** — с высокой вероятностью это известная проблема #47979 (Chrome 146 + Lit shadow DOM)
2. **Workaround:** использовать Firefox для Control UI
3. **Если проблема с большой сессией** — это #44107 Bug 2, лечится обрезкой файла сессии
4. **Если blank page** — проверить расширения Chrome, попробовать Incognito
