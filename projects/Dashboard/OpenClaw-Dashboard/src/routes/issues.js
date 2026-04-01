const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

const WORKSPACE = '/home/rem/.openclaw/workspace';

// GET /api/issues — список issues из Beads
router.get('/', async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    // Выполняем bd list
    const output = execSync(
      `cd ${WORKSPACE} && npx @beads/bd list --all --long 2>&1`,
      { timeout: 10000 }
    ).toString();
    
    // Парсим вывод
    const issues = parseBeadsOutput(output);
    
    // Фильтруем
    let filtered = issues;
    if (filter === 'open') {
      filtered = issues.filter(i => i.status !== 'closed');
    } else if (filter === 'closed') {
      filtered = issues.filter(i => i.status === 'closed');
    }
    
    res.json({
      total: issues.length,
      filtered: filtered.length,
      issues: filtered
    });
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/issues/:id — один issue
router.get('/:id', async (req, res) => {
  try {
    const output = execSync(
      `cd ${WORKSPACE} && npx @beads/bd show ${req.params.id} 2>&1`,
      { timeout: 10000 }
    ).toString();
    
    const issue = parseIssueShow(output, req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    res.json(issue);
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

function parseBeadsOutput(output) {
  const lines = output.split('\n');
  const issues = [];
  let current = null;

  for (const line of lines) {
    // Строка с issue: "✓ workspace-11o ● P2 task [Title]"
    const issueMatch = line.match(/^([○◐●✓❄])\s+(\S+)\s+(●)\s+(P\d+)\s+(\S+)\s+(.+)$/);
    if (issueMatch) {
      if (current) issues.push(current);
      current = {
        symbol: issueMatch[1],
        id: issueMatch[2],
        priority: issueMatch[4],
        type: issueMatch[5],
        title: issueMatch[6],
        status: symbolToStatus(issueMatch[1]),
        owner: null,
        assignee: null,
        created: null,
        updated: null,
        closedAt: null,
      };
      continue;
    }

    // Мета-строки
    if (current) {
      if (line.includes('Owner:')) {
        current.owner = line.split('·')[0].replace('Owner:', '').trim();
      }
      if (line.includes('Assignee:')) {
        const parts = line.split('·')[0].split('Assignee:');
        if (parts.length > 1) {
          current.assignee = parts[1].trim();
        }
      }
      if (line.includes('Created:')) {
        current.created = line.replace('Created:', '').trim();
      }
      if (line.includes('Updated:')) {
        current.updated = line.replace('Updated:', '').trim();
      }
      if (line.includes('Closed at:')) {
        current.closedAt = line.replace('Closed at:', '').trim();
      }
    }
  }
  if (current) issues.push(current);
  return issues;
}

function parseIssueShow(output, id) {
  const lines = output.split('\n');
  const issue = {
    id,
    title: null,
    status: null,
    priority: null,
    type: null,
    owner: null,
    assignee: null,
    created: null,
    updated: null,
    closedAt: null,
    description: null,
  };

  for (const line of lines) {
    if (line.includes('·')) {
      const parts = line.split('·').map(s => s.trim());
      if (parts.length >= 1) {
        issue.title = parts[1] || issue.title;
      }
    }
    if (line.includes('Owner:')) {
      issue.owner = line.split('·')[0].replace('Owner:', '').trim();
    }
    if (line.includes('Assignee:')) {
      const parts = line.split('·')[0].split('Assignee:');
      if (parts.length > 1) {
        issue.assignee = parts[1].trim();
      }
    }
    if (line.includes('Created:')) {
      issue.created = line.replace('Created:', '').trim();
    }
    if (line.includes('Updated:')) {
      issue.updated = line.replace('Updated:', '').trim();
    }
    if (line.includes('Closed at:')) {
      issue.closedAt = line.replace('Closed at:', '').trim();
    }
  }

  return issue.title ? issue : null;
}

function symbolToStatus(symbol) {
  const map = {
    '✓': 'closed',
    '○': 'open',
    '◐': 'in_progress',
    '●': 'blocked',
    '❄': 'deferred',
  };
  return map[symbol] || 'unknown';
}

module.exports = router;
