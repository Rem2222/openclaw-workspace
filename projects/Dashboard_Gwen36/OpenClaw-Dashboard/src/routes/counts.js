const express = require('express');
const router = express.Router();
const fs = require('fs');
const cronStore = require('../cron-store');
const approvalsStore = require('../approvals-store');

router.get('/', async (req, res) => {
  try {
    // Sessions + subagents count from sessions.json
    // sessions.json is a dict: { "sessionId": sessionObj } where sessionId is "agent:main:subagent:uuid" or "agent:main:uuid"
    const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
    let sessionsCount = 0;
    let subagentsCount = 0;
    if (fs.existsSync(sessionsPath)) {
      const raw = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      const entries = Object.entries(raw); // [ [key, obj], ... ]
      sessionsCount = entries.filter(([key]) => !key.includes(':subagent:')).length;
      subagentsCount = entries.filter(([key]) => key.includes(':subagent:')).length;
    }

    // Issues count from bd list (lightweight, just counts)
    let issuesOpen = 0;
    let issuesTotal = 0;
    try {
      const { execSync } = require('child_process');
      const workspace = '/home/rem/.openclaw/workspace';
      const out = execSync(`cd "${workspace}" && npx @beads/bd list --all --json 2>/dev/null`, { timeout: 10000 });
      const issues = JSON.parse(out.toString());
      issuesTotal = Array.isArray(issues) ? issues.length : 0;
      issuesOpen = Array.isArray(issues) ? issues.filter(i => i.status !== 'done' && i.status !== 'closed').length : 0;
    } catch {}

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
      issues: { open: issuesOpen, total: issuesTotal },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
