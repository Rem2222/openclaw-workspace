import { useState, useEffect } from 'react';

const ConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error',
};

function StatusIcon({ status }) {
  if (status === ConnectionStatus.CONNECTING) {
    return <div className="status-spinner"></div>;
  }
  const cls = status === ConnectionStatus.CONNECTED ? 'status-dot--success' : 'status-dot--danger';
  return <div className={`status-dot ${cls}`}></div>;
}

export default function GatewaySelector() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  function loadConfig() {
    try {
      const saved = localStorage.getItem('gateway-config');
      if (saved) {
        const config = JSON.parse(saved);
        setUrl(config.url || '');
        setToken(config.token || '');
        if (config.url && config.token) {
          testConnection(config.url, config.token);
        }
      }
    } catch (err) {
      console.error('Failed to load gateway config:', err);
    }
  }

  async function testConnection(testUrl, testToken) {
    if (!testUrl) {
      setStatus(ConnectionStatus.DISCONNECTED);
      setError('URL не задан');
      return;
    }

    setStatus(ConnectionStatus.CONNECTING);
    setError('');

    try {
      const response = await fetch('/api/gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl, token: testToken }),
      });

      const data = await response.json();

      if (data.connected) {
        setStatus(ConnectionStatus.CONNECTED);
        setError('');
      } else {
        setStatus(ConnectionStatus.DISCONNECTED);
        setError(data.error || 'Недоступен');
      }
    } catch (err) {
      setStatus(ConnectionStatus.DISCONNECTED);
      setError('Недоступен');
    }
  }

  function handleSave() {
    const config = {
      url: url.trim(),
      token: token.trim(),
    };
    localStorage.setItem('gateway-config', JSON.stringify(config));
    if (config.url) {
      testConnection(config.url, config.token);
    }
  }

  function handleTest() {
    testConnection(url, token);
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Gateway</span>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span style={{ color: status === ConnectionStatus.CONNECTED ? 'var(--accent)' : 'var(--text-muted)', fontSize: '12px' }}>
            {status === ConnectionStatus.CONNECTED ? 'Подключено' : status === ConnectionStatus.CONNECTING ? 'Проверка...' : 'Не подключено'}
          </span>
        </div>
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Gateway URL"
        className="input"
        style={{ marginBottom: '8px' }}
      />

      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Token"
        className="input"
        style={{ marginBottom: '12px' }}
      />

      <div className="flex gap-2">
        <button onClick={handleTest} className="btn btn-ghost" style={{ flex: 1 }}>
          🔌 Test
        </button>
        <button onClick={handleSave} disabled={!url} className="btn btn-primary" style={{ flex: 1 }}>
          💾 Save
        </button>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  );
}
