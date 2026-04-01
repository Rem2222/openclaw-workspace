const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { initWebSocket, getIo } = require('./websocket');
const GatewayClient = require('./gateway');

// DEBUG: Log env vars
console.log('[DEBUG] CWD:', process.cwd());
console.log('[DEBUG] GATEWAY_URL:', process.env.GATEWAY_URL);
console.log('[DEBUG] GATEWAY_TOKEN length:', process.env.GATEWAY_TOKEN?.length);
console.log('[DEBUG] PORT:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Static files (production build)
const staticPath = path.resolve(__dirname, '../../OpenClaw-Dashboard-Frontend/dist');
app.use(express.static(staticPath));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA catch-all (serve index.html for non-API routes) - размещаем ПОСЛЕ API
// Используем регулярное выражение без path-to-regexp
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    next();
  }
});

// ==================== WebSocket & Real-time Updates ====================

// Запуск HTTP сервера (не через app.listen, чтобы можно было передать в WebSocket)
const httpServer = app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Dashboard running on http://localhost:${PORT}`);
});

// Инициализация WebSocket
initWebSocket(httpServer);

// GatewayClient для polling
const gateway = new GatewayClient(
  process.env.GATEWAY_URL,
  process.env.GATEWAY_TOKEN
);

// Хранилище предыдущих значений для детекции изменений
const previousState = {
  agents: [],
  sessions: [],
  tasks: []
};

/**
 * Polling механизм для проверки изменений
 */
async function pollForChanges() {
  try {
    // 1. Проверяем агентов
    const agentsResponse = await gateway.getAgents();
    const agents = agentsResponse.data?.result || [];
    
    // Сравнение с предыдущим состоянием
    const agentsChanged = JSON.stringify(agents) !== JSON.stringify(previousState.agents);
    previousState.agents = agents;
    
    if (agentsChanged) {
      getIo()?.emit('agents:update', {
        agents,
        timestamp: new Date().toISOString()
      });
    }
    
    // 2. Проверяем сессии
    const sessionsResponse = await gateway.getSessions();
    const sessions = sessionsResponse.data?.result || [];
    
    const sessionsChanged = JSON.stringify(sessions) !== JSON.stringify(previousState.sessions);
    previousState.sessions = sessions;
    
    if (sessionsChanged) {
      getIo()?.emit('sessions:update', {
        sessions,
        timestamp: new Date().toISOString()
      });
    }
    
    // 3. Проверяем задачи (из сессий)
    const tasks = await gateway.getTasks({});
    
    const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(previousState.tasks);
    previousState.tasks = tasks;
    
    if (tasksChanged) {
      getIo()?.emit('tasks:update', {
        tasks,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('⚠️ Polling error:', error.message);
  }
}

// Запуск polling каждые 5 секунд
const POLL_INTERVAL = 30000; // 5 секунд
setInterval(pollForChanges, POLL_INTERVAL);

// Первый запуск сразу
pollForChanges();

console.log(`🔄 Real-time polling started (interval: ${POLL_INTERVAL}ms)`);

// ==================== Event Names ====================
// События, которые отправляет сервер:
// 
// - 'connected' — клиент подключился
// - 'agents:update' — обновление списка агентов
// - 'sessions:update' — обновление списка сессий  
// - 'tasks:update' — обновление списка задач
// - 'activity:new' — новое событие в activity feed
//
// Пример использования на клиенте:
// 
// const socket = io('http://localhost:3000');
// socket.on('agents:update', (data) => {
//   console.log('Agents updated:', data.agents);
// });
// socket.on('sessions:update', (data) => {
//   console.log('Sessions updated:', data.sessions);
// });
// socket.on('tasks:update', (data) => {
//   console.log('Tasks updated:', data.tasks);
// });
