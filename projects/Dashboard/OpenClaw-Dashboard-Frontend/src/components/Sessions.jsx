import { useState, useEffect } from 'react';

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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');

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
        
        // Получаем человекочитаемое название
        const displayInfo = getSessionDisplayName(session);
        
        return {
          key: session.key,  // Сохраняем оригинальный key для удаления
          id: session.sessionId || session.key,  // Используем sessionId или key
          agentId: agentId,  // Извлекаем из key
          type: isSubagent ? 'subagent' : (session.kind || 'agent'),  // Выделяем субагентов
          displayName: session.displayName,
          channel: session.channel || '—',
          model: session.model || '—',
          isSubagent: isSubagent,  // Флаг для UI
          updatedAt: session.updatedAt,
          duration: session.duration,  // Пока нет данных
          startedAt: session.startedAt,  // Пока нет данных
          displayInfo,  // Информация для отображения
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      // Меньше минуты
      if (diff < 60000) return 'только что';
      // Меньше часа
      if (diff < 3600000) return `${Math.floor(diff / 60000)}м назад`;
      // Меньше суток
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}ч назад`;
      
      // Иначе - дата
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

  function getSortedSessions() {
    const sorted = [...sessions];
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
                return (
                  <tr key={session.id} className={session.isSubagent ? 'table-nested' : ''}>
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
                      <span className={`badge ${session.isSubagent ? 'badge-warning' : 'badge-info'}`}>
                        {session.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatTime(session.updatedAt)}
                    </td>
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
                );
              })}
              {sessions.length === 0 && (
                <tr className="no-hover">
                  <td colSpan={7}>
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