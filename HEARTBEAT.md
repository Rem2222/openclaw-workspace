# HEARTBEAT.md

# Регулярные задачи для сердцебиений

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

## 🤖 Мониторинг JAWL (Jinx)

**JAWL сервисы** (проверять при каждом heartbeat):
```bash
# Статус JAWL сервисов
bash /home/rem/JAWL/scripts/check-services.sh status

# Быстрая проверка: JAWL + Dashboard
JAWL_OK=$(pgrep -c -f "python.*src/main\.py" 2>/dev/null || echo "0")
DASH_OK=$(curl -s -m 3 http://localhost:5000/api/providers > /dev/null 2>&1 && echo "1" || echo "0")
echo "JAWL: $JAWL_OK, Dashboard: $DASH_OK"

# Проверка Qdrant lock (ожидаемо залочен когда JAWL работает)
if [ -f /home/rem/JAWL/src/utils/local/data/vector_db/.lock ]; then
  echo "🔒 Qdrant залочен (норма)"
fi
```

**JAWL скрипты:**
- `/home/rem/JAWL/scripts/check-services.sh` — единый скрипт для проверки/запуска/остановки всех сервисов
- `/home/rem/JAWL/scripts/start-safe.sh` — безопасный запуск JAWL + Dashboard (обновлён)

**Сервисы JAWL:**
- JAWL (Python, PID в `.pid` файле)
- Dashboard Flask (порт 5000, PID в `.dash_pid` файле)
- Qdrant (embedded в JAWL, не отдельный сервер)
- venv (Python virtualenv в `/home/rem/JAWL/venv`)

**Если JAWL DOWN:** попробовать перезапустить через `bash /home/rem/JAWL/scripts/check-services.sh start`

## ⚡ Мониторинг нагрузки процессора

**При каждом heartbeat проверять нагрузку на процессы:**
```bash
# Проверить Gateway CPU
GATEWAY_CPU=$(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $3}')
if (( $(echo "$GATEWAY_CPU > 50" | bc -l) 2>/dev/null || echo "0" )); then
  echo "⚠️ Gateway CPU: ${GATEWAY_CPU}%"
fi

# Проверить общую нагрузку
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo "📊 Load average: $LOAD"
```

**Если Gateway CPU > 50% — предупредить.**

## 🔴 Проверка зависших сессий

**При каждом heartbeat:**
```bash
# Проверить есть ли зависшие сессии (asks > 5 минут без ответа)
# Список активных сессий можно получить через API Gateway
curl -s -m 5 http://localhost:18789/api/sessions 2>/dev/null | python3 -c "
import sys, json
try:
    sessions = json.load(sys.stdin)
    stuck = [s for s in sessions if s.get('duration', 0) > 300000 and s.get('asks', 0) == 0]
    if stuck:
        print(f'⚠️ Зависших сессий: {len(stuck)}')
        for s in stuck[:3]:
            print(f'  - {s.get(\"key\", \"unknown\")}: {s.get(\"duration\", 0)//60000} min')
except: pass
" 2>/dev/null || echo "Не могу проверить сессии"
```

## 📝 Личный To-Do

**При каждом heartbeat показывать:**
```bash
# Проверить есть ли незавершенные задачи в Linear
TODO_STATUS=$(python3 << 'EOF'
import subprocess, json
query = """
query {
  projectWorkflowStates(projectId: "7723bcfa-ebd6-4841-acdd-9a65f2c0f13f") {
    nodes { id name }
  }
  issues(first: 10, filter: { projectId: { eq: "7723bcfa-ebd6-4841-acdd-9a65f2c0f13f" }, state: { name: { neq: "Done" } } }) {
    nodes { identifier title priority }
  }
}
"""
result = subprocess.run(["curl", "-s", "-X", "POST", "https://api.linear.app/graphql",
  "-H", "Authorization: lin_api_64ssmuFiW5KjeTX8pmiG83nFiCma02PSa5R2oL1k",
  "-H", "Content-Type: application/json",
  "-d", json.dumps({"query": query})],
  capture_output=True, text=True)
try:
  data = json.loads(result.stdout)
  issues = data.get("data", {}).get("issues", {}).get("nodes", [])
  if issues:
    for i in issues:
      print(f"  \U0001F4CB {i['identifier']}: {i['title']}")
  else:
    print("  Нет активных задач")
except: print("  Не могу прочитать задачи")
EOF
)
echo "📝 Активные задачи (Linear TODOTuda):"
echo "$TODO_STATUS"
```

