# HEARTBEAT.md

# Регулярные задачи для сердцебиений

## 🔄 Автосохранение в OpenViking

### При старте сессии (автоматическое восстановление контекста)
```bash
# Найти последний сохранённый контекст
echo "🔄 Восстановление контекста..."
~/.openclaw/skills/openviking-memory/scripts/ov_search "recent session context" 3
```

### При каждом heartbeat (если прошло >1 часа)
```bash
# Сохранить контекст текущей сессии
~/.openclaw/skills/openviking-memory/scripts/auto_save "${SESSION_ID:-session-$(date +%Y%m%d-%H%M%S)}" "Session Context" "$(date +%Y-%m-%d)" < /dev/null
```

**Результат автосохранения:**
- L0 (abstract) — метаданные
- L1 (overview) — краткое описание
- L2 (read) — полный текст
- URI ресурса — viking://resources/memory-xxx

### Вечером (при "на сегодня достаточно")
```bash
# Архивировать день в OpenViking
~/.openclaw/skills/openviking-memory/scripts/auto_save "daily-$(date +%Y%m%d)" "Daily Archive" "$(date +%Y-%m-%d)" < /dev/null
```

## 🖥️ Мониторинг серверов

**При каждом heartbeat (каждый час):**
```bash
# Проверить статус серверов
cd ~/.openclaw/workspace/scripts/server-monitor && python3 check-servers.py 2>/dev/null

# Показать текущий статус
cat ~/.openclaw/workspace/scripts/server-monitor/status.json | python3 -m json.tool 2>/dev/null | grep -E '"(name|status)":' | paste - - | sed 's/"//g; s/,//g; s/name://; s/status://' | while read name status; do
  if [ "$status" = "UP" ]; then echo "🟢 $name"; else echo "🔴 $name"; fi
done
```

**Если есть DOWN сервера — уведомить Романа.**

**Cron:** Автоматическая проверка каждые 15 минут уже настроена.

## 📝 Личный To-Do

**При каждом heartbeat показывать:**
```bash
# Проверить есть ли незавершенные задачи
if [ -f ~/.openclaw/workspace/TODOS.md ]; then
  echo "📝 Личные задачи:"
  grep "\- \[ \]" ~/.openclaw/workspace/TODOS.md | sed 's/- \[ \]/  • /' || echo "  Нет активных задач"
fi
```

## 🧠 Self-Improvement

**При каждом сердцебиении:**

## Ежедневный регламент

### Утро (если онлайн)
- Проверить погоду в Ростове-на-Дону (скилл weather)
- Проверить календарь на события сегодня
- **2026-03-19**: Проверить память — что я вспомню из 2026-03-18?

### Вечер (если онлайн)
- Проверить `.learnings/` на pending items (приоритет high/critical)
- Если pending > 3 — напомнить о зачистке
- Проверить email/уведомления
- Проверить календарь на завтра
- **Изучить новые скиллы** (если использовались сегодня)
  - Прочитать SKILL.md использованных скиллов
  - Запомнить варианты использования
  - Обновить контекст для будущих предложений

### Автосохранение в OpenViking (настроено в секции "Авто-сохранение в OpenViking")
- Работает автоматически при каждом heartbeat
- Сохраняет L0, L1, L2 уровни
- Архивирует день при "на сегодня достаточно"

### **Последняя проверка дня** (при "на сегодня достаточно")
- **Итоговая сводка** — темы, задачи, токены
- **Проверка работы memory** — тестовый запрос к memory и ожидание результата
- **Git бэкап** — коммит + пуш в GitHub
- **OpenViking Daily Archive** — архивировать день в OpenViking

---

*Этот файл обновляется по мере необходимости.*
