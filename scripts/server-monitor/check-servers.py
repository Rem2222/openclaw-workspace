#!/usr/bin/env python3
"""
Server Monitor Script
Проверяет доступность серверов и логгирует результаты
"""

import json
import subprocess
import urllib.request
import urllib.error
import socket
import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Any

import os

# Динамическое определение workspace
WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
CONFIG_FILE = f"{WORKSPACE}/scripts/server-monitor/config.json"
STATUS_FILE = f"{WORKSPACE}/scripts/server-monitor/status.json"
LOG_FILE = f"{WORKSPACE}/scripts/server-monitor/monitor.log"

def check_http(host: str, port: int, path: str = "/", timeout: int = 5, expected_code: int = 200) -> tuple:
    """Проверка HTTP сервера"""
    url = f"http://{host}:{port}{path}"
    start_time = datetime.now()
    
    try:
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            http_code = response.getcode()
            return http_code == expected_code, round(response_time)
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        return False, round(response_time)

def check_tcp(host: str, port: int, timeout: int = 5) -> tuple:
    """Проверка TCP порта"""
    start_time = datetime.now()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        return True, round(response_time)
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        return False, round(response_time)

def check_ping(host: str, timeout: int = 5) -> tuple:
    """Проверка через ping"""
    start_time = datetime.now()
    try:
        result = subprocess.run(
            ['ping', '-c', '1', '-W', str(timeout), host],
            capture_output=True,
            timeout=timeout + 2
        )
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        return result.returncode == 0, round(response_time)
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        return False, round(response_time)

def check_server(server: Dict[str, Any]) -> tuple:
    """Проверка одного сервера"""
    host = server.get('host', '')
    port = server.get('port', 0)
    server_type = server.get('type', 'http')
    timeout = server.get('timeout', 5)
    
    if server_type == 'http':
        path = server.get('path', '/')
        expected_code = server.get('expected_code', 200)
        return check_http(host, port, path, timeout, expected_code)
    elif server_type == 'tcp':
        return check_tcp(host, port, timeout)
    elif server_type == 'ping':
        return check_ping(host, timeout)
    else:
        return False, 0

def main():
    # Временные метки
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_human = datetime.now().strftime("%d.%m.%Y %H:%M")
    
    # Создание директории для логов
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    
    # Открываем лог-файл
    with open(LOG_FILE, 'a') as log:
        log.write("=" * 40 + "\n")
        log.write(f"[{date_human}] Server Check Started\n")
        log.write("=" * 40 + "\n")
        
        # Чтение конфига
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
        except FileNotFoundError:
            print(f"❌ Config file not found: {CONFIG_FILE}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in config: {e}", file=sys.stderr)
            sys.exit(1)
        
        servers = config.get('servers', [])
        total_servers = len(servers)
        down_servers = 0
        
        # Результаты проверки
        server_results = {}
        
        for server in servers:
            name = server.get('name', f"{server.get('host', 'unknown')}:{server.get('port', '?')}")
            host = server.get('host', '')
            port = server.get('port', 0)
            
            is_up, response_time = check_server(server)
            
            server_results[name] = {
                "status": "UP" if is_up else "DOWN",
                "response_time": response_time
            }
            
            if is_up:
                log.write(f"✅ {name} ({host}:{port}) - {response_time}ms\n")
            else:
                log.write(f"❌ {name} ({host}:{port}) - {response_time}ms\n")
                down_servers += 1
        
        # Итог
        if down_servers == 0:
            log.write(f"\n🟢 ALL SERVERS OK ({total_servers}/{total_servers})\n")
            exit_code = 0
        else:
            log.write(f"\n🔴 {down_servers} SERVER(S) DOWN! ({total_servers - down_servers}/{total_servers} OK)\n")
            exit_code = 1
        
        # Сохранение статусов в JSON
        status_data = {
            "timestamp": timestamp,
            "total": total_servers,
            "up": total_servers - down_servers,
            "down": down_servers,
            "servers": server_results
        }
        
        with open(STATUS_FILE, 'w') as f:
            json.dump(status_data, f, indent=2)
        
        # Консольный вывод
        print(f"[{date_human}] Check complete: {total_servers - down_servers}/{total_servers} OK")
        
        sys.exit(exit_code)

if __name__ == "__main__":
    main()
