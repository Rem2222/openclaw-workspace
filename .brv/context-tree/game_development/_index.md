---
children_hash: e6926faa02a2b3794ea1ec38b114afa2c4b73ba144ca84964accfe997ba564a1
compression_ratio: 0.7674418604651163
condensation_order: 2
covers: [bug_fixes/_index.md]
covers_token_total: 215
summary_level: d2
token_count: 165
type: summary
---
# Game Development: Bug Fixes Summary

## Bug Fixes Overview

Documents rendering and lighting system bug fixes for game projects.

## Campfire Survival Lighting Bug

**Entry:** `campfire_survival_lighting_bug.md`

- **Problem:** GeometryMask configured at depth 200 caused full-screen blue rendering
- **Solution:** Replaced GeometryMask with 4 darkness rectangles positioned around light circle
- **Date:** 2026-03-27
- **Affects:** Light/lighting rendering system
- **Architectural change:** Eliminated GeometryMask dependency for darkness effects

**Key pattern:** Rendering bugs resolved by simplifying geometry masking to positioned overlay rectangles.