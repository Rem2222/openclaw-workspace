# Dashboard Development Lessons (2026-04-02)

## Project: OpenClaw Dashboard (React + Express)

### Architecture
- **Backend:** 14 route files, gateway.js, index.js, websocket.js
- **Frontend:** 11 page components, 2 contexts, Layout, utility components
- **Styling:** Catppuccin Mocha/Latte, JetBrains Mono (nekocode-landing.css)

### Major Refactoring (Dashboard_Gwen36)

#### P0 Performance Fixes
- **CountsContext:** Reduced from 9 fetches/5s → 8 fetches/30s
- **Component polling:** Each component duplicated 5s polling → unified 15s
- **Result:** Load reduced 10-15x

#### P1 Security & Bugs
- **Command injection** in `/api/command` (CWE-78) → fixed with allowlist
- **GatewayClient** instantiated 4x → singleton pattern
- **Kill session** called non-existent route → fixed
- **Route ordering** `/session-task-map` conflict resolved

#### P2 Code Quality
- **Monitor.jsx:** 23 IIFEs → useMemo
- **Projects.jsx:** loadSessionTaskMap dedup → useCallback
- **Path traversal** protection added to `/session/:id`
- **Console.log spam** removed from 10 frontend + 11 backend files

### API Routes Created
- `GET /api/issues` — Beads task list
- `GET /api/issues/session-task-map` — session-to-task mapping
- `POST /api/issues/sessions` — register session for task
- `POST /api/chat/send` — send message to session (JSONL)
- `GET /api/activity` — global activity feed

### Superpowers Workflow Integration
- Subagents get label `bd:<ISSUE_ID>`
- On spawn: `bd update <id> --claim`
- On complete: `bd update <id> --status done`
- `-d` flag for task description

### Known Limitations
- Chat pagination: backend doesn't support offset/limit
- Full chat integration with sessions_send requires intermediary agent
- Tab switching profiling needed (DevTools)

---
*Consolidated: 2026-04-05*
