# 🚀 Quick Start: OpenViking Memory Integration

## Цель
Использовать OpenViking как семантическую долгосрочную память для OpenClaw.

## Состояние

| Компонент | Статус |
|-----------|--------|
| OpenViking | ✅ v0.2.6 установлен |
| Конфигурация | ✅ `~/.openviking/ov.conf` |
| Ollama | ✅ Работает с моделями |
| VikingBot | ⚪ Не установлен |

## Быстрый старт (5 минут)

### 1. Установить VikingBot

```bash
source ~/.openviking/venv/bin/activate
pip install -U "openviking[bot]"
```

### 2. Запустить gateway

```bash
vikingbot gateway
```

### 3. Настроить через Web UI

Открыть: **http://localhost:18791**

- Перейти во вкладку **Config**
- Добавить API ключи (OpenRouter или использовать Ollama)
- Сохранить

### 4. Тестировать

```bash
# Запустить чат
vikingbot chat

# Или одно сообщение
vikingbot chat -m "Привет, запомни что меня зовут Роман"
vikingbot chat -m "Как меня зовут?"
```

## Ожидаемый результат

```
> Привет, запомни что меня зовут Роман

Привет! Я запомнил, что тебя зовут Роман. Чем ещё могу помочь?

> Как меня зовут?

Тебя зовут Роман. Я запомнил это из нашего предыдущего сообщения.
```

## Проверка авто-сохранения

```bash
# Смотреть ресурсы в OpenViking
ls -la ~/.openviking/workspace/viking/resources/

# Должны появиться файлы сессий
```

## Инструменты OpenViking в VikingBot

| Инструмент | Описание |
|------------|----------|
| `openviking_read` | Чтение (L0/L1/L2) |
| `openviking_list` | Список ресурсов |
| `openviking_search` | Семантический поиск |
| `openviking_add_resource` | Добавить ресурс |
| `openviking_grep` | Поиск по regex |
| `openviking_glob` | Поиск по glob |
| `user_memory_search` | Поиск в памяти пользователя |
| `openviking_memory_commit` | Сохранение сессии |

## Уровни чтения

| Уровень | Токенов | Использование |
|---------|---------|---------------|
| L0 (abstract) | ~100 | Быстрый preview |
| L1 (overview) | ~2000 | Контекст для ответов |
| L2 (read) | full | Полный контент |

## Следующие шаги

После тестирования VikingBot:

1. **Создать скилл** `openviking-memory` для OpenClaw
2. **Интегрировать** с `memory_search` и `memory_get`
3. **Настроить** авто-сохранение сессий OpenClaw

## Полезные команды

```bash
# Статус VikingBot
vikingbot status

# Список каналов
vikingbot channels status

# Логи
vikingbot chat --logs

# Остановить gateway
# Ctrl+C
```

## Troubleshooting

### Ошибка: "ModuleNotFoundError: No module named 'openviking'"

```bash
source ~/.openviking/venv/bin/activate
```

### Ошибка: "Connection refused"

Проверить что Ollama запущен:

```bash
curl http://localhost:11434/api/tags
```

### Таймаут обработки

Модель `qwen2.5:1.5b` слишком медленная для L0/L1 генерации. Использовать:
- `qwen2.5:7b` или больше
- OpenRouter с быстрыми моделями

## Документация

- **Полный README**: `README.md`
- **TODO**: `TODO.md`
- **VikingBot docs**: `/home/rem/.openclaw/workspace/Down/OpenViking-main/bot/README.md`

---

**Последнее обновление**: 2026-03-17 12:35
