---
description: CodexBar-Win умеет расшифровывать Chromium cookies через DPAPI + AES-GCM. Эта технология позволяет создавать API для извлечения кукисов из Chrome/Edge/Brave.
---

# CodexBar-Win Cookie Decryption

CodexBar-Win уже умеет расшифровывать Chromium cookies. Это позволяет создавать инструменты, которые извлекают сессионные кукисы из браузеров для использования в API.

## Как это работает

### Архитектура

```python
_CookieDecryptor  # DPAPI + BCrypt AES-GCM для Chromium cookies
```

### Поддерживаемые браузеры (v10 cookies)

CodexBar-Win работает с **Chromium v10 cookies** (Chromium v80-126):
- Google Chrome
- Microsoft Edge
- Brave
- любой Chromium-based браузер

### Алгоритм расшифровки

1. **Чтение Local State** — `User Data\Local State` содержит ключ шифрования
2. **DPAPI** — Windows API для доступа к мастер-ключу
3. **AES-256-GCM** — расшифровка кукисов через bcrypt.dll

### Код из CodexBar-Win

```python
class _CookieDecryptor:
    """Decrypts Chromium cookies using DPAPI + AES-GCM"""
    
    def decrypt(self, encrypted_value: bytes) -> str:
        # 1. Get master key from Local State via DPAPI
        # 2. Decrypt using AES-256-GCM via bcrypt.dll
        # 3. Return plaintext cookie value
```

### Файлы cookie database

| Браузер | Путь |
|---------|------|
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Network\Cookies` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Network\Cookies` |
| Brave | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Network\Cookies` |

## Ограничения

### v20 cookies (Chromium 127+)
**НЕ поддерживаются.** Chromium 127+ использует App-Bound Encryption, который требует:
- COM object для Chrome elevation service
- Elevated permissions
- **НЕ реализовано** в CodexBar-Win

### Firefox
**НЕ поддерживается.** Firefox использует SQLite с `moz_cookies` таблицей, формат отличается от Chromium.

## Практическое применение

### Создание API для извлечения кукисов

Можно написать Python-скрипт, который:
1. Читает кукисы из Chromium browsers
2. Расшифровывает через DPAPI + AES-GCM
3. Отдаёт кукисы для нужного домена

### Пример использования

```python
from cookie_decryptor import CookieDecryptor

decryptor = CookieDecryptor(browser='chrome')

# Получить кукис для домена
cookie = decryptor.get_cookie('.opencode.ai', 'sessionKey')
print(cookie.value)  # sess_xxxxx...

cookie = decryptor.get_cookie('.minimax.io', 'session_id')  
print(cookie.value)  # xxxxxx...
```

### Для каких сервисов пригодится

| Сервис | Кукис | Домен |
|--------|-------|-------|
| OpenCode | sessionKey | .opencode.ai |
| MiniMax | session_id | .minimax.io |
| Cursor | session_id | .cursor.com |
| Claude Web | session_key | .claude.ai |

## Аналоги

### macOS CodexBar
- Использует **Keychain** для доступа к кукисам
- WKWebView для извлечения
- **НЕ использует** DPAPI

### Node.js решения
- `electron-cookies` — для Electron apps
- `chrome-cookies-secure` — требует Chrome запущенный с `--enable-encrypted-cookies`

## Источники

- CodexBar-Win: https://github.com/babakarto/CodexBar-Win
- Файл: `codexbar.py` — класс `_CookieDecryptor`
- Windows DPAPI: https://docs.microsoft.com/en-us/windows/win32/api/dpapi/
- AES-GCM via bcrypt: https://docs.microsoft.com/en-us/windows/win32/api/bcrypt/

## Связанные страницы

- [[codexbar-win]] — CodexBar-Win
- [[opencode]] — OpenCode
- [[minimax]] — MiniMax (китайский AI)

---

*Технология: DPAPI + AES-256-GCM, Python, ctypes (без внешних крипто-библиотек)*
