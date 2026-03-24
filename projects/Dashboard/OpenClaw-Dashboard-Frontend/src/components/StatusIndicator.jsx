import { useSocket } from '../context/SocketContext';

function StatusIndicator() {
  const { connected } = useSocket();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '10px 15px',
      borderRadius: '8px',
      backgroundColor: connected ? '#10b981' : '#ef4444',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 1000
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'white',
        animation: connected ? 'pulse 2s infinite' : 'none'
      }} />
      {connected ? 'Real-time: Online' : 'Real-time: Offline'}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default StatusIndicator;
