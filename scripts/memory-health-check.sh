#!/bin/bash
# Memory Health Check Script
# Tests: LCM, MemPalace, ByteRover, Memory Files
# Usage: bash memory-health-check.sh

echo "🧠 Memory Health Check — $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="

FAILED=0

# 1. Test LCM (Lossless Context Management)
echo ""
echo "1️⃣  LCM (Conversation History)..."
LCM_RESULT=$(python3 -c "
import sqlite3, os
db_path = os.path.expanduser('~/.openclaw/lcm.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.execute('SELECT COUNT(*) FROM messages')
    count = cur.fetchone()[0]
    print(f'OK: {count} messages in DB')
else:
    print('FAIL: LCM DB not found at ' + db_path)
" 2>&1)
if echo "$LCM_RESULT" | grep -q "OK"; then
    echo "   ✅ $LCM_RESULT"
else
    echo "   ❌ $LCM_RESULT"
    FAILED=$((FAILED + 1))
fi

# 2. Test MemPalace (Semantic Memory)
echo ""
echo "2️⃣  MemPalace (Semantic Facts)..."
MP_RESULT=$(python3 -c "
from mempalace.searcher import search_memories
import os
results = search_memories('Rem', palace_path=os.path.expanduser('~/.mempalace/palace'), wing='rem')
drawer_count = len(results.get('results', []))
print(f'OK: {drawer_count} results for \"Rem\", palace accessible')
" 2>&1)
if echo "$MP_RESULT" | grep -q "OK"; then
    echo "   ✅ $MP_RESULT"
else
    echo "   ❌ $MP_RESULT"
    FAILED=$((FAILED + 1))
fi

# 3. Test ByteRover (Project KB) — query + last updated
echo ""
echo "3️⃣  ByteRover (Project KB)..."
BRV_QUERY=$(timeout 8 /root/.brv-cli/bin/brv query "Rem" --format text 2>&1 | head -5)
BRV_EXIT=$?
if [ $BRV_EXIT -eq 124 ]; then
    echo "   ⚠️  ByteRover: timeout (>8s)"
elif echo "$BRV_QUERY" | grep -q "No results\|empty\|not found" 2>/dev/null; then
    echo "   ⚠️  ByteRover: no results for \"Rem\""
else
    echo "   ✅ ByteRover: query OK"
fi
# Show last updated from manifest
MANIFEST=~/.openclaw/workspace/.brv/context-tree/_manifest.json
if [ -f "$MANIFEST" ]; then
    LAST_UPDATED=$(python3 -c "import json; m=json.load(open('$MANIFEST')); print(m.get('generated_at', m.get('lastUpdated', 'unknown')))" 2>/dev/null)
    echo "   📅 Last updated: $LAST_UPDATED"
fi

# 4. Test Memory Files
echo ""
echo "4️⃣  Memory Files..."
MEMORY_DIR=~/.openclaw/workspace/memory
if [ -d "$MEMORY_DIR" ]; then
    FILE_COUNT=$(find "$MEMORY_DIR" -name "*.md" 2>/dev/null | wc -l)
    TODAY_FILES=$(find "$MEMORY_DIR" -name "$(date '+%Y-%m-%d')*.md" 2>/dev/null | wc -l)
    echo "   ✅ Memory dir: $FILE_COUNT .md files, $TODAY_FILES today"
else
    echo "   ❌ Memory dir not found"
    FAILED=$((FAILED + 1))
fi

# 5. Test HEARTBEAT.md exists
echo ""
echo "5️⃣  HEARTBEAT.md..."
HB_FILE=~/.openclaw/workspace/HEARTBEAT.md
if [ -f "$HB_FILE" ]; then
    SIZE=$(stat -c%s "$HB_FILE" 2>/dev/null || stat -f%z "$HB_FILE" 2>/dev/null)
    echo "   ✅ HEARTBEAT.md exists ($SIZE bytes)"
else
    echo "   ❌ HEARTBEAT.md not found"
    FAILED=$((FAILED + 1))
fi

# 6. Test MEMORY.md
echo ""
echo "6️⃣  MEMORY.md..."
MEM_FILE=~/.openclaw/workspace/MEMORY.md
if [ -f "$MEM_FILE" ]; then
    LINES=$(wc -l < "$MEM_FILE" 2>/dev/null || echo "?")
    echo "   ✅ MEMORY.md exists ($LINES lines)"
else
    echo "   ❌ MEMORY.md not found"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All checks passed!"
else
    echo "❌ $FAILED check(s) failed"
fi

exit $FAILED