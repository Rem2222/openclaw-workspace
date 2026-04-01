import { useState, useEffect } from 'react';

const STATUS_SYMBOLS = {
  open: '○',
  in_progress: '◐',
  blocked: '●',
  closed: '✓',
  deferred: '❄',
};

const STATUS_LABELS = {
  open: 'Открыта',
  in_progress: 'В работе',
  blocked: 'Заблокирована',
  closed: 'Закрыта',
  deferred: 'Отложена',
};

const PRIORITY_COLORS = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
  P3: 'muted',
  P4: 'muted',
};

const SORT_ICONS = {
  asc: ' ↑',
  desc: ' ↓',
  none: '',
};

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadIssues();
  }, [filter, projectFilter]);

  function loadIssues() {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchWithRetry = (attempt = 0) => {
      const url = `/api/issues?filter=${filter}&project=${projectFilter}`;
      console.log('[Issues] Fetching:', url);
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!cancelled) {
            setIssues(data.issues || []);
            setError(null);
          }
        })
        .catch(err => {
          if (!cancelled) {
            if (attempt < 2) {
              // Retry up to 2 times
              setTimeout(() => fetchWithRetry(attempt + 1), 1000);
            } else {
              setError('Не удалось загрузить: ' + err.message);
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    fetchWithRetry();
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function getSortedIssues() {
    const sorted = [...issues];
    sorted.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      // Для дат сравниваем по raw значениям
      if (sortField === 'created' || sortField === 'updated') {
        aVal = a.createdRaw || '';
        bVal = b.createdRaw || '';
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function getSortIcon(field) {
    if (sortField !== field) return SORT_ICONS.none;
    return sortDir === 'asc' ? SORT_ICONS.asc : SORT_ICONS.desc;
  }

  function getProjects() {
    const projects = new Set();
    issues.forEach(i => {
      if (i.project) projects.add(i.project);
    });
    return Array.from(projects).sort();
  }

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-left">
          <h1>Проекты</h1>
          <span className="badge badge-info">{issues.length}</span>
        </div>
        <div className="header-actions">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="all">Все</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="closed">Закрытые</option>
          </select>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="all">Все проекты</option>
            {getProjects().map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={loadIssues} className="btn btn-ghost" title="Обновить">↻</button>
        </div>
      </div>

      {loading && (
        <div className="card">
          <div className="loading">Загрузка...</div>
        </div>
      )}

      {error && (
        <div className="card">
          <div className="empty-state text-danger">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="card" style={{ padding: 0 }}>
          {issues.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p>Нет задач</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ width: '80px' }}>
                    <button className="sort-btn" onClick={() => handleSort('id')}>
                      ID{getSortIcon('id')}
                    </button>
                  </th>
                  <th>
                    <button className="sort-btn" onClick={() => handleSort('project')}>
                      Проект{getSortIcon('project')}
                    </button>
                  </th>
                  <th>
                    <button className="sort-btn" onClick={() => handleSort('title')}>
                      Название{getSortIcon('title')}
                    </button>
                  </th>
                  <th style={{ width: '80px' }}>
                    <button className="sort-btn" onClick={() => handleSort('priority')}>
                      Приор.{getSortIcon('priority')}
                    </button>
                  </th>
                  <th style={{ width: '100px' }}>
                    <button className="sort-btn" onClick={() => handleSort('status')}>
                      Статус{getSortIcon('status')}
                    </button>
                  </th>
                  <th style={{ width: '90px' }}>
                    <button className="sort-btn" onClick={() => handleSort('created')}>
                      Создано{getSortIcon('created')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedIssues().map(issue => (
                  <>
                    <tr
                      key={issue.id}
                      onClick={() => toggleExpand(issue.id)}
                      className={expandedId === issue.id ? 'tr-selected' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ color: 'var(--accent)' }}>
                          {STATUS_SYMBOLS[issue.status] || '○'}
                        </span>
                      </td>
                      <td>
                        <code className="mono" style={{ fontSize: '11px' }}>
                          {issue.id.replace('workspace-', '')}
                        </code>
                      </td>
                      <td>
                        {issue.project ? (
                          <span className="badge" style={{
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                            fontSize: '11px'
                          }}>
                            {issue.project}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {issue.title}
                      </td>
                      <td>
                        <span className={`badge badge-${PRIORITY_COLORS[issue.priorityLabel] || 'info'}`}>
                          {issue.priorityLabel || issue.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${
                          issue.status === 'closed' ? 'success' :
                          issue.status === 'in_progress' ? 'warning' : 'info'
                        }`}>
                          {STATUS_LABELS[issue.status] || issue.status}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {issue.created || '—'}
                      </td>
                    </tr>
                    {expandedId === issue.id && (
                      <tr key={issue.id + '-detail'} className="tr-detail">
                        <td colSpan={7}>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Type:</span>
                              <span className="badge badge-info">{issue.type || 'task'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Owner:</span>
                              <span className="mono" style={{ fontSize: '11px' }}>
                                {issue.owner || '—'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Assignee:</span>
                              <span className="mono" style={{ fontSize: '11px' }}>
                                {issue.assignee || '—'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Updated:</span>
                              <span className="mono" style={{ fontSize: '11px' }}>
                                {issue.updated || '—'}
                              </span>
                            </div>
                            {issue.closedAt && (
                              <div className="detail-item">
                                <span className="detail-label">Closed:</span>
                                <span className="mono" style={{ fontSize: '11px' }}>
                                  {issue.closedAt}
                                </span>
                              </div>
                            )}
                            {issue.labels && issue.labels.length > 0 && (
                              <div className="detail-item">
                                <span className="detail-label">Labels:</span>
                                {issue.labels.map(l => (
                                  <span key={l} className="badge badge-muted" style={{ marginLeft: '4px' }}>
                                    {l}
                                  </span>
                                ))}
                              </div>
                            )}
                            {issue.description && (
                              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="detail-label">Description:</span>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                                  {issue.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
