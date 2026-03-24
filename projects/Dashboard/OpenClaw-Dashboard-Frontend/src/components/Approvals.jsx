import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadApprovals();
    
    // Polling каждые 5 секунд (fallback)
    const interval = setInterval(loadApprovals, 5000);
    
    // Подписка на WebSocket события
    if (socket) {
      socket.on('approvals:update', handleApprovalsUpdate);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('approvals:update', handleApprovalsUpdate);
      }
    };
  }, [socket]);

  async function loadApprovals() {
    try {
      console.log('[Approvals] Запрос к /api/approvals...');
      const start = Date.now();
      
      const res = await fetch('/api/approvals');
      const elapsed = Date.now() - start;
      
      console.log(`[Approvals] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[Approvals] Raw data:', data);
      console.log('[Approvals] Type:', typeof data, Array.isArray(data) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      const approvals = Array.isArray(data) ? data : [];
      console.log(`[Approvals] Количество запросов: ${approvals.length}`);
      
      setApprovals(approvals);
    } catch (error) {
      console.error('[Approvals] Ошибка:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    if (!confirm('Одобрить это действие?')) return;
    try {
      await fetch(`/api/approvals/${id}/approve`, { method: 'POST' });
      loadApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleReject(id) {
    if (!confirm('Отклонить это действие?')) return;
    try {
      await fetch(`/api/approvals/${id}/reject`, { method: 'POST' });
      loadApprovals();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  // Обработчик WebSocket события
  function handleApprovalsUpdate(data) {
    console.log('[Approvals] WebSocket update:', data);
    setRawData(data.approvals);
    setApprovals(Array.isArray(data.approvals) ? data.approvals : []);
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
        <h2 className="text-2xl font-bold text-white">Очередь подтверждений</h2>
        <span className="text-sm text-dark-600">{countDisplay} запрос(ов)</span>
      </div>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <div key={approval.id} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-white font-medium mb-2">{approval.action || 'Действие'}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-dark-400">
                    <span className="text-dark-500">Агент:</span> {approval.agentId?.split('-')[0] || 'Unknown'}
                  </p>
                  {approval.description && (
                    <p className="text-dark-500">{approval.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(approval.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
                >
                  ✓ Одобрить
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
                >
                  ✗ Отклонить
                </button>
              </div>
            </div>
            <p className="text-xs text-dark-600">
              Создано: {new Date(approval.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {approvals.length === 0 && (
          <div className="text-center py-12 text-dark-600">
            Очередь пуста
          </div>
        )}
      </div>
    </div>
  );
}
