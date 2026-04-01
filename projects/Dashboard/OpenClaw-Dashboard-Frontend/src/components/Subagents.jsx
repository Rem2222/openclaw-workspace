import { useState, useEffect } from 'react';

export default function Subagents() {
  const [subagents, setSubagents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadSubagents();
    const interval = setInterval(loadSubagents, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadSubagents() {
    try {
      console.log('[Subagents] Запрос к /api/subagents...');
      const start = Date.now();
      
      const res = await fetch('/api/subagents');
      const elapsed = Date.now() - start;
      
      console.log(`[Subagents] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const rawData = await res.json();
      setRawData(rawData);
      
      console.log('[Subagents] Raw data:', rawData);
      console.log('[Subagents] Type:', typeof rawData, Array.isArray(rawData) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      // Данные уже массив
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные
      const agents = dataAsArray.map(sa => ({
        id: sa.sessionKey || sa.runId || `subagent_${Date.now()}`,
        agentId: 'subagent',
        type: 'subagent',
        displayName: sa.label || `Subagent ${sa.runId?.slice(0, 8)}`,
        channel: sa.channel || 'unknown',
        model: sa.model,
        status: sa.status, // active, recent, done
        runtime: sa.runtime,
        totalTokens: sa.totalTokens,
        updatedAt: sa.endedAt || sa.startedAt,
        durationMs: sa.runtimeMs,
        startedAt: sa.startedAt,
        endedAt: sa.endedAt,
        isSubagent: true
      }));
      
      console.log('[Subagents] Transformed data:', agents);
      console.log(`[Subagents] Количество субагентов: ${agents.length}`);
      
      setSubagents(agents);
    } catch (error) {
      console.error('[Subagents] Ошибка:', error);
      setSubagents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleKill(sessionKey) {
    if (!confirm('Завершить этого субагента?')) return;
    try {
      await fetch(`/api/subagents/${sessionKey}/kill`, { method: 'POST' });
      loadSubagents();
    } catch (error) {
      console.error('Failed to kill subagent:', error);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'done':
        return 'badge-info';
      case 'error':
        return 'badge-danger';
      default:
        return 'badge-warning';
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
        <h2 className="page-title">Субагенты</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} субагентов</span>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ marginTop: '0', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Задача</th>
                <th>Статус</th>
                <th>Длительность</th>
                <th>Модель</th>
                <th>Токены</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {subagents.map((subagent) => (
                <tr key={subagent.id} className="table-nested">
                  <td><span className="mono">{subagent.id}</span></td>
                  <td>
                    <span style={{ marginRight: '6px' }}>🔧</span>
                    {subagent.displayName}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(subagent.status)}`}>
                      {subagent.status}
                    </span>
                  </td>
                  <td>{formatDuration(subagent.durationMs)}</td>
                  <td>{subagent.model}</td>
                  <td>{subagent.totalTokens?.toLocaleString() || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {subagent.status === 'active' && (
                      <button
                        onClick={() => handleKill(subagent.id)}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', color: 'var(--danger)' }}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {subagents.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={7}>
                    <div className="empty-state">
                      Активных субагентов нет
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