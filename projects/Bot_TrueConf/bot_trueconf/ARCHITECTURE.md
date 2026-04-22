# Архитектура Bot для TrueConf

## Общий поток сообщений

```
Пользователь (TrueConf)
        │
        ▼
  ┌─────────────┐    auth middleware    ┌──────────────┐
  │ TrueConf Bot │◄────────────────────│   Rate Limiter │
  │  (handlers)  │    (email whitelist) └──────────────┘
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐    POST /v1/chat/completions     ┌──────────────────┐
  │   Gateway    │─────────────────────────────────►│  OpenClaw Agent  │
  │   Client     │    POST /v1/responses (files)    │  (LLM + Tools)   │
  └──────┬──────┘◄─────────────────────────────────└──────────────────┘
         │              JSON / SSE ответ
         ▼
  ┌─────────────┐
  │  Formatter   │   Markdown → HTML
  │  (utils)     │   Парсинг OPENCLAW_FILE блоков
  └──────┬──────┘
         │
         ▼
  Пользователь (TrueConf)
   текст + файлы
```

## Компоненты

### 1. Auth Middleware (`auth/middleware.py`)
- Проверка email пользователя против белого списка (`ALLOWED_USERS`)
- Если список пуст — доступ разрешён всем
- Вызывается до обработки любого сообщения

### 2. Rate Limiter (`auth/rate_limiter.py`)
- Token bucket: 30 запросов в минуту на пользователя
- Возвращает `429 Too Many Requests` при превышении
- Защищает Gateway от перегрузки

### 3. Session Manager (`auth/session.py`)
- Привязка сессии к `trueconf_{user_id}` через `x-openclaw-session-key`
- Управление историей对话 в рамках сессии
- Команда `/clear` сбрасывает сессию

### 4. Gateway Client (`gateway/client.py`)
- **HTTP-клиент** на `httpx.AsyncClient`
- Два режима запросов:
  - **Sync** (`stream: false`) — текстовые сообщения, ждать полный ответ
  - **Stream** (`stream: true`) — SSE-поток для индикаторов активности
- Retry при 429 (exponential backoff)
- Таймаут: 120 секунд (настраиваемый)
- Endpoints:
  - `/v1/chat/completions` — текст
  - `/v1/responses` — файлы/изображения

### 5. Handlers (`handlers/`)

| Хендлер | Файл | Назначение |
|---------|------|------------|
| Commands | `commands.py` | `/help`, `/status`, `/clear` |
| Message | `message.py` | Текстовые сообщения, reply-to |
| Files | `files.py` | Загрузка/отправка файлов, base64, лимит 10 MB |
| Indicators | `indicators.py` | SSE-парсинг, «печатает...», tool indicators |

### 6. Formatter (`utils/formatter.py`)
- **Markdown → HTML** конвертация для TrueConf
- **XSS-санитизация** ответов
- **Парсинг `OPENCLAW_FILE`** блоков — извлечение base64, декодирование, сохранение во временный файл, отправка пользователю
- После отправки — очистка временных файлов

## Двухэндпоинтная схема

```
┌─────────────────────────────────────────────────┐
│                   Запрос                         │
├─────────────────┬───────────────────────────────┤
│   Тип           │   Endpoint                    │
├─────────────────┼───────────────────────────────┤
│ Текст           │ POST /v1/chat/completions     │
│ Изображение     │ POST /v1/responses            │
│ Файл (PDF,etc)  │ POST /v1/responses            │
│ Файл от агента  │ base64 маркеры в ответе       │
└─────────────────┴───────────────────────────────┘
```

**Почему два эндпоинта:** Multimodal API (`input_file`, `input_image`) документирован только для `/v1/responses`. Использование `image_url` через `/v1/chat/completions` — undefined behavior.

## Обработка файлов от агента (FR-15)

```
1. Агент генерирует ответ с маркерами:
   <<<OPENCLAW_FILE name="report.pdf" mime="application/pdf">>>
   <base64 content>
   <<<END_OPENCLAW_FILE>>>

2. Formatter парсит маркеры
3. Base64 → файл в /tmp/trueconf_bot/out/<uuid>.<ext>
4. Текст (без маркеров) → HTML → пользователю
5. Файл → attachment → пользователю
6. Временный файл удаляется
```

**Ограничения:** макс. 3 MB файла, парсинг чувствителен к регистру маркеров.

## Security

```
┌──────────────────────────────────┐
│         Internet (запрещено)     │
└──────────────────────────────────┘
                 │ ✗
┌────────────────┴─────────────────┐
│    Loopback / Tailnet only       │
│  ┌──────────┐    ┌───────────┐  │
│  │   Bot    │───►│  Gateway  │  │
│  │ (bot_true│    │ :18789    │  │
│  │  conf)   │◄───│           │  │
│  └──────────┘    └───────────┘  │
│        127.0.0.1 / tailnet      │
└──────────────────────────────────┘
```

- Gateway bind **только** на loopback или private tailnet
- Bearer token = operator-level доступ — не утекать
- Whitelist email для авторизации пользователей
- Rate limiting от abuse

## Диаграмма зависимостей модулей

```
handlers/commands ──► gateway/client
handlers/message ──► gateway/client ──► utils/formatter
handlers/files   ──► gateway/client
handlers/indicators ──► gateway/client (SSE)
auth/middleware ──► auth/rate_limiter
auth/middleware ──► auth/session
```
