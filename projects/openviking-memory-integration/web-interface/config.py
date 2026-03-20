"""Конфигурация веб-интерфейса для OpenViking Memory."""
import os
import sys
from datetime import date

# Пути
WORKSPACE_DIR = "/home/rem/.openclaw/workspace"
OPENVIKING_CLIENT_PATH = os.path.join(WORKSPACE_DIR, ".openclaw/skills/openviking-memory/lib")
sys.path.insert(0, OPENVIKING_CLIENT_PATH)

# Настройки сервера
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8000  # Backend API порт (frontend использует 7860)

# Настройки OpenViking
OPENVIKING_WORKSPACE = os.path.expanduser("~/.openviking/workspace")

# Настройки поиска
DEFAULT_TOP_K = 10
MAX_TOP_K = 100
MIN_TOP_K = 1

# Настройки кэша
CACHE_MAX_SIZE = 100

# Сегодняшняя дата для фильтра по умолчанию
TODAY = date.today().isoformat()
