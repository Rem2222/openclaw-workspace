const express = require('express');
const router = express.Router();
const fs = require('fs');
const cronStore = require('../cron-store');
const approvalsStore = require('../approvals-store');

router.get('/', async (req, res) => {
  try {
    // Sessions + subagents count from sessions.json
    const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
    let sessionsCount = 0;
    let subagentsCount = 0;
    if (fs.existsSync(sessionsPath)) {
      const raw = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      const sessions = Array.isArray(raw) ? raw : Object.values(raw);
      sessionsCount = sessions.filter(s => !s.key?.includes(':subagent:')).length;
      subagentsCount = sessions.filter(s => s.key?.includes(':subagent:')).length;
    }

    // Agents + tasks from Gateway
    const gateway = require('../shared-gateway');
    const [agents, tasks] = await Promise.all([
      gateway.getAgents().catch(() => []),
      gateway.getTasks().catch(() => []),
    ]);

    // Cron + approvals from stores
    let cronCount = 0;
    let approvalsCount = 0;
    try { cronCount = cronStore.list().length; } catch {}
    try { approvalsCount = approvalsStore.list().length; } catch {}

    res.json({
      agents: Array.isArray(agents) ? agents.length : 0,
      tasks: Array.isArray(tasks) ? tasks.length : 0,
      sessions: sessionsCount,
      subagents: subagentsCount,
      cron: cronCount,
      activity: 0, // deprecated, not used meaningfully
      approvals: approvalsCount,
      issues: { open: 0, total: 0 }, // issues are external (bd list), skip heavy call
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
