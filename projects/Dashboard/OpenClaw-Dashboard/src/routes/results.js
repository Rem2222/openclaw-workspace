const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const RESULTS_FILE = path.join(__dirname, '../../data/task-results.json');

// Убеждаемся что директория существует
const dataDir = path.dirname(RESULTS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Загрузка результатов
function loadResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

// Сохранение результатов
function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// GET /api/issues/results — получить все результаты
router.get('/', async (req, res) => {
  try {
    const results = loadResults();
    res.json(results);
  } catch (error) {
    console.error('[Results API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/issues/results — сохранить результат для задачи
router.post('/', async (req, res) => {
  try {
    const { issueId, result } = req.body;
    if (!issueId || !result) {
      return res.status(400).json({ error: 'issueId and result required' });
    }

    const results = loadResults();
    results[issueId] = result;
    saveResults(results);

    res.json({ ok: true, issueId, result });
  } catch (error) {
    console.error('[Results API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/issues/results/:issueId — удалить результат
router.delete('/:issueId', async (req, res) => {
  try {
    const results = loadResults();
    const issueId = req.params.issueId;
    
    if (results[issueId]) {
      delete results[issueId];
      saveResults(results);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'Result not found' });
    }
  } catch (error) {
    console.error('[Results API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;