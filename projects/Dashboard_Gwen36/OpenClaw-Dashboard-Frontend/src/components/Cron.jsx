import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Cron() {
  const [cronJobs, setCronJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadCron();
    
    // Подписка на WebSocket события
    if (socket) {
      socket.on('cron:update', handleCronUpdate);
    }
    
    return () => {
      if (socket) {
        socket.off('cron:update', handleCronUpdate);
      }
    };
  }, [socket]);

  async function loadCron() {
    try {
      
      const res = await fetch('/api/cron');
      
      
      const data = await res.json();
      setRawData(data);
      
      
      const cronJobs = Array.isArray(data) ? data : [];
      
      setCronJobs(cronJobs);
    } catch (error) {
      console.error('[Cron] Ошибка:', error);
      setCronJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrigger(id) {
    try {
      await fetch(`/api/cron/${id}/trigger`, { method: 'POST' });
      loadCron();
    } catch (error) {
      console.error('Failed to trigger cron:', error);
    }
  }

  // Обработчик WebSocket события
  function handleCronUpdate(data) {
    setRawData(data.cronJobs);
    setCronJobs(Array.isArray(data.cronJobs) ? data.cronJobs : []);
  }

  const formatNextRun = (nextRun) => {
    if (!nextRun) return '—';
    const now = new Date();
    const next = new Date(nextRun);
    const diff = next - now;
    if (diff < 60000) return 'Сейчас';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ч`;
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
        <h2 className="page-title">Cron задачи</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} задач</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {cronJobs.map((job) => (
          <div key={job.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{job.name || job.id}</h3>
                <span className="mono" style={{ fontSize: '11px' }}>{job.id}</span>
              </div>
              <span className={`badge badge-${job.enabled ? 'success' : 'info'}`}>
                {job.enabled ? 'Включено' : 'Выкл'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Расписание:</span>
                <span className="mono">{job.schedule || '*'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>След. запуск:</span>
                <span style={{ color: 'var(--text)' }}>{formatNextRun(job.nextRun)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Последний:</span>
                <span className="mono" style={{ fontSize: '12px' }}>
                  {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Никогда'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleTrigger(job.id)}
              className="btn btn-ghost"
              style={{ width: '100%' }}
            >
              🚀 Запустить сейчас
            </button>
          </div>
        ))}
        {cronJobs.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Cron задач нет
          </div>
        )}
      </div>
    </div>
  );
}