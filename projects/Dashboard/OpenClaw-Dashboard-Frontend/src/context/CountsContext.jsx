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
    const interval = setInterval(loadCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadCounts() {
    try {
      console.log('[Counts] Загрузка количества объектов...');
      
      const [agentsRes, tasksRes, sessionsRes, subagentsRes, cronRes, activityRes, approvalsRes, issuesRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/tasks'),
        fetch('/api/sessions'),
        fetch('/api/subagents'),
        fetch('/api/cron'),
        fetch('/api/activity?limit=100'),
        fetch('/api/approvals'),
        fetch('/api/issues?filter=open'),
      ]);
      
      const [agents, tasks, sessions, subagents, cron, activity, approvals, issues] = await Promise.all([
        agentsRes.json(),
        tasksRes.json(),
        sessionsRes.json(),
        subagentsRes.json(),
        cronRes.json(),
        activityRes.json(),
        approvalsRes.json(),
        issuesRes.json(),
      ]);
      
      setCounts({
        agents: Array.isArray(agents) ? agents.length : 0,
        tasks: Array.isArray(tasks) ? tasks.length : 0,
        sessions: Array.isArray(sessions) ? sessions.length : 0,
        subagents: Array.isArray(subagents) ? subagents.length : 0,
        cron: Array.isArray(cron) ? cron.length : 0,
        activity: Array.isArray(activity) ? activity.length : 0,
        approvals: Array.isArray(approvals) ? approvals.length : 0,
        issues: issues.total || 0,
      });
      
      console.log('[Counts] Загружены:', counts);
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
