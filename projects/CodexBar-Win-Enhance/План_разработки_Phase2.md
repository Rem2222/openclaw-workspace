# CodexBar-Win Phase 2 — План разработки

**Цель:** Добавить провайдеры MiniMax и OpenCode, исправить баг с чёрным текстом процентов на иконке.

**Дата создания:** 2026-04-11
**Аналитик:** Romul (субагент)

---

## Архитектура текущего кода

### ZaiDataFetcher (класс, строки ~854-999)
- `_empty()` → возвращает структуру данных по умолчанию
- `fetch()` → главный метод, вызывает `_fetch_from_api()`
- `_fetch_from_api()` → HTTP GET к `https://api.z.ai/api/monitor/usage/quota/limit`
- Парсит JSON с полями `limits[]`, `type`, `percentage`, `nextResetTime`

### Вкладки (_build_ui)
- `_tab_bar` — фрейм с кнопками Claude/OpenAI/Z.AI
- `_switch_tab(tab)` — анимированное переключение (fade out → swap → fade in)
- `_do_swap()` — меняет контент, цвета, размеры

### SettingsPopup (класс, строки ~1600+)
- `CONFIG_PATH = ~/.codexbar/settings.json`
- `_load_token()` / `save_token()` — загрузка/сохранение Z.AI токена
- `_test_token()` — проверка токена через API запрос

### make_icon (функция, строки ~620-720)
- Создаёт PIL Image с процентом и цветовым индикатором
- Рисует круг → накладывает логотип → рисует текст с outline → рисует точку-индикатор
- **Проблема:** при рисовании текста используется `\n` в строке `text = f"{pct}%"` — НО это не проблема. Нужно проверить цвет текста.

### _set_tray_icon (строки ~1890+)
- Вызывает `make_icon(sp=session_pct, provider=provider)`
- Обновляет `self.tray.icon`

---

## Этапы разработки

---

### Этап 1: Исправление бага — чёрный текст процентов на иконке

**Тип агента:** bug-fix

**Задача:**
Проанализировать функцию `make_icon()` и найти причину, почему проценты отображаются чёрным цветом вместо белого с обводкой.

**Код для анализа (строки 620-720):**
```python
def make_icon(sp=0, wp=0, sz=64, provider="claude"):
    # ...
    # Draw percentage text centered on icon with thick dark outline for visibility
    if pct > 0:
        try:
            # Larger font for better visibility (20pt for 64x64 icon)
            font_size = max(18, sz // 3)
            # Try to use a bold system font for better readability
            try:
                font = ImageDraw.ImageFont.truetype("arialbd.ttf", font_size)  # Bold Arial
            except Exception:
                # ...
            
            text = f"{pct}%"
            # ...
            # Draw thick dark outline by drawing text multiple times with offsets
            outline_color = (0, 0, 0, 255)  # Solid black outline
            for ox in [-2, -1, 0, 1, 2]:
                for oy in [-2, -1, 0, 1, 2]:
                    if abs(ox) + abs(oy) <= 3:  # Circular outline pattern
                        d.text((text_x + ox, text_y + oy), text, font=font, fill=outline_color)
            # Draw white text on top
            d.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))
```

**Возможные причины:**
1. Шрифт `arialbd.ttf` не найден → fallback на default font без поддержки цвета
2. Режим изображения не `'RGBA'` (проверить создание `Image.new('RGBA', ...)`)
3. Проблема с альфа-каналом при наложении на цветной круг

**Действия:**
1. Проверить создание изображения — должно быть `'RGBA'`
2. Добавить fallback на белый текст, если шрифт не загрузился
3. Протестировать на провайдерах с разным % (0%, 50%, 90%)

**Сложность:** Низкая (1-2 часа)

**Файлы:**
- `codexbar.py`: функция `make_icon()`

---

### Этап 2: Добавить MiniMax провайдер — MiniMaxDataFetcher

**Тип агента:** developer

**Задача:**
Создать класс `MiniMaxDataFetcher` по образцу `ZaiDataFetcher`.

**API Endpoint:**
```
GET https://www.minimax.io/v1/api/openplatform/coding_plan/remains
Authorization: Bearer <API_KEY>
```

**Ответ (предполагаемый формат):**
```json
{
  "data": {
    "remains": 50000,
    "total": 100000,
    "reset_time": "..."
  }
}
```

**Требуется уточнить у MiniMax:**
- Точный формат ответа endpoint `/coding_plan/remains`
- Есть ли еженедельные лимиты (или только 5-часовые rolling windows)
- Формат времени сброса (timestamp или ISO)

**Структура класса:**
```python
class MiniMaxDataFetcher:
    API_URL = "https://www.minimax.io/v1/api/openplatform/coding_plan/remains"
    TIMEOUT = 10

    @staticmethod
    def _empty():
        return {
            "provider": "MiniMax", "plan": "Unknown",
            "updated": "Never", "source": "none",
            "session_used_pct": 0, "session_reset": "unknown",
            "weekly_used_pct": 0, "weekly_reset": "unknown",
            # ...
        }

    def fetch(self):
        token = os.environ.get("MINIMAX_API_KEY", "")
        if not token:
            d["error"] = "MINIMAX_API_KEY not set"
            return d
        # HTTP GET to API_URL with Bearer token
        # Parse response → fill session_used_pct, plan, etc.
```

**Действия:**
1. Найти точный формат ответа API (читал FAQ, но нужен тестовый вызов)
2. Создать класс по образцу ZaiDataFetcher
3. Добавить `MINIMAX_API_KEY` в SettingsPopup
4. Интегрировать в CodexBarApp (add tab + icon colors)

**Сложность:** Средняя (3-5 часов)

**Файлы:**
- `codexbar.py`: добавить класс после `ZaiDataFetcher`
- `codexbar.py`: обновить `SettingsPopup` для хранения токена
- `codexbar.py`: добавить вкладку в `_build_ui()`, `_switch_tab()`, `_do_swap()`
- `assets/`: добавить `minimax-logo.png` (если нужен)

---

### Этап 3: Добавить OpenCode провайдер — OpenCodeDataFetcher

**Тип агента:** developer

**Задача:**
Создать класс `OpenCodeDataFetcher` для чтения данных из SQLite базы OpenCode.

**База данных:**
- Путь: `~/.local/share/opencode/opencode.db`
- Формат: SQLite

**Известно из opencode-usage (PyPI):**
- База содержит таблицы с токенами, моделями, провайдерами
- Есть поля для расчёта стоимости и времени
- Группировка по дням, сессиям, моделям

**Требуется исследовать:**
- Схему базы данных (таблицы, колонки)
- Как хранятся лимиты провайдера (если хранятся вообще)
- Или парсить JSONL логи для подсчёта токенов

**Структура класса:**
```python
class OpenCodeDataFetcher:
    DB_PATH = Path.home() / ".local" / "share" / "opencode" / "opencode.db"

    @staticmethod
    def _empty():
        return {
            "provider": "OpenCode", "plan": "Go",
            "updated": "Never", "source": "none",
            "session_used_pct": 0, "session_reset": "unknown",
            "cost_today": 0, "cost_30d": 0,
            # ...
        }

    def fetch(self):
        if not self.DB_PATH.exists():
            d["error"] = "OpenCode not installed"
            return d
        # Connect to SQLite
        # Query tokens, models, costs
        # Calculate percentages (нужно уточнить лимиты OpenCode Go)
```

**Важное уточнение:**
- OpenCode Go ($10/месяц) имеет лимиты, но они не публичны в API
- Возможно придётся парсить локальные логи или подсчитывать токены

**Действия:**
1. Исследовать структуру SQLite базы OpenCode
2. Реализовать запросы для получения токенов за день/неделю
3. Добавить расчёт процентов (если известны лимиты плана)
4. Интегрировать в UI

**Сложность:** Средняя-высокая (4-6 часов, зависит от структуры БД)

**Файлы:**
- `codexbar.py`: добавить класс после `MiniMaxDataFetcher`
- `codexbar.py`: добавить вкладку в UI (аналогично Z.AI)

---

### Этап 4: Интеграция вкладок в UI

**Тип агента:** developer

**Задача:**
Добавить вкладки MiniMax и OpenCode в `_build_ui()`, обновить `_switch_tab()` и `_do_swap()`.

**Изменения:**
1. **Tab bar:**
   - Добавить кнопки `_minimax_tab_btn` и `_opencode_tab_btn`
   - Загрузить иконки `minimax-logo.png`, `opencode-logo.png`

2. **Панели:**
   - `_build_minimax_panel(parent)` — аналогично `_build_zai_panel()`
   - `_build_opencode_panel(parent)` — аналогично

