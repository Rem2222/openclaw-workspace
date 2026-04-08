const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * TODO: Refactor all synchronous fs.* calls to async fs.promises.* to avoid blocking the event loop.
 * Parse a JSONL session file and extract activity items.
 * Filters out user messages and structures the data for the Activity feed.
 */
function parseSessionActivity(sessionKey, limit = 100, offset = 0) {
  // First, look up session in sessions.json to find the correct file
  const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
  let transcriptPath = null;
  
  try {
    if (fs.existsSync(sessionsPath)) {
      const sessionsContent = fs.readFileSync(sessionsPath, 'utf8');
      const sessionsData = JSON.parse(sessionsContent);
      
      // Find the session by key
      const session = sessionsData[sessionKey];
      if (session && session.sessionFile) {
        transcriptPath = session.sessionFile;
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('[monitor route] Error reading sessions.json:', e.message);
  }
  
  // Fallback: try to find file directly
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    const agentsDir = '/home/rem/.openclaw/agents';
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir);
      for (const agent of agents) {
        const sessionsDir = path.join(agentsDir, agent, 'sessions');
        if (fs.existsSync(sessionsDir)) {
          const files = fs.readdirSync(sessionsDir);
          // Try exact match or topic pattern
          for (const file of files) {
            if (file === `${sessionKey}.jsonl` || file.startsWith(`${sessionKey}.topic-`)) {
              transcriptPath = path.join(sessionsDir, file);
              break;
            }
            // Also try matching by sessionId
            if (file.startsWith(`${sessionKey.split(':').pop()}.jsonl`) || 
                file.match(new RegExp(`^${sessionKey.split(':').pop()}-topic-.*\\.jsonl$`))) {
              transcriptPath = path.join(sessionsDir, file);
              break;
            }
          }
        }
        if (transcriptPath) break;
      }
    }
  }
  
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { items: [], total: 0 };
  }
  
  try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');
    const allItems = [];
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        // Skip user messages - we only want assistant/tool activity
        if (entry.type === 'message' && entry.message?.role === 'user') {
          continue;
        }
        
        // Process different entry types
        if (entry.type === 'message' && entry.message?.role === 'assistant') {
          // Assistant message with potential tool calls
          const content = entry.message?.content || [];
          for (const block of content) {
            if (block.type === 'toolCall') {
              allItems.push({
                id: `tool-${block.id || entry.id}`,
                type: 'tool_call',
                timestamp: entry.timestamp,
                toolName: block.name,
                arguments: block.arguments,
                preview: formatToolCallPreview(block.name, block.arguments),
                expanded: false
              });
            } else if (block.type === 'text' && block.text) {
              // Text response from assistant
              const text = block.text;
              allItems.push({
                id: `text-${entry.id}`,
                type: 'text',
                timestamp: entry.timestamp,
                content: text,
                preview: text.slice(0, 100),
                expanded: false
              });
            } else if (block.type === 'thinking') {
              // Thinking block (usually hidden but can show)
              allItems.push({
                id: `think-${entry.id}`,
                type: 'thinking',
                timestamp: entry.timestamp,
                content: block.thinking?.slice(0, 200) || '',
                expanded: false
              });
            }
          }
        } else if (entry.type === 'message' && entry.message?.role === 'toolResult') {
          // Tool result
          const result = entry.message;
          const isError = result.isError || false;
          
          // Extract content preview
          let contentPreview = '';
          let fullContent = '';
          if (result.content && Array.isArray(result.content)) {
            for (const c of result.content) {
              if (c.type === 'text' && c.text) {
                fullContent = c.text;
                contentPreview = c.text.slice(0, 100);
                break;
              }
            }
          }
          
          allItems.push({
            id: `result-${result.toolCallId || entry.id}`,
            type: isError ? 'error' : 'result',
            timestamp: entry.timestamp,
            toolName: result.toolName || 'unknown',
            toolCallId: result.toolCallId,
            isError,
            content: fullContent,
            preview: contentPreview,
            expanded: false
          });
        } else if (entry.type === 'message' && entry.message?.role === 'system') {
          // System message
          const content = entry.message?.content;
          allItems.push({
            id: `sys-${entry.id}`,
            type: 'system',
            timestamp: entry.timestamp,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            preview: (typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 100),
            expanded: false
          });
        } else if (entry.type === 'session') {
          // Session start marker
          allItems.push({
            id: `session-${entry.id}`,
            type: 'session_start',
            timestamp: entry.timestamp,
            sessionId: entry.id,
            cwd: entry.cwd
          });
        } else if (entry.type === 'model_change') {
          allItems.push({
            id: `model-${entry.id}`,
            type: 'model_change',
            timestamp: entry.timestamp,
            provider: entry.provider,
            modelId: entry.modelId
          });
        } else if (entry.type === 'custom') {
          // Custom events (like model-snapshot)
          allItems.push({
            id: `custom-${entry.id}`,
            type: 'custom',
            timestamp: entry.timestamp,
            customType: entry.customType,
            data: entry.data
          });
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // Sort by timestamp (newest first)
    allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const total = allItems.length;
    const items = allItems.slice(offset, offset + limit);
    
    return { items, total };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[monitor route] Error parsing session:', error.message);
    return { items: [], total: 0 };
  }
}

