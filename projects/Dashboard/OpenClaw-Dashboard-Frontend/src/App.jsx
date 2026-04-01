import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CountsProvider } from './context/CountsContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Agents from './components/Agents';
import Tasks from './components/Tasks';
import Sessions from './components/Sessions';
import Subagents from './components/Subagents';
import Cron from './components/Cron';
import ActivityFeed from './components/ActivityFeed';
import Approvals from './components/Approvals';
import StatusIndicator from './components/StatusIndicator';
import Projects from './components/Projects';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <CountsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/agents" replace />} />
              <Route path="agents" element={<Agents />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="subagents" element={<Subagents />} />
              <Route path="cron" element={<Cron />} />
              <Route path="activity" element={<ActivityFeed />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="projects" element={<Projects />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <StatusIndicator />
        </CountsProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
