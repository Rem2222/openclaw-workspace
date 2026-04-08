#!/bin/bash

# Server Monitor Script - Simple Version

CONFIG_FILE="/home/rem/.openclaw/workspace/scripts/server-monitor/config.json"
STATUS_FILE="/home/rem/.openclaw/workspace/scripts/server-monitor/status.json"
LOG_FILE="/home/rem/.openclaw/workspace/scripts/server-monitor/monitor.log"

# Используем EPOCHSECONDS вместо date (доступно в bash 4.2+)
TIMESTAMP="$EPOCHSECONDS"

echo "=======================================" >> "$LOG_FILE"
echo "Server Check Started (epoch: $TIMESTAMP)" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

TOTAL_SERVERS=0
DOWN_SERVERS=0
SERVERS_JSON=""

# Проверка Ollama
check_ollama() {
    local start=$EPOCHSECONDS
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:11434/api/tags 2>/dev/null || echo "000")
    local end=$EPOCHSECONDS
    local resp_time=$(( (end - start) * 1000 ))
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Ollama (localhost:11434) - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"Ollama","host":"localhost","port":11434,"status":"UP","response_time":'$resp_time',"type":"http"}'
        return 0
    else
        echo "❌ Ollama (localhost:11434) HTTP $http_code - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"Ollama","host":"localhost","port":11434,"status":"DOWN","response_time":'$resp_time',"type":"http","http_code":"'$http_code'"}'
        return 1
    fi
}

# Проверка TCP порта
check_tcp_port() {
    local name="$1"
    local host="$2"
    local port="$3"
    local timeout="$4"
    
    local start=$EPOCHSECONDS
    if timeout "$timeout" bash -c "echo >/dev/tcp/${host}/${port}" 2>/dev/null; then
        local end=$EPOCHSECONDS
        local resp_time=$(( (end - start) * 1000 ))
        echo "✅ $name (${host}:${port}) - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"'$name'","host":"'$host'","port":'$port',"status":"UP","response_time":'$resp_time',"type":"tcp"}'
        return 0
    else
        local end=$EPOCHSECONDS
        local resp_time=$(( (end - start) * 1000 ))
        echo "❌ $name (${host}:${port}) - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"'$name'","host":"'$host'","port":'$port',"status":"DOWN","response_time":'$resp_time',"type":"tcp"}'
        return 1
    fi
}

# Проверка HTTP
check_http_server() {
    local name="$1"
    local host="$2"
    local port="$3"
    local path="$4"
    local timeout="$5"
    local expected="$6"
    
    local start=$EPOCHSECONDS
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "http://${host}:${port}${path}" 2>/dev/null || echo "000")
    local end=$EPOCHSECONDS
    local resp_time=$(( (end - start) * 1000 ))
    
    if [ "$http_code" = "$expected" ]; then
        echo "✅ $name (${host}:${port}) - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"'$name'","host":"'$host'","port":'$port',"status":"UP","response_time":'$resp_time',"type":"http"}'
        return 0
    else
        echo "❌ $name (${host}:${port}) HTTP $http_code - ${resp_time}ms" >> "$LOG_FILE"
        echo '{"name":"'$name'","host":"'$host'","port":'$port',"status":"DOWN","response_time":'$resp_time',"type":"http","http_code":"'$http_code'"}'
        return 1
    fi
}

# === ПРОВЕРКА OLLAMA (всегда включена) ===
TOTAL_SERVERS=$((TOTAL_SERVERS + 1))
RESULT=$(check_ollama)
if [ $? -ne 0 ]; then
    DOWN_SERVERS=$((DOWN_SERVERS + 1))
fi
SERVERS_JSON="$RESULT"

# === ЧТЕНИЕ ДОПОЛНИТЕЛЬНЫХ СЕРВЕРОВ ИЗ КОНФИГА ===
# Формат: NAME|HOST|PORT|TYPE|PATH|TIMEOUT|EXPECTED_CODE
# Пример: MyServer|192.168.1.100|80|http|/|5|200

if [ -f "$CONFIG_FILE" ]; then
    while IFS='|' read -r name host port type path timeout expected; do
        # Пропускаем пустые строки и комментарии
        [[ -z "$name" || "$name" =~ ^# ]] && continue
        
        TOTAL_SERVERS=$((TOTAL_SERVERS + 1))
        
        case $type in
            "http")
                path=${path:-/}
                timeout=${timeout:-5}
                expected=${expected:-200}
                RESULT=$(check_http_server "$name" "$host" "$port" "$path" "$timeout" "$expected")
                if [ $? -ne 0 ]; then
                    DOWN_SERVERS=$((DOWN_SERVERS + 1))
                fi
                ;;
            "tcp")
                timeout=${timeout:-5}
                RESULT=$(check_tcp_port "$name" "$host" "$port" "$timeout")
                if [ $? -ne 0 ]; then
                    DOWN_SERVERS=$((DOWN_SERVERS + 1))
                fi
                ;;
            *)
                echo "⚠️ Unknown type: $type" >> "$LOG_FILE"
                ;;
        esac
        
        # Добавляем к JSON
        if [ -n "$SERVERS_JSON" ]; then
            SERVERS_JSON="$SERVERS_JSON,$RESULT"
        else
            SERVERS_JSON="$RESULT"
        fi
    done < "$CONFIG_FILE"
fi

# === СОХРАНЕНИЕ СТАТУСА ===
cat > "$STATUS_FILE" << EOF
{
  "timestamp": $TIMESTAMP,
  "total": $TOTAL_SERVERS,
  "up": $((TOTAL_SERVERS - DOWN_SERVERS)),
  "down": $DOWN_SERVERS,
  "servers": [$SERVERS_JSON]
}
EOF

# === ИТОГ ===
echo "" >> "$LOG_FILE"
if [ $DOWN_SERVERS -eq 0 ]; then
    echo "🟢 ALL SERVERS OK ($TOTAL_SERVERS/$TOTAL_SERVERS)" >> "$LOG_FILE"
    echo "✅ $TOTAL_SERVERS/$TOTAL_SERVERS OK"
    exit 0
else
    echo "🔴 $DOWN_SERVERS SERVER(S) DOWN! ($((TOTAL_SERVERS - DOWN_SERVERS))/$TOTAL_SERVERS OK)" >> "$LOG_FILE"
    echo "❌ $DOWN_SERVERS сервера недоступны ($((TOTAL_SERVERS - DOWN_SERVERS))/$TOTAL_SERVERS OK)"
    exit 1
fi
