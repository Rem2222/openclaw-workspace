# OpenRouter Setup Guide

## Шаг 1: Получите API ключ OpenRouter

1. Перейдите на [openrouter.ai](https://openrouter.ai)
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел **Settings** → **API Keys**
4. Нажмите **"Create API Key"**
5. Скопируйте полученный ключ (начинается с `sk-or-`)

## Шаг 2: Добавьте API ключ в OpenClaw

Текущая конфигурация содержит placeholder `YOUR_OPENROUTER_API_KEY`. Замените его на ваш реальный ключ:

```bash
# Откройте файл конфигурации
nano /home/rem/.openclaw/openclaw.json
```

Найдите секцию `openrouter` и замените:
```json
"apiKey": "YOUR_OPENROUTER_API_KEY"
```
на:
```json
"apiKey": "sk-or-ваш_ключ"
```

Также обновите файл аутентификации:
```bash
nano /home/rem/.openclaw/agents/main/agent/auth.json
```

## Шаг 3: Перезапустите OpenClaw

```bash
openclaw gateway restart
```

## Доступные модели OpenRouter

После настройки вы сможете использовать следующие модели:

### Anthropic
- `openrouter/anthropic/claude-3.5-sonnet` (алиас: `claude-sonnet`)
- `openrouter/anthropic/claude-3.5-haiku` (алиас: `claude-haiku`)

### OpenAI
- `openrouter/openai/gpt-4o` (алиас: `gpt4o`)
- `openrouter/openai/gpt-4o-mini` (алиас: `gpt4o-mini`)

### Meta Llama
- `openrouter/meta-llama/llama-3.2-11b-instruct` (алиас: `llama-11b`)
- `openrouter/meta-llama/llama-3.2-90b-instruct` (алиас: `llama-90b`)

### DeepSeek
- `openrouter/deepseek/deepseek-chat` (алиас: `deepseek`)
- `openrouter/deepseek/deepseek-r1` (алиас: `deepseek-r1`) — с поддержкой reasoning

### Google Gemini
- `openrouter/google/gemini-2.0-flash` (алиас: `gemini-flash`)
- `openrouter/google/gemini-2.0-pro` (алиас: `gemini-pro`)

### X.AI (Grok)
- `openrouter/x-ai/grok-2-1212` (алиас: `grok-2`)
- `openrouter/x-ai/grok-2-vision-1212` (алиас: `grok-2-vision`)

### Mistral
- `openrouter/mistralai/mistral-nemo` (алиас: `mistral-nemo`)

## Использование

После настройки вы можете переключаться между моделями через команду:
```
/session model openrouter/anthropic/claude-3.5-sonnet
```
или использовать алиас:
```
/session model claude-sonnet
```

## Стоимость

OpenRouter взимает плату за использование моделей. Проверьте актуальные цены на [openrouter.ai/pricing](https://openrouter.ai/pricing).

## Безопасность

- Никогда не коммитьте API ключи в репозитории
- Используйте переменные окружения для хранения ключей в продакшене
- Регулярно ротируйте API ключи
