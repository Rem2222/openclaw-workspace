# Bot для TrueConf

Бот для TrueConf, подключающийся к OpenClaw Gateway. Пересылает сообщения пользователей ИИ-агенту, обрабатывает ответы (текст, файлы, изображения) и возвращает их в чат TrueConf. Поддерживает авторизацию по email-белому списку, rate limiting и работу с файлами.

## Возможности

- **Текстовые сообщения** — пересылка вопросов агенту, синхронные и потоковые ответы (FR-3, FR-4)
- **Команды** — `/help`, `/status`, `/clear` для управления сессией (FR-5..FR-7)
- **Ответы на конкретные сообщения** — reply-to для контекстных вопросов (FR-8)
- **Обработка файлов** — отправка файлов/изображений агенту через `/v1/responses` (FR-12, FR-14)
- **Файлы от агента** — получение и скачивание файлов, сгенерированных агентом (FR-15)
- **Индикаторы активности** — отображение статуса «печатает» и индикаторов инструментов (FR-16, FR-17)
- **Авторизация** — белый список email-адресов TrueConf (FR-1)
- **Rate limiting** — защита от перегрузки: 30 запросов/мин на пользователя (FR-2)
- **Безопасность** — Gateway только на loopback/tailnet, токен в env, XSS-санитизация ответов
- **Markdown → HTML** — автоматическая конвертация ответов агента для TrueConf

## Быстрый старт

### Требования

- Python 3.11+
- TrueConf Server/Cloud аккаунт
- OpenClaw Gateway (настроенный и запущенный)

### Установка

```bash
git clone <repo-url>
cd bot_trueconf
pip install -e ".[dev]"
cp .env.example .env
# Заполнить .env (см. раздел Конфигурация)
```

### Запуск

**Development:**
```bash
python -m bot_trueconf
```

**Docker:**
```bash
docker compose up -d
```

## Структура проекта

```
bot_trueconf/
├── bot_trueconf/
│   ├── __init__.py
│   ├── gateway/
│   │   └── client.py        # HTTP-клиент для OpenClaw Gateway
│   ├── handlers/
│   │   ├── commands.py       # Обработчики команд (/help, /status, /clear)
│   │   ├── message.py        # Обработчик текстовых сообщений
│   │   ├── files.py          # Обработчик файлов и изображений
│   │   └── indicators.py     # SSE-индикаторы активности
│   ├── auth/
│   │   ├── middleware.py      # Авторизация (email whitelist)
│   │   ├── rate_limiter.py    # Rate limiting (30 req/min)
│   │   └── session.py        # Управление сессиями
│   └── utils/
│       └── formatter.py       # Markdown → HTML конвертация
├── tests/
│   ├── test_gateway.py
│   ├── test_commands.py
│   ├── test_files.py
│   └── test_message.py
├── pyproject.toml
├── .env.example
└── docker-compose.yml
```

## Конфигурация

Все настройки через переменные окружения (файл `.env`):

| Переменная | Обязательная | По умолчанию | Описание |
|---|---|---|---|
| `GATEWAY_URL` | Да | — | URL OpenClaw Gateway (только loopback/tailnet!) |
| `GATEWAY_TOKEN` | Да | — | Bearer-токен для авторизации в Gateway |
| `BOT_TOKEN` | Да | — | Токен бота TrueConf |
| `ALLOWED_USERS` | Нет | (пусто) | Список email через запятую для white-list |
| `REQUEST_TIMEOUT` | Нет | `120` | Таймаут запросов к Gateway (секунды) |

### ⚠️ Безопасность

- **Gateway должен быть доступен только на `127.0.0.1` или private tailnet** — endpoint даёт operator-уровень доступа
- **Не публикуйте** `GATEWAY_TOKEN` в git — используйте env vars или secrets
- При shared-secret auth запросы имеют **полный** operator-доступ, без per-user scopes

## API

Бот использует два эндпоинта OpenClaw Gateway:

| Эндпоинт | Назначение |
|---|---|
| `POST /v1/chat/completions` | Текстовые сообщения (OpenAI-совместимый) |
| `POST /v1/responses` | Файлы и изображения (multimodal) |

**Session routing:** Заголовок `x-openclaw-session-key: trueconf_{user_id}` обеспечивает изоляцию сессий пользователей.

## Тестирование

```bash
# Полный набор тестов
pytest -v

# С покрытием
pytest --cov=bot_trueconf -v

# Линтинг
ruff check .
```

**Текущий статус:** 31/31 тестов проходят (см. [QA Отчёт](../QA_Отчёт.md)).

## Архитектура

Подробное описание архитектуры — в [ARCHITECTURE.md](./ARCHITECTURE.md).

## Лицензия

MIT
