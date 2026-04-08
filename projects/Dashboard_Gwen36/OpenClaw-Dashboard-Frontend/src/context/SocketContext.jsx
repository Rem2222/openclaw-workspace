import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

// Состояние для real-time данных
const initialState = {
  agents: [],
  sessions: [],
  tasks: [],
  activity: [],
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(initialState);
  const [error, setError] = useState(null);

  // Функция для обновления данных
  const updateData = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let newSocket = null;

    try {
      // Подключаемся к WebSocket серверу
      // В development используем относительный путь (через Vite proxy)
      // В production — относительный путь (тот же origin)
      const isDev = import.meta.env.DEV;
      // Пустая строка = тот же origin (через Vite proxy в dev, или тот же сервер в prod)
      const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
      
      if (import.meta.env.DEV) console.log('[SocketContext] Connecting to:', socketUrl || '(same origin)', '(DEV:', isDev, ')');
      
      newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        if (import.meta.env.DEV) console.log('✅ WebSocket connected:', newSocket.id);
        setConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', (reason) => {
        if (import.meta.env.DEV) console.log('❌ WebSocket disconnected:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.warn('⚠️ WebSocket connection error:', error.message);
        setConnected(false);
        setError(error.message);
      });

      // --- WebSocket Events ---

      // Обновление списка агентов
      newSocket.on('agents:update', (agents) => {
        if (import.meta.env.DEV) console.log('[Socket] agents:update:', agents);
        updateData('agents', agents);
      });

      // Обновление списка сессий
      newSocket.on('sessions:update', (sessions) => {
        if (import.meta.env.DEV) console.log('[Socket] sessions:update:', sessions);
        updateData('sessions', sessions);
      });

      // Обновление списка задач
      newSocket.on('tasks:update', (tasks) => {
        if (import.meta.env.DEV) console.log('[Socket] tasks:update:', tasks);
        updateData('tasks', tasks);
      });

      // Новое событие в activity feed
      newSocket.on('activity:new', (activityItem) => {
        if (import.meta.env.DEV) console.log('[Socket] activity:new:', activityItem);
        setData(prev => ({
          ...prev,
          activity: [activityItem, ...prev.activity].slice(0, 100), // Храним последние 100
        }));
      });

      // ---

      setSocket(newSocket);
    } catch (err) {
      console.error('❌ SocketProvider error:', err);
      setError(err.message);
      setConnected(false);
    }

    // Cleanup при размонтировании
    return () => {
      if (newSocket) {
        try {
          newSocket.off('connect');
          newSocket.off('disconnect');
          newSocket.off('connect_error');
          newSocket.off('agents:update');
          newSocket.off('sessions:update');
          newSocket.off('tasks:update');
          newSocket.off('activity:new');
          newSocket.close();
        } catch (e) {
          console.warn('Socket cleanup error:', e);
        }
      }
    };
  }, [updateData]);

  return (
    <SocketContext.Provider value={{ socket, connected, data, updateData, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
