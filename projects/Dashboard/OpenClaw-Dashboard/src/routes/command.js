const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

const WORKSPACE = '/home/rem/.openclaw/workspace';

// POST /api/command — выполнить произвольную команду
router.post('/', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'command required' });
    }

    console.log('[Command] Executing:', command);
    const output = execSync(`cd ${WORKSPACE} && ${command} 2>&1`, {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    }).toString();

    res.json({ ok: true, output });
  } catch (error) {
    console.error('[Command] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message, output: error.stdout?.toString() || '' });
  }
});

module.exports = router;
