import { useState, useEffect } from 'react';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

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
        
        return {
          id: session.sessionId || session.key,  // Используем sessionId или key
          agentId: agentId,  // Извлекаем из key
          type: isSubagent ? 'subagent' : (session.kind || 'agent'),  // Выделяем субагентов
          displayName: session.displayName,
          channel: session.channel,
          model: session.model,
          isSubagent: isSubagent,  // Флаг для UI
          updatedAt: session.updatedAt,
          duration: session.duration,  // Пока нет данных
          startedAt: session.startedAt,  // Пока нет данных
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Определяем отображение количества
  const countDisplay = rawData === null ? '-' : rawData.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Сессии</h2>
        <span className="text-sm text-dark-600">{countDisplay} сессий</span>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700">
            <tr>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">ID</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Агент</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Тип</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Длительность</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Запущена</th>
              <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {sessions.map((session) => (
              <tr 
                key={session.id} 
                className={`hover:bg-dark-700 transition-colors ${session.isSubagent ? 'bg-dark-700/30' : ''}`}
              >
                <td className="px-6 py-4 text-sm text-white font-mono">{session.id}</td>
                <td className="px-6 py-4 text-sm text-dark-400">{session.agentId?.split('-')[0] || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm">
                  {session.isSubagent && <span className="text-yellow-500 mr-2" title="Субагент">🔧</span>}
                  <span className={session.isSubagent ? 'text-yellow-400' : 'text-dark-400'}>
                    {session.type || 'agent'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-dark-400">{formatDuration(session.duration)}</td>
                <td className="px-6 py-4 text-sm text-dark-400">
                  {session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <button
                    onClick={() => handleKill(session.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-dark-600">
                  Активных сессий нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
