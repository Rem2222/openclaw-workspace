# Деплой — Bot для TrueConf

## Быстрый старт (Docker)

```bash
cd bot_trueconf
cp .env.example .env
# Заполнить .env (см. ниже)
docker-compose up -d
```

## Настройка .env

| Переменная    | Описание                          |
|---------------|-----------------------------------|
| GATEWAY_URL   | URL OpenClaw Gateway              |
| GATEWAY_TOKEN | Token для Gateway                 |
| BOT_TOKEN     | TrueConf bot token                |
| ALLOWED_USERS | Разрешённые email через запятую   |

## Мониторинг

```bash
docker-compose logs -f bot      # Логи бота
docker-compose logs -f gateway  # Логи gateway
docker-compose ps               # Статус контейнеров
```

## Остановка

```bash
docker-compose down
```

## Обновление

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

- **Gateway недоступен** → проверить `GATEWAY_URL` и токен
- **Bot не отвечает** → проверить `BOT_TOKEN`, проверить логи
- **Rate limit** → подождать, политика: 20 msg/min, 100 msg/hour
- **Container перезапускается** → `docker-compose logs bot` для диагностики
