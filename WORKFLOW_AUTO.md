# WORKFLOW_AUTO.md

# Автоматизированные workflows для OpenViking Integration

## Описание

Этот файл содержит команды и скрипты для автоматизированной работы с OpenViking.

---

## 1. Pre-Compaction (если поддерживается)

### Сохранение контекста перед сверткой

```bash
# Автосохранить контекст перед сверткой
~/.openclaw/skills/openviking-memory/scripts/auto_save "pre-compaction-$(date +%Y%m%d-%H%M%S)" "Pre-Compaction Backup" "$(date +%Y-%m-%d)" < /dev/null
```

### Параметры:
- `SESSION_ID`: `pre-compaction-YYYYMMDD-HHMMSS`
- `TOPIC`: `Pre-Compaction Backup`
- `DATE`: текущая дата

---

## 2. On-Session-Start

### Загрузка контекста при старте сессии

```bash
# Найти последний сохранённый контекст
~/.openclaw/skills/openviking-memory/scripts/ov_search "recent session context" 3

# Прочитать последний сохранённый день
LAST_DAY=$(date -d "yesterday" +%Y-%m-%d)
~/.openclaw/skills/openviking-memory/scripts/ov_list "viking://resources/" false false true | grep "$LAST_DAY" | tail -1 | xargs -I {} ~/.openclaw/skills/openviking-memory/scripts/ov_read "{}" overview
```

### Параметры:
- Поиск по запросу: `recent session context`
- Количество результатов: `3`

---

## 3. On-Session-End

### Сохранение контекста при завершении сессии

```bash
# Сохранить контекст при завершении
~/.openclaw/skills/openviking-memory/scripts/auto_save "session-end-$(date +%Y%m%d-%H%M%S)" "Session End Backup" "$(date +%Y-%m-%d)" < /dev/null
```

### Параметры:
- `SESSION_ID`: `session-end-YYYYMMDD-HHMMSS`
- `TOPIC`: `Session End Backup`
- `DATE`: текущая дата

---

## 4. Regular Heartbeat-Based Saves

### Автосохранение каждые N минут

```bash
# Каждые 30 минут автосохранять
*/30 * * * * ~/.openclaw/skills/openviking-memory/scripts/auto_save "heartbeat-$(date +%Y%m%d-%H%M)" "Heartbeat Backup" "$(date +%Y-%m-%d)" < /dev/null
```

### Параметры:
- `SESSION_ID`: `heartbeat-YYYYMMDD-HHMM`
- `TOPIC`: `Heartbeat Backup`
- `DATE`: текущая дата
- Интервал: `30 минут`

---

## 5. Manual Commands for Quick Access

### Быстрые команды для ручного автосохранения

```bash
# Создать алиасы
alias ov_backup='~/.openclaw/skills/openviking-memory/scripts/auto_save "backup-$(date +%Y%m%d-%H%M%S)" "Manual Backup" "$(date +%Y-%m-%d)" < /dev/null'

alias ov_save='cd /home/rem/.openclaw/skills/openviking-memory && ./scripts/ov_store'
alias ov_search='cd /home/rem/.openclaw/skills/openviking-memory && ./scripts/ov_search'
alias ov_read='cd /home/rem/.openclaw/skills/openviking-memory && ./scripts/ov_read'
alias ov_list='cd /home/rem/.openclaw/skills/openviking-memory && ./scripts/ov_list'
alias ov_auto='cd /home/rem/.openclaw/skills/openviking-memory && ./scripts/auto_save'
```

### Использование:
```bash
# Ручное автосохранение
ov_backup

# Сохранить контент
ov_save "Текст" "Тема" "2026-03-19"

# Поиск
ov_search "запрос" 5

# Чтение
ov_read "viking://resources/memory-xxx" overview

# Список
ov_list "viking://resources/" false
```

---

## 6. Advanced Workflows

### Автосохранение при определённых событиях

```bash
# Функция для автосохранения при событии
ov_event_save() {
    local EVENT_TYPE="$1"
    local EVENT_DATA="$2"
    local SESSION_ID="event-${EVENT_TYPE}-$(date +%Y%m%d-%H%M%S)"
    local TOPIC="Event: ${EVENT_TYPE}"
    
    if [ -n "$EVENT_DATA" ]; then
        echo "$EVENT_DATA" | ~/.openclaw/skills/openviking-memory/scripts/auto_save "$SESSION_ID" "$TOPIC" "$(date +%Y-%m-%d)"
    else
        ~/.openclaw/skills/openviking-memory/scripts/auto_save "$SESSION_ID" "$TOPIC" "$(date +%Y-%m-%d)" < /dev/null
    fi
}

# Пример использования
ov_event_save "user-command" "Пользователь выполнил команду: git commit"
ov_event_save "session-error" "Ошибка в сессии: timeout"
```

---

## 7. Monitoring and Logging

### Логирование операций

```bash
# Функция для логирования
ov_log() {
    local OPERATION="$1"
    local RESULT="$2"
    echo "$(date +%Y-%m-%d\ %H:%M:%S) [$OPERATION] $RESULT" >> ~/.openviking/logs/operations.log
}

# Пример использования
ov_log "ov_store" "Сохранено: viking://resources/memory-xxx"
ov_log "ov_search" "Найдено: 5 результатов"
```

---

## 8. Backup and Recovery

### Полное резервное копирование

```bash
# Резервное копирование всей базы
ov_full_backup() {
    local BACKUP_DIR="~/.openviking/backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Копировать базу данных
    cp ~/.openviking/workspace/viking/context.db "$BACKUP_DIR/"
    
    # Копировать ресурсы
    cp -r ~/.openviking/workspace/viking/resources "$BACKUP_DIR/"
    
    # Сохранить метаданные
    echo "Backup created: $(date)" > "$BACKUP_DIR/META.txt"
    
    echo "Backup saved to: $BACKUP_DIR"
}

# Восстановление из резервной копии
ov_restore() {
    local BACKUP_DIR="$1"
    
    if [ -z "$BACKUP_DIR" ]; then
        echo "Usage: ov_restore <backup_dir>"
        return 1
    fi
    
    # Восстановить базу данных
    cp "$BACKUP_DIR/context.db" ~/.openviking/workspace/viking/
    
    # Восстановить ресурсы
    cp -r "$BACKUP_DIR/resources" ~/.openviking/workspace/viking/
    
    echo "Restored from: $BACKUP_DIR"
}
```

---

## 9. Integration with OpenClaw Commands

### Создание custom-команд

```bash
# Добавить в ~/.openclaw/openclaw.json
{
  "commands": {
    "custom": {
      "ov_backup": {
        "description": "Автосохранить контекст в OpenViking",
        "command": "~/.openclaw/skills/openviking-memory/scripts/auto_save \"backup-$(date +%Y%m%d-%H%M%S)\" \"OpenClaw Backup\" \"$(date +%Y-%m-%d)\" < /dev/null"
      },
      "ov_search_recent": {
        "description": "Найти последний сохранённый контекст",
        "command": "~/.openclaw/skills/openviking-memory/scripts/ov_search \"recent session context\" 3"
      }
    }
  }
}
```

---

## 10. Troubleshooting

### Проверка состояния

```bash
# Проверить, что Ollama запущен
curl http://localhost:11434/api/tags

# Проверить, что OpenViking доступен
source ~/.openviking/venv/bin/activate
python -c "from openviking import OpenViking; print('OK')"

# Проверить последнюю операцию
ls -lt ~/.openviking/workspace/viking/resources/ | head -5
```

---

## Версионирование

| Версия | Дата | Изменения |
|--------|------|----------|
| 1.0 | 2026-03-19 | Изначальная версия |

---

**Файл создан:** 2026-03-19  
**Автор:** Romul (агент)  
**Версия:** 1.0
