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

const LEVEL_BADGES = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
  success: 'success',
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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const dateStr = date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const todayStr = now.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
      
      // Сегодня — только время, не сегодня — дата
      if (dateStr === todayStr) {
        return timeStr;
      }
      return dateStr;
    } catch {
      return '—';
    }
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
        <h2 className="page-title">Activity Feed</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} событий</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border-subtle)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--elevation-4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{TYPE_ICONS[activity.type] || '📌'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                      {activity.message || activity.description || activity.type}
                    </span>
                    {activity.level && (
                      <span className={`badge badge-${LEVEL_BADGES[activity.level] || 'info'}`} style={{ fontSize: '11px' }}>
                        {activity.level}
                      </span>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {formatDateTime(activity.timestamp || activity.createdAt)}
                  </span>
                </div>
                {activity.agentId && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Агент: <span className="mono">{activity.agentId.split('-')[0]}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="empty-state">
            Событий пока нет
          </div>
        )}
      </div>
    </div>
  );
}