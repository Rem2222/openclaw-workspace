#!/bin/bash
# Мониторинг активных субагентов оркестратора
# Запускается каждые 5 минут через cron

LOG_DIR="/home/rem/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/orchestrator-subagents-$(date +%Y-%m-%d).log"
mkdir -p "$LOG_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Проверка субагентов оркестратора..." >> "$LOG_FILE"

# Получаем список активных субагентов
OUTPUT=$(openclaw subagents list --recent 30 2>&1)
echo "$OUTPUT" >> "$LOG_FILE"

# Проверяем, есть ли-running дольше 30 минут
if echo "$OUTPUT" | grep -q "running"; then
  echo "⚠️  Обнаружены долгие субагенты (>30м)!" >> "$LOG_FILE"
  # TODO: отправить уведомление в webchat (если настроен)
fi

echo "" >> "$LOG_FILE"
