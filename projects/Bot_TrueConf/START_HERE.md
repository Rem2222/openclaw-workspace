# 🚀 Bot для TrueConf — Инструкция по запуску и настройке

## О проекте

Бот подключается к TrueConf (TrueConf Bot API), пересылает сообщения пользователей в OpenClaw Gateway, получает ответы ИИ-агента и возвращает их в чат TrueConf.

## Структура проекта

```
Bot_TrueConf/
├── ТЗ.md                 ← Техническое задание (источник истины)
├── SPEC.md               ← Спецификация (FR-1..FR-20)
├── bot_trueconf/
│   ├── bot_trueconf/
│   │   ├── gateway/client.py    ← HTTP-клиент для OpenClaw Gateway
│   │   ├── handlers/
│   │   │   ├── commands.py     ← /help, /status, /clear
│   │   │   ├── message.py     ← обработка текстовых сообщений
│   │   │   ├── files.py        ← файлы (download/upload)
│   │   │   └── indicators.py   ← SSE-индикаторы ("печатает...")
│   │   ├── auth/
│   │   │   ├── session.py      ← SessionStore (whitelist email)
│   │   │   ├── rate_limiter.py ← 20 msg/min, 100 msg/hour
│   │   │   └── middleware.py   ← auth + rate limit combined
│   │   └── utils/
│   │       └── formatter.py     ← Markdown → HTML + XSS protection
│   ├── tests/             ← 31 тест (все проходят)
│   ├── docker-compose.yml ← Docker (gateway + bot)
│   ├── Dockerfile
│   ├── .env.example
│   ├── README.md          ← документация
│   ├── ARCHITECTURE.md    ← архитектура
│   └── DEPLOY.md         ← инструкция по деплою
└── QA_Отчёт.md           ← результаты тестирования
```

---

## ⚙️ Настройка

### 1. Скопируй `.env.example`

```bash
cd ~/.openclaw/workspace/projects/Bot_TrueConf/bot_trueconf
cp .env.example .env
```

### 2. Заполни `.env`

```env
# === OpenClaw Gateway ===
# URL Gateway (порт по умолчанию 18789)
GATEWAY_URL=http://localhost:18789

# Токен из auth.profiles в конфиге OpenClaw
# Файл: ~/.openclaw/agents/main/agent/auth-profiles.json
GATEWAY_TOKEN=your_gateway_token_here

# === TrueConf Bot ===
# Токен бота от @BotFather в TrueConf (TrueConf ID)
BOT_TOKEN=your_trueconf_bot_token

# === Auth ===
# Разрешённые email (через запятую)
ALLOWED_USERS=skogorev@team.trueconf.com,skogorev@demo.trueconf.com

# === Опционально ===
REQUEST_TIMEOUT=120
```

### Где взять токены

**GATEWAY_TOKEN** — из конфига OpenClaw:
```bash
cat ~/.openclaw/agents/main/agent/auth-profiles.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d['profiles'].items():
    if 'key' in v:
        print(f'{k}: {v[\"key\"]}')
"
```

**BOT_TOKEN** — токен TrueConf бота (нужен от @BotFather или из настроек TrueConf Server).

---

## 🏃 Запуск

### Вариант А: Python напрямую (для разработки)

```bash
cd ~/.openclaw/workspace/projects/Bot_TrueConf/bot_trueconf

# Установить зависимости
pip install -e ".[dev]"

# Запустить бота
python -m bot_trueconf
```

### Вариант Б: Docker (для production)

```bash
cd ~/.openclaw/workspace/projects/Bot_TrueConf/bot_trueconf

# Запустить gateway + bot
docker-compose up -d

# Посмотреть логи
docker-compose logs -f
```

---

## 🔧 Конфигурация OpenClaw Gateway

Бот работает с **OpenClaw Gateway** (не с Telegram/Discord/etc). Gateway должен быть запущен и доступен.

### Проверка Gateway

```bash
# Gateway запущен?
curl -s http://localhost:18789/health

# Какие модели доступны?
curl -s http://localhost:18789/v1/models -H "Authorization: Bearer YOUR_TOKEN"
```

### Как работает авторизация

1. Пользователь пишет в TrueConf боту
2. Бот получает `email` от TrueConf API
3. `SessionStore` проверяет: `email in ALLOWED_USERS`
4. Если не в whitelist → бот не отвечает (FR-1)

### Rate limiting

| Лимит | Значение |
|-------|----------|
| Минута | 20 сообщений |
| Час | 100 сообщений |

При превышении бот отвечает: *"Подождите немного"*

---

## 📡 API Gateway (для понимания)

### Отправка сообщения

```
POST /v1/chat/completions
Authorization: Bearer {GATEWAY_TOKEN}
```

Тело:
```json
{
  "model": "minimax/minimax-m2.7",
  "messages": [{"role": "user", "content": "Привет"}],
  "max_tokens": 1000
}
```

### Файлы (FR-15)

Файлы от агента передаются через base64 в ответе:
```
<<<OPENCLAW_FILE name="report.pdf" mime="application/pdf">>>
{BASE64_DATA}
<<<
```

Бот парсит, сохраняет во временную папку и отправляет в TrueConf.

---

## ✅ Тестирование

```bash
cd ~/.openclaw/workspace/projects/Bot_TrueConf/bot_trueconf

# Все тесты
pytest -v

# Конкретный модуль
pytest tests/test_message.py -v

# С покрытием
pytest --cov=bot_trueconf --cov-report=term-missing
```

---

## 🐛 Troubleshooting

### Бот не отвечает

1. **Проверь `.env`** — все переменные заполнены?
2. **Проверь Gateway** — `curl http://localhost:18789/health`
3. **Проверь email** — `ALLOWED_USERS` содержит твой email?
4. **Проверь rate limit** — подожди минуту если превысил

### Gateway 401 Unauthorized

```bash
# Проверь токен
curl -s http://localhost:18789/v1/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Ответ должен быть JSON. Если 401 — токен неверный.

### Ошибка "Бот временно недоступен"

Gateway недоступен. Проверь:
- Gateway запущен
- `GATEWAY_URL` правильный
- Нет firewall блокировки

---

## 📊 Мониторинг

```bash
# Логи бота (Docker)
docker-compose logs -f bot

# Статус контейнеров
docker-compose ps

# Gateway health
curl http://localhost:18789/health
```

---

## 🔐 Безопасность

- **Gateway** — только localhost или tailnet (не публичный интернет)
- **Токен** — только в `.env`, не в git
- **XSS protection** — ответы агента санитизируются (formatter.py)
- **Whitelist** — только 2 email имеют доступ

---

## 📝 Команды бота

| Команда | Описание |
|---------|----------|
| `/help` | Показать справку |
| `/status` | Статус бота и сессии |
| `/clear` | Очистить историю сессии |
| Reply на сообщение бота | Контекстный вопрос (FR-8) |

---

## 📂 Ключевые файлы

| Файл | Зачем |
|------|-------|
| `gateway/client.py` | Всё общение с OpenClaw Gateway |
| `handlers/message.py` | Основной пайплайн: сообщение → Gateway → ответ |
| `handlers/files.py` | Download/upload файлов |
| `auth/middleware.py` | Auth + rate limit |
| `utils/formatter.py` | Markdown → HTML + XSS |