import { useState, useEffect } from 'react';

const TYPE_ICONS = {
  agent_started: '🚀',
  agent_paused: '⏸️',
  agent_resumed: '▶️',
  agent_stopped: '🛑',
  task_created: '📝',
  task_started: '▶️',
  task_completed: '✅',
  task_failed: '❌',
  session_started: '📱',
  session_ended: '🔚',
  cron_executed: '⏰',
  approval_required: '⚠️',
  approval_approved: '✔️',
  approval_rejected: '✖️',
  error: '💥',
  warning: '⚠️',
  info: 'ℹ️',
};

const LEVEL_COLORS = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
  success: 'text-green-400',
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadActivity() {
    try {
      console.log('[Activity] Запрос к /api/activity?limit=100...');
      const start = Date.now();
      
      const res = await fetch('/api/activity?limit=100');
      const elapsed = Date.now() - start;
      
      console.log(`[Activity] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[Activity] Raw data:', data);
      console.log('[Activity] Type:', typeof data, Array.isArray(data) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      const activities = Array.isArray(data) ? data : [];
      console.log(`[Activity] Количество событий: ${activities.length}`);
      
      setActivities(activities);
    } catch (error) {
      console.error('[Activity] Ошибка:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return time.toLocaleDateString();
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
        <h2 className="text-2xl font-bold text-white">Activity Feed</h2>
        <span className="text-sm text-dark-600">{countDisplay} событий</span>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 hover:bg-dark-700 transition-colors">
            <div className="flex items-start gap-4">
              <span className="text-2xl">{TYPE_ICONS[activity.type] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p className={`text-sm font-medium ${LEVEL_COLORS[activity.level] || 'text-white'}`}>
                    {activity.message || activity.description || activity.type}
                  </p>
                  <span className="text-xs text-dark-600 whitespace-nowrap">
                    {formatTime(activity.timestamp || activity.createdAt)}
                  </span>
                </div>
                {activity.agentId && (
                  <p className="text-xs text-dark-500 mt-1">
                    Агент: {activity.agentId.split('-')[0]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="p-12 text-center text-dark-600">
            Событий пока нет
          </div>
        )}
      </div>
    </div>
  );
}
