import { useState, useEffect } from 'react';

/**
 * Статус подключения к Gateway
 */
const ConnectionStatus = {
  CONNECTED: 'connected',     // Зелёный — подключение успешно
  DISCONNECTED: 'disconnected', // Красный — нет подключения
  CONNECTING: 'connecting',   // Жёлтый — проверка подключения
  ERROR: 'error',            // Красный — ошибка при проверке
};

/**
 * Иконка статуса подключения
 */
function StatusIcon({ status }) {
  if (status === ConnectionStatus.CONNECTING) {
    return (
      <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    );
  }
  
  const color = status === ConnectionStatus.CONNECTED ? 'bg-green-500' : 'bg-red-500';
  return <div className={`w-2 h-2 rounded-full ${color}`}></div>;
}

/**
 * Текст статуса подключения
 */
function StatusText({ status }) {
  const texts = {
    [ConnectionStatus.CONNECTED]: 'Подключено',
    [ConnectionStatus.DISCONNECTED]: 'Нет подключения',
    [ConnectionStatus.CONNECTING]: 'Проверка...',
    [ConnectionStatus.ERROR]: 'Ошибка',
  };
  return <span className="text-xs">{texts[status] || texts[ConnectionStatus.DISCONNECTED]}</span>;
}

/**
 * Цвета для статуса
 */
const STATUS_COLORS = {
  [ConnectionStatus.CONNECTED]: 'text-green-400',
  [ConnectionStatus.DISCONNECTED]: 'text-red-400',
  [ConnectionStatus.CONNECTING]: 'text-yellow-400',
  [ConnectionStatus.ERROR]: 'text-red-400',
};

export default function GatewaySelector() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [error, setError] = useState('');

  // Загрузка сохранённой конфигурации
  useEffect(() => {
    loadConfig();
  }, []);

  /**
   * Загрузка конфига из localStorage
   */
  function loadConfig() {
    try {
      const saved = localStorage.getItem('gateway-config');
      if (saved) {
        const config = JSON.parse(saved);
        setUrl(config.url || '');
        setToken(config.token || '');
        
        // Пытаемся автоматически проверить подключение
        if (config.url && config.token) {
          testConnection(config.url, config.token);
        }
      }
    } catch (err) {
      console.error('Failed to load gateway config:', err);
    }
  }

  /**
   * Проверка подключения к Gateway через Backend
   */
  async function testConnection(testUrl, testToken) {
    if (!testUrl) {
      setStatus(ConnectionStatus.DISCONNECTED);
      setError('URL не задан');
      return;
    }

    setStatus(ConnectionStatus.CONNECTING);
    setError('');

    try {
      // Используем Backend как прокси для проверки подключения
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

  /**
   * Сохранение конфигурации
   */
  function handleSave() {
    const config = {
      url: url.trim(),
      token: token.trim(),
    };

    localStorage.setItem('gateway-config', JSON.stringify(config));
    
    // После сохранения проверяем подключение
    if (config.url) {
      testConnection(config.url, config.token);
    }
  }

  /**
   * Ручная проверка подключения
   */
  function handleTest() {
    testConnection(url, token);
  }

  return (
    <div className="space-y-3">
      {/* Заголовок и статус */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dark-500 uppercase">Gateway</span>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className={`text-xs ${STATUS_COLORS[status] || STATUS_COLORS[ConnectionStatus.DISCONNECTED]}`}>
            <StatusText status={status} />
          </span>
        </div>
      </div>

      {/* Input для URL */}
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Gateway URL"
        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-600 focus:outline-none focus:border-blue-500 transition-colors"
      />


      {/* Input для Token */}
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Token"
        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-600 focus:outline-none focus:border-blue-500 transition-colors"
      />

      {/* Кнопки действий */}
      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={status === ConnectionStatus.CONNECTING}
          className="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
          title="Проверить подключение"
        >
          🔌 Test
        </button>
        <button
          onClick={handleSave}
          disabled={status === ConnectionStatus.CONNECTING || !url}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
          title="Сохранить конфигурацию"
        >
          💾 Save
        </button>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
