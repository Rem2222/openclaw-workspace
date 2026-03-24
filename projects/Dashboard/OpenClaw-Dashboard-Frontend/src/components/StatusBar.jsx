import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [status, setStatus] = useState('checking');
  const [backendTime, setBackendTime] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkBackend() {
    try {
      const start = Date.now();
      const res = await fetch('/health');
      const data = await res.json();
      const elapsed = Date.now() - start;
      
      setStatus('connected');
      setBackendTime(data.timestamp);
      setResponseTime(elapsed);
      
      console.log('[Status] Backend connected:', {
        responseTime: `${elapsed}ms`,
        backendTime: data.timestamp,
        data
      });
    } catch (error) {
      setStatus('disconnected');
      setBackendTime(null);
      setResponseTime(null);
      console.error('[Status] Backend disconnected:', error);
    }
  }

  const statusColor = {
    checking: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
  }[status];

  const statusText = {
    checking: 'Подключение...',
    connected: 'Подключено',
    disconnected: 'Нет подключения',
  }[status];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 px-4 py-2 text-xs text-dark-400 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></span>
          <span>{statusText}</span>
        </div>
        {responseTime && (
          <span className="hidden sm:inline text-dark-500">{responseTime}ms</span>
        )}
      </div>
      <div>
        {backendTime && `Backend: ${new Date(backendTime).toLocaleTimeString()}`}
      </div>
    </div>
  );
}
