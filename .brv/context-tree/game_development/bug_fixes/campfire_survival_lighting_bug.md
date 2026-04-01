---
title: Campfire Survival Lighting Bug
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-01T09:51:08.692Z'
updatedAt: '2026-04-01T09:51:08.692Z'
---
## Raw Concept
**Task:**
Document Campfire Survival lighting bug fix

**Changes:**
- Fixed GeometryMask depth 200 causing blue screen
- Implemented 4 darkness rectangles without mask

**Flow:**
Bug discovered -> Root cause: GeometryMask depth 200 -> Fix: 4 darkness rectangles without mask

**Timestamp:** 2026-03-27

## Narrative
### Structure
Campfire Survival game rendering issue

### Dependencies
Affects light/lighting system

### Highlights
GeometryMask on depth 200 makes entire screen blue. Solution: 4 darkness rectangles around light circle WITHOUT mask.

## Facts
- **lighting_bug**: GeometryMask on depth 200 causes entire screen to turn blue in Campfire Survival [project]
- **lighting_fix**: Fixed lighting bug using 4 darkness rectangles around light circle WITHOUT GeometryMask [project]
- **fix_date**: Bug discovered and fixed on 2026-03-27 [project]
