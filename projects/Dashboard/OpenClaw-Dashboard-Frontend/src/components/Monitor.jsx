import { useState, useEffect, useRef } from 'react';

export default function Monitor() {
  const [allSessions, setAllSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);
  const [taskSessionMap, setTaskSessionMap] = useState({});
  const pollingRef = useRef(null);
  const sessionsLoaded = useRef(false);

  // Читаем project из URL
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const project = params.get('project');
    if (project) {
      setProjectFilter(decodeURIComponent(project));
    }
  }, []);

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

  function filterSessions() {
    if (allSessions.length === 0) return;
    
    let filtered = allSessions;
    if (projectFilter) {
      const projectTaskIds = projects.find(p => p.name === projectFilter)?.issues.map(i => i.id) || [];
      filtered = allSessions.filter(s => {
        const sessionKey = s.key;
        return Object.entries(taskSessionMap).some(([tk, info]) => 
          tk === sessionKey && projectTaskIds.includes(info.issueId)
        );
      });
    }
    setFilteredSessions(filtered);
    
    // Выбираем первую активную если нет выбранной
    if (!selectedSession && filtered.length > 0) {
      const active = filtered.find(s => s.status !== 'done') || filtered[0];
      setSelectedSession(active.key);
      loadMessages(active.key);
    }
  }

  function loadTaskSessionMap() {
    // Загружаем маппинг session -> task
    fetch('/api/issues/session-task-map')
      .then(r => r.json())
      .then(data => {
        if (data.map) {
          setTaskSessionMap(data.map);
        }
      })
      .catch(() => {});
  }

  // Поллинг каждые 3 секунды
  useEffect(() => {
    if (selectedSession) {
      pollingRef.current = setInterval(() => {
        loadMessages(selectedSession);
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedSession]);

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

  // Загружаем сессии один раз
  useEffect(() => {
    loadSessions();
  }, []);

  function loadProjects() {
    fetch('/api/issues?filter=all')
      .then(r => r.json())
      .then(data => {
        if (data.issues) {
          // Группируем по проекту
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

  function loadMessages(sessionKey) {
    fetch(`/api/sessions/${encodeURIComponent(sessionKey)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          // Извлекаем activities из сообщений
          extractActivities(data);
        }
      })
      .catch(err => console.error('Failed to load messages:', err));
  }

  function extractActivities(msgs) {
    const acts = [];
    msgs.forEach(msg => {
      const role = msg.message?.role;
      const content = msg.message?.content;
      
      if (role === 'user' && typeof content === 'string') {
        acts.push({
          time: new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          type: 'user',
          text: content.slice(0, 60) + (content.length > 60 ? '...' : '')
        });
      } else if (role === 'assistant') {
        // Tool calls
        if (msg.message?.toolCalls) {
          msg.message.toolCalls.forEach(tc => {
            acts.push({
              time: new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              type: 'tool',
              text: `⚡ ${tc.function?.name || 'tool'}`
            });
          });
        }
        // Subagent spawns
        if (msg.message?.content) {
          const text = Array.isArray(msg.message.content) 
            ? msg.message.content.map(c => c.text || '').join('')
            : msg.message.content;
          if (text.includes('spawn') || text.includes('subagent') || text.includes('запускаю')) {
            acts.push({
              time: new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              type: 'spawn',
              text: '🔄 ' + (text.slice(0, 50) + '...')
            });
          }
        }
      }
    });
    setActivities(acts.slice(-50)); // Последние 50
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
        <select 
          value={selectedSession || ''}
          onChange={e => { setSelectedSession(e.target.value); setMessages([]); setActivities([]); }}
          className="input"
          style={{ width: '300px' }}
        >
          {filteredSessions.map(s => (
            <option key={s.key} value={s.key}>
              {getStatusIcon(s)} {getSessionDisplay(s)} ({formatDuration(s.duration)})
            </option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left: Activity + Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Activity Feed */}
          <div className="card" style={{ flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>📋 Activity</h3>
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {activities.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Нет активности</div>
              ) : (
                activities.map((act, i) => (
                  <div key={i} style={{ 
                    padding: '4px 0', 
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '50px' }}>{act.time}</span>
                    <span>{act.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="card" style={{ flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>💬 Сообщения</h3>
            <div style={{ fontSize: '12px' }}>
              {messages.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Нет сообщений</div>
              ) : (
                messages.slice(-20).map((msg, i) => {
                  const role = msg.message?.role;
                  const content = msg.message?.content;
                  const text = Array.isArray(content) 
                    ? content.map(c => c.text || '').join('')
                    : (typeof content === 'string' ? content : JSON.stringify(content).slice(0, 100));
                  
                  return (
                    <div key={i} style={{ 
                      padding: '6px 8px', 
                      marginBottom: '4px',
                      borderRadius: '4px',
                      background: role === 'user' ? 'var(--surface)' : 'transparent',
                      borderLeft: role === 'user' ? '2px solid var(--accent)' : 'none'
                    }}>
                      <span style={{ fontWeight: 'bold', color: role === 'user' ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {role === 'user' ? '👤' : '🤖'} {role}:
                      </span>
                      <span style={{ marginLeft: '8px' }}>
                        {text.slice(0, 100)}{text.length > 100 ? '...' : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Tasks + Docs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tasks */}
          <div className="card" style={{ flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>📌 Задачи</h3>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>Нет задач</div>
            ) : (
              projects.map(proj => (
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
                          issue.status === 'done' ? 'var(--success)' :
                          issue.status === 'in_progress' ? 'var(--warning)' : 'var(--border)'
                        }`
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>
                        {issue.status === 'done' ? '✓' : issue.status === 'in_progress' ? '◐' : '○'}{' '}
                        {issue.title}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Subagents */}
          <div className="card" style={{ flex: '0 0 auto' }}>
            <h3 style={{ marginTop: 0 }}>🔄 Subagents</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Запустите проект чтобы увидеть subagents
            </div>
          </div>

          {/* Docs */}
          <div className="card" style={{ flex: '0 0 auto' }}>
            <h3 style={{ marginTop: 0 }}>📄 Docs</h3>
            <div style={{ fontSize: '12px' }}>
              {selectedSession && (
                <div style={{ color: 'var(--text-muted)' }}>
                  Проект: {getSessionDisplay(sessions.find(s => s.key === selectedSession))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
