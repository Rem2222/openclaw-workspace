const express = require('express');
const router = express.Router();
const approvalsStore = require('../approvals-store');

// GET /api/approvals — список запросов на подтверждение
router.get('/', async (req, res) => {
  try {
    const status = req.query.status; // pending, approved, rejected
    const approvals = approvalsStore.list(status);
    res.json(approvals);
  } catch (error) {
    console.error('❌ Error in /api/approvals:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/approvals/stats — статистика
router.get('/stats', async (req, res) => {
  try {
    const stats = approvalsStore.stats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error in /api/approvals/stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/approvals/:id — запрос по ID
router.get('/:id', async (req, res) => {
  try {
    const approval = approvalsStore.get(req.params.id);
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    res.json(approval);
  } catch (error) {
    console.error('❌ Error in /api/approvals/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals — добавить запрос на подтверждение
router.post('/', async (req, res) => {
  try {
    const approval = approvalsStore.add(req.body);
    res.status(201).json(approval);
  } catch (error) {
    console.error('❌ Error in POST /api/approvals:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/:id/approve — одобрить запрос
router.post('/:id/approve', async (req, res) => {
  try {
    const result = approvalsStore.approve(req.params.id, req.body.approvedBy || 'user');
    
    if (!result) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in POST /api/approvals/:id/approve:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/:id/reject — отклонить запрос
router.post('/:id/reject', async (req, res) => {
  try {
    const result = approvalsStore.reject(
      req.params.id,
      req.body.rejectedBy || 'user',
      req.body.reason || ''
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in POST /api/approvals/:id/reject:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/approvals/:id — удалить запрос
router.delete('/:id', async (req, res) => {
  try {
    const removed = approvalsStore.remove(req.params.id);
    
    if (!removed) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('❌ Error in DELETE /api/approvals/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/cleanup — очистить обработанные запросы
router.post('/cleanup', async (req, res) => {
  try {
    const removed = approvalsStore.cleanupProcessed();
    res.json({ success: true, removed });
  } catch (error) {
    console.error('❌ Error in POST /api/approvals/cleanup:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
