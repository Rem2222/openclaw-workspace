import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const SORT_ICONS = {
  asc: ' ▲',
  desc: ' ▼',
  none: '',
};

// Генерация человекочитаемого названия сессии
function getSessionDisplayName(session) {
  const key = session.key || '';
  const keyParts = key.split(':');
  
  // agent:main:main → "🎯 Main"
  if (key === 'agent:main:main') {
    return { icon: '🎯', label: 'Main (ты)', sublabel: 'Основная сессия' };
  }
  
  // agent:main:telegram:... → "📱 Telegram"
  if (keyParts[1] === 'main' && keyParts[2] === 'telegram') {
    return { icon: '📱', label: 'Telegram', sublabel: keyParts.slice(3).join(':') || 'main' };
  }
  
  // agent:main:subagent:xxx → "🔧 Subagent: <задача>"
  if (keyParts[1] === 'main' && keyParts[2] === 'subagent') {
    // Пытаемся извлечь описание из displayName или используем taskId
    const taskId = keyParts[3] || '';
    const shortId = taskId.length > 8 ? taskId.substring(0, 8) : taskId;
    
    // Если есть displayName с описанием задачи - используем его
    if (session.displayName && session.displayName !== key) {
      const displayParts = session.displayName.split(' — ');
      const taskDesc = displayParts[1] || displayParts[0] || 'задача';
      const shortDesc = taskDesc.length > 40 ? taskDesc.substring(0, 40) + '...' : taskDesc;
      return { icon: '🔧', label: 'Subagent', sublabel: shortDesc };
    }
    
    return { icon: '🔧', label: 'Subagent', sublabel: `id: ${shortId}` };
  }
  
  // agent:main:node:xxx → "🖥️ Node"
  if (keyParts[1] === 'main' && keyParts[2] === 'node') {
    const nodeName = keyParts[3] || 'unknown';
    return { icon: '🖥️', label: 'Node', sublabel: nodeName };
  }
  
  // agent:main:canvas:... → "🎨 Canvas"
  if (keyParts[1] === 'main' && keyParts[2] === 'canvas') {
    return { icon: '🎨', label: 'Canvas', sublabel: keyParts.slice(3).join(':') || '' };
  }
  
  // Fallback
  return { icon: '🤖', label: keyParts[1] || 'Agent', sublabel: keyParts.slice(2).join(':') || '' };
}

