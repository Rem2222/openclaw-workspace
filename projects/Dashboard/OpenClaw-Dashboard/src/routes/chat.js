const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = '/home/rem/.openclaw/agents/main/sessions';
const SESSIONS_INDEX = path.join(SESSIONS_DIR, 'sessions.json');

function findSessionFile(sessionKey) {
  // First try direct path
  const directPath = path.join(SESSIONS_DIR, `${sessionKey}.jsonl`);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  // Look up in sessions.json
  try {
    const content = fs.readFileSync(SESSIONS_INDEX, 'utf8');
    const data = JSON.parse(content);
    const session = data[sessionKey];
    if (session && session.sessionFile && fs.existsSync(session.sessionFile)) {
      return session.sessionFile;
    }
  } catch (e) {
    // Ignore
  }

  // Search in subdirs
  if (fs.existsSync(SESSIONS_DIR)) {
    const files = fs.readdirSync(SESSIONS_DIR);
    for (const file of files) {
      if (file === `${sessionKey}.jsonl`) {
        return path.join(SESSIONS_DIR, file);
      }
    }
  }

  return null;
}

// POST /api/chat/send — отправить сообщение в сессию
router.post('/send', async (req, res) => {
  try {
    const { sessionKey, message } = req.body;

    if (!sessionKey || !message) {
      return res.status(400).json({ error: 'sessionKey and message are required' });
    }

    const sessionFile = findSessionFile(sessionKey);
    if (!sessionFile) {
      return res.status(404).json({ error: 'Session not found', sessionKey });
    }

    // Append to JSONL — format: {"type":"message","message":{"role":"user","content":"...","timestamp":"..."}}
    const timestamp = new Date().toISOString();
    const entry = {
      type: 'message',
      message: {
        role: 'user',
        content: message,
        timestamp
      }
    };

    fs.appendFileSync(sessionFile, JSON.stringify(entry) + '\n', 'utf8');

    console.log(`[chat] Message appended to session ${sessionKey}`);

    // Update sessions.json to bump updatedAt
    try {
      const content = fs.readFileSync(SESSIONS_INDEX, 'utf8');
      const data = JSON.parse(content);
      if (data[sessionKey]) {
        data[sessionKey].updatedAt = Date.now();
        fs.writeFileSync(SESSIONS_INDEX, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      // Non-critical — log and continue
      console.warn('[chat] Failed to update sessions index:', e.message);
    }

    res.json({ ok: true, timestamp });
  } catch (error) {
    console.error('[chat] Error sending message:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
