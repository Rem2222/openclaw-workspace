const express = require('express');
const router = express.Router();
const gateway = require('../shared-gateway');

// GET /api/tasks — список задач из сессий
router.get('/', async (req, res) => {
  try {
    // Получаем список сессий напрямую
    const response = await gateway.invokeTool('sessions_list', 'json', {
      activeMinutes: req.query.activeMinutes || 60
    });
    
    // Парсим данные из JSON строки
    let sessions = [];
    
    if (response.data.result?.content?.[0]?.text) {
      const parsed = JSON.parse(response.data.result.content[0].text);
      sessions = parsed.sessions || [];
    } else if (response.data.result?.details?.sessions) {
      sessions = response.data.result.details.sessions;
    }
    
    // Маппинг сессий в задачи
    const tasks = sessions.map(session => ({
      id: session.key || session.sessionKey || session.id || `task_${Date.now()}`,
      title: session.label || session.displayName || 'Untitled task',
      description: '',
      status: 'active',
      agent: session.key?.split(':')[1] || 'unknown',
      kind: session.kind || 'unknown',
      channel: session.channel || 'unknown',
      activeMinutes: Math.floor((Date.now() - (session.updatedAt || Date.now())) / 60000) || 0,
      updatedAt: session.updatedAt ? new Date(session.updatedAt).toISOString() : new Date().toISOString(),
      sessionKey: session.key || session.sessionKey
    }));
    
    res.json(tasks);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in /api/tasks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id — задача по ID
router.get('/:id', async (req, res) => {
  try {
    const tasks = await gateway.getTasks({});
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in /api/tasks/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
