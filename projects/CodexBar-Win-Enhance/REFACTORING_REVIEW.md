## CodexBar Refactoring Review

### 🔴 Critical Issues (исправить немедленно)

1. **codexbar.py — Дублирование кода в `main()` premium_widget.py**
   - **Строка:** premium_widget.py:389-407
   - **Проблема:** `main()` создаёт виджет через `__new__` + ручную инициализацию вместо вызова `__init__`, дублируя всю логику инициализации. При этом в конце дважды повторяются `w.show(); w.raise_(); print; sys.exit(app.exec())` — вторая пара никогда не выполнится (после `sys.exit`).
   - **Исправление:** Использовать обычный `PremiumWidget(pos)` конструктор, убрать дублирующий код.

2. **codexbar.py — `ZaiDataFetcher._fetch_from_api` содержит мёртвый код после `return None`**
   - **Строка:** ~830 (`return result` после блока except)
   - **Проблема:** Последний `return result` в методе `_fetch_from_api` недостижим — все ветки внутри try/catch уже возвращают значение.
   - **Исправление:** Удалить мёртвый `return result`.

3. **codexbar.py — `OllamaDataFetcher._load_cookies_from_browser` выполняет отладочное сканирование SQLite в продакшн-коде**
   - **Строка:** ~960-990
   - **Проблема:** Метод открывает Cookies DB, сканирует ВСЕ хосты и имена cookie (включая отладочный лог), чего не должно быть в продакшн. Это замедляет старт и раскрывает конфиденциальные данные в лог-файлах.
   - **Исправление:** Удалить отладочный блок или заменить на conditional debug-only блок.

4. **codexbar.py — `_pty_usage` голый `cmd.exe /c claude` без экранирования пути**
   - **Строка:** ~330
   - **Проблема:** `PtyProcess.spawn("cmd.exe /c claude")` не использует найденный путь от `_find_claude()`. Если `claude` не в PATH, PTY-подход молча упадёт, хотя `_find_claude()` уже вернул путь.
   - **Исправление:** Передавать результат `_find_claude()` в `_pty_usage` и использовать его.

5. **codexbar.py — Небезопасное использование `ctypes` без проверки ошибок**
   - **Строки:** `_dpapi_decrypt`, `_copy_locked_file`, `_aes_gcm_decrypt`
   - **Проблема:** `ctypes.windll.kernel32.LocalFree` и `_k.CloseHandle` вызываются без проверки возврата. `GetLastError()` может быть перезаписан последующими вызовами.
   - **Исправление:** Сохранять `GetLastError()` сразу послеWin32 вызовов, проверять возврат `LocalFree`.

### 🟡 Medium Issues (нужно исправить)

6. **codexbar.py — Массивное дублирование palette-констант**
   - **Строки:** 1300-1380 (6 палитр: CL, ZA, OA, MM, OC + дублирование цветов)
   - **Проблема:** Практически все палитры идентичны (`#F8FAFE`, `#EEF2F8`, `#E4E8F0` и т.д.), отличаются только accent-цвета. Это ~80 строк дублирования.
   - **Исправление:** Создать базовую палитру через dict/functional и переопределять только accent.

7. **codexbar.py — `_do_swap()` — огромный метод с повторяющимся if/elif для 6 вкладок**
   - **Строка:** ~1400-1500
   - **Проблема:** Каждая вкладка дублирует один и тот же паттерн: `(bg, track, divider, accent, ...) = (self.ZA_BG, self.ZA_TRACK, ...)`. Все 6 веток идентичны.
   - **Исправление:** Свести к одной логике с dict lookup по tab name.

8. **codexbar.py — `_build_ui` и `_build_*_panel` — монструозные методы**
   - **Проблема:** `_build_ui` + 6 методов построения панелей занимают сотни строк с повторяющимся boilerplate (progressbar, label, layout). Каждый panel строится вручную с микро-отличиями.
   - **Исправление:** Вынести общий layout в helper-метод/класс, параметризовать accent цвет и лейблы.

9. **premium_widget.py и bar_widget.py — Дублирование `_set_click_through`**
   - **Строки:** premium_widget.py:230-260, bar_widget.py:120-150
   - **Проблема:** Идентичная реализация `_set_click_through` в обоих файлах.
   - **Исправление:** Вынести в общий модуль/примесь.

10. **premium_widget.py и bar_widget.py — Дублирование `_load_widget_settings`, `_save_settings`**
    - **Проблема:** near-идентичная логика загрузки/сохранения настроек.
    - **Исправление:** Общий utility модуль.

11. **codexbar.py — `_CookieDecryptor` — потенциальная SQL-инъекция**
    - **Строка:** `_read_cookies` использует f-string для `placeholders` (безопасно: `",".join("?" * len(cookie_names))`), но `host` передаётся как параметр. Однако `_read_cookie` использует конкатенацию строк для SQL-запроса.
    - **Строка:** ~280
    - **Проблема:** `host_key IN ('.claude.ai','claude.ai')` — захардкожено, не параметризовано. Не прямая инъекция (константы), но плохой паттерн.
    - **Исправление:** Параметризовать все SQL-запросы.

12. **codexbar.py — Временные файлы Cookies DB не всегда очищаются**
    - **Строки:** `_read_cookie`, `_read_cookies`
    - **Проблема:** `tempfile.NamedTemporaryFile(delete=False)` создаёт файл, который удаляется в `finally`, но если процесс упадёт между созданием и `finally`, файл остаётся.
    - **Исправление:** Использовать `tempfile.TemporaryDirectory` или `contextlib`.

13. **codexbar.py — `_fetch_jsonl` не учитывает кэш-токены за сегодня**
    - **Строка:** ~480
    - **Проблема:** `ct` (cost today) не включает `cache_read/today`, хотя `c30` включает `total_cache`. Несогласованность.
    - **Исправление:** Добавить подсчёт cache токенов за сегодня.

14. **bar_widget.py — `_poll_file` не обрабатывает `"quit"` и `"off"` корректно**
    - **Строка:** bar_widget.py:80
    - **Проблема:** Проверяет `if data == self._last_data or data in ("quit", "off")`, но при `"quit"` должен выйти из приложения, а при `"off"` — скрыть виджет. Сейчас оба сигнала молча игнорируются.
    - **Исправление:** Добавить обработку `"quit"` → `QApplication.quit()`, `"off"` → скрыть виджет.

15. **codexbar.py — `MiniMaxDataFetcher._parse` — путаница с `remaining` vs `used`**
    - **Строка:** ~740-750
    - **Проблема:** Переменная `remaining` затеняется: сначала `remaining = cp.get("current_interval_usage_count"...)`, потом `remaining = max(0, ts - datetime.now().timestamp())`. Shadowing.
    - **Исправление:** Переименовать вторую в `secs_remaining` или `delta`.

### 🟢 Minor Issues / Suggestions

16. **codexbar.py — `import math` внутри `_make_openai_icon`**
    - **Строка:** ~560
    - **Проблема:** Import внутри функции. Перенести наверх файла.

17. **codexbar.py — `_d` используется но не определён в видимом коде**
    - **Строка:**多处 (`_d(f"[POPUP]...`)`)
    - **Проблема:** `_d` — debug-функция, но её определение где-то ниже в усечённом коде. Убедиться что она определена до первого использования или вынести в отдельный модуль.

18. **codexbar.py — `VERSION = "2.2.70"` — захардкожена**
    - **Проблема:** Версия не синхронизируется с package.json/pyproject.toml.
    - **Исправление:** Читать из одного источника (например `__version__` в `__init__.py`).

19. **premium_widget.py — `_OPACITY_LEVELS` повторяется в bar_widget.py**
    - **Проблема:** Одинаковый список `[0.25, 0.50, 0.75, 1.0]` в обоих файлах.
    - **Исправление:** Общая константа.

20. **codexbar.py — PEP 8 нарушения**
    - Длинные строки (>200 символов) во многих местах
    - Несколько blank lines внутри методов
    - `except Exception: pass` — слишком широкий catch без логирования

21. **codexbar.py — `_call_claude_api` не обрабатывает таймаут отдельно**
    - **Проблема:** `timeout=15` захардкожен, нет retry, нет экспоненциальной задержки.
    - **Исправление:** Добавить retry с backoff.

22. **codexbar.py — `make_icon` — неиспользуемый параметр `wp`**
    - **Строка:** ~580
    - **Проблема:** `wp` (weekly percentage) не используется в функции, только в docstring.
    - **Исправление:** Удалить или использовать.

23. **codexbar.py — `_CookieDecryptor` — класс-методы вместо static-методов**
    - **Проблема:** Вс© методы `@classmethod`, но `cls` не используется для полиморфизма. Нет необходимости в classmethod для утилитных методов.
    - **Исправление:** Можно оставить, но это неидеальный паттерн.

24. **bar_widget.py — `_poll_count` установлен в `main()`, но не в `__init__`**
    - **Строка:** bar_widget.py:172
    - **Проблема:** В `main()` `w._poll_count = 0`, но в `BarWidget.__init__` нет `self._poll_count`.
    - **Исправление:** Инициализировать в `__init__`.

25. **codexbar.py — `OllamaDataFetcher` — неработающий парсер HTML (TODO в коде)**
    - **Строка:** ~1010
    - **Проблема:** В коде прямиком написано "TODO: Ollama.com HTML structure for usage data is not yet reverse-engineered". Парсер — заглушка.
    - **Исправление:** Либо доработать, либо явно возвращать ошибку "not implemented".

26. **codexbar.py — `OpenCodeDataFetcher` — `import re as _re` внутри метода `fetch`**
    - **Строка:** ~870
    - **Проблема:** `re` уже импортирован наверху файла. Локальный `import re as _re` внутри метода бессмысленен и запутывает.
    - **Исправление:** Использовать уже импортированный `re`.

27. **premium_widget.py — `WeeklyBar` создаёт `QPropertyAnimation` в `set_wp` без остановки предыдущей**
    - **Строка:** premium_widget.py:88
    - **Проблема:** Каждый вызов `set_wp` создаёт новую анимацию, не останавливая предыдущую. Возможна утечка памяти при частых обновлениях.
    - **Исправление:** Сохранять анимацию как `self._anim` и вызывать `self._anim.stop()` перед созданием новой.

### 📊 Statistics

- Total lines: 5303
- Functions: 195
- Classes: 14
- Issues found: 27 (5 critical, 10 medium, 12 minor)

### 🔧 Top Recommendations

1. **Вынести общую логику виджетов** (click-through, settings, opacity) в отдельный модуль-примесь
2. **Параметризовать палитры** — вместо 6 наборов констант создать dict с accent-цветами
3. **Рефакторинг `_do_swap`** — единственный dict lookup вместо 6 одинаковых elif-блоков
4. **Удалить мёртвый код** — недостижимый `return result`, дублирующий `show/raise_/sys.exit`
5. **Параметризовать SQL** в `_read_cookie` для consistency с `_read_cookies`