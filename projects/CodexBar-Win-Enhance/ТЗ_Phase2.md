# ТЗ Phase 2 — CodexBar-Win: MiniMax + OpenCode + Фикс иконки

**Дата:** 2026-04-11
**Проект:** CodexBar-Win-Enhance
**Основной файл:** `codexbar.py`

---

## Этап 1: Фикс процентов на иконке

### Задача
Проценты на tray иконке отображаются некорректно. Нужно сделать текст процентов **чёрным** с белой обводкой (хорошо видно на любом цветном фоне круга).

### Что сделать
В функции `make_icon()`:
1. Изменить `fill` параметр текста с `(255, 255, 255, 255)` (белый) на `(0, 0, 0, 255)` (чёрный)
2. Изменить `outline_color` с `(0, 0, 0, 255)` (чёрная обводка) на `(255, 255, 255, 255)` (белая обводка)
3. Увеличить толщину обводки для лучшей читаемости

### Критерии приёмки
- [ ] Проценты видны на зелёном, жёлтом и красном фоне круга
- [ ] Обводка обеспечивает контраст на любом фоне
- [ ] Font size корректный (не 1pt)
- [ ] Иконка генерируется без ошибок при pct=0, 50, 99

---

## Этап 2: MiniMaxDataFetcher

### Задача
Создать класс `MiniMaxDataFetcher` для получения usage данных из MiniMax API.

### API Endpoint
```
GET https://api.minimax.chat/v1/api/openplatform/coding_plan/remains
Authorization: Bearer <API_KEY>
MM-API-Source: CodexBar
```

### Формат ответа (из CodexBar macOS)
```json
{
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  },
  "data": {
    "current_subscribe_title": "Coding Plan Standard",
    "plan_name": "standard",
    "model_remains": [
      {
        "current_interval_total_count": 500,
        "current_interval_usage_count": 350,
        "start_time": 1712808000000,
        "end_time": 1712811600000,
        "remains_time": 3200
      }
    ]
  }
}
```

### Расчёт процентов
```
used = max(0, total_count - usage_count)
used_percent = (used / total_count) * 100
```
- `start_time` / `end_time` — Unix миллисекунды (или секунды если > 1_000_000_000_000)
- `remains_time` — секунды до сброса (или мс если > 1_000_000)

### Структура класса (по образцу ZaiDataFetcher)
```python
class MiniMaxDataFetcher:
    API_URL = "https://api.minimax.chat/v1/api/openplatform/coding_plan/remains"
    TIMEOUT = 10

    @staticmethod
    def _empty() -> dict  # Возвращает структуру с нулями

    def fetch(self, token: str) -> dict  # GET request с Bearer token
    def _parse_response(self, data: dict) -> dict  # Парсинг JSON ответа
```

### Возвращаемая структура
```python
{
    "provider": "MiniMax",
    "plan": "standard",          # из plan_name / current_subscribe_title
    "updated": "2026-04-11 02:00",
    "source": "api",
    "session_used_pct": 30.0,    # (total - remaining) / total * 100
    "session_reset": "45 min",   # из end_time или remains_time
    "weekly_used_pct": 0,        # Если есть несколько model_remains
    "weekly_reset": "unknown",
    "error": None
}
```

### Обработка ошибок
- `status_code != 0` → error с status_msg
- `status_code == 1004` → invalid credentials
- Пустой `model_remains` → parse failed
- Network timeout → network error

### Критерии приёмки
- [ ] Класс создан по образцу ZaiDataFetcher
- [ ] API вызов с Bearer токеном
- [ ] Парсинг base_resp.status_code (ошибка если != 0)
- [ ] Парсинг model_remains[0] → session_used_pct
- [ ] Расчёт reset time из end_time / remains_time
- [ ] Обработка network errors, invalid credentials, parse failures
- [ ] Fallback: если `model_remains` пуст — попытка HTML parse (опционально)

---

## Этап 3: OpenCodeDataFetcher

### Задача
Создать класс `OpenCodeDataFetcher` для получения usage из OpenCode Go через cookies.

### Важно: Cookie-based, не API token!
OpenCode Go не имеет API token. Данные получаются через браузерные cookies.

### API (из CodexBar macOS)
1. **Получить workspace_id:**
   ```
   POST https://opencode.ai/_server
   Cookie: <cookie_header>
   Body: {"serverID": "def39973159c7f0483d8793a822b8dbb10d067e12c65455fcb4608459ba0234f", "method": "GET"}
   ```
   Парсинг workspace IDs из ответа.

2. **Получить usage:**
   ```
   POST https://opencode.ai/_server
   Cookie: <cookie_header>
   Body: {"serverID": "<workspace_id>", "method": "GET"}
   ```
   Ответ содержит percent / resetInSec / planName.

### Структура класса
```python
class OpenCodeDataFetcher:
    BASE_URL = "https://opencode.ai"
    SERVER_URL = "https://opencode.ai/_server"
    WORKSPACES_SERVER_ID = "def39973159c7f0483d8793a822b8dbb10d067e12c65455fcb4608459ba0234f"
    TIMEOUT = 10

    @staticmethod
    def _empty() -> dict

    def fetch(self, cookie_header: str) -> dict
    def _fetch_workspace_id(self, cookie_header: str) -> str
    def _fetch_usage_page(self, workspace_id: str, cookie_header: str) -> dict
    def _parse_response(self, text: str) -> dict
```

### Ключи для парсинга (пробовать по порядку)
**Percent:** usagePercent, usedPercent, percentUsed, percent, usage_percent, used_percent, utilization, utilizationPercent
**Reset:** resetInSec, resetInSeconds, resetSeconds, resetIn, resetSec, resetAt, resetsAt, nextReset

### Возвращаемая структура
```python
{
    "provider": "OpenCode",
    "plan": "Go",
    "updated": "2026-04-11 02:00",
    "source": "cookie",
    "session_used_pct": 25.0,
    "session_reset": "2h 15min",
    "weekly_used_pct": 0,
    "weekly_reset": "unknown",
    "error": None
}
```

### Обработка ошибок
- Cookie expired / invalid → invalid credentials
- Workspace ID не найден → parse failed
- Network error → network error

### Критерии приёмки
- [ ] Класс создан по образцу ZaiDataFetcher
- [ ] Двухшаговый fetch (workspace_id → usage)
- [ ] Cookie-based авторизация
- [ ] Парсинг percent и reset из текстового ответа
- [ ] Обработка ошибок (invalid credentials, network, parse)
- [ ] Fallback: POST если GET workspace IDs не сработал

---

## Этап 4: UI интеграция

### Задача
Добавить вкладки MiniMax и OpenCode в CodexBar popup.

### Tab bar
Добавить 2 кнопки в `_tab_bar`:
- `_minimax_tab_btn` — иконка/текст "MM" с оранжевым акцентом
- `_opencode_tab_btn` — иконка/текст "OC" с teal акцентом

### Цветовые палитры
```python
# MiniMax — тёплый оранжевый
MM_BG = "#FFF8F0"
MM_SURFACE = "#FFE8D0"
MM_ACCENT = "#FF6A00"
MM_TEXT = "#3D2200"

# OpenCode — тёмный teal
OC_BG = "#0A2F2F"
OC_SURFACE = "#1A4A4A"
OC_ACCENT = "#00D4AA"
OC_TEXT = "#E0FFF8"
```

### Панели
- `_build_minimax_panel(parent)` — Session Quota bar, Plan, Reset timer
- `_build_opencode_panel(parent)` — Session Quota bar, Plan, Reset timer

### _switch_tab() и _do_swap()
Обновить для 5 провайдеров (Claude, Codex, Z.AI, MiniMax, OpenCode).

### _set_tray_icon()
Обновить `make_icon()` для распознавания `provider="minimax"` и `provider="opencode"`.

### Критерии приёмки
- [ ] 5 кнопок в tab bar
- [ ] Переключение вкладок без крашей
- [ ] Анимация fade in/out работает для всех
- [ ] Цвета корректны для каждого провайдера
- [ ] Tab memory сохраняет последнюю активную
- [ ] Tray icon цвет зависит от процента (не от провайдера)

---

## Этап 5: SettingsPopup

### Задача
Расширить настройки для хранения токенов MiniMax и cookie OpenCode.

### MiniMax
- Поле ввода API токена (masked)
- Кнопка "Test" — вызов MiniMaxDataFetcher.fetch()
- Сохранение в `~/.codexbar/settings.json`

### OpenCode
- Кнопка "Import from Browser" — импорт cookies через DPAPI
- Или поле для ручного ввода cookie header
- Отображение пути к БД

### Критерии приёмки
- [ ] MiniMax токен сохраняется и загружается
- [ ] Test кнопка проверяет токен
- [ ] OpenCode cookie import работает (или ручной ввод)
- [ ] Все токены в settings.json

---

## Этап 6: Тестирование

### Чеклист
1. [ ] Иконка: проценты чёрным текстом с белой обводкой
2. [ ] Иконка: цвет фона по % (зелёный <50%, жёлтый 50-70%, красный >70%)
3. [ ] MiniMax: API вызов с реальным токеном
4. [ ] MiniMax: парсинг ответа корректный
5. [ ] OpenCode: cookie-based fetch
6. [ ] Tab switching: все 5 вкладок без крашей
7. [ ] Settings: сохранение/загрузка всех токенов
8. [ ] Tab memory: последняя вкладка восстанавливается
9. [ ] Syntax: `python -m py_compile codexbar.py` без ошибок

---

## Ограничения
- Python 3.10+ (Windows)
- customtkinter для UI
- Нет GPU требований
- MiniMax: наш сервер заблокирован Cloudflare, тестить на Windows
- OpenCode: cookie import через DPAPI (Windows only)
