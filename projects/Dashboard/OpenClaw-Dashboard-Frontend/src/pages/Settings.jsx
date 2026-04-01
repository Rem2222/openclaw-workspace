import GatewaySelector from '../components/GatewaySelector';

export default function Settings() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Gateway Connection</h3>
        <GatewaySelector />
      </div>
    </div>
  );
}
