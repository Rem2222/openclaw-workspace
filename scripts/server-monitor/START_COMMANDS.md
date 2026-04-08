# Команды запуска серверов

## Управление через systemd (рекомендуется)

Сервисы настроены с автоматической очисткой портов перед запуском.

### Статус сервисов
```bash
systemctl --user status openclaw-backend openclaw-frontend
```

### Перезапуск
```bash
systemctl --user restart openclaw-backend openclaw-frontend
```

### Остановка
```bash
systemctl --user stop openclaw-backend openclaw-frontend
```

### Логи
```bash
journalctl --user -u openclaw-backend -f
journalctl --user -u openclaw-frontend -f
```

## Ручной запуск (если нужно)

### Backend (Dashboard API)
```bash
cd ~/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard && npm start
```
- Порт: 3000
- URL: http://localhost:3000/health

### Frontend (Dashboard UI)
```bash
cd ~/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard-Frontend && npm run dev
```
- Порт: 5173
- URL: http://localhost:5173/

## OpenMOSS (если появится код)
```bash
cd ~/.openclaw/workspace/projects/OpenMOSS && python -m uvicorn app.main:app --host 0.0.0.0 --port 6565
```
- Порт: 6565
- URL: http://localhost:6565/

## MissionControl
```bash
# Уже работает как сервис или вручную:
cd ~/.mission-control && npm start  # или как там запускается
```
- Порт: 4000
- URL: http://localhost:4000/

## Ollama
```bash
# Системный сервис, запускается автоматически
# Проверка: curl http://localhost:11434
```
- Порт: 11434

---
*Файл создан: 2026-03-19*
