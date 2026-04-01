const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readSessionsFromFile() {
  const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
  
  try {
    const content = fs.readFileSync(sessionsPath, 'utf8');
    const data = JSON.parse(content);
    
    // Файл — объект где ключи = session keys
    const sessions = Object.entries(data).map(([key, session]) => ({
      key: key,
      sessionId: session.sessionId,
      updatedAt: session.updatedAt,
      ageMs: session.ageMs,
      model: session.model,
      modelProvider: session.modelProvider,
      contextTokens: session.contextTokens,
      totalTokens: session.totalTokens,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      estimatedCostUsd: session.estimatedCostUsd,
      agentId: session.agentId,
      kind: session.kind,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    }));
    
    // Сортируем по updatedAt desc
    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    return sessions;
  } catch (error) {
    console.error('Error reading sessions file:', error.message);
    return [];
  }
}

// GET /api/sessions — список всех сессий
router.get('/', async (req, res) => {
  try {
    console.log('[sessions route] Called, reading from file...');
    const sessions = readSessionsFromFile();
    console.log('[sessions route] Got', sessions.length, 'sessions');
    res.json(sessions);
  } catch (error) {
    console.error('[sessions route] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:sessionId — детали сессии (JSONL транскрипт)
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find the JSONL file
    const agentsDir = '/home/rem/.openclaw/agents';
    let transcriptPath = null;
    
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir);
      for (const agent of agents) {
        const sessionFile = path.join(agentsDir, agent, 'sessions', `${sessionId}.jsonl`);
        if (fs.existsSync(sessionFile)) {
          transcriptPath = sessionFile;
          break;
        }
      }
    }
    
    if (!transcriptPath) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Read and parse JSONL
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const messages = content.trim().split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
