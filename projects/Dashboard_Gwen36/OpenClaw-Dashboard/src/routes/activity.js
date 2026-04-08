const express = require('express');
const router = express.Router();

// TODO: Replace mock data with real implementation — read activity from session transcripts / event store
// GET /api/activity — activity feed (mock данные)
router.get('/', async (req, res) => {
  // Mock данные для демонстрации
  const mockActivity = [
    {
      id: 'evt-001',
      type: 'agent_started',
      level: 'info',
      message: 'Агент main запущен',
      description: 'Агент main начал работу',
      timestamp: Date.now(),
      agentId: 'main'
    },
    {
      id: 'evt-002',
      type: 'session_created',
      level: 'success',
      message: 'Создана новая сессия',
      description: 'Сессия agent:main:main создана',
      timestamp: Date.now() - 60000, // 1 минута назад
      agentId: 'main'
    },
    {
      id: 'evt-003',
      type: 'task_completed',
      level: 'success',
      message: 'Задача выполнена',
      description: 'Задача успешно завершена',
      timestamp: Date.now() - 120000, // 2 минуты назад
      agentId: 'main'
    },
  ];
  
  res.json(mockActivity);
});

module.exports = router;
