---
description: Извлечённые процедуры из CodexBar-Win для расшифровки Chromium cookies. Windows-only, DPAPI + AES-GCM.
---

# Cookie Decryptor

Извлечённые процедуры из CodexBar-Win 0.2 для работы с Chromium cookies.

## Быстрый старт

```python
from cookie_decryptor import CookieDecryptor

# sessionKey для Claude
value, browser = CookieDecryptor.get_session_key()

# Cookies для любого хоста
cookies = CookieDecryptor.get_cookies('.opencode.ai', 'sessionKey')
```

## Проект

**Путь:** `projects/cookie-decryptor/`

**Файлы:**
- `cookie_decryptor.py` — основной модуль
- `README.md` — документация

## Архитектура

```python
CookieDecryptor
├── get_session_key()    # → (value, browser)
├── get_cookies()        # → {name: value}
└── get_all_cookies()    # → {name: value}
```

## Технологии

- **DPAPI** — Windows Data Protection API (crypt32.dll)
- **AES-256-GCM** — шифрование через bcrypt.dll
- **SQLite** — чтение cookies database

## Ограничения

| Версия | Браузер | Статус |
|--------|---------|--------|
| v10 | Chromium v80-126 | ✅ Работает |
| v20 | Chromium v127+ | ❌ Требует App-Bound |

## Связанные страницы

- [[codexbar-win]] — CodexBar-Win
- [[codexbar-win-cookie-decryption]] — оригинальная документация
