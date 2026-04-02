import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const IssueContext = createContext(null);

export function IssueProvider({ children }) {
  const [issueData, setIssueData] = useState({});
  const [sessionTaskMap, setSessionTaskMap] = useState({});

  const loadIssues = useCallback(async () => {
    try {
      const [issuesRes, mapRes] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/issues/session-task-map'),
      ]);
      const issuesJson = await issuesRes.json();
      const mapJson = await mapRes.json();
      
      const issues = issuesJson.issues || [];
      const dataMap = {};
      issues.forEach(iss => {
        dataMap[iss.id] = { title: iss.title, project: iss.project };
      });
      setIssueData(dataMap);
      setSessionTaskMap(mapJson.map || {});
    } catch (e) {
      console.error('[Issues] Load failed:', e);
    }
  }, []);

  useEffect(() => {
    loadIssues();
    const interval = setInterval(loadIssues, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [loadIssues]);

  return (
    <IssueContext.Provider value={{ issueData, sessionTaskMap, reloadIssues: loadIssues }}>
      {children}
    </IssueContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssueContext);
  if (!context) throw new Error('useIssues must be inside IssueProvider');
  return context;
}