/**
 * Format a preview of a tool call
 */
function formatToolCallPreview(toolName, args) {
  if (!args) return `${toolName}()`;
  
  const argPreview = Object.entries(args)
    .slice(0, 2)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v.slice(0, 30) : JSON.stringify(v).slice(0, 30);
      return `${k}="${val}"`;
    })
    .join(', ');
  
  return `${toolName}(${argPreview}${Object.keys(args).length > 2 ? ', ...' : ''})`;
}

/**
 * GET /api/monitor/messages - Get activity messages from a session
 * Query params:
 *   - sessionKey: session key (required)
 *   - limit: number of items (default 25)
 *   - offset: pagination offset (default 0)
 */
router.get('/messages', async (req, res) => {
  const { sessionKey, limit = 25, offset = 0 } = req.query;
  
  if (!sessionKey) {
    return res.status(400).json({ error: 'sessionKey is required' });
  }
  
  const result = parseSessionActivity(
    sessionKey,
    parseInt(limit, 10),
    parseInt(offset, 10)
  );
  
  res.json(result);
});

/**
 * GET /api/monitor/session-activity - Get activity from multiple sessions
 * For project view, aggregates activity from sessions related to project tasks
 * Query params:
 *   - project: project name (optional)
 *   - limit: number of items (default 50)
 */
router.get('/session-activity', async (req, res) => {
  const { project, limit = 50 } = req.query;
  
  // Read sessions.json to get session list
  const sessionsPath = '/home/rem/.openclaw/agents/main/sessions/sessions.json';
  
  if (!fs.existsSync(sessionsPath)) {
    return res.json({ items: [], total: 0 });
  }
  
  try {
    const sessionsContent = fs.readFileSync(sessionsPath, 'utf8');
    const sessionsData = JSON.parse(sessionsContent);
    
    // If project filter, load task-session mapping
    let projectSessions = null;
    if (project) {
      // Load issues to get project task IDs
      const issuesPath = '/home/rem/.openclaw/workspace/.beads/issues.json';
      let projectTaskIds = [];
      
      if (fs.existsSync(issuesPath)) {
        const issuesContent = fs.readFileSync(issuesPath, 'utf8');
        const issuesData = JSON.parse(issuesContent);
        projectTaskIds = (issuesData.issues || [])
          .filter(i => i.project === project)
          .map(i => i.id);
      }
      
      // Load task-session mapping
      const mappingPath = '/home/rem/.openclaw/workspace/.beads/task-sessions.json';
      if (fs.existsSync(mappingPath)) {
        const mappingContent = fs.readFileSync(mappingPath, 'utf8');
        const mappingData = JSON.parse(mappingContent);
        const taskId = mappingData.taskId || mappingData;
        
        // Find sessions for these tasks
        projectSessions = new Set();
        for (const [sessionKey, taskInfo] of Object.entries(sessionsData)) {
          const taskLabel = sessionKey.match(/bd:([a-zA-Z0-9-]+)/)?.[1];
          if (taskLabel && projectTaskIds.includes(taskLabel)) {
            projectSessions.add(sessionKey);
          }
        }
      }
    }
    
    // Collect activity from sessions
    const allItems = [];
    const sessionKeys = projectSessions 
      ? Array.from(projectSessions) 
      : Object.keys(sessionsData).slice(0, 10); // Limit to 10 sessions for initial load
    
    for (const key of sessionKeys) {
      const session = sessionsData[key];
      // Get session file path
      if (session?.sessionFile && fs.existsSync(session.sessionFile)) {
        try {
          const content = fs.readFileSync(session.sessionFile, 'utf8');
          const lines = content.trim().split('\n');
          
          // Parse for recent activity
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              
              // Same filtering logic as parseSessionActivity
              if (entry.type === 'message' && entry.message?.role === 'user') continue;
              
              // Extract key activity items
              if (entry.type === 'message' && entry.message?.role === 'assistant') {
                const content = entry.message?.content || [];
                for (const block of content) {
                  if (block.type === 'toolCall') {
                    allItems.push({
                      id: `${key}-tool-${block.id || entry.id}`,
                      type: 'tool_call',
                      timestamp: entry.timestamp,
                      toolName: block.name,
                      sessionKey: key,
                      sessionLabel: session?.label
                    });
                  }
                }
              } else if (entry.type === 'message' && entry.message?.role === 'toolResult') {
                const result = entry.message;
                allItems.push({
                  id: `${key}-result-${result.toolCallId || entry.id}`,
                  type: result.isError ? 'error' : 'result',
                  timestamp: entry.timestamp,
                  toolName: result.toolName,
                  sessionKey: key,
                  sessionLabel: session?.label,
                  isError: result.isError
                });
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    }
    
    // Sort by timestamp and limit
    allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      items: allItems.slice(0, parseInt(limit, 10)),
      total: allItems.length
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[monitor route] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;