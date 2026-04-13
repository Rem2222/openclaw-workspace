# Cookie Decryptor

Извлечённые процедуры из CodexBar-Win 0.2 для расшифровки Chromium cookies.

## Возможности

- **Чтение cookies** из Chrome, Edge, Brave
- **Расшифровка** через DPAPI + AES-256-GCM
- **Поддержка v10** cookies (Chromium v80-126)
- **Автоопределение браузера** с cookie для хоста

## Установка

```bash
cd cookie-decryptor
pip install .
```

## Использование

### Как модуль

```python
from cookie_decryptor import CookieDecryptor

# Получить sessionKey для Claude.ai
value, browser = CookieDecryptor.get_session_key()
print(f"{browser}: {value}")

# Получить конкретные cookies для домена
cookies = CookieDecryptor.get_cookies('.opencode.ai', 'sessionKey', 'auth_token')
print(cookies['sessionKey'])

# Получить ВСЕ cookies для домена
all_cookies = CookieDecryptor.get_all_cookies('.minimax.io')
```

### CLI

```bash
# Получить sessionKey для Claude
python cookie_decryptor.py --session

# Получить конкретные cookies
python cookie_decryptor.py --host .opencode.ai --cookies sessionKey auth_token

# Получить все cookies для домена
python cookie_decryptor.py --host .minimax.io --all
```

## Поддерживаемые браузеры

| Браузер | Путь |
|---------|------|
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data` |
| Brave | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data` |

## Ограничения

- **Только Windows** (использует DPAPI/Bcrypt через ctypes)
- **Chromium v10** (v80-126) — поддерживается
- **Chromium v20** (v127+) — НЕ поддерживается (требует App-Bound Encryption)
- **Firefox** — не поддерживается

## Структура кода

```
cookie_decryptor.py
├── CookieDecryptor class
│   ├── get_session_key()      # sessionKey для Claude
│   ├── get_cookies()          # произвольные cookies
│   ├── get_all_cookies()      # все cookies хоста
│   ├── _dpapi_decrypt()       # Windows DPAPI
│   ├── _aes_gcm_decrypt()     # AES-256-GCM через BCrypt
│   ├── _master_key()          # ключ из Local State
│   └── _decrypt_value()       # определение версии и расшифровка
```

## Примеры для сервисов

| Сервис | Домен | Cookie |
|--------|-------|--------|
| Claude | .claude.ai | sessionKey |
| OpenCode | .opencode.ai | sessionKey |
| MiniMax | .minimax.io | session_id |

## Интеграция с MCP

Для создания MCP сервера см. `cookie_decryptor_mcp.py` (планируется).
