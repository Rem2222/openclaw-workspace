import { useState, useEffect } from 'react';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadSessions() {
    try {
      console.log('[Sessions] Запрос к /api/sessions...');
      const start = Date.now();
      
      const res = await fetch('/api/sessions');
      const elapsed = Date.now() - start;
      
      console.log(`[Sessions] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const rawData = await res.json();
      setRawData(rawData);
      
      console.log('[Sessions] Raw data:', rawData);
      console.log('[Sessions] Type:', typeof rawData, Array.isArray(rawData) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      // Проверка: если не массив, оборачиваем или используем пустой
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные
      const sessions = dataAsArray.map(session => {
        // Извлекаем agentId из key (формат: "agent:main:main")
        const keyParts = session.key?.split(':') || [];
        const agentId = keyParts[1] || 'unknown';
        
        // Проверка на субагент (формат: "agent:main:subagent:<uuid>")
        const isSubagent = session.key?.includes(':subagent:') || false;
        
        return {
          key: session.key,  // Сохраняем оригинальный key для удаления
          id: session.sessionId || session.key,  // Используем sessionId или key
          agentId: agentId,  // Извлекаем из key
          type: isSubagent ? 'subagent' : (session.kind || 'agent'),  // Выделяем субагентов
          displayName: session.displayName,
          channel: session.channel,
          model: session.model,
          isSubagent: isSubagent,  // Флаг для UI
          updatedAt: session.updatedAt,
          duration: session.duration,  // Пока нет данных
          startedAt: session.startedAt,  // Пока нет данных
        };
      });
      
      console.log('[Sessions] Transformed data:', sessions);
      console.log(`[Sessions] Количество сессий: ${sessions.length}`);
      
      setSessions(sessions);
    } catch (error) {
      console.error('[Sessions] Ошибка:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleKill(sessionId) {
    if (!confirm('Завершить эту сессию?')) return;
    try {
      await fetch(`/api/sessions/${sessionId}/kill`, { method: 'POST' });
      loadSessions();
    } catch (error) {
      console.error('Failed to kill session:', error);
      alert('Ошибка при завершении сессии: ' + error.message);
    }
  }

  async function handleDelete(sessionKey) {
    if (!confirm('Удалить эту сессию? Это действие необратимо.')) return;
    setDeleting(sessionKey);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionKey)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка удаления');
      }
      loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Ошибка при удалении сессии: ' + error.message);
    } finally {
      setDeleting(null);
    }
  }

  const formatDuration = (ms) => {
    if (!ms) return '—';
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}с`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}м`;
    const hr = Math.floor(min / 60);
    return `${hr}ч ${min % 60}м`;
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
        <h2 className="page-title">Сессии</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} сессий</span>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ marginTop: '0', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Агент</th>
                <th>Тип</th>
                <th>Длительность</th>
                <th>Запущена</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className={session.isSubagent ? 'table-nested' : ''}>
                  <td><span className="mono">{session.id}</span></td>
                  <td>{session.agentId?.split('-')[0] || 'Unknown'}</td>
                  <td>
                    {session.isSubagent && <span title="Субагент" style={{ marginRight: '6px' }}>🔧</span>}
                    <span className={`badge ${session.isSubagent ? 'badge-warning' : 'badge-info'}`}>
                      {session.type || 'agent'}
                    </span>
                  </td>
                  <td>{formatDuration(session.duration)}</td>
                  <td>{session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleKill(session.id)}
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', color: 'var(--danger)', marginRight: '4px' }}
                      title="Завершить сессию"
                    >
                      ✕
                    </button>
                    <button
                      onClick={() => handleDelete(session.key)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '13px' }}
                      disabled={deleting === session.key}
                      title="Удалить сессию"
                    >
                      {deleting === session.key ? '...' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={6}>
                    <div className="empty-state">
                      Активных сессий нет
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}