const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const WORKSPACE = '/home/rem/.openclaw/workspace';
const SESSION_TASK_FILE = path.join(__dirname, '../../data/session-task.json');

// Убеждаемся что директория существует
const dataDir = path.dirname(SESSION_TASK_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Загрузка маппинга session → task
function loadSessionTaskMap() {
  try {
    if (fs.existsSync(SESSION_TASK_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_TASK_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

// Сохранение маппинга
function saveSessionTaskMap(map) {
  fs.writeFileSync(SESSION_TASK_FILE, JSON.stringify(map, null, 2));
}

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

// GET /api/issues/session-task-map — получить все привязки session -> task
router.get('/session-task-map', async (req, res) => {
  try {
    const map = loadSessionTaskMap();
    res.json({ map });
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

// POST /api/issues/sessions — привязать сессию к задаче
router.post('/sessions', async (req, res) => {
  try {
    const { sessionKey, issueId } = req.body;
    if (!sessionKey || !issueId) {
      return res.status(400).json({ error: 'sessionKey and issueId required' });
    }

    const map = loadSessionTaskMap();
    map[sessionKey] = issueId;
    saveSessionTaskMap(map);

    res.json({ ok: true, sessionKey, issueId });
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/issues/sessions/:sessionKey — удалить привязку
router.delete('/sessions/:sessionKey', async (req, res) => {
  try {
    const map = loadSessionTaskMap();
    delete map[req.params.sessionKey];
    saveSessionTaskMap(map);
    res.json({ ok: true });
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/issues/:id/sessions — получить активные сессии для задачи
router.get('/:id/sessions', async (req, res) => {
  try {
    const issueId = req.params.id;
    const map = loadSessionTaskMap();

    // Найти все sessionKey, привязанные к этой задаче
    const sessionKeys = Object.entries(map)
      .filter(([, v]) => v === issueId)
      .map(([k]) => k);

    // Получить информацию о сессиях из OpenClaw
    let sessions = [];
    try {
      const sessionsRes = await fetch('http://localhost:18789/api/sessions');
      const allSessions = await sessionsRes.json();
      sessions = allSessions
        .filter(s => sessionKeys.includes(s.key))
        .map(s => ({
          key: s.key,
          displayName: s.displayName,
          model: s.model,
          status: s.status,
          duration: s.duration,
          startedAt: s.startedAt,
          updatedAt: s.updatedAt,
        }));
    } catch {}

    res.json({ sessions });
  } catch (error) {
    console.error('[Issues API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

function normalizeIssue(raw) {
  // Определяем проект из title/file path
  const project = extractProject(raw.title || '', raw.file_path || '');
  console.log('[DEBUG] extractProject:', { title: raw.title, filePath: raw.file_path, project });

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
  // Парсим проект из title "[Dashboard]" или "Dashboard:" или file path
  const titleMatch = title.match(/^\[(.+?)\]/);
  if (titleMatch) return titleMatch[1];
  
  // Также поддерживаем "Project:" формат (без скобок)
  const colonMatch = title.match(/^([A-Za-z][A-Za-z0-9_-]+):/);
  if (colonMatch) return colonMatch[1];

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