3. **Переключение:**
   - Обновить `_switch_tab()` для новых провайдеров
   - Обновить `_do_swap()` для смены цветовой схемы
   - Добавить цветовые палитры:
     ```python
     MM_BG = "#FFF8F0"      # MiniMax — тёплый оранжевый
     MM_ACCENT = "#FF6A00"
     OC_BG = "#1A1A2E"      # OpenCode — тёмный синий
     OC_ACCENT = "#00D4AA"
     ```

4. **Иконка tray:**
   - Обновить `make_icon()` для распознавания `provider="minimax"` и `provider="opencode"`
   - Добавить логотипы и цвета для новых провайдеров

**Сложность:** Средняя (3-4 часа)

**Файлы:**
- `codexbar.py`: `CodexBarPopup._build_ui()`, `_switch_tab()`, `_do_swap()`
- `codexbar.py`: `make_icon()`
- `assets/`: `minimax-logo.png`, `opencode-logo.png`

---

### Этап 5: Обновление SettingsPopup для хранения токенов

**Тип агента:** developer

**Задача:**
Расширить `SettingsPopup` для хранения токенов MiniMax и OpenCode.

**Изменения:**
```python
class SettingsPopup(ctk.CTkToplevel):
    # Добавить секции:
    # ── MiniMax API Token ──
    # ── OpenCode (авто из ~/.local/share/opencode/opencode.db) ─
```

**Для MiniMax:**
- Поле ввода токена (как Z.AI)
- Кнопка "Test" для проверки
- Сохранение в `settings.json`

**Для OpenCode:**
- Отображение пути к БД
- Возможно — выбор пути к БД (если нестандартный)

**Сложность:** Низкая (1-2 часа)

**Файлы:**
- `codexbar.py`: `SettingsPopup`

---

### Этап 6: Тестирование и отладка

**Тип агента:** qa

**Задача:**
Полное тестирование всех провайдеров и UI.

**Чек-лист:**
1. [ ] **Иконка tray:**
   - Проценты отображаются белым с чёрной обводкой
   - Цвет фона зависит от % (зелёный → жёлтый → красный)
   - Логотип провайдера виден
   - Точка-индикатор в углу

2. [ ] **Вкладки:**
   - Переключение всех 5 вкладок (Claude, OpenAI, Z.AI, MiniMax, OpenCode)
   - Анимация fade in/out работает
   - Цвета меняются корректно

3. [ ] **Данные провайдеров:**
   - Claude: тест с CLI / OAuth / cookie
   - OpenAI: тест с установленным Codex
   - Z.AI: тест с токеном
   - MiniMax: тест с реальным API
   - OpenCode: тест с установленным OpenCode

4. [ ] **Settings:**
   - Сохранение токенов
   - Загрузка токенов при старте

**Сложность:** Средняя (2-3 часа)

---

## Итого по этапам

| Этап | Задача | Тип | Сложность | Время |
|------|--------|-----|-----------|-------|
| 1 | Фикс иконки (чёрный текст) | bug-fix | Низкая | 1-2ч |
| 2 | MiniMaxDataFetcher | developer | Средняя | 3-5ч |
| 3 | OpenCodeDataFetcher | developer | Средняя-высокая | 4-6ч |
| 4 | Интеграция вкладок | developer | Средняя | 3-4ч |
| 5 | SettingsPopup | developer | Низкая | 1-2ч |
| 6 | Тестирование | qa | Средняя | 2-3ч |

**Общая оценка:** 14-22 часа работы

---

## Необходимые уточнения перед реализацией

### MiniMax:
1. ✅ **Endpoint найден:** `https://www.minimax.io/v1/api/openplatform/coding_plan/remains`
2. ❓ **Формат ответа:** нужен пример JSON-ответа (либо вызвать API вручную)
3. ❓ **Еженедельные лимиты:** FAQ упоминает 5ч rolling window, но есть ли недельные?

### OpenCode:
1. ✅ **Путь к БД:** `~/.local/share/opencode/opencode.db`
2. ❓ **Схема БД:** нужна структура таблиц (изучить Python-пакет opencode-usage или саму БД)
3. ❓ **Лимиты плана:** как узнать лимиты токенов для OpenCode Go?

### Иконка:
1. Нужен скриншот бага для понимания проблемы
2. Или просто протестировать на Windows

---

## Следующие шаги

1. **Уточнить у Романа:** точный формат ответа MiniMax API (можно сделать тестовый вызов)
2. **Исследовать:** SQLite базу OpenCode на реальной системе
3. **Начать с:** Этап 1 (фикс иконки) — это блокирующий баг

---

*План создан системным аналитиком Romul. Готов к передаче разработчикам.*