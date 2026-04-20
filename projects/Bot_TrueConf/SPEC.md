# SPEC.md — Bot для Труконф

## 1. Описание задачи

Бот для TrueConf Server (TrueConf Messenger) — аналог Telegram-бота OpenClaw, но работающий в экосистеме TrueConf. Бот пересылает сообщения пользователей в ИИ-агента OpenClaw через OpenClaw Gateway и возвращает ответ.

**Решает задачу:** дать пользователям TrueConf доступ к ИИ-ассистенту (аналогично тому, как уже работает Telegram-бот OpenClaw).

## 2. Цель проекта

Предоставить сотрудникам TrueConf (только `skogorev@team.trueconf.com` и `skogorev@demo.trueconf.com`) доступ к ИИ-ассистенту через мессенджер TrueConf Messenger с полным набором возможностей OpenClaw-агента: tools, skills, файлы, сессии.

## 3. Архитектура решения

```
┌─────────────────────────────────────────────────────────────────────┐
│  TrueConf Messenger                                                 │
│  (клиент Романа / сотрудников TrueConf)                              │
└────────────────────┬────────────────────────────────────────────────┘
                     │ TrueConf ChatBot API (WebSocket)
                     │ Авторизация: username + password
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  bot_trueconf/                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Python-процесс: python-trueconf-bot v1.2.x                   │   │
│  │  • Dispatcher + Router (aiogram-style)                       │   │
│  │  • Авторизация по allowlist (email)                          │   │
│  │  • Сессии пользователей (3 часа idle → сброс)                │   │
│  │  • Очередь сообщений + rate limiting                         │   │
│  │  • Файловая обработка (download → upload к агенту)           │   │
│  │  • Форматирование: Markdown → HTML (TrueConf compatible)    │   │
│  │  • Редактирование сообщений (tool indicators)                 │   │
│  └──────────────────────────┬────────────────────────────────────┘   │
│                              │ HTTP POST /tools/invoke               │
│                              │ (или WebSocket gateway protocol)      │
└──────────────────────────────┼──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OpenClaw Gateway (:18789)                                          │
│  • sessions.send  → отправка в агента                                │
│  • sessions.create / sessions.reset / sessions.get                   │
│  • tools.invoke  → файловые операции                                │
│  • chat.send     → доставка ответа обратно                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Стек

- **Язык:** Python 3.10+
- **Библиотека TrueConf:** [python-trueconf-bot](https://github.com/trueconf/python-trueconf-bot) v1.2.x
- **Интеграция с OpenClaw:** HTTP API (`/tools/invoke`, `sessions.send`)
- **Форматирование:** Markdown ↔ HTML (TrueConf не поддерживает Markdown напрямую)

## 4. Функциональные требования

### 4.1 Авторизация и доступ

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-1 | Доступ только для `skogorev@team.trueconf.com` и `skogorev@demo.trueconf.com` | Фильтрация по `message.user.username` или `message.user.id` в Dispatcher |
| FR-2 | Авторизация бота на TrueConf Server — логин/пароль (не токен) | `Bot.from_credentials(username, password, server)` |

### 4.2 Коммуникация с агентом

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-3 | Пересылка текстовых сообщений в OpenClaw Gateway | `sessions.send` через HTTP POST `/tools/invoke` |
| FR-4 | Ответы через текущую модель агента | Агент выбирает модель сам; бот только доставляет |
| FR-5 | Доступ ко всем tools и skills агента | Полный набор tools доступен через сессию агента |
| FR-6 | Реакция на любой текст (не только команды) | `router.message(F.text)` — ловит всё текстовое |
| FR-7 | Команды `/start`, `/help`, `/status`, `/reset` обрабатываются агентом | Префикс `/` отправляется как обычное сообщение агенту |

### 4.3 Форматирование и UX

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-8 | Хорошее форматирование текста | Markdown → HTML конвертация; `ParseMode.HTML` при отправке |
| FR-9 | "Барыга ищет товар" вместо typing indicator | `msg.answer("Барыга ищет товар... 🕵️")` сразу при получении |
| FR-10 | Индикация tools (🐍 execute_code:, 💻 terminal:) | Редактирование сообщения бота: `message.edit_text()` |
| FR-11 | Чтение оригинального сообщения при reply | `message.reply_to_message` → включение в контекст сессии |

### 4.4 Файлы

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-12 | Получение файлов от пользователя | `MessageType.ATTACHMENT`; скачивание через `message.download()` |
| FR-13 | Отправка файлов пользователю | `message.answer()` с `attachment` или `message.reply()` |
| FR-14 | Файлы с подписями (caption) | `message.caption` или связанное сообщение |
| FR-15 | Выгрузка файлов по запросу (архивы, картинки) | Tool `fs_read` / `file_upload` через gateway |

### 4.5 Сессии

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-16 | Сессии сохраняются | Session key = user_id в TrueConf; персистентность через Gateway |
| FR-17 | Обрыв сессии: `/reset` или 3 часа без активности | `sessions.reset` по команде; TTL-таймер сбрасывает при inactivity |
| FR-18 | Сообщение об ошибке при отвале сессии | `try/except` при `sessions.send`; отправка ошибки пользователю |

### 4.6 Работа как Telegram-бот (user experience)

| # | Требование | Реализация |
|---|-----------|-----------|
| FR-19 | Per-user сессии (как в Telegram-боте) | Одна сессия = один TrueConf user_id |
| FR-20 | Очередь обработки (не блокировать long-running) | `asyncio.Queue` + воркер-таск |

## 5. Нефункциональные требования

### 5.1 Производительность
- Ожидание ответа агента: до 60 сек (gateway timeout)
- Очередь входящих сообщений: без ограничений (asyncio)
- Максимум 128 WebSocket-соединений на TrueConf Server (лимит TrueConf)

### 5.2 Безопасность
- **Allowlist email:** проверка `skogorev@team.trueconf.com` и `skogorev@demo.trueconf.com`
- **Gateway auth:** Bearer token из `OPENCLAW_GATEWAY_TOKEN`
- **TrueConf auth:** логин/пароль бота (не токен)
- **SSL:** `verify_ssl=False` только для dev-стенда; prod — `True`
- Файлы скачиваются в tmpfs/ ramdisk, не на диск

### 5.3 Надёжность
- Автопереподключение WebSocket (python-trueconf-bot делает сам)
- Rate limit на отправку: не более 5 сообщений/сек в один чат
- Timeout на ответ агента: 120 сек

### 5.4 Логирование
- Python stdlib `logging` с ротацией
- Логировать: входящие сообщения, ошибки gateway, отвалы сессий
- Не логировать: тела ответов агента (безопасность)

## 6. API и интеграции

### 6.1 TrueConf Bot API

Документация: [TrueConf Server Chatbot API](https://trueconf.com/docs/chatbot-connector/en/overview/)

```python
from trueconf import Bot, Dispatcher, Router, Message, F, ParseMode
from trueconf.enums import MessageType

bot = Bot.from_credentials(
    username=CONFIG["username"],
    password=CONFIG["password"],
    server=CONFIG["server"],       # video.example.com
    dispatcher=dp,
)

# Ответ на текст
@router.message(F.text)
async def handle_text(msg: Message):
    await msg.answer("текст", parse_mode=ParseMode.HTML)

# Ответ на файл
@router.message(F.type == MessageType.ATTACHMENT)
async def handle_file(msg: Message):
    await msg.download()  # скачать файл
    await msg.answer("получил файл")

# Reply (цитирование)
@router.message(F.reply_to_message)
async def handle_reply(msg: Message):
    original = msg.reply_to_message.text
```

**Важные поля Message:**
- `msg.content.text` — текст
- `msg.content.type` — тип (text, attachment, etc.)
- `msg.user.id` / `msg.user.username` — идентификация отправителя
- `msg.reply_to_message` — оригинальное сообщение при reply
- `msg.caption` — подпись к файлу
- `msg.chat.id` — ID чата

### 6.2 OpenClaw Gateway API

Адрес: `http://<gateway-host>:18789`

**Авторизация:**
```
Authorization: Bearer <OPENCLAW_GATEWAY_TOKEN>
```

**Основные endpoints:**

| Метод | Endpoint | Назначение |
|-------|----------|-----------|
| `POST` | `/tools/invoke` | Вызов tools (fs_read, spawn, etc.) |
| `POST` | `/sessions.send` | Отправка сообщения в сессию агента |
| `POST` | `/sessions.create` | Создание новой сессии |
| `POST` | `/sessions.reset` | Сброс сессии |
| `GET`  | `/sessions.get` | Получить состояние сессии |

**sessions.send request:**
```json
POST /tools/invoke
{
  "tool": "sessions.send",
  "args": {
    "sessionKey": "trueconf_{user_id}",
    "text": "сообщение от пользователя"
  }
}
```

**sessions.send response** — асинхронный; ответы летят как events в WebSocket или через separate receive loop.

### 6.3 Bot ↔ Gateway integration pattern

```
Пользователь → TrueConf → Bot (Python)
                          │
                          │ sessions.send (HTTP)
                          ▼
                    OpenClaw Gateway
                          │
                          │ agent processing
                          ▼
                    ИИ-агент
                          │
                          │ chat.send / sessions.messages events
                          ▼
                    Gateway → Bot
                          │
                          │ msg.answer() / message.edit_text()
                          ▼
                    TrueConf → Пользователь
```

**Receiving agent responses** — три варианта:
1. **WebSocket-подписка** на сессию (`sessions.messages.subscribe`) — events летят в real-time
2. **Polling** `sessions.get` каждые 2 сек во время ожидания
3. **Callback URL** — TrueConf не поддерживает callbacks

**Рекомендация:** Вариант 2 (polling с backoff) или WebSocket-подписка.

## 7. Конфигурация

### 7.1 config.toml (бота)

```toml
[trueconf]
server = "video.example.com"        # TrueConf Server address
username = "openclaw_bot"           # Bot account login
password = "verystrongpassword"     # Bot account password
ssl_verify = true                   # or false for dev

[gateway]
host = "localhost"                  # OpenClaw Gateway host
port = 18789                        # OpenClaw Gateway port
token = "secret_token_here"         # OPENCLAW_GATEWAY_TOKEN

[access]
allowed_users = [
    "skogorev@team.trueconf.com",
    "skogorev@demo.trueconf.com"
]

[session]
idle_timeout_hours = 3
session_key_prefix = "trueconf_"

[bot]
typing_placeholder = "Барыга ищет товар... 🕵️"
```

### 7.2 Переменные окружения

```bash
OPENCLAW_GATEWAY_TOKEN=secret_token_here
TRUECONF_SERVER=video.example.com
TRUECONF_USERNAME=openclaw_bot
TRUECONF_PASSWORD=verystrongpassword
```

## 8. Критерии приёмки

### 8.1 Авторизация
- [ ] Бот подключается к TrueConf Server с логином/паролем
- [ ] Сообщения от `skogorev@team.trueconf.com` обрабатываются
- [ ] Сообщения от любого другого пользователя — игнорируются ( нет ответа)

### 8.2 Основной сценарий
- [ ] Пользователь отправляет текст → бот пересылает в Gateway → получает ответ → отправляет пользователю
- [ ] Ответ содержит форматирование (bold, italic, code)
- [ ] "Барыга ищет товар..." показывается сразу при получении

### 8.3 Команды
- [ ] `/start` — ответ агента (а не бота напрямую)
- [ ] `/help` — ответ агента
- [ ] `/status` — ответ агента
- [ ] `/reset` — сессия сбрасывается, пользователю приходит подтверждение

### 8.4 Файлы
- [ ] Пользователь отправляет файл → бот скачивает → передаёт агенту
- [ ] Агент возвращает файл → бот отправляет пользователю
- [ ] Caption (подпись) файла передаётся вместе с файлом

### 8.5 Сессии
- [ ] Повторное сообщение через 1 час → та же сессия
- [ ] Повторное сообщение через 4 часа → новая сессия
- [ ] `/reset` → новая сессия

### 8.6 Tool indicators
- [ ] Когда агент выполняет `execute_code` → сообщение редактируется: "🐍 execute_code: ..."
- [ ] Когда агент выполняет `terminal` → сообщение редактируется: "💻 terminal: ..."
- [ ] После завершения — финальный ответ подставляется

### 8.7 Reply
- [ ] Пользователь reply на сообщение бота → оригинальный текст включён в контекст

### 8.8 Ошибки
- [ ] Gateway недоступен → пользователю: "⚠️ Ошибка подключения к ассистенту. Попробуйте позже."
- [ ] Сессия отвалилась → пользователю: "⚠️ Сессия истекла. Отправьте сообщение заново."

## 9. Структура проекта

```
bot_trueconf/
├── config.toml              # Конфигурация
├── requirements.txt         # python-trueconf-bot>=1.2.0
├── main.py                  # Entry point
├── app/
│   ├── __init__.py
│   ├── bot.py               # Инициализация Bot, Dispatcher, Router
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── text.py          # Обработка текста (F.text)
│   │   ├── files.py         # Обработка файлов (MessageType.ATTACHMENT)
│   │   ├── commands.py      # /start, /help, /status, /reset
│   │   └── replies.py       # Reply handling
│   ├── gateway/
│   │   ├── __init__.py
│   │   ├── client.py        # HTTP-клиент для Gateway
│   │   ├── sessions.py      # Управление сессиями
│   │   └── tools.py         # Tool invocation
│   ├── formatter.py         # Markdown → HTML конвертация
│   ├── session_store.py     # Персистентное хранение session keys
│   ├── allowed_users.py     # Фильтрация доступа
│   └── utils.py             # Rate limiting, etc.
├── tests/
│   ├── __init__.py
│   ├── test_handlers.py
│   ├── test_gateway.py
│   └── test_formatter.py
└── README.md
```
