const express = require('express');
const router = express.Router();
const GatewayClient = require('../gateway');

const gateway = new GatewayClient(
  process.env.GATEWAY_URL,
  process.env.GATEWAY_TOKEN
);

// POST /api/spawn — запустить новую сессию (Superpowers)
router.post('/', async (req, res) => {
  try {
    const { projectName, description, model } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: 'projectName required' });
    }

    // Формируем промпт для Superpowers
    const task = `Ты начинаешь новый проект "${projectName}". 

Прочитай и следуй Superpowers workflow:
1. Прочитай /home/rem/.openclaw/workspace/skills/superpowers/SKILL.md
2. Прочитай /home/rem/.openclaw/workspace/skills/superpowers/references/writing-plans.md
3. Начни с Phase 1: Analysis & Planning
4. Спроси у пользователя: название проекта, краткое описание, технологии
5. Создай SPEC.md и план в docs/plans/
6. Создай Beads tasks: bd create "[${projectName}] Task name"
7. После планирования — спроси: какой агент использовать для разработки?`;

    const label = `project:${projectName}`;

    console.log('[Spawn] Launching Superpowers session:', projectName);
    
    const result = await gateway.spawnSession({
      task,
      label,
      model: model || 'opencode-go/glm-5',
      mode: 'session'
    });

    console.log('[Spawn] Result:', JSON.stringify(result.data).slice(0, 200));
    
    res.json({ ok: true, label, projectName });
  } catch (error) {
    console.error('[Spawn] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
