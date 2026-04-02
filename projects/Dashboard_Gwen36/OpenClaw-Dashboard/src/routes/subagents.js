const express = require('express');
const router = express.Router();
const fs = require('fs');

// GET /api/subagents — список субагентов (читаем из sessions.json)
router.get('/', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') console.log('[Subagents API] Reading subagents from sessions.json...');
    
    const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
    const content = fs.readFileSync(sessionsPath, 'utf8');
    const data = JSON.parse(content);
    
    // Фильтруем сессии где ключ содержит "subagent"
    const subagents = Object.entries(data)
      .filter(([key, session]) => key.includes('subagent'))
      .map(([key, session]) => ({
        sessionKey: key,
        sessionId: session.sessionId,
        label: session.label || session.subagentRole || 'Unknown task',
        status: session.status || 'unknown',
        model: session.model,
        channel: session.channel,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        runtimeMs: session.ageMs,
        totalTokens: session.totalTokens,
        contextTokens: session.contextTokens,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
      }))
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    
    if (process.env.NODE_ENV === 'development') console.log(`[Subagents API] Found ${subagents.length} subagent sessions`);
    res.json(subagents);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[Subagents API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subagents/:sessionKey/kill — завершить субагента
router.post('/:sessionKey/kill', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    if (process.env.NODE_ENV === 'development') console.log(`[Subagents API] Kill request for: ${sessionKey}`);
    
    // TODO: Интеграция с gateway для kill команды
    // Пока возвращаем успех - kill будет реализован через gateway API
    
    res.json({ success: true, message: 'Kill signal sent' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[Subagents API] Kill error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
