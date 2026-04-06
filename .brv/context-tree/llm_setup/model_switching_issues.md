# Model Switching Issues (2026-04-03)

## Problem: Gateway Resets Model on Restart

When Gateway restarts, the `agents.defaults.primaryModel` resets to `xiaomi/mimo-v2-omni` instead of keeping the configured model.

### Timeline
1. Config set to `neko/claude-opus-4-6` (Claude Opus via Neko)
2. Gateway restart → reset to `xiaomi/mimo-v2-omni`
3. Manual fix → `neko/claude-opus-4-6` works again
4. Session reset → changed to `xiaomi/mimo-v2-flash` (unexplained)

### Neko API Model Format
- **Wrong:** `claude-opus-4-6-1m` (hyphens)
- **Correct:** `claude-opus-4-6[1m]` (square brackets for context window)

### Lessons
1. Gateway restarts may reset primary model config
2. Neko API requires specific model naming with square brackets
3. Model can change unexpectedly on session reset — check after any gateway operation

---
*Consolidated: 2026-04-05*
