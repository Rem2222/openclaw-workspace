import { createContext, useContext, useState, useEffect } from 'react';

const CountsContext = createContext(null);

export function CountsProvider({ children }) {
  const [counts, setCounts] = useState({
    agents: null,
    tasks: null,
    sessions: null,
    subagents: null,
    cron: null,
    activity: null,
    approvals: null,
    issues: null,
  });

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadCounts() {
    try {
      const res = await fetch('/api/counts');
      const data = await res.json();
      setCounts(data);
    } catch (error) {
      console.error('[Counts] Ошибка:', error);
    }
  }

  return (
    <CountsContext.Provider value={counts}>
      {children}
    </CountsContext.Provider>
  );
}

export function useCounts() {
  const context = useContext(CountsContext);
  if (!context) {
    throw new Error('useCounts должен использоваться внутри CountsProvider');
  }
  return context;
}
