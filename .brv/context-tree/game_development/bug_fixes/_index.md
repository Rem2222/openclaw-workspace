---
children_hash: 05ed76695b98d3d196251b2d9abe41cad63eb59992634d7055b22161e3c3dd31
compression_ratio: 0.5643939393939394
condensation_order: 1
covers: [campfire_survival_lighting_bug.md]
covers_token_total: 264
summary_level: d1
token_count: 149
type: summary
---
# Game Development: Bug Fixes

## Overview
Documents rendering bug fixes and their solutions for game projects.

## Key Bug Fixes

### Campfire Survival Lighting Bug

**Problem:** GeometryMask set at depth 200 caused the entire screen to render blue.

**Solution:** Implemented 4 darkness rectangles positioned around the light circle, removing the GeometryMask entirely.

**Date:** 2026-03-27

**Related File:** `game_development/bug_fixes/campfire_survival_lighting_bug.md`

**Key Relationships:**
- Affects the light/lighting rendering system
- No longer uses GeometryMask for darkness effect