# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## API ключи

**Файл:** `~/.openclaw/agents/main/agent/auth-profiles.json`

Содержит все API ключи провайдеров:
- `minimax:global` — Minimax API key
- `zai:default` — Z.AI (GLM) ключ
- `xiaomi:default` — Xiaomi (MiMo) ключ
- `qwen-portal:default` — Qwen OAuth токены

Для получения ключа:
```bash
cat ~/.openclaw/agents/main/agent/auth-profiles.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['profiles']['minimax:global']['key'])"
```

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 🖥 TUI (Terminal UI)

**Разрыв строки в вводе:** `Ctrl+Enter`

---

Add whatever helps you do your job. This is your cheat sheet.

## ByteRover (Memory)
- **CLI:** `/root/.brv-cli/bin/brv` (version 2.5.2)
- **Query:** `/root/.brv-cli/bin/brv query "auth patterns"` (Check existing knowledge)
- **Curate:** `/root/.brv-cli/bin/brv curate "Auth uses JWT in cookies"` (Save new knowledge)
- **Sync:** `/root/.brv-cli/bin/brv pull` / `/root/.brv-cli/bin/brv push` (Sync with team - requires login)

## MemPalace (Facts & Decisions)
MemPalace извлекает факты и решения из workspace файлов в semantic storage.
- **CLI:** `mempalace status` — показать количество drawers
- **CLI Search:** `mempalace search "query" --wing rem` — поиск по фактам
- **Wake-up:** `mempalace wake-up --wing rem` — получить контекст для новой сессии (~569 tokens)
- **Mine:** `mempalace mine ~/.openclaw/workspace --mode convos --wing rem` — загрузить файлы в palace
- **Python API:**
```python
from mempalace.searcher import search_memories
import os
results = search_memories('query', palace_path=os.path.expanduser('~/.mempalace/palace'), wing='rem')
for r in results['results']:
    print(r['text'][:100], '|', r['source_file'])
```
- **Palace location:** `~/.mempalace/palace`
- **Status:** 2561 drawers (technical: 1972, general: 264, planning: 149, architecture: 133, problems: 43)
- **Wings:** rem (main), openclaw
