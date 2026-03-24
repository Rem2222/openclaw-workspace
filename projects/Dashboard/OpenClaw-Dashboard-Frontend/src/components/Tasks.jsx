import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const COLUMNS = {
  pending: { title: 'Очередь', color: 'border-l-yellow-500' },
  in_progress: { title: 'В работе', color: 'border-l-blue-500' },
  completed: { title: 'Готово', color: 'border-l-green-500' },
};

const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadTasks();
    
    // Polling каждые 5 секунд (fallback)
    const interval = setInterval(loadTasks, 5000);
    
    // Подписка на WebSocket события
    if (socket) {
      socket.on('tasks:update', handleTasksUpdate);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('tasks:update', handleTasksUpdate);
      }
    };
  }, [socket]);

  async function loadTasks() {
    try {
      console.log('[Tasks] Запрос к /api/tasks...');
      const start = Date.now();
      
      const res = await fetch('/api/tasks');
      const elapsed = Date.now() - start;
      
      console.log(`[Tasks] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[Tasks] Raw data:', data);
      console.log('[Tasks] Type:', typeof data, Array.isArray(data) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      const tasks = Array.isArray(data) ? data : [];
      console.log(`[Tasks] Количество задач: ${tasks.length}`);
      
      setTasks(tasks);
    } catch (error) {
      console.error('[Tasks] Ошибка:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  // Обработчик WebSocket события
  function handleTasksUpdate(data) {
    console.log('[Tasks] WebSocket update:', data);
    setRawData(data.tasks);
    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
  }

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'active'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Определяем отображение количества
  const countDisplay = rawData === null ? '-' : rawData.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Задачи</h2>
        <span className="text-sm text-dark-600">{countDisplay} задач</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(COLUMNS).map(([key, { title, color }]) => (
          <div key={key} className={`bg-dark-800 rounded-xl p-4 ${color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{title}</h3>
              <span className="text-xs text-dark-600">{tasksByStatus[key].length}</span>
            </div>

            <div className="space-y-3">
              {tasksByStatus[key].map((task) => (
                <div
                  key={task.id}
                  className="bg-dark-700 rounded-lg p-4 hover:bg-dark-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm text-white font-medium line-clamp-2">
                      {task.title || task.description || 'Без названия'}
                    </span>
                    {task.priority && (
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-dark-500">
                    <span>{task.agentId?.split('-')[0] || 'Unknown'}</span>
                    <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {tasksByStatus[key].length === 0 && (
                <div className="text-center py-8 text-dark-600 text-sm">
                  Пусто
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
