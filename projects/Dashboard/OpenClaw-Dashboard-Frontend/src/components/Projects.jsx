import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

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

export default function Projects() {
  const location = useLocation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProject, setNewProject] = useState('');
  const [creating, setCreating] = useState(false);
  const [taskSessions, setTaskSessions] = useState({});
  const [highlightIssueId, setHighlightIssueId] = useState(null);
  const [sessionTaskMap, setSessionTaskMap] = useState({}); // taskKey -> sessionKey
  const [taskResults, setTaskResults] = useState({}); // issueId -> result text

  useEffect(() => {
    loadIssues();
  }, [filter, projectFilter]);

  useEffect(() => {
    // Загружаем сессии для раскрытых задач
    if (expandedId) {
      loadTaskSessions(expandedId);
    }
  }, [expandedId]);

  // Обработка highlight параметра из URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setHighlightIssueId(highlight);
      // Автоматически раскрываем строку с этим issueId
      if (issues.length > 0) {
        const issue = issues.find(i => i.id === highlight);
        if (issue && expandedId !== highlight) {
          setExpandedId(highlight);
        }
      }
    }
  }, [location.search, issues]);

  // Загружаем карту сессий (при загрузке страницы)
  useEffect(() => {
    fetch('/api/issues/session-task-map')
      .then(r => r.json())
      .then(data => {
        setSessionTaskMap(data.map || {});
      })
      .catch(() => {});
  }, []);

  // Загружаем результаты задач
  useEffect(() => {
    fetch('/api/issues/results')
      .then(r => r.json())
      .then(data => {
        setTaskResults(data.map || data || {});
      })
      .catch(() => {});
  }, []);

  // Считаем активные сессии по проекту
  const projectSessionCounts = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
      if (issue.project) {
        const sessions = taskSessions[issue.id] || [];
        const activeCount = sessions.filter(s => s.status === 'running' || s.status === 'active').length;
        if (activeCount > 0) {
          counts[issue.project] = (counts[issue.project] || 0) + activeCount;
        }
      }
    });
    return counts;
  }, [issues, taskSessions]);

  function loadTaskSessions(issueId) {
    fetch(`/api/issues/${issueId}/sessions`)
      .then(r => r.json())
      .then(data => {
        setTaskSessions(prev => ({ ...prev, [issueId]: data.sessions || [] }));
      })
      .catch(() => {});
  }

  function handleCreateProject() {
    if (!newProject.trim()) return;
    setCreating(true);

    // Запускаем новую сессию Superpowers
    fetch('/api/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: newProject })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setNewProject('');
          setShowNewForm(false);
          // Перенаправить на Монитор после небольшой задержки
          setTimeout(() => {
            window.location.hash = '#/monitor';
          }, 1000);
        }
      })
      .catch(err => {
        console.error('Create failed:', err);
      })
      .finally(() => setCreating(false));
  }

  function handleArchiveProject(project) {
    if (!confirm(`Архивировать все задачи проекта "${project}"?`)) return;

    // Закрываем все задачи проекта
    const projectIssues = issues.filter(i => i.project === project && i.status !== 'closed');
    let closed = 0;
    projectIssues.forEach(issue => {
      fetch(`/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `bd update ${issue.id} --status closed` })
      }).then(() => {
        closed++;
        if (closed === projectIssues.length) loadIssues();
      });
    });
  }

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
      if (sortField === 'created') {
        aVal = a.createdRaw || '';
        bVal = b.createdRaw || '';
      } else if (sortField === 'updated') {
        aVal = a.updatedRaw || '';
        bVal = b.updatedRaw || '';
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
          <button onClick={() => setShowNewForm(!showNewForm)} className="btn btn-primary">
            + Новый проект
          </button>
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

      {showNewForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginTop: 0 }}>Новый проект</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Название проекта</label>
              <input
                type="text"
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
                placeholder="Campfire Survival"
                className="input"
                style={{ width: '100%' }}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
            <div>
              <button onClick={handleCreateProject} className="btn btn-primary" disabled={creating || !newProject.trim()}>
                {creating ? 'Запускаю...' : 'Запустить'}
              </button>
            </div>
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Агент Superpowers запустится и задаст вопросы о проекте
          </p>
          <div style={{ marginTop: '8px' }}>
            <button onClick={() => setShowNewForm(false)} className="btn btn-ghost">Отмена</button>
          </div>
        </div>
      )}

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
                  <React.Fragment key={issue.id}>
                    <tr
                      onClick={() => toggleExpand(issue.id)}
                      className={expandedId === issue.id ? 'tr-selected' : ''}
                      style={{
                        cursor: 'pointer',
                        ...(highlightIssueId === issue.id ? {
                          boxShadow: 'inset 0 0 0 2px var(--accent)',
                          background: 'var(--highlight-bg, rgba(var(--accent-rgb, 100, 150, 200), 0.08))'
                        } : {})
                      }}
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
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span className="badge" style={{
                              background: 'var(--surface)',
                              color: 'var(--text-muted)',
                              fontSize: '11px'
                            }}>
                              {issue.project}
                            </span>
                            {projectSessionCounts[issue.project] > 0 && (
                              <span className="badge badge-success" title="Активных сессий">
                                📊 {projectSessionCounts[issue.project]}
                              </span>
                            )}
                          </div>
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
                        {formatDateTime(issue.createdRaw) || '—'}
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
                                {formatDateTime(issue.updatedRaw) || '—'}
                              </span>
                            </div>
                            {issue.closedAt && (
                              <div className="detail-item">
                                <span className="detail-label">Closed:</span>
                                <span className="mono" style={{ fontSize: '11px' }}>
                                  {formatDateTime(issue.closedAtRaw)}
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
                            {/* Сессии для этой задачи */}
                            {(taskSessions[issue.id] || []).length > 0 && (
                              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="detail-label">Активные сессии:</span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {taskSessions[issue.id].map(s => (
                                    <span key={s.key} className="badge badge-success" style={{ cursor: 'pointer' }}>
                                      ↗ {s.displayName || s.key}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Кнопки действий */}
                            <div className="detail-item" style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', gap: '8px' }}>
                              {issue.project && (
                                <Link
                                  to={`/monitor?project=${encodeURIComponent(issue.project)}`}
                                  className="btn btn-primary"
                                  style={{ fontSize: '11px', padding: '4px 12px' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  📊 Монитор
                                </Link>
                              )}
                              {issue.id &&Object.values(sessionTaskMap).includes(issue.id) && (() => {
                                const sessionKey = Object.entries(sessionTaskMap).find(([_, taskId]) => taskId === issue.id)?.[0];
                                const targetPage = localStorage.getItem('dashboard.openSessionIn') || 'sessions';
                                return sessionKey ? (
                                  <Link
                                    to={`/${targetPage}?highlight=${encodeURIComponent(sessionKey)}`}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '11px', padding: '4px 12px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    🔹 Сессия/Агент
                                  </Link>
                                ) : null;
                              })()}
                              {issue.id && taskResults[issue.id] && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: '11px', padding: '4px 12px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert(taskResults[issue.id]);
                                  }}
                                >
                                  📋 Результат
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
