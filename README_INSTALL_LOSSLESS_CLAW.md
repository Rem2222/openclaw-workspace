# Установка и настройка Lossless Claw (LCM) для OpenClaw

## 1. Предварительные требования
- **Node.js 22+** (или активная установка через `n`/`nvm`/`pnpm`).
- **npm**/`pnpm` – менеджер пакетов. Убедитесь, что `openclaw` установлен глобально.

## 2. Установка плагина
```bash
# Самая простая команда – установит глобально и зафиксирует в занчениях OpenClaw
openclaw plugins install @martian-engineering/lossless-claw
```

### Если OpenClaw запускается из локального репозитория
```bash
pnpm openclaw plugins install @martian-engineering/lossless-claw
```

### Если вы разрабатываете плагин из локального копирования
```bash
# Указываем путь к вашему проекту lossless-claw
openclaw plugins install --link /полный/путь/к/lossless-claw
```

## 3. Конфигурация

После установки в корень вашего проекта будет создана переменная конфига, но её можно изменить вручную, редактируя файл `~/.openclaw/openclaw.json`.

```json
{
  "plugins": {
    "entries": {
      "lossless-claw": {
        "enabled": true,
        "config": {
          "freshTailCount": 32,
          "contextThreshold": 0.75,
          "incrementalMaxDepth": -1,
          "ignoreSessionPatterns": [
            "agent:*:cron:**",
            "agent:main:subagent:**"
          ],
          "summaryProvider": "anthropic",
          "summaryModel": "claude-3-5-haiku"
        }
      }
    }
  }
}
```

> **Куда писать** – укажите `summaryProvider`/`summaryModel` так, как предпочитаете. Можно оставить пустыми – тогда будет использоваться основной провайдер OpenClaw.

### Переменные окружения (приоритет выше конфигурации)
```
LCM_ENABLED=true
LCM_DATABASE_PATH=~/.openclaw/lcm.db
LCM_FRESH_TAIL_COUNT=32
LCM_CONTEXT_THRESHOLD=0.75
LCM_INCREMENTAL_MAX_DEPTH=-1
```

## 4. Перезапуск OpenClaw
```bash
openclaw gateway restart
```

После перезапуска проверьте, что плагин активен:
```bash
openclaw plugins list
```
в выводе должна быть строка `@martian-engineering/lossless-claw` с статусом `enabled`.

## 5. Тестирование

```bash
# Запустите небольшую сессию
openclaw tui
# Ответьте несколько сообщений, например «Привет»
# После завершения сессии проверьте логи:
cat ~/.openclaw/logs/gateway.log | grep lossless
```

Проверьте, что существование «L0», «L1» и «L2» см. в базе `~/.openclaw/lcm.db`.

## 6. Инструменты LCM
- `lcm_grep` – поиск по сжатому контексту.
- `lcm_describe` – краткое описание узла.
- `lcm_expand` – расширение узла до исходного текста.

Пример:
```bash
lcm_grep "Какие задачи у Романа"
```

## 7. Ошибки и Диагностика
- Если LCM не включается, проверьте флаг `LCM_ENABLED`.
- При ошибках «Connection error» убедитесь, что ваша модель‑провайдер корректен.
- В случае тайм‑аутов TLS засекает переменную `LCM_PROVIDER_TIMEOUT`.

## 8. Ресурсы
- GitHub репозиторий: https://github.com/Martian-Engineering/lossless-claw
- Документация: docs/ (внутри репозитория)
- Если возникнут вопросы: Issues на GitHub.

---
**Удачной работы!**
