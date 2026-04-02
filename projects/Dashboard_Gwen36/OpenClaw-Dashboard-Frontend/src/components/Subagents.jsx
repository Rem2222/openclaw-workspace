import { useState, useEffect, useRef } from 'react';
import { useIssues } from '../context/IssueContext';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDateTime, SORT_ICONS } from '../utils/format';

export default function Subagents() {
  const [subagents, setSubagents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { issueData } = useIssues();
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [projectFilter, setProjectFilter] = useState(() => {
    return localStorage.getItem('dashboard.projectFilter') || 'all';
  });
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  const highlightRef = useRef(null);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlight && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlight, subagents]);

  useEffect(() => {
    loadSubagents();
    const interval = setInterval(loadSubagents, 15000);
    return () => clearInterval(interval);
  }, []);

  // Сохраняем projectFilter в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('dashboard.projectFilter', projectFilter);
  }, [projectFilter]);

  // Парсим label в human-readable название
  function parseLabel(label) {
    if (!label) return { icon: '🤖', text: 'Unknown', issueId: null };
    
    // bd:workspace-xxx -> показываем issue title или ID
    if (label.startsWith('bd:')) {
      const issueId = label.slice(3);
      const info = issueData[issueId] || {};
      const title = info.title || issueId;
      const project = info.project;
      // Ссылка на страницу проектов с подсветкой issueId
      const url = `/projects?highlight=${encodeURIComponent(issueId)}`;
      return { 
        icon: '📋', 
        text: title, 
        issueId,
        url,
        project
      };
    }
    
    // review:spec:xxx, review:quality:xxx
    if (label.startsWith('review:')) {
      const parts = label.split(':');
      const type = parts[1]; // spec или quality
      const issueId = parts[2];
      const icon = type === 'spec' ? '🔍' : '✅';
      return { icon, text: issueId, issueId, url: null };
    }
    
    // leaf, full-memory-consolidation и другие
    return { icon: '🤖', text: label, issueId: null };
  }

  async function loadSubagents() {
    try {
      
      const res = await fetch('/api/subagents');
      
      
      const rawData = await res.json();
      setRawData(rawData);
      
      
      // Данные уже массив
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные
      const agents = dataAsArray.map(sa => {
        const parsed = parseLabel(sa.label || '');
        return {
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
          isSubagent: true,
          project: parsed.project || null
        };
      });
      
      
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

  function getProjects() {
    const projects = new Set();
    subagents.forEach(sa => {
      if (sa.project) projects.add(sa.project);
    });
    return Array.from(projects).sort();
  }

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

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function getSortIcon(field) {
    if (sortField !== field) return SORT_ICONS.none;
    return sortDir === 'asc' ? SORT_ICONS.asc : SORT_ICONS.desc;
  }

  function getSortedSubagents() {
    let filtered = subagents;
    // Фильтр по проекту
    if (projectFilter !== 'all') {
      filtered = subagents.filter(sa => sa.project === projectFilter);
    }
    
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'id':
          aVal = a.id?.toLowerCase() || '';
          bVal = b.id?.toLowerCase() || '';
          break;
        case 'task':
          aVal = (a.displayName || '').toLowerCase();
          bVal = (b.displayName || '').toLowerCase();
          break;
        case 'model':
          aVal = (a.model || '').toLowerCase();
          bVal = (b.model || '').toLowerCase();
          break;
        case 'channel':
          aVal = (a.channel || '').toLowerCase();
          bVal = (b.channel || '').toLowerCase();
          break;
        case 'updatedAt':
          aVal = a.updatedAt || 0;
          bVal = b.updatedAt || 0;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
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
        <h2 className="page-title">Субагенты</h2>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} субагентов</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
        <button onClick={() => { loadSubagents(); }} className="btn btn-ghost" title="Обновить">↻</button>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ marginTop: '0', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('id')}>
                    ID{getSortIcon('id')}
                  </button>
                </th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('task')}>
                    Задача{getSortIcon('task')}
                  </button>
                </th>
                <th>Проект</th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('model')}>
                    Модель{getSortIcon('model')}
                  </button>
                </th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('channel')}>
                    Канал{getSortIcon('channel')}
                  </button>
                </th>
                <th>Тип</th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('updatedAt')}>
                    Активность{getSortIcon('updatedAt')}
                  </button>
                </th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {getSortedSubagents().map((subagent) => {
                const isHighlighted = highlight === subagent.id;
                return (
                <tr key={subagent.id} ref={isHighlighted ? highlightRef : null} className={isHighlighted ? 'tr-selected' : 'table-nested'}>
                  <td><span className="mono" style={{ fontSize: '11px' }}>{subagent.id?.length > 12 ? subagent.id.substring(0, 12) + '…' : subagent.id}</span></td>
                  <td>
                    {(() => {
                      const parsed = parseLabel(subagent.displayName);
                      return (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{parsed.icon}</span>
                          {parsed.url ? (
                            <Link to={parsed.url} style={{ color: 'var(--accent)' }}>
                              {parsed.text}
                            </Link>
                          ) : (
                            <span>{parsed.text}</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const parsed = parseLabel(subagent.displayName);
                      const issueId = parsed.issueId;
                      if (issueId && parsed.project) {
                        return (
                          <Link to={`/monitor?project=${encodeURIComponent(parsed.project)}`} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📁</span>
                            <span>{parsed.project}</span>
                          </Link>
                        );
                      }
                      if (issueId) {
                        return (
                          <Link to={`/projects?highlight=${encodeURIComponent(issueId)}`} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📋</span>
                            <span>{issueId}</span>
                          </Link>
                        );
                      }
                      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                    })()}
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--surface)', fontSize: '11px' }}>
                      {subagent.model}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {subagent.channel || 'subagent'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      subagent
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatDateTime(subagent.updatedAt)}
                  </td>
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
              );
              })}
              {subagents.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={8}>
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