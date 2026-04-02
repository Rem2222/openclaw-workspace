const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function readSessionsFromFile() {
  const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
  
  try {
    const content = fs.readFileSync(sessionsPath, 'utf8');
    const data = JSON.parse(content);
    
    // Файл — объект где ключи = session keys
    const sessions = Object.entries(data).map(([key, session]) => ({
      key: key,
      sessionId: session.sessionId,
      updatedAt: session.updatedAt,
      ageMs: session.ageMs,
      model: session.model,
      modelProvider: session.modelProvider,
      contextTokens: session.contextTokens,
      totalTokens: session.totalTokens,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      estimatedCostUsd: session.estimatedCostUsd,
      agentId: session.agentId,
      kind: session.kind,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      // Канал из origin.provider или явно заданный channel
      channel: session.channel || session.origin?.provider || null,
      // Origin для детальной информации
      origin: session.origin,
      // Label для субагентов
      label: session.label || session.subagentRole || null,
      // DisplayName если есть
      displayName: session.displayName || session.label || null,
    }));
    
    // Сортируем по updatedAt desc
    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    return sessions;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Error reading sessions file:', error.message);
    return [];
  }
}

// GET /api/sessions — список всех сессий
router.get('/', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') console.log('[sessions route] Called, reading from file...');
    const sessions = readSessionsFromFile();
    if (process.env.NODE_ENV === 'development') console.log('[sessions route] Got', sessions.length, 'sessions');
    res.json(sessions);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[sessions route] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sessions/:sessionKey — удалить сессию
router.delete('/:sessionKey', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
    
    // Читаем sessions.json
    const content = fs.readFileSync(sessionsPath, 'utf8');
    const data = JSON.parse(content);
    
    // Проверяем существование сессии
    if (!data[sessionKey]) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = data[sessionKey];
    const sessionFile = session.sessionFile;
    
    // Удаляем ключ из объекта
    delete data[sessionKey];
    
    // Сохраняем обновлённый sessions.json
    fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Переименовываем .jsonl файл (soft delete)
    if (sessionFile && fs.existsSync(sessionFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const deletedPath = `${sessionFile}.deleted.${timestamp}`;
      fs.renameSync(sessionFile, deletedPath);
    }
    
    if (process.env.NODE_ENV === 'development') console.log(`[sessions route] Deleted session: ${sessionKey}`);
    res.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[sessions route] Error deleting session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:sessionId — детали сессии (JSONL транскрипт)
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Path traversal protection
    if (sessionId.includes('..') || sessionId.includes('/')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    const agentsDir = '/home/rem/.openclaw/agents';
    let transcriptPath = null;
    
    // 1. Сначала проверяем — может это UUID и файл существует напрямую
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir);
      for (const agent of agents) {
        const sessionFile = path.join(agentsDir, agent, 'sessions', `${sessionId}.jsonl`);
        if (fs.existsSync(sessionFile)) {
          transcriptPath = sessionFile;
          break;
        }
      }
    }
    
    // 2. Если не нашли — ищем в sessions.json по ключу (sessionId может быть key)
    if (!transcriptPath) {
      const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
      try {
        const content = fs.readFileSync(sessionsPath, 'utf8');
        const data = JSON.parse(content);
        
        // sessionId может быть key в sessions.json
        const session = data[sessionId];
        if (session && session.sessionFile) {
          transcriptPath = session.sessionFile;
        }
        
        // Или ищем сессию где key == sessionId
        if (!transcriptPath) {
          for (const [key, sess] of Object.entries(data)) {
            if (key === sessionId && sess.sessionFile) {
              transcriptPath = sess.sessionFile;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore lookup errors
      }
    }
    
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Session transcript not found', sessionId });
    }
    
    // Read and parse JSONL — извлекаем только объекты с message
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');
    const messages = [];
    
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        // Берем только объекты с message (это и есть сообщения)
        if (obj.message) {
          const msg = obj.message;
          // content может быть строкой или массивом
          let text = '';
          if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (Array.isArray(msg.content)) {
            text = msg.content.map(c => c.text || '').join('\n');
          }
          messages.push({
            role: msg.role,
            content: text,
            timestamp: msg.timestamp
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
