import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { HISTORY_LIMIT } from '../pages/Settings';

export default function Monitor() {
  const location = useLocation();
  const [allSessions, setAllSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);
  const [taskSessionMap, setTaskSessionMap] = useState({});
  const pollingRef = useRef(null);
  const sessionsLoaded = useRef(false);

  // Activity feed state
  const [activityItems, setActivityItems] = useState([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState({});
  const activityListRef = useRef(null);

  // Project-wide activity count (for header stat)
  const [projectActivityCount, setProjectActivityCount] = useState(0);

  // Читаем project из URL при загрузке и изменении location
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const project = params.get('project');
    if (project) {
      setProjectFilter(decodeURIComponent(project));
    }
  }, [location.search]);

  // Загружаем при монтировании
  useEffect(() => {
    loadProjects();
    loadTaskSessionMap();
    sessionsLoaded.current = false;
  }, []);

  // Фильтруем сессии когда меняется фильтр или данные
  useEffect(() => {
    filterSessions();
  }, [projectFilter, allSessions, projects, taskSessionMap]);

  // Load project activity count when project filter changes
  useEffect(() => {
    loadProjectActivityCount();
  }, [projectFilter]);

  // Загружаем активность при выборе сессии
  useEffect(() => {
    if (selectedSession) {
      loadActivity(selectedSession, 0);
      // Polling for updates
      pollingRef.current = setInterval(() => {
        loadActivity(selectedSession, 0, true);
      }, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedSession]);

  // Infinite scroll handler
  const handleActivityScroll = useCallback(() => {
    if (!activityListRef.current || activityLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = activityListRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // Load more when within 5 items of bottom
    if (scrollBottom < 100 && activityItems.length < activityTotal) {
      loadMoreActivity();
    }
  }, [activityLoading, activityItems.length, activityTotal]);

  function loadActivity(sessionKey, offset = 0, isPolling = false) {
    if (!projectFilter) {
      // No project selected - show nothing
      if (!isPolling) setActivityItems([]);
      return;
    }
    
    if (isPolling) return; // Skip polling for now, we load once
    
    setActivityLoading(true);
    fetch(`/api/monitor/messages?sessionKey=${encodeURIComponent(sessionKey)}&limit=${HISTORY_LIMIT}&offset=${offset}`)
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          if (offset === 0) {
            setActivityItems(data.items);
          } else {
            setActivityItems(prev => [...prev, ...data.items]);
          }
          setActivityTotal(data.total);
          setActivityOffset(offset + data.items.length);
        }
      })
      .catch(err => console.error('Failed to load activity:', err))
      .finally(() => setActivityLoading(false));
  }

  function loadMoreActivity() {
    if (selectedSession && activityOffset < activityTotal && !activityLoading) {
      loadActivity(selectedSession, activityOffset);
    }
  }

  function filterSessions() {
    if (allSessions.length === 0) return;
    if (!projects || projects.length === 0) return;
    
    let filtered = allSessions;
    if (projectFilter) {
      const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
      filtered = allSessions.filter(s => {
        const sessionKey = s.key;
        return Object.entries(taskSessionMap).some(([tk, issueId]) => 
          tk === sessionKey && projectTaskIds.includes(issueId)
        );
      });
    }
    setFilteredSessions(filtered);
    
    // Выбираем первую активную если нет выбранной
    if (!selectedSession && filtered.length > 0) {
      const active = filtered.find(s => s.status !== 'done') || filtered[0];
      setSelectedSession(active.key);
    }
  }

  function loadTaskSessionMap() {
    fetch('/api/issues/session-task-map')
      .then(r => r.json())
      .then(data => {
        if (data.map) {
          setTaskSessionMap(data.map);
        }
      })
      .catch(() => {});
  }

  function loadSessions() {
    if (sessionsLoaded.current) return;
    sessionsLoaded.current = true;
    
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllSessions(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load sessions:', err);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSessions();
  }, []);

  function loadProjects() {
    fetch('/api/issues?filter=all')
      .then(r => r.json())
      .then(data => {
        if (data.issues) {
          const grouped = {};
          data.issues.forEach(issue => {
            const project = issue.project || 'Без проекта';
            if (!grouped[project]) grouped[project] = [];
            grouped[project].push(issue);
          });
          setProjects(Object.entries(grouped).map(([name, issues]) => ({ name, issues })));
        }
      })
      .catch(() => {});
  }

  // Load project-wide activity count for header stat
  function loadProjectActivityCount() {
    if (!projectFilter) {
      setProjectActivityCount(0);
      return;
    }
    
    fetch(`/api/monitor/session-activity?project=${encodeURIComponent(projectFilter)}&limit=0`)
      .then(r => r.json())
      .then(data => {
        setProjectActivityCount(data.total || 0);
      })
      .catch(() => setProjectActivityCount(0));
  }

  function loadMessages(sessionKey) {
    fetch(`/api/sessions/${encodeURIComponent(sessionKey)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err =>console.error('Failed to load messages:', err));
  }

  function getSessionDisplay(session) {
    if (session.label) return session.label;
    if (session.displayName) return session.displayName;
    if (session.key) return session.key.split(':').pop();
    return 'Untitled';
  }

  function getStatusIcon(session) {
    if (session.status === 'done') return '✓';
    if (session.status === 'running') return '🔄';
    return '○';
  }

  function formatDuration(ms) {
    if (!ms) return '';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}ч ${mins % 60}м`;
    if (mins > 0) return `${mins}м`;
    return `${secs}с`;
  }

  // Format timestamp
  function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    try {
      return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  // Get icon for activity type
  function getActivityIcon(item) {
    switch (item.type) {
      case 'tool_call':
        return '⚡';
      case 'result':
        return '✓';
      case 'error':
        return '❌';
      case 'thinking':
        return '💭';
      case 'text':
        return '💬';
      case 'system':
        return '📋';
      case 'session_start':
        return '🚀';
      case 'model_change':
        return '🔄';
      default:
        return '📌';
    }
  }

  // Format activity preview
  function formatActivityPreview(item) {
    switch (item.type) {
      case 'tool_call':
        return `${item.toolName}${item.preview ? ': ' + item.preview : ''}`;
      case 'result':
        return `${item.toolName}${item.preview ? ': ' + item.preview : ''}`;
      case 'error':
        return `${item.toolName}: ОШИБКА`;
      case 'text':
        return item.preview || 'Текст';
      case 'thinking':
        return 'Думает...';
      case 'system':
        return item.preview || 'Система';
      case 'session_start':
        return `Сессия: ${item.sessionId?.slice(0, 8)}`;
      case 'model_change':
        return `Модель: ${item.modelId}`;
      default:
        return item.type;
    }
  }

  // Toggle activity expansion
  function toggleActivityExpand(itemId) {
    setExpandedActivity(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }

  // Render activity item content
  function renderActivityContent(item) {
    const isExpanded = expandedActivity[item.id];
    const content = item.content || item.arguments;
    
    if (!content) return null;
    
    let contentStr = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
    const isLong = contentStr.length > 100;
    
    return (
      <div style={{ marginTop: '4px' }}>
        {isLong && !isExpanded ? (
          <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => toggleActivityExpand(item.id)}>
            {contentStr.slice(0, 100)}...
            <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>развернуть</span>
          </span>
        ) : isLong && isExpanded ? (
          <div style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => toggleActivityExpand(item.id)}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '11px' }}>
              {contentStr}
            </pre>
            <span style={{ color: 'var(--accent)' }}>свернуть</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{contentStr}</span>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="page"><div className="card">Загрузка...</div></div>;
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>Монитор{projectFilter ? `: ${projectFilter}` : ' проекта'}</h1>
          {projectFilter && (
            <a href="#/projects" className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }}>
              ← К проектам
            </a>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Проект:</label>
          <select 
            value={projectFilter || ''}
            onChange={e => { 
              const val = e.target.value || null;
              setProjectFilter(val); 
              setSelectedSession(null); 
              setMessages([]); 
              setActivityItems([]);
            }}
            className="input"
            style={{ width: '180px' }}
          >
            <option value="">Все проекты</option>
            {projects.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Stats Header */}
      {projectFilter && (
        <div className="project-stats-header">
          <div className="stats-grid">
            {/* Task Progress */}
            <div className="stat-card-new">
              <div className="stat-card-icon">📋</div>
              <div className="stat-card-content">
                <div className="stat-card-label">Задачи</div>
                <div className="stat-card-value">
                  {(() => {
                    const proj = projects.find(p => p.name === projectFilter);
                    if (!proj) return '0/0';
                    const done = proj.issues.filter(i => i.status === 'closed').length;
                    const total = proj.issues.length;
                    return `${done}/${total}`;
                  })()}
                </div>
                <div className="stat-card-progress">
                  {(() => {
                    const proj = projects.find(p => p.name === projectFilter);
                    if (!proj || proj.issues.length === 0) return null;
                    const done = proj.issues.filter(i => i.status === 'closed').length;
                    const total = proj.issues.length;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Time Tracker */}
            <div className="stat-card-new">
              <div className="stat-card-icon">⏱️</div>
              <div className="stat-card-content">
                <div className="stat-card-label">Время</div>
                <div className="stat-card-value">
                  {(() => {
                    const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
                    const projectSessionKeys = Object.entries(taskSessionMap)
                      .filter(([_, issueId]) => projectTaskIds.includes(issueId))
                      .map(([sessionKey]) => sessionKey);
                    // Calculate duration from startedAt/endedAt (or Date.now() for running sessions)
                    const totalMs = allSessions
                      .filter(s => projectSessionKeys.includes(s.key))
                      .reduce((sum, s) => {
                        if (s.endedAt && s.startedAt) {
                          return sum + (s.endedAt - s.startedAt);
                        }
                        if (s.startedAt) {
                          return sum + (Date.now() - s.startedAt);
                        }
                        return sum;
                      }, 0);
                    const secs = Math.floor(totalMs / 1000);
                    const mins = Math.floor(secs / 60);
                    const hours = Math.floor(mins / 60);
                    if (hours > 0) return `${hours}ч ${mins % 60}м`;
                    if (mins > 0) return `${mins}м`;
                    return `${secs}с`;
                  })()}
                </div>
                <div className="stat-card-sub">общее время</div>
              </div>
            </div>

            {/* Subagent Stats */}
            <div className="stat-card-new">
              <div className="stat-card-icon">🔄</div>
              <div className="stat-card-content">
                <div className="stat-card-label">Subagents</div>
                <div className="stat-card-value">
                  {(() => {
                    const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
                    const projectSessionKeys = Object.entries(taskSessionMap)
                      .filter(([_, issueId]) => projectTaskIds.includes(issueId))
                      .map(([sessionKey]) => sessionKey);
                    const subagentSessions = allSessions.filter(s => 
                      (s.key?.includes('subagent') || s.label?.startsWith('bd:') || s.label?.includes('subagent')) &&
                      projectSessionKeys.includes(s.key)
                    );
                    return subagentSessions.length;
                  })()}
                </div>
                <div className="stat-card-sub">
                  {(() => {
                    const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
                    const projectSessionKeys = Object.entries(taskSessionMap)
                      .filter(([_, issueId]) => projectTaskIds.includes(issueId))
                      .map(([sessionKey]) => sessionKey);
                    const subagentSessions = allSessions.filter(s => 
                      (s.key?.includes('subagent') || s.label?.startsWith('bd:') || s.label?.includes('subagent')) &&
                      projectSessionKeys.includes(s.key)
                    );
                    const doneSessions = subagentSessions.filter(s => {
                      if (s.status !== 'done') return false;
                      // Check if we have valid duration
                      return (s.endedAt && s.startedAt);
                    });
                    if (doneSessions.length === 0) return 'сессий';
                    // Calculate durations from endedAt - startedAt
                    const totalMs = doneSessions.reduce((sum, s) => sum + (s.endedAt - s.startedAt), 0);
                    const avgMs = totalMs / doneSessions.length;
                    const avgMins = Math.floor(avgMs / 60000);
                    const avgSecs = Math.floor((avgMs % 60000) / 1000);
                    return `ср ${avgMins > 0 ? `${avgMins}м` : `${avgSecs}с`}`;
                  })()}
                </div>
              </div>
            </div>

            {/* Activity Count */}
            <div className="stat-card-new">
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-content">
                <div className="stat-card-label">Активность</div>
                <div className="stat-card-value">{projectActivityCount}</div>
                <div className="stat-card-sub">событий в проекте</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 280px)' }}>
        {/* Left: Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px' }}>📋 Активность {selectedSession ? `(${getSessionDisplay(filteredSessions.find(s => s.key === selectedSession) || {})})` : ''}</h3>
          
          {!projectFilter ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Выберите проект для просмотра активности
            </div>
          ) : !selectedSession ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Нет активных сессий для выбранного проекта
            </div>
          ) : (
            <>
              <div 
                ref={activityListRef}
                onScroll={handleActivityScroll}
                style={{ flex: 1, overflow: 'auto', fontSize: '12px', fontFamily: 'monospace' }}
              >
                {activityItems.length === 0 && !activityLoading ? (
                  <div style={{ color: 'var(--text-muted)' }}>Нет активности</div>
                ) : (
                  activityItems.map((item, i) => (
                    <div 
                      key={item.id || i} 
                      style={{ 
                        padding: '6px 8px', 
                        borderBottom: '1px solid var(--border)',
                        background: expandedActivity[item.id] ? 'var(--surface)' : 'transparent',
                        cursor: (item.content || item.arguments) ? 'pointer' : 'default'
                      }}
                      onClick={() => (item.content || item.arguments) && toggleActivityExpand(item.id)}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--text-muted)', minWidth: '50px', flexShrink: 0 }}>
                          {formatTime(item.timestamp)}
                        </span>
                        <span style={{ flexShrink: 0 }}>{getActivityIcon(item)}</span>
                        <span style={{ flex: 1 }}>
                          {formatActivityPreview(item)}
                        </span>
                      </div>
                      {(expandedActivity[item.id] || (item.content?.length <= 100 && item.content)) && renderActivityContent(item)}
                    </div>
                  ))
                )}
                {activityLoading && (
                  <div style={{ padding: '8px', color: 'var(--text-muted)' }}>Загрузка...</div>
                )}
                {!activityLoading && activityItems.length > 0 && activityItems.length < activityTotal && (
                  <div 
                    style={{ padding: '8px', color: 'var(--accent)', cursor: 'pointer', textAlign: 'center' }}
                    onClick={loadMoreActivity}
                  >
                    Загрузить ещё ({activityTotal - activityItems.length} осталось)
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Tasks + Subagents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
          {/* Tasks */}
          <div className="card" style={{ flex: 1, minHeight: 0, maxHeight: '50%', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>📌 Задачи</h3>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>Нет задач</div>
            ) : (
              (projectFilter ? projects.filter(p => p.name === projectFilter) : projects).map(proj => (
                <div key={proj.name} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {proj.name}
                  </div>
                  {proj.issues.map(issue => (
                    <div 
                      key={issue.id}
                      onClick={() => setExpandedRow(expandedRow === issue.id ? null : issue.id)}
                      style={{ 
                        padding: '6px 8px',
                        marginBottom: '2px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: expandedRow === issue.id ? 'var(--surface)' : 'transparent',
                        borderLeft: `2px solid ${
                          issue.status === 'closed' ? 'var(--success)' :
                          issue.status === 'in_progress' ? 'var(--warning)' : 'var(--border)'
                        }`
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>
                        {issue.status === 'closed' ? '✓' : issue.status === 'in_progress' ? '◐' : '○'}{' '}
                        {issue.title}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Subagents */}
          <div className="card" style={{ flex: '0 0 auto', maxHeight: '200px', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>🔄 Subagents</h3>
            {(() => {
              const isSubagent = (s) => 
                s.key?.includes('subagent') || 
                s.label?.startsWith('bd:') || 
                s.label?.includes('subagent');
              
              let subagentSessions = allSessions.filter(isSubagent);
              
              if (projectFilter) {
                const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
                const projectSessionKeys = Object.entries(taskSessionMap)
                  .filter(([_, issueId]) => projectTaskIds.includes(issueId))
                  .map(([sessionKey]) => sessionKey);
                subagentSessions = subagentSessions.filter(s => 
                  s.status === 'running' || projectSessionKeys.includes(s.key)
                );
              }
              
              if (subagentSessions.length === 0) {
                return <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Нет активных subagent сессий</div>;
              }
              
              const sorted = [...subagentSessions].sort((a, b) => {
                const statusOrder = { running: 0, done: 1 };
                const statusA = statusOrder[a.status] ?? 2;
                const statusB = statusOrder[b.status] ?? 2;
                if (statusA !== statusB) return statusA - statusB;
                const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return timeB - timeA;
              });
              
              const getTaskName = (session) => {
                const sessionKey = session.key;
                const issueId = taskSessionMap[sessionKey];
                if (issueId) {
                  for (const proj of projects) {
                    const issue = proj.issues.find(i => i.id === issueId);
                    if (issue) return issue.title;
                  }
                }
                if (session.label?.startsWith('bd:')) {
                  const id = session.label.slice(3);
                  for (const proj of projects) {
                    const issue = proj.issues.find(i => i.id === id);
                    if (issue) return issue.title;
                  }
                }
                return '— Unknown —';
              };
              
              return (
                <div style={{ fontSize: '12px' }}>
                  {sorted.map(s => (
                    <div key={s.key} style={{ 
                      padding: '4px 0', 
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>
                        {getStatusIcon(s)} {getTaskName(s)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {s.model || '—'} {formatDuration(s.duration) ? `· ${formatDuration(s.duration)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Chat Section */}
          <div className="card" style={{ flex: '0 0 auto', marginTop: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>💬 Чат</h3>
            
            {/* Message Area */}
            <div style={{ 
              minHeight: '80px', 
              maxHeight: '150px',
              overflow: 'auto',
              padding: '8px 12px',
              background: 'var(--elevation-1)',
              borderRadius: 'var(--radius)',
              marginBottom: '12px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', paddingTop: '24px' }}>
                Выберите сессию для начала чата
              </div>
            </div>
            
            {/* Input Area */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input"
                placeholder="Введите сообщение..."
                disabled
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" disabled style={{ padding: '8px 16px' }}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}