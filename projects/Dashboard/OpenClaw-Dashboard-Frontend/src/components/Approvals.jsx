import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadApprovals();
    
    // Polling every 5 seconds (fallback)
    const interval = setInterval(loadApprovals, 5000);
    
    // Subscribe to WebSocket events
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
      console.log('[Approvals] Request to /api/approvals...');
      const start = Date.now();
      
      const res = await fetch('/api/approvals');
      const elapsed = Date.now() - start;
      
      console.log(`[Approvals] Response received in ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[Approvals] Raw data:', data);
      console.log('[Approvals] Type:', typeof data, Array.isArray(data) ? 'IS_ARRAY' : 'NOT_ARRAY');
      
      const approvals = Array.isArray(data) ? data : [];
      console.log(`[Approvals] Count: ${approvals.length}`);
      
      setApprovals(approvals);
    } catch (error) {
      console.error('[Approvals] Error:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    if (!confirm('Approve this action?')) return;
    try {
      await fetch(`/api/approvals/${id}/approve`, { method: 'POST' });
      loadApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this action?')) return;
    try {
      await fetch(`/api/approvals/${id}/reject`, { method: 'POST' });
      loadApprovals();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  // WebSocket event handler
  function handleApprovalsUpdate(data) {
    console.log('[Approvals] WebSocket update:', data);
    setRawData(data.approvals);
    setApprovals(Array.isArray(data.approvals) ? data.approvals : []);
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Display count
  const countDisplay = rawData === null ? '-' : rawData.length;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Approval Queue</h2>
        <span className="badge badge-info">{countDisplay} request(s)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {approvals.map((approval) => (
          <div key={approval.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  {approval.action || 'Action'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text-subtle)' }}>Agent:</span> {approval.agentId?.split('-')[0] || 'Unknown'}
                  </p>
                  {approval.description && (
                    <p style={{ color: 'var(--text-subtle)' }}>{approval.description}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleApprove(approval.id)}
                  className="btn btn-primary"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  className="btn btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
            <p className="mono" style={{ fontSize: '12px' }}>
              Created: {new Date(approval.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {approvals.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">✓</span>
            <span>Queue is empty</span>
          </div>
        )}
      </div>
    </div>
  );
}