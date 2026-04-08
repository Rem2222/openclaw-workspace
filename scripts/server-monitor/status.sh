#!/bin/bash

# Server Status Command
# Проверяет и отображает статус всех серверов

MONITOR_DIR="/home/rem/.openclaw/workspace/scripts/server-monitor"
CONFIG_FILE="$MONITOR_DIR/config.json"

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        📊 СТАТУС СЕРВЕРОВ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL=0
UP=0
DOWN=0

# Функция проверки HTTP
check_http() {
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
    
    echo "$name|$host|$port|$http_code|$resp_time|http|$expected"
}

# Функция проверки TCP
check_tcp() {
    local name="$1"
    local host="$2"
    local port="$3"
    local timeout="$4"
    
    local start=$EPOCHSECONDS
    if timeout "$timeout" bash -c "echo >/dev/tcp/${host}/${port}" 2>/dev/null; then
        local end=$EPOCHSECONDS
        local resp_time=$(( (end - start) * 1000 ))
        echo "$name|$host|$port|OK|$resp_time|tcp|"
    else
        local end=$EPOCHSECONDS
        local resp_time=$(( (end - start) * 1000 ))
        echo "$name|$host|$port|FAIL|$resp_time|tcp|"
    fi
}

# Проверка Ollama (всегда включена)
RESULT=$(check_http "Ollama" "localhost" "11434" "/api/tags" "5" "200")
TOTAL=$((TOTAL + 1))

# Проверка серверов из конфига
if [ -f "$CONFIG_FILE" ]; then
    while IFS='|' read -r name host port type path timeout expected; do
        # Пропускаем пустые строки и комментарии
        [[ -z "$name" || "$name" =~ ^# ]] && continue
        
        case $type in
            "http")
                path=${path:-/}
                timeout=${timeout:-5}
                expected=${expected:-200}
                RESULT="$RESULT\n$(check_http "$name" "$host" "$port" "$path" "$timeout" "$expected")"
                ;;
            "tcp")
                timeout=${timeout:-5}
                RESULT="$RESULT\n$(check_tcp "$name" "$host" "$port" "$timeout")"
                ;;
        esac
        TOTAL=$((TOTAL + 1))
    done < "$CONFIG_FILE"
fi

# Вывод результатов
printf -v RESULTS "%b" "$RESULT"

while IFS='|' read -r name host port status resp_time type expected; do
    [[ -z "$name" ]] && continue
    
    if [[ "$status" == "OK" ]] || [[ "$status" == "$expected" ]]; then
        STATUS_ICON="🟢"
        STATUS_TEXT="UP"
        COLOR="$GREEN"
        UP=$((UP + 1))
    else
        STATUS_ICON="🔴"
        STATUS_TEXT="DOWN"
        COLOR="$RED"
        DOWN=$((DOWN + 1))
    fi
    
    if [ "$type" = "http" ]; then
        echo -e "${STATUS_ICON} ${COLOR}${name}${NC} (${host}:${port}) - ${resp_time}ms | HTTP ${status}"
    else
        echo -e "${STATUS_ICON} ${COLOR}${name}${NC} (${host}:${port}) - ${resp_time}ms | TCP"
    fi
done <<< "$RESULTS"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $DOWN -eq 0 ]; then
    echo -e "${GREEN}✅ ВСЕ СЕРВЕРА ДОСТУПНЫ${NC}"
    echo "   ${UP}/${TOTAL} серверов UP"
else
    echo -e "${RED}❌ ${DOWN} СЕРВЕР(ОВ) НЕДОСТУПНО${NC}"
    echo "   ${UP}/${TOTAL} серверов UP"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit $DOWN
