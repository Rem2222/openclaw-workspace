const express = require('express');
const router = express.Router();
const gateway = require('../shared-gateway');

// GET /api/agents — список всех агентов
router.get('/', async (req, res) => {
  try {
    const response = await gateway.invokeTool('agents_list', 'json', {});
    
    // Извлекаем данные из result.details.agents
    const agents = response.data.result?.details?.agents || [];
    
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:id — детали агента
router.get('/:id', async (req, res) => {
  try {
    const response = await gateway.invokeTool('agents_list', 'json', { filterBy: req.params.id });
    const agents = response.data.details?.agents || [];
    
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agents/:id/action — управление агентом (не реализовано)
router.post('/:id/action', async (req, res) => {
  res.status(501).json({ error: 'Agent action not supported' });
});

module.exports = router;
