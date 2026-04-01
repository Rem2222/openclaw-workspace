const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

const WORKSPACE = '/home/rem/.openclaw/workspace';

// GET /api/issues — список issues из Beads
router.get('/', async (req, res) => {
  try {
    const { filter = 'all', project = 'all' } = req.query;

    // JSON mode — получаем все данные
    const output = execSync(
      `cd ${WORKSPACE} && npx @beads/bd list --all --json 2>&1`,
      { timeout: 10000 }
    ).toString();

    let issues = [];
    try {
      issues = JSON.parse(output);
    } catch {
      // Fallback — парсим текстовый вывод
      issues = parseFromText(output);
    }

    // Нормализуем данные
    issues = issues.map(normalizeIssue);

    // Фильтруем
    let filtered = issues;
    if (filter === 'open') {
      filtered = issues.filter(i => i.status === 'open');
    } else if (filter === 'in_progress') {
      filtered = issues.filter(i => i.status === 'in_progress');
    } else if (filter === 'closed') {
      filtered = issues.filter(i => i.status === 'closed');
    }

    // Фильтр по проекту
    if (project !== 'all') {
      filtered = filtered.filter(i => i.project === project);
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
      `cd ${WORKSPACE} && npx @beads/bd show ${req.params.id} --json 2>&1`,
      { timeout: 10000 }
    ).toString();

    const issues = JSON.parse(output);
    if (!issues || issues.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(normalizeIssue(issues[0]));
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

function normalizeIssue(raw) {
  // Определяем проект из title/file path
  const project = extractProject(raw.title || '', raw.file_path || '');

  return {
    id: raw.id || raw.issue_id || '',
    title: raw.title || '',
    status: raw.status || 'open',
    priority: raw.priority || 2,
    priorityLabel: `P${raw.priority || 2}`,
    type: raw.issue_type || 'task',
    owner: raw.owner || null,
    assignee: raw.assignee || null,
    created: raw.created_at ? formatDate(raw.created_at) : null,
    createdRaw: raw.created_at || null,
    updated: raw.updated_at ? formatDate(raw.updated_at) : null,
    updatedRaw: raw.updated_at || null,
    closedAt: raw.closed_at ? formatDate(raw.closed_at) : null,
    project: project,
    filePath: raw.file_path || null,
    labels: raw.labels || [],
    description: raw.description || null,
    notes: raw.notes || null,
    commentsCount: raw.comments_count || 0,
  };
}

function extractProject(title, filePath) {
  // Парсим проект из title "[Dashboard]" или file path
  const titleMatch = title.match(/^\[(.+?)\]/);
  if (titleMatch) return titleMatch[1];

  const pathMatch = filePath.match(/projects\/([^\/]+)/);
  if (pathMatch) return pathMatch[1];

  return null;
}

function formatDate(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function parseFromText(output) {
  // Fallback парсер для текстового вывода
  const lines = output.split('\n');
  const issues = [];
  let current = null;

  for (const line of lines) {
    const issueMatch = line.match(/^([○◐●✓❄])\s+(\S+)\s+(●)\s+(P\d+)\s+(\S+)\s+(.+)$/);
    if (issueMatch) {
      if (current) issues.push(current);
      current = {
        id: issueMatch[2],
        title: issueMatch[6],
        priority: parseInt(issueMatch[4].replace('P', '')),
        issue_type: issueMatch[5],
        status: symbolToStatus(issueMatch[1]),
      };
      continue;
    }

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
        current.created_at = line.replace('Created:', '').trim();
      }
      if (line.includes('Updated:')) {
        current.updated_at = line.replace('Updated:', '').trim();
      }
      if (line.includes('Closed at:')) {
        current.closed_at = line.replace('Closed at:', '').trim();
      }
    }
  }
  if (current) issues.push(current);
  return issues;
}

function symbolToStatus(symbol) {
  const map = {
    '✓': 'closed',
    '○': 'open',
    '◐': 'in_progress',
    '●': 'blocked',
    '❄': 'deferred',
  };
  return map[symbol] || 'open';
}

module.exports = router;
