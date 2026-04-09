---
title: "OpenAI Routing в OpenClaw"
description: "Настройка нескольких OpenAI подписок через OmniRoute"
tags: [openai, openclaw, routing, omniroute, api]
related: [[openclaw]], [[openclaw-billing-proxy]]
---

# OpenAI Routing в OpenClaw

**Источник:** OpenClaw Lab (t.me/openclaw_lab)

## Базовый вариант (одна подписка)

1. В терминале: `openclaw configure`
2. Выбрать: Local → Model → OpenAI → OAuth
3. Авторизоваться в браузере
4. Скопировать ссылку после авторизации (начинается с `localhost`) в терминал

**Если OAuth не появляется:**
```bash
openclaw models auth login --provider openai-codex
```

---

## Продвинутый вариант (несколько подписок)

Если нужно использовать несколько OpenAI подписок (например, при лимитах).

### Что понадобится

- [OmniRoute](https://github.com/diegosouzapw/OmniRoute) — роутер для API запросов

### Установка OmniRoute

Можно установить через OpenClaw или Codex:
```bash
# Прислать ссылку агенту и попросить установить
```

### Настройка OmniRoute

1. **Установить OmniRoute** — агент выдаст ссылку для авторизации в дашборде

2. **Перейти в дашборд** → **API Manager** → выпустить API ключ, сохранить

3. **Вкладка Providers** → выбрать **OpenAI Codex** → авторизоваться в двух и более аккаунтах (схема та же, что при авторизации через OpenClaw)

4. **Настроить OpenClaw:**
   - Не использовать CLI команды (может установить не тот размер контекста)
   - Изучить документацию OpenClaw
   - Заменить только `apiKey` в конфиге
   - Выполнить `openclaw gateway restart`

### Пример конфига

См. [Telegraph: Конфиг OmniRoute для OpenClaw](https://telegra.ph/Konfig-OmniRoute-dlya-OpenClaw-3-04-09)

---

## Как это работает

Когда лимиты кончатся на одной подписке → автоматически запросы идут ко второй.

**Схема:**
```
OpenClaw → OmniRoute → OpenAI Account 1
                        ↓ (если лимит)
                        OpenAI Account 2
                        ↓
                        OpenAI Account N
```

## Зачем это нужно

1. **Обход лимитов** — при исчерпании дневного лимита на одной подписке
2. **Бэкап** — если одна подписка упадёт
3. **Балансировка нагрузки** — несколько подписок работают параллельно

## Статус

⏳ На рассмотрении — нужен тест с реальными подписками
