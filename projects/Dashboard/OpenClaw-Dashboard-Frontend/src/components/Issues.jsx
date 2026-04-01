import { useState, useEffect } from 'react';

const STATUS_SYMBOLS = {
  open: '○',
  in_progress: '◐',
  blocked: '●',
  closed: '✓',
  deferred: '❄',
};

const PRIORITY_COLORS = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
  P3: 'muted',
  P4: 'muted',
};

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadIssues();
    const interval = setInterval(loadIssues, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadIssues() {
    try {
      const res = await fetch(`/api/issues?filter=${filter}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setIssues(data.issues || []);
      setError(null);
    } catch (err) {
      console.error('[Issues] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = issues;

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-left">
          <h1>Issues</h1>
          <span className="badge">{issues.length}</span>
        </div>
        <div className="header-actions">
          <select 
            value={filter} 
            onChange={e => {
              setFilter(e.target.value);
              loadIssues();
            }} 
            className="select"
          >
            <option value="all">Все</option>
            <option value="open">Открытые</option>
            <option value="closed">Закрытые</option>
          </select>
          <button onClick={loadIssues} className="btn btn-ghost">↻</button>
        </div>
      </div>

      {loading && (
        <div className="card">
          <div className="loading">Загрузка...</div>
        </div>
      )}

      {error && (
        <div className="card">
          <div className="text-danger">Ошибка: {error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>Нет задач</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{width: '40px'}}></th>
                  <th>ID</th>
                  <th>Название</th>
                  <th style={{width: '80px'}}>Приоритет</th>
                  <th style={{width: '100px'}}>Статус</th>
                  <th style={{width: '150px'}}>Создано</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(issue => (
                  <tr key={issue.id}>
                    <td>
                      <span style={{color: 'var(--accent)'}}>
                        {STATUS_SYMBOLS[issue.status]}
                      </span>
                    </td>
                    <td>
                      <code className="mono">{issue.id.replace('workspace-', '')}</code>
                    </td>
                    <td>{issue.title}</td>
                    <td>
                      <span className={`badge badge-${PRIORITY_COLORS[issue.priority]}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${issue.status === 'closed' ? 'success' : 'info'}`}>
                        {issue.status === 'closed' ? 'Закрыта' : 
                         issue.status === 'open' ? 'Открыта' : 
                         issue.status}
                      </span>
                    </td>
                    <td className="mono">{issue.created || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
