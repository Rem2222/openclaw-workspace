const express = require('express');
const router = express.Router();
const GatewayClient = require('../gateway');

const gateway = new GatewayClient(
  process.env.GATEWAY_URL,
  process.env.GATEWAY_TOKEN
);

// GET /api/subagents — список субагентов (через subagents list)
router.get('/', async (req, res) => {
  try {
    console.log('[Subagents API] Request received, calling gateway.subagents...');
    const response = await gateway.subagents('list', { recentMinutes: 5 });
    
    console.log('[Subagents API] Raw response data:', JSON.stringify(response.data, null, 2));
    
    // Структура ответа:
    // response.data = { ok: true, result: { details: { active: [], recent: [] } } }
    // Нужно извлечь active и recent из result.details
    
    const result = response.data?.result || {};
    const subagentsData = result.details || result; // fallback если details нет
    
    console.log('[Subagents API] Extracted subagentsData:', JSON.stringify(subagentsData, null, 2));
    
    const subagents = [];
    
    // Добавляем активные
    if (Array.isArray(subagentsData.active)) {
      subagents.push(...subagentsData.active.map(sa => ({
        ...sa,
        status: 'active'
      })));
    }
    
    // Добавляем недавние
    if (Array.isArray(subagentsData.recent)) {
      subagents.push(...subagentsData.recent.map(sa => ({
        ...sa,
        status: 'recent'
      })));
    }
    
    console.log(`[Subagents API] Returning ${subagents.length} subagents`);
    res.json(subagents);
  } catch (error) {
    console.error('[Subagents API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subagents/:id/kill — завершить субагента
router.post('/:id/kill', async (req, res) => {
  try {
    const response = await gateway.subagents('kill', { target: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
