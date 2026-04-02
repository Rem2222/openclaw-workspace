const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

const WORKSPACE = '/home/rem/.openclaw/workspace';

const ALLOWED_COMMANDS = [
  /^bd\s/,
  /^git\s+(status|log|diff|branch)/,
  /^ls\b/,
  /^cat\b/,
  /^pwd\b/,
  /^node\s+--version/,
  /^npm\s+--version/,
  /^openclaw\s+/,
];

// POST /api/command — выполнить разрешённую команду
router.post('/', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'command required' });
    }

    const isAllowed = ALLOWED_COMMANDS.some(pattern => pattern.test(command));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Command not allowed', command });
    }

    if (process.env.NODE_ENV === 'development') console.log('[Command] Executing:', command);
    const output = execSync(`cd ${WORKSPACE} && ${command} 2>&1`, {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    }).toString();

    res.json({ ok: true, output });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[Command] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message, output: error.stdout?.toString() || '' });
  }
});

module.exports = router;
