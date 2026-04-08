import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [status, setStatus] = useState('checking');
  const [backendTime, setBackendTime] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
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
    } catch (error) {
      setStatus('disconnected');
      setBackendTime(null);
      setResponseTime(null);
      console.error('[Status] Backend disconnected:', error);
    }
  }

  const statusColor = {
    checking: '#eab308',
    connected: '#22c55e',
    disconnected: '#ef4444',
  }[status];

  const statusText = {
    checking: 'Подключение...',
    connected: 'Подключено',
    disconnected: 'Нет подключения',
  }[status];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '8px 16px',
      fontSize: '12px',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            animation: status === 'checking' ? 'statusbar-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          }}></span>
          <span>{statusText}</span>
        </div>
        {responseTime && (
          <span style={{ color: 'var(--text-muted)' }}>{responseTime}ms</span>
        )}
      </div>
      <div>
        {backendTime && `Backend: ${new Date(backendTime).toLocaleTimeString()}`}
      </div>
      <style>{`
        @keyframes statusbar-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
