const express = require('express');
const router = express.Router();
const GatewayClient = require('../gateway');

// Создаём клиент с параметрами из запроса
function createClient(url, token) {
  return new GatewayClient(url, token);
}

// POST /api/gateway/test — проверка подключения к Gateway
router.post('/test', async (req, res) => {
  const { url, token } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const client = createClient(url, token);
    const result = await client.testConnection();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    });
  }
});

module.exports = router;
