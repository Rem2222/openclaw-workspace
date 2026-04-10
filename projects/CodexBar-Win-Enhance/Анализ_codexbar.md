# Анализ CodexBar-Win — Паттерны для ZaiDataFetcher

## Источник
codexbar.py — GitHub CodexBar-Win (master branch), 1936 строк, v1.0.0

## Паттерн 1: DataFetcher класс

### Структура (на примере ClaudeDataFetcher + CodexDataFetcher)

**Конструктор:**
```python
class XxxDataFetcher:
    def __init__(self):
        self.data = self._empty()
```
- Без параметров — данные собираются внутри
- `self.data` — единый dict, обновляемый fetch-методами

**Метод `_empty()` — шаблон данных:**
```python
@staticmethod
def _empty():
    return {
        "provider": "Name",
        "plan": "Unknown",
        "updated": "Never",
        "source": "none",        # "none" | "api" | "cli" | "logs" | "sessions" | "config"
        "session_used_pct": 0,   # 0-100
        "session_reset": "unknown",
        "weekly_used_pct": 0,
        "weekly_reset": "unknown",
        "cost_today": 0.0,
        "cost_today_tokens": "0",
        "cost_30d": 0.0,
        "cost_30d_tokens": "0",
        "error": None,
        "installed": False,      # или "available": False для Codex
    }
```

**Главный метод `fetch()` / `fetch_all()`:**
- Вызывает несколько `_fetch_xxx()` методов по цепочке с fallback
- Каждый метод возвращает dict или None
- Первый успешный результат записывается в `self.data`
- В конце ставит `self.data["updated"] = datetime.now().strftime("Updated %H:%M")`
- Возвращает `self.data`

**Цепочка fallback (Claude):**
1. `_fetch_cli()` — PTY → CLI /usage
2. `_fetch_oauth_api()` — OAuth токен из файла → API
3. `_fetch_cookie_api()` — Cookie из браузера → API
4. `_fetch_jsonl()` — всегда, для cost данных (дополняет любой source)

**CodexDataFetcher проще:**
- `_scan_sessions()` — сканирует `~/.codex/sessions/*.jsonl`
- Читает config.toml для модели
- Читает auth.json для плана (JWT decode)

**Обработка ошибок:**
- Каждый `_fetch_xxx()` оборачён в try/except
- При ошибке → print + return None → fallback к следующему методу
- `_empty()` гарантирует консистентную структуру даже при полной неудаче

## Паттерн 2: Регистрация fetcher в главном цикле

**Класс `CodexBarApp` (строка 1791):**

```python
class CodexBarApp:
    def __init__(self):
        self.fetcher = ClaudeDataFetcher()
        self.codex_fetcher = CodexDataFetcher()
        self.codex_data = None
```

**Инициализация при старте (`start()`):**
```python
self.fetcher.fetch_all()                         # Claude
self.codex_data = self.codex_fetcher.fetch()      # Codex
```

**Данные передаются в popup:**
```python
self.popup = CodexBarPopup(
    self.root,
    self.fetcher.data,          # Claude data dict
    codex_data=self.codex_data, # Codex data dict
    ...
)
```

**Auto-refresh каждые 5 мин:**
```python
self.root.after(300_000, self._auto_refresh)
```
В `_do_refresh()` — фоновый поток вызывает fetch для обоих провайдеров.

**Для нового провайдера нужно:**
1. Добавить `self.zai_fetcher = ZaiDataFetcher()` в `__init__`
2. Добавить `self.zai_data = self.zai_fetcher.fetch()` в `start()`
3. Передать `zai_data=self.zai_data` в `CodexBarPopup`
4. Добавить в `_do_refresh()`

## Паттерн 3: UI tabs

**Tab bar** — горизонтальный `CTkFrame` с иконками-кнопками:
```python
tab_bar = ctk.CTkFrame(self, height=34)
self._tab_inner = ctk.CTkFrame(tab_bar, corner_radius=9)  # скруглённый контейнер

self._cl_tab_btn = ctk.CTkButton(
    tab_inner, text="", image=self._cl_tab_icon,
    corner_radius=8, height=26, width=34,
    command=lambda: self._switch_tab("claude"))
```

**Каждый tab = отдельный `CTkFrame`:**
- `self._claude_frame` → `_build_claude_panel()`
- `self._openai_frame` → `_build_openai_panel()`
- Переключение через `pack_forget()` / `pack()`

**Переключение (`_switch_tab(tab)`):**
1. Анимация fade-out (alpha 0.94→0, ~100ms)
2. `_do_swap()` — мгновенная смена: цвета, frame visibility, resize
3. Анимация fade-in (alpha 0→0.94 + slide-up 8px, ~170ms)

**Структура панели (оба провайдера идентичны):**
1. Gradient flare (декоративные полоски цвета)
2. Header: logo + название + badge плана
3. Meta: status dot + timestamp + source
4. Usage bars: Session %, Weekly % (progress bars)
5. Cost section: Today / 30 days (card с цифрами)
6. "Not installed" / "No data" fallback

**Usage bar виджет:**
```python
def _cl_usage_bar(self, parent, label, pct, reset=None):
    # label row
    # progress bar (CTkFrame трек + CTkFrame fill через .place(relwidth=pct/100))
    # reset text
```

**Для нового tab нужно:**
1. Добавить palette константы (цвета)
2. Добавить tab кнопку в `_tab_inner`
3. Создать `self._zai_frame` + метод `_build_zai_panel()`
4. Добавить case в `_do_swap()`
5. Передать `zai_data` в конструктор popup

## Паттерн 4: Config/settings

**CodexBar НЕ использует внешний config.json.** Все настройки хардкодятся.

**Пути к данным провайдеров:**
- Claude: `~/.claude/` (credentials, projects, JSONL logs)
- Codex: `~/.codex/` (config.toml, auth.json, sessions/*.jsonl)

**Для нового провайдера (Z.AI) нужно определить:**
- Где хранятся токены? (API key файл, OAuth, cookies)
- Есть ли локальные логи сессий для cost estimate?
- Есть ли API endpoint для usage?

**Если нужен config — паттерн из CodexDataFetcher:**
```python
config = Path.home() / ".zai" / "config.toml"
if config.exists():
    for line in config.read_text().splitlines():
        if line.startswith("api_key"):
            ...
```

## Заключение

### Что нужно для добавления ZaiDataFetcher:

1. **Создать класс `ZaiDataFetcher`** (по шаблону `CodexDataFetcher`):
   - `_empty()` → стандартный dict
   - `fetch()` → цепочка fallback методов
   - `_fetch_api()` → вызов Z.AI API с токеном
   - `_fetch_sessions()` → сканирование локальных логов (если есть)
   - Определить источник токена (API key файл, env var, etc.)

2. **Добавить в `CodexBarApp.__init__()`**:
   - `self.zai_fetcher = ZaiDataFetcher()`
   - `self.zai_data = None`

3. **Добавить в `CodexBarApp.start()`**:
   - `self.zai_data = self.zai_fetcher.fetch()`

4. **Добавить tab в `CodexBarPopup`**:
   - Palette константы для Z.AI (цвета бренда)
   - Tab кнопку с иконкой
   - `self._zai_frame` + `_build_zai_panel()`
   - Case в `_switch_tab()` / `_do_swap()`

5. **Добавить в refresh**:
   - `_do_refresh()` → `self.zai_data = self.zai_fetcher.fetch()`

### Ключевой принцип:
Каждый провайдер — **изолированный fetcher** + **свой UI panel**. Связь только через data dict. Регистрация — 3-4 строки в app классе.