## 🧠 Self-Improvement

**При каждом сердцебиении:**

## 🎛️ Мониторинг субагентов оркестратора

**При каждом heartbeat (каждые 5 минут для долгих задач):**
```bash
# Проверить активные субагенты (оркестратор)
echo "🎯 Активные субагенты оркестратора:"
openclaw subagents list --recent 30 || echo "  Нет активных"

# Если есть running дольше 30 минут — уведомить
openclaw subagents list --recent 30 | grep -q "running" && echo "⚠️ Есть долгие субагенты!" || true
```

**Примечание:** Для фоновых субагентов оркестратора (pipeline) проверяй каждые 5 минут, если задача >15 мин.

---

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

### **Последняя проверка дня** (при "на сегодня достаточно")
- **Итоговая сводка** — темы, задачи, токены
- **Проверка работы памяти** — запустить `bash ~/.openclaw/workspace/scripts/memory-health-check.sh` и показать результат (LCM, MemPalace, ByteRover, файлы)
- **MemPalace** — обновить базу: `mempalace mine ~/.openclaw/workspace --mode convos --wing rem`
- **Git бэкап** — коммит + пуш в GitHub
- **🔄 Проверка обновлений**:
```bash
# 1. npm global (OpenClaw, mcporter, node-llama-cpp)
echo "=== npm global ===" && npm outdated -g --depth=0 2>/dev/null | grep -v "(empty)" | tail -n +2 || echo "нет npm"

# 2. lossless-claw (LCM)
echo "=== LCM ===" && npm show @martian-engineering/lossless-claw version 2>/dev/null

# 3. clawhub skills (все скиллы из ~/.openclaw/workspace/skills/)
echo "=== clawhub skills ===" && cd ~/.openclaw/workspace && npx clawhub update --workdir . --dir skills --all --no-input 2>&1 | grep -E "(updated|skipped|local changes)" | head -20

# 4. git repos (если есть)
for d in ~/.openclaw/workspace/skills/*/; do
  [ -d "$d/.git" ] && echo -n "$(basename $d): " && cd "$d" && git status -sb 2>/dev/null | head -1
done
```
Показать списком: что устарело и какие версии доступны.

### 🛡️ Отчёт по защите сервера
```bash
# Проверить забаненные IP
BANNED=$(sudo fail2ban-client banned 2>/dev/null | grep -c '[' || echo '0')
echo "🛡️ fail2ban: $BANNED IP забанено"
sudo fail2ban-client banned 2>/dev/null | grep -E "\[" | sed 's/^/  /'

# Неудачные SSH за сегодня
FAILED=$(sudo grep "Failed password" /var/log/auth.log 2>/dev/null | grep -c "$(date '+%b %d')" || echo '0')
echo "🚫 Неудачных SSH-входов сегодня: $FAILED"

# Успешные входы за сегодня (кроме своих IP)
GOOD=$(sudo last -20 2>/dev/null | grep -v "185.207.139" | grep -v "185.224.3" | grep "$(date '+%a %b %d')" | grep -v "reboot" | wc -l)
if [ "$GOOD" -gt "0" ]; then
  echo "⚠️ Подозрительные входы: $GOOD"
fi
```
**Если есть забаненные IP или подозрительные входы — показать Роману.**

---

*Этот файл обновляется по мере необходимости.*
