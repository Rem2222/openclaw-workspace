import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Cron() {
  const [cronJobs, setCronJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadCron();
    
    // Polling каждые 10 секунд (fallback)
    const interval = setInterval(loadCron, 10000);
    
    // Подписка на WebSocket события
    if (socket) {
      socket.on('cron:update', handleCronUpdate);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('cron:update', handleCronUpdate);
      }
    };
  }, [socket]);

  async function loadCron() {
    try {
      console.log('[Cron] Запрос к /api/cron...');
      const start = Date.now();
      
      const res = await fetch('/api/cron');
      const elapsed = Date.now() - start;
      
      console.log(`[Cron] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[Cron] Raw data:', data);
      console.log('[Cron] Type:', typeof data, Array.isArray(data) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      const cronJobs = Array.isArray(data) ? data : [];
      console.log(`[Cron] Количество cron задач: ${cronJobs.length}`);
      
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
    console.log('[Cron] WebSocket update:', data);
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
        <h2 className="text-2xl font-bold text-white">Cron задачи</h2>
        <span className="text-sm text-dark-600">{countDisplay} задач</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cronJobs.map((job) => (
          <div key={job.id} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">{job.name || job.id}</h3>
                <p className="text-xs text-dark-600 mt-1">{job.id}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${job.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {job.enabled ? 'Включено' : 'Выкл'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Расписание:</span>
                <span className="text-white font-mono text-xs">{job.schedule || '*'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">След. запуск:</span>
                <span className="text-white">{formatNextRun(job.nextRun)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Последний:</span>
                <span className="text-dark-400 text-xs">
                  {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Никогда'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleTrigger(job.id)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
            >
              🚀 Запустить сейчас
            </button>
          </div>
        ))}
        {cronJobs.length === 0 && (
          <div className="col-span-full text-center py-12 text-dark-600">
            Cron задач нет
          </div>
        )}
      </div>
    </div>
  );
}
