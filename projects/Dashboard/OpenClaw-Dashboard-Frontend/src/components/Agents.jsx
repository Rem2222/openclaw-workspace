import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  idle: 'bg-green-500',
  busy: 'bg-blue-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
};

const STATUS_LABELS = {
  idle: 'Свободен',
  busy: 'Занят',
  paused: 'На паузе',
  error: 'Ошибка',
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadAgents() {
    try {
      console.log('[Agents] Запрос к /api/agents...');
      const start = Date.now();
      
      const res = await fetch('/api/agents');
      const elapsed = Date.now() - start;
      
      console.log(`[Agents] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const rawData = await res.json();
      setRawData(rawData);
      
      console.log('[Agents] Raw data:', rawData);
      console.log('[Agents] Type:', typeof rawData, Array.isArray(rawData) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      // Проверка: если не массив, оборачиваем или используем пустой
      const dataAsArray = Array.isArray(rawData) ? rawData : [];
      
      // Трансформируем данные, добавляя дефолтные значения
      const agents = dataAsArray.map(agent => ({
        id: agent.id,
        name: agent.name || agent.id,  // Используем id как name если нет name
        configured: agent.configured,
        status: agent.status || 'idle',  // Дефолтный статус
        tasks: agent.tasks || [],       // Пустой массив
        sessions: agent.sessions || [], // Пустой массив
      }));
      
      console.log('[Agents] Transformed data:', agents);
      console.log(`[Agents] Количество агентов: ${agents.length}`);
      
      setAgents(agents);
    } catch (error) {
      console.error('[Agents] Ошибка:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(agentId, action) {
    try {
      await fetch(`/api/agents/${agentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      loadAgents();
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }

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
        <h2 className="text-2xl font-bold text-white">Агенты</h2>
        <span className="text-sm text-dark-600">{countDisplay} агент(ов)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[agent.status] || 'bg-gray-500'}`}></div>
                <div>
                  <h3 className="text-white font-medium">{agent.name || agent.id}</h3>
                  <p className="text-xs text-dark-600">{agent.id}</p>
                </div>
              </div>
              <span className="text-xs text-dark-600">{STATUS_LABELS[agent.status]}</span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Задач:</span>
                <span className="text-white">{agent.tasks?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Сессий:</span>
                <span className="text-white">{agent.sessions?.length || 0}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {agent.status === 'paused' ? (
                <button
                  onClick={() => handleAction(agent.id, 'resume')}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
                >
                  ▶️ Resume
                </button>
              ) : (
                <button
                  onClick={() => handleAction(agent.id, 'pause')}
                  className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm text-white transition-colors"
                >
                  ⏸️ Pause
                </button>
              )}
              <button
                onClick={() => handleAction(agent.id, 'restart')}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
              >
                🔄 Restart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
