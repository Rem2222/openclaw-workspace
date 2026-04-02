const express = require('express');
const router = express.Router();
const cronStore = require('../cron-store');

// GET /api/cron — список cron задач
router.get('/', async (req, res) => {
  try {
    const tasks = cronStore.list();
    res.json(tasks);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in /api/cron:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cron/:id — cron задача по ID
router.get('/:id', async (req, res) => {
  try {
    const task = cronStore.get(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in /api/cron/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cron — добавить cron задачу
router.post('/', async (req, res) => {
  try {
    const task = cronStore.add(req.body.id, req.body);
    res.status(201).json(task);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in POST /api/cron:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cron/:id — обновить cron задачу
router.put('/:id', async (req, res) => {
  try {
    const task = cronStore.update(req.params.id, req.body);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in PUT /api/cron/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cron/:id — удалить cron задачу
router.delete('/:id', async (req, res) => {
  try {
    const removed = cronStore.remove(req.params.id);
    
    if (!removed) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in DELETE /api/cron/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cron/:id/trigger — ручной запуск cron задачи
router.post('/:id/trigger', async (req, res) => {
  try {
    const result = cronStore.trigger(req.params.id);
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('❌ Error in POST /api/cron/:id/trigger:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
