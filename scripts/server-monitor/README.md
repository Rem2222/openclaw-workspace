# Server Monitor - Cron Job Configuration

## Описание
Скрипт проверки доступности критически важных серверов запускается раз в 15 минут.

## Расписание
```
*/15 * * * *
```
Каждые 15 минут

## Команда
```bash
bash /home/rem/.openclaw/workspace/scripts/server-monitor/check-servers.sh
```

## Файлы
- **Скрипт:** `/home/rem/.openclaw/workspace/scripts/server-monitor/check-servers.sh`
- **Конфиг:** `/home/rem/.openclaw/workspace/scripts/server-monitor/config.json`
- **Лог:** `/home/rem/.openclaw/workspace/scripts/server-monitor/monitor.log`
- **Статус:** `/home/rem/.openclaw/workspace/scripts/server-monitor/status.json`

## Добавление серверов

В файл `config.json` добавляйте строки в формате:
```
NAME|HOST|PORT|TYPE|PATH|TIMEOUT|EXPECTED_CODE
```

### Примеры:

```bash
# HTTP сервер (веб-сервер)
WebServer|192.168.1.100|80|http|/health|5|200

# 1С сервер
1C_Server|192.168.1.50|8400|http|/rpc|10|200

# PostgreSQL (TCP порт)
PostgreSQL|localhost|5432|tcp||5|

# Redis
Redis|localhost|6379|tcp||5|

# Внешний API
ExternalAPI|api.example.com|443|http|/status|10|200
```

## Типы проверок

| Тип | Описание | Пример |
|-----|----------|--------|
| `http` | HTTP запрос с проверкой кода ответа | Веб-сервера, API, 1С |
| `tcp` | Проверка открытости TCP порта | Базы данных, кэши |

## Поля конфигурации

| Поле | Описание | Пример |
|------|----------|--------|
| `NAME` | Имя сервера (для логирования) | `WebServer` |
| `HOST` | Хост или IP адрес | `192.168.1.100` |
| `PORT` | Порт | `80` |
| `TYPE` | Тип проверки (`http` или `tcp`) | `http` |
| `PATH` | Путь для HTTP (только для `http`) | `/health` |
| `TIMEOUT` | Таймаут в секундах | `5` |
| `EXPECTED_CODE` | Ожидаемый HTTP код (только для `http`) | `200` |

## Уведомления

Скрипт возвращает код выхода:
- `0` — все сервера доступны
- `1` — один или более серверов недоступен

Лог записывается в `monitor.log` со статусом каждой проверки.