export default function Sessions() {
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  const highlightRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [hideSubagents, setHideSubagents] = useState(true); // По умолчанию скрываем субов
  const [projectFilter, setProjectFilter] = useState(() => {
    return localStorage.getItem('dashboard.projectFilter') || 'all';
  });
  const [issueData, setIssueData] = useState({}); // { issueId: { title, project } }
  const [sessionTaskMap, setSessionTaskMap] = useState({}); // sessionKey -> issueId

  // Скролл к подсвеченной сессии
  useEffect(() => {
    if (highlight && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlight, sessions]);

  useEffect(() => {
    loadSessions();
    loadIssueTitles();
    loadSessionTaskMap();
    const interval = setInterval(loadSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  // Сохраняем projectFilter в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('dashboard.projectFilter', projectFilter);
  }, [projectFilter]);

  // Загружаем titles для Beads issues
  async function loadIssueTitles() {
    try {
      const res = await fetch('/api/issues');
      const data = await res.json();
      const issues = data.issues || [];
      const dataMap = {};
      issues.forEach(iss => {
        dataMap[iss.id] = { title: iss.title, project: iss.project };
      });
      setIssueData(dataMap);
    } catch (e) {
      console.error('Failed to load issue titles:', e);
    }
  }

  // Загружаем маппинг session -> task
  async function loadSessionTaskMap() {
    try {
      const res = await fetch('/api/issues/session-task-map');
      const data = await res.json();
      setSessionTaskMap(data.map || {});
    } catch (e) {
      console.error('Failed to load session-task-map:', e);
    }
  }

  // Получить issueId для сессии
  function getSessionIssueId(sessionKey, displayName) {
    // Сначала проверяем session-task-map
    if (sessionTaskMap[sessionKey]) {
      return sessionTaskMap[sessionKey];
    }
    // Потом парсим displayName если это bd:xxx
    if (displayName && displayName.startsWith('bd:')) {
      return displayName.slice(3);
    }
    return null;
  }

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

  async function loadSessions() {
    try {
      
      const res = await fetch('/api/sessions');
      
      
      const rawData = await res.json();
      setRawData(rawData);
      
      
      // Проверка: если не массив, оборачиваем или используем пустой
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные
      const sessions = dataAsArray.map(session => {
        // Извлекаем agentId из key (формат: "agent:main:main")
        const keyParts = session.key?.split(':') || [];
        const agentId = keyParts[1] || 'unknown';
        
        // Проверка на субагент (формат: "agent:main:subagent:<uuid>")
        const isSubagent = session.key?.includes(':subagent:') || false;
        
        // Получаем человекочитаемое название
        const displayInfo = getSessionDisplayName(session);
        
        // Извлекаем канал: из session.channel, session.origin.provider, или из ключа
        let channel = session.channel;
        if (!channel && session.origin?.provider) {
          channel = session.origin.provider;
        }
        if (!channel && keyParts[2]) {
          // Из ключа: agent:main:telegram:... -> telegram
          channel = keyParts[2];
        }
        // Если это TUI сессия (agent:main:tui-xxx)
        if (!channel && keyParts[2]?.startsWith('tui-')) {
          channel = 'tui';
        }
        // Fallback
        if (!channel) {
          channel = '—';
        }
        
        return {
          key: session.key,  // Сохраняем оригинальный key для удаления
          id: session.sessionId || session.key,  // Используем sessionId или key
          agentId: agentId,  // Извлекаем из key
          type: isSubagent ? 'subagent' : (session.kind || 'agent'),  // Выделяем субагентов
          displayName: session.displayName || session.label,
          label: session.label,  // Для субагентов
          channel: channel,
          model: session.model || '—',
          isSubagent: isSubagent,  // Флаг для UI
          updatedAt: session.updatedAt,
          duration: session.duration,  // Пока нет данных
          startedAt: session.startedAt,  // Пока нет данных
          displayInfo,  // Информация для отображения
        };
      });
      
      
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
      await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
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

  function getProjects() {
    const projects = new Set();
    Object.values(issueData).forEach(info => {
      if (info.project) projects.add(info.project);
    });
    return Array.from(projects).sort();
  }

  function getSortedSessions() {
    let filtered = sessions;
    
    // Фильтруем субов если включено, НО оставляем подсвеченную сессию
    if (hideSubagents) {
      filtered = sessions.filter(s => !s.isSubagent || s.key === highlight);
    }
    
    // Фильтр по проекту
    if (projectFilter !== 'all') {
      filtered = filtered.filter(s => {
        const issueId = sessionTaskMap[s.key];
        if (!issueId) return false;
        const issue = issueData[issueId];
        return issue && issue.project === projectFilter;
      });
    }
    
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'id':
          aVal = a.id?.toLowerCase() || '';
          bVal = b.id?.toLowerCase() || '';
          break;
        case 'name':
          aVal = a.displayInfo?.label?.toLowerCase() || '';
          bVal = b.displayInfo?.label?.toLowerCase() || '';
          break;
        case 'model':
          aVal = (a.model || '').toLowerCase();
          bVal = (b.model || '').toLowerCase();
          break;
        case 'channel':
          aVal = (a.channel || '').toLowerCase();
          bVal = (b.channel || '').toLowerCase();
          break;
        case 'status':
          aVal = a.type?.toLowerCase() || '';
          bVal = b.type?.toLowerCase() || '';
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
  const totalCount = sessions.length;
  const subagentCount = sessions.filter(s => s.isSubagent).length;
  const visibleCount = hideSubagents ? totalCount - subagentCount : totalCount;
  const countDisplay = hideSubagents && subagentCount > 0 
    ? `${visibleCount} из ${totalCount}` 
    : `${totalCount}`;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 className="page-title">Сессии</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{countDisplay} сессий</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={hideSubagents}
              onChange={(e) => setHideSubagents(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Скрыть субов</span>
          </label>
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
        </div>
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
                  <button className="sort-btn" onClick={() => handleSort('name')}>
                    Название{getSortIcon('name')}
                  </button>
                </th>
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
                <th>Проект</th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('status')}>
                    Статус{getSortIcon('status')}
                  </button>
                </th>
                <th>
                  <button className="sort-btn" onClick={() => handleSort('updatedAt')}>
                    Активность{getSortIcon('updatedAt')}
                  </button>
                </th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {getSortedSessions().map((session) => {
                const info = session.displayInfo;
                const isHighlighted = highlight === session.key;
                return (
                  <tr key={session.id} ref={isHighlighted ? highlightRef : null} className={isHighlighted ? 'tr-selected' : (session.isSubagent ? 'table-nested' : '')}>
                    <td>
                      <span className="mono" style={{ fontSize: '11px' }}>
                        {session.id?.length > 12 ? session.id.substring(0, 12) + '…' : session.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{info.icon}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{info.label}</div>
                          {info.sublabel && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={info.sublabel}>
                              {info.sublabel}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--surface)', fontSize: '11px' }}>
                        {session.model}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {session.channel}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        // Для сессий: сначала проверяем session-task-map, потом displayName/label
                        const issueId = getSessionIssueId(session.key, session.label || session.displayName);
                        if (issueId && issueData[issueId]) {
                          const issue = issueData[issueId];
                          return (
                            <Link to={`/monitor?project=${encodeURIComponent(issue.project)}`} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>📁</span>
                              <span>{issue.project || issue.title}</span>
                            </Link>
                          );
                        }
                        // Если есть issueId но нет данных в issueData
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
                      <span className={`badge ${session.isSubagent ? 'badge-warning' : 'badge-info'}`}>
                        {session.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatDateTime(session.updatedAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleKill(session.key)}
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
                );
              })}
              {sessions.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={8}>
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