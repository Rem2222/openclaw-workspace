import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  idle: 'success',
  busy: 'info',
  paused: 'warning',
  error: 'danger',
};

const STATUS_LABELS = {
  idle: 'Свободен',
  busy: 'Занят',
  paused: 'На паузе',
  error: 'Ошибка',
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadAgents() {
    try {
      
      const res = await fetch('/api/agents');
      
      
      const rawData = await res.json();
      setRawData(rawData);
      
      
      // Проверка: если не массив, оборачиваем или используем пустой
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные, добавляя дефолтные значения
      const agents = dataAsArray.map(agent => ({
        id: agent.id,
        name: agent.name || agent.id,  // Используем id как name если нет name
        configured: agent.configured,
        status: agent.status || 'idle',  // Дефолтный статус
        tasks: agent.tasks || [],       // Пустой массив
        sessions: agent.sessions || [], // Пустой массив
      }));
      
      
      setAgents(agents);
    } catch (error) {
      console.error('[Agents] Ошибка:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(agentId, action) {
    try {
      await fetch(`/api/agents/${agentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      loadAgents();
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }

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
        <h2 className="page-title">Агенты</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} агент(ов)</span>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ marginTop: '0', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Статус</th>
                <th>Задач</th>
                <th>Сессий</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td><span className="mono">{agent.id}</span></td>
                  <td>{agent.name || agent.id}</td>
                  <td>
                    <span className={`badge badge-${STATUS_COLORS[agent.status] || 'info'}`}>
                      <span className={`status-dot status-dot--${STATUS_COLORS[agent.status] || 'info'}`}>
                        {STATUS_LABELS[agent.status] || agent.status}
                      </span>
                    </span>
                  </td>
                  <td>{agent.tasks?.length || 0}</td>
                  <td>{agent.sessions?.length || 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {agent.status === 'paused' ? (
                        <button
                          onClick={() => handleAction(agent.id, 'resume')}
                          className="btn btn-ghost"
                        >
                          ▶️ Resume
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(agent.id, 'pause')}
                          className="btn btn-ghost"
                        >
                          ⏸️ Pause
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(agent.id, 'restart')}
                        className="btn btn-ghost"
                      >
                        🔄 Restart
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={6}>
                    <div className="empty-state">
                      Активных агентов нет
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