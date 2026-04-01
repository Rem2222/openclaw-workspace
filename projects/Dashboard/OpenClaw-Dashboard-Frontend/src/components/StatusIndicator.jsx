import { useSocket } from '../context/SocketContext';

function StatusIndicator() {
  const { connected } = useSocket();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <div className="card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        minWidth: 'auto'
      }}>
        <span className={`status-dot status-dot--${connected ? 'success' : 'danger'}`} />
        <span style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text)'
        }}>
          {connected ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

export default StatusIndicator;