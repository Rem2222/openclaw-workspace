import { useState, useEffect } from 'react';
import GatewaySelector from '../components/GatewaySelector';

const STORAGE_KEY = 'dashboard.openSessionIn';

export default function Settings() {
  const [openSessionIn, setOpenSessionIn] = useState('sessions');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'sessions' || saved === 'subagents') {
      setOpenSessionIn(saved);
    }
  }, []);

  const handleChange = (value) => {
    setOpenSessionIn(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Gateway Connection</h3>
        <GatewaySelector />
      </div>

      <div className="card" style={{ maxWidth: '500px', marginTop: '16px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text)' }}>Отображение</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Открывать сессию из проектов в:
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="openSessionIn"
              value="sessions"
              checked={openSessionIn === 'sessions'}
              onChange={() => handleChange('sessions')}
            />
            <span style={{ fontSize: '14px' }}>Сессии</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="openSessionIn"
              value="subagents"
              checked={openSessionIn === 'subagents'}
              onChange={() => handleChange('subagents')}
            />
            <span style={{ fontSize: '14px' }}>Субагенты</span>
          </label>
        </div>
      </div>
    </div>
  );
}
