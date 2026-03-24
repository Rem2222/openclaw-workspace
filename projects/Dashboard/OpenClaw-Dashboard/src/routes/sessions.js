const express = require('express');
const router = express.Router();
const GatewayClient = require('../gateway');

const gateway = new GatewayClient(
  process.env.GATEWAY_URL,
  process.env.GATEWAY_TOKEN
);

// GET /api/sessions — список всех сессий
router.get('/', async (req, res) => {
  try {
    // Получаем сессии с увеличенным limit и activeMinutes
    const response = await gateway.invokeTool('sessions_list', 'json', {
      limit: 100,      // Увеличиваем лимит
      activeMinutes: 1440  // 24 часа активности
    });
    
    // Данные могут быть в JSON строке в content[0].text
    let sessions = [];
    
    if (response.data.result?.content?.[0]?.text) {
      const parsed = JSON.parse(response.data.result.content[0].text);
      sessions = parsed.sessions || [];
    } else if (response.data.result?.details?.sessions) {
      sessions = response.data.result.details.sessions;
    }
    
    // Добавляем duration и startedAt
    const enrichedSessions = sessions.map(session => ({
      ...session,
      startedAt: session.updatedAt,  // Используем updatedAt как approximation
      duration: session.updatedAt ? Date.now() - session.updatedAt : 0,  // в миллисекундах
    }));
    
    res.json(enrichedSessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id — детали сессии
router.get('/:id', async (req, res) => {
  try {
    const response = await gateway.invokeTool('sessions_history', 'json', { sessionKey: req.params.id, limit: 100 });
    
    // Извлекаем данные из result.details
    const sessionDetails = response.data.result?.details || {};
    
    res.json(sessionDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/kill — завершить сессию
router.post('/:id/kill', async (req, res) => {
  try {
    const response = await gateway.invokeTool('subagents', 'kill', { target: req.params.id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
