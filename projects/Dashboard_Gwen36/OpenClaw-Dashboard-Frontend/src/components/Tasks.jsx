import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const COLUMNS = {
  pending: { title: 'Очередь', color: 'warning' },
  in_progress: { title: 'В работе', color: 'info' },
  completed: { title: 'Готово', color: 'success' },
};

const PRIORITY_COLORS = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadTasks();
    
    // Polling каждые 5 секунд (fallback)
    const interval = setInterval(loadTasks, 15000);
    
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
      
      const res = await fetch('/api/tasks');
      
      
      const data = await res.json();
      setRawData(data);
      
      
      const tasks = Array.isArray(data) ? data : [];
      
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
      <div className="loading-screen">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  // Определяем отображение количества
  const countDisplay = rawData === null ? '-' : rawData.length;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Задачи</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} задач</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {Object.entries(COLUMNS).map(([key, { title, color }]) => (
          <div key={key} className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{title}</h3>
              <span className={`badge badge-${color}`} style={{ fontSize: '12px' }}>{tasksByStatus[key].length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasksByStatus[key].map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: 'var(--elevation-2)',
                    borderRadius: 'var(--radius)',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--elevation-4)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--elevation-2)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>
                      {task.title || task.description || 'Без названия'}
                    </span>
                    {task.priority && (
                      <span 
                        className={`badge badge-${PRIORITY_COLORS[task.priority] || 'info'}`}
                        style={{ fontSize: '11px', padding: '2px 6px', flexShrink: 0, marginLeft: '8px' }}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span className="mono">{task.agentId?.split('-')[0] || 'Unknown'}</span>
                    <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {tasksByStatus[key].length === 0 && (
                <div className="empty-state" style={{ padding: '32px 16px' }}>
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