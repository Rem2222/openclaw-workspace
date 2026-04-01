coded by romul

# OpenClaw Dashboard

Веб-дашборд для мониторинга OpenClaw агентов в реальном времени.

![OpenClaw Dashboard](https://img.shields.io/badge/Status-Development-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![React](https://img.shields.io/badge/React-19.2.4-61dafb)

## 📋 Описание

OpenClaw Dashboard — это веб-интерфейс для просмотра и управления OpenClaw агентами. Предоставляет real-time мониторинг через WebSocket подключение и визуализацию данных через OpenClaw Gateway API.

### Возможности

- 📊 **Список агентов** — просмотр всех активных OpenClaw агентов
- 🔄 **Сессии** — мониторинг текущих сессий агентов
- ✅ **Задачи** — Kanban-доска с задачами из сессий
- ⏰ **Cron задачи** — просмотр запланированных задач
- ✔️ **Approvals** — управление одобрениями действий
- 📡 **Лента активности** — mock-данные для демонстрации
- 🔌 **WebSocket** — real-time обновления состояния

---

## 🏗 Структура проекта

```
/home/rem/.openclaw/workspace/projects/Dashboard/
├── README.md                              # Эта документация
├── OpenClaw-Dashboard/                    # Backend (Node.js + Express)
│   ├── src/
│   │   ├── index.js                       # Точка входа, WebSocket сервер
│   │   ├── websocket.js                   # WebSocket логика
│   │   ├── gateway.js                     # Клиент для OpenClaw Gateway
│   │   ├── routes/                        # API endpoints
│   │   │   ├── agents.js                  # GET /api/agents
│   │   │   ├── sessions.js                # GET /api/sessions
│   │   │   ├── tasks.js                   # GET /api/tasks
│   │   │   ├── cron.js                    # GET /api/cron
│   │   │   ├── approvals.js               # GET /api/approvals
│   │   │   └── activity.js                # GET /api/activity
│   │   ├── cron-store.js                  # Хранилище cron задач
│   │   └── approvals-store.js             # Хранилище approvals
│   ├── package.json
│   └── .env                               # Переменные окружения
│
└── OpenClaw-Dashboard-Frontend/           # Frontend (React + Vite)
    ├── src/
    │   ├── main.jsx                       # Точка входа React
    │   ├── App.jsx                        # Главный компонент
    │   ├── index.css                      # Глобальные стили (Tailwind)
    │   ├── context/
    │   │   ├── SocketContext.jsx          # WebSocket контекст
    │   │   └── CountsContext.jsx          # Счётчики (badge counts)
    │   └── components/
    │       ├── Layout.jsx                 # Основной layout
    │       ├── Agents.jsx                 # Список агентов
    │       ├── Sessions.jsx               # Сессии
    │       ├── Tasks.jsx                  # Задачи (Kanban)
    │       ├── Cron.jsx                   # Cron задачи
    │       ├── ActivityFeed.jsx           # Лента активности
    │       ├── Approvals.jsx              # Approvals
    │       ├── GatewaySelector.jsx        # Выбор Gateway
    │       └── StatusIndicator.jsx        # Индикатор WebSocket
    ├── public/
    │   └── vite.svg                       # Favicon
    ├── index.html                         # HTML шаблон
    ├── package.json
    ├── vite.config.js                     # Vite конфиг с proxy
    ├── tailwind.config.js                 # Tailwind конфиг
    ├── postcss.config.js                  # PostCSS конфиг
    └── .env                               # VITE_SOCKET_URL
```

---

## 🛠 Технологии

### Backend
- **Node.js** 22.x — Runtime environment
- **Express** 5.2.1 — Web framework
- **Socket.io** 4.8.3 — WebSocket библиотека
- **Axios** 1.13.6 — HTTP клиент для Gateway
- **CORS** 2.8.6 — CORS middleware
- **dotenv** 17.3.1 — Переменные окружения

### Frontend
- **React** 19.2.4 — UI библиотека
- **Vite** 8.0.0 — Build tool
- **React Router** 7.13.1 — Роутинг
- **Socket.io-client** 4.8.3 — WebSocket клиент
- **Tailwind CSS** 3.4.19 — Utility-first CSS

---

## 📦 Установка

### Требования

- **Node.js** 22.x или выше
- **OpenClaw Gateway** запущен на порту 18789

### 1. Клонирование проекта

```bash
cd /home/rem/.openclaw/workspace/projects/Dashboard
```

### 2. Установка зависимостей Backend

```bash
cd OpenClaw-Dashboard
npm install
```

### 3. Установка зависимостей Frontend

```bash
cd ../OpenClaw-Dashboard-Frontend
npm install
```

---

## ⚙️ Настройка

### Backend (.env)

Создайте или отредактируйте файл `OpenClaw-Dashboard/.env`:

```env
# Порт сервера
PORT=3000

# OpenClaw Gateway
GATEWAY_URL=http://localhost:18789
GATEWAY_TOKEN=ваш_gateway_token

# CORS (допустимые источники)
CORS_ORIGIN=http://localhost:5173

# Режим работы
NODE_ENV=development
```

**Переменные окружения:**

| Переменная | Описание | По умолчанию |
|------------|----------|-------------|
| `PORT` | Порт Backend сервера | `3000` |
| `GATEWAY_URL` | URL OpenClaw Gateway | `http://localhost:18789` |
| `GATEWAY_TOKEN` | Токен авторизации Gateway | *обязательно* |
| `CORS_ORIGIN` | Разрешённый CORS origin | `http://localhost:5173` |
| `NODE_ENV` | Режим работы | `development` |

### Frontend (.env)

Создайте или отредактируйте файл `OpenClaw-Dashboard-Frontend/.env`:

```env
# URL WebSocket сервера (для прямого подключения)
VITE_SOCKET_URL=http://localhost:3000
```

**Примечание:** В development режиме frontend использует Vite proxy для пересылки запросов к Backend. Переменная `VITE_SOCKET_URL` используется только при прямом подключении.

---

## 🚀 Запуск

### Development режим

#### Backend (терминал 1)

```bash
cd /home/rem/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard
npm run dev
```

Backend запустится на `http://localhost:3000`

#### Frontend (терминал 2)

```bash
cd /home/rem/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard-Frontend
npm run dev
```

Frontend запустится на `http://localhost:5173`

### Production сборка

#### Backend

```bash
cd /home/rem/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard
npm start
```

#### Frontend

```bash
cd /home/rem/.openclaw/workspace/projects/Dashboard/OpenClaw-Dashboard-Frontend
npm run build
```

Собранные файлы будут в папке `dist/`

Для предпросмотра production сборки:

```bash
npm run preview
```

---

## 📡 API Документация

### HTTP Endpoints

#### GET `/api/agents`

Возвращает список всех активных OpenClaw агентов.

**Response:**
```json
[
  {
    "session": "agent:main:telegram:direct:386235337:thread:171843",
    "type": "main",
    "channel": "telegram",
    "capabilities": ["inlineButtons"],
    "reasoning": false,
    "reasoningLevel": 0,
    "requester": "386235337",
    "requesterName": "Rem",
    "requesterAvatar": "https://...",
    "createdAt": 1742373009175,
    "lastMessageAt": 1742376681288,
    "messageCount": 45,
    "tokenCount": 231933
  }
]
```

#### GET `/api/sessions`

Возвращает список сессий всех агентов.

**Response:**
```json
{
  "agent:main:telegram:direct:386235337:thread:171843": {
    "sessions": [
      {
        "sessionId": "agent:main:telegram:direct:386235337:thread:171843",
        "label": "Main Session",
        "requesterSession": "agent:main:telegram:direct:386235337:thread:171843",
        "requesterChannel": "telegram",
        "depth": 0,
        "createdAt": 1742373009175
      }
    ]
  }
}
```

#### GET `/api/tasks`

Возвращает задачи из всех сессий (для Kanban доски).

**Response:**
```json
{
  "agent:main:telegram:direct:386235337:thread:171843": {
    "tasks": [
      {
        "sessionId": "agent:main:subagent:9c867a1b-4462-427c-b9da-f1ebb10fc349",
        "taskType": "subagent",
        "title": "Создать документацию",
        "status": "in-progress",
        "createdAt": 1742376681288
      }
    ]
  }
}
```

#### GET `/api/cron`

Возвращает список cron задач.

**Response:**
```json
{
  "tasks": [
    {
      "id": "heartbeat-check",
      "name": "Heartbeat Check",
      "schedule": "*/5 * * * *",
      "nextRun": "2024-01-15T12:35:00.000Z"
    }
  ]
}
```

#### GET `/api/approvals`

Возвращает список pending approvals.

**Response:**
```json
{
  "approvals": [
    {
      "id": "approval-123",
      "sessionId": "agent:main:telegram:direct:386235337:thread:171843",
      "action": "tool_call",
      "tool": "message",
      "description": "Отправить сообщение в Telegram",
      "createdAt": 1742376681288
    }
  ]
}
```

#### GET `/api/activity`

Возвращает mock-данные ленты активности (для демонстрации).

**Response:**
```json
{
  "activity": [
    {
      "id": "act-1",
      "type": "message",
      "agent": "Rem",
      "action": "отправил сообщение",
      "timestamp": 1742376681288
    }
  ]
}
```

#### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1742376681288
}
```

### WebSocket Events

Подключитесь через Socket.io на `/socket.io`.

#### Server → Client Events

| Event | Описание | Payload |
|-------|----------|---------|
| `agents-update` | Обновление списка агентов | `Array<Agent>` |
| `sessions-update` | Обновление сессий | `Object` |
| `tasks-update` | Обновление задач | `Object` |
| `cron-update` | Обновление cron задач | `Object` |
| `approvals-update` | Обновление approvals | `Object` |
| `connection-count` | Количество подключений | `{ count: number }` |

#### Client → Server Events

| Event | Описание | Payload |
|-------|----------|---------|
| `connect` | Подключение клиента | `-` |
| `disconnect` | Отключение клиента | `-` |

---

## 🔧 Команды

### Backend

| Команда | Описание |
|---------|----------|
| `npm start` | Запуск сервера (production) |
| `npm run dev` | Запуск с nodemon (development) |
| `npm test` | Запуск тестов (не реализовано) |

### Frontend

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск Vite dev сервера |
| `npm run build` | Сборка production |
| `npm run preview` | Предпросмотр production сборки |
| `npm run lint` | Запуск ESLint |

---

## 🌐 Порты

| Сервис | Порт | Описание |
|--------|------|----------|
| OpenClaw Gateway | 18789 | OpenClaw Gateway API |
| Backend | 3000 | Express сервер + WebSocket |
| Frontend (dev) | 5173 | Vite dev сервер |
| Frontend (prod) | 4173 | Vite preview сервер |

---

## 🐛 Устранение неполадок

### Порт уже занят

**Ошибка:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000`

**Решение:** Найдите и убейте процесс:

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Или через fuser
fuser -k 3000/tcp

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Или измените порт в `.env`:

```env
PORT=3001
```

### OpenClaw Gateway недоступен

**Ошибка:** `ECONNREFUSED connect ECONNREFUSED 127.0.0.1:18789`

**Решение:** Запустите Gateway:

```bash
# Проверка статуса
openclaw gateway status

# Запуск
openclaw gateway start

# Или перезапуск
openclaw gateway restart
```

### CORS ошибка

**Ошибка:** `Access to fetch at 'http://localhost:3000/api/agents' has been blocked by CORS policy`

**Решение:** Проверьте `CORS_ORIGIN` в Backend `.env`:

```env
CORS_ORIGIN=http://localhost:5173
```

Перезапустите Backend после изменения.

### WebSocket не подключается

**Ошибка:** `WebSocket connection failed`

**Проверьте:**

1. Backend запущен на порту 3000
2. Frontend подключается к правильному URL
3. В браузере нет расширений, блокирующих WebSocket

### npm install не работает

**Решение:** Очистите кэш и переустановите:

```bash
# Очистка кэша
npm cache clean --force

# Удаление node_modules
rm -rf node_modules package-lock.json

# Переустановка
npm install
```

### Frontend не видит изменения Backend

Убедитесь, что Vite proxy настроен правильно в `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': 'http://localhost:3000',
    '/health': 'http://localhost:3000',
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
    },
  },
}
```

---

## 📝 Лицензия

MIT

---

## 🎨 Дизайн-референс (nekocode.app)

Для редизайна интерфейса используется CSS из https://nekocode.app

**Файл стилей:** `OpenClaw-Dashboard-Frontend/src/styles/nekocode-landing.css`

**Документация:** `OpenClaw-Dashboard-Frontend/src/styles/README.md`

**Содержимое:**
- CSS-переменные (dark/light темы, Catppuccin Mocha/Latte)
- Готовые компоненты: sidebar, nav, buttons, cards, modals, tables, auth screens
- Шрифт: JetBrains Mono
- Иконки: Lucide Icons

**Планы по редизайну:** см. `План_разработки.md` — Этап X: Редизайн интерфейса

---

## 👤 Автор

**Rem** — OpenClaw Dashboard Project

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи Backend в терминале
2. Проверьте Console в браузере (F12)
3. Убедитесь, что OpenClaw Gateway запущен
4. Проверьте переменные окружения в `.env` файлах

