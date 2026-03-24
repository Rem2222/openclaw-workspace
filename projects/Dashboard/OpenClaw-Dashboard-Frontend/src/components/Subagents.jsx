import { useState, useEffect } from 'react';

export default function Subagents() {
  const [subagents, setSubagents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadSubagents();
    const interval = setInterval(loadSubagents, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadSubagents() {
    try {
      console.log('[Subagents] Запрос к /api/subagents...');
      const start = Date.now();
      
      const res = await fetch('/api/subagents');
      const elapsed = Date.now() - start;
      
      console.log(`[Subagents] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const rawData = await res.json();
      setRawData(rawData);
      
      console.log('[Subagents] Raw data:', rawData);
      console.log('[Subagents] Type:', typeof rawData, Array.isArray(rawData) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      // Данные уже массив
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные
      const agents = dataAsArray.map(sa => ({
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
        isSubagent: true
      }));
      
      console.log('[Subagents] Transformed data:', agents);
      console.log(`[Subagents] Количество субагентов: ${agents.length}`);
      
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
        <h2 className="text-2xl font-bold text-white">Субагенты</h2>
        <span className="text-sm text-dark-600">{countDisplay} субагентов</span>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700">
            <tr>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">ID</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Задача</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Статус</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Длительность</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Модель</th>
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Токены</th>
              <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {subagents.map((subagent) => (
              <tr 
                key={subagent.id} 
                className="hover:bg-dark-700 transition-colors bg-dark-700/30"
              >
                <td className="px-6 py-4 text-sm text-white font-mono">{subagent.id}</td>
                <td className="px-6 py-4 text-sm text-dark-400">
                  🔧 {subagent.displayName}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    subagent.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : subagent.status === 'done'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {subagent.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-dark-400">{formatDuration(subagent.durationMs)}</td>
                <td className="px-6 py-4 text-sm text-dark-400">{subagent.model}</td>
                <td className="px-6 py-4 text-sm text-dark-400">{subagent.totalTokens?.toLocaleString() || '—'}</td>
                <td className="px-6 py-4 text-sm text-right">
                  {subagent.status === 'active' && (
                    <button
                      onClick={() => handleKill(subagent.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {subagents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-dark-600">
                  Активных субагентов нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
