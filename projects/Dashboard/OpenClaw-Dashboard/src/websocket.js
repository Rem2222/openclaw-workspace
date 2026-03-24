const socketIo = require('socket.io');

let io = null;
let server = null;

/**
 * Инициализация WebSocket сервера
 * @param {Server} httpServer - HTTP сервер Express
 */
function initWebSocket(httpServer) {
  server = httpServer;
  
  io = socketIo(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling']
  });
  
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Отправляем текущее состояние при подключении
    socket.emit('connected', {
      message: 'Connected to OpenClaw Dashboard',
      timestamp: new Date().toISOString()
    });
    
    // Обработка отключения
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
    
    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error.message);
    });
  });
  
  console.log('🔌 WebSocket server initialized');
  return io;
}

/**
 * Получить instance io
 */
function getIo() {
  return io;
}

/**
 * Отправить событие всем подключённым клиентам
 * @param {string} event - Название события
 * @param {any} data - Данные
 */
function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
    console.log(`📡 Emit to all: ${event}`);
  }
}

/**
 * Отправить событие конкретному клиенту
 * @param {string} socketId - ID сокета
 * @param {string} event - Название события
 * @param {any} data - Данные
 */
function emitToSocket(socketId, event, data) {
  if (io) {
    io.to(socketId).emit(event, data);
  }
}

/**
 * Получить количество подключённых клиентов
 */
function getClientCount() {
  return io ? io.engine?.sockets?.size || 0 : 0;
}

module.exports = {
  initWebSocket,
  getIo,
  emitToAll,
  emitToSocket,
  getClientCount
};
