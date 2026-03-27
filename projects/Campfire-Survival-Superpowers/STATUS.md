# Campfire Tales — Status

**Created:** 2026-03-26
**Last Updated:** 2026-03-27
**Status:** ⏸ PAUSED

---

## Что построено

### Архитектура
- **Engine:** Phaser 3 + Vite
- **Physics:** Arcade Physics
- **Textures:** Процедурные (Generated in BootScene.js)
- **Structure:** Scenes → Entities → Systems

### Реализованные системы

| Система | Статус | Описание |
|---------|--------|---------|
| **Day/Night Cycle** | ✅ | Day(60s) → Dusk(15s) → Night(3 waves) → Dawn(10s) |
| **Campfire** | ✅ | Топливо, радиус света, градиентное свечение |
| **Woodpile** | ✅ | Складирование дров у костра, не пропадают |
| **Monster AI** | ✅ | Y-axis chase, eye/leg effects, barrier от света |
| **Wave System** | ✅ | Time-based (30s survive), difficulty scaling |
| **EXP System** | ✅ | За волну + за убийство (1 EXP / 5 HP) |
| **Progressive Difficulty** | ✅ | +15% сложность каждую ночь |
| **SkillTree** | ✅ | 9 перков, K=открыть, perk-скиллы (always active) |
| **Player HP Bar** | ✅ | Над головой, green/yellow/red |
| **Crit System** | ✅ | critChance, critMultiplier, popup text |
| **Gradient Light** | ✅ | Inner (ERASE, 80%) + outer (ADD, 20%) зоны |
| **Scary Monsters** | ✅ | Eyes + legs в темноте |
| **Tree Variety** | ✅ | tree/oak, pine, bush, rock |
| **Chopping** | ✅ | SPACE + particles + floating text |

### Сущности (Entities)

| Entity | Файлы | Особенности |
|--------|-------|-------------|
| **Player** | Player.js | WASD, SPACE(attack/chop), E(pick), Q(drop/feed), HP bar, crit |
| **Campfire** | Campfire.js | Топливо, радиус света 60-400px, addFuel(), gradient ERASE/ADD |
| **Tree** | Tree.js | 4 типа, shake+timer, auto-pickup, chip particles |
| **Log** | Log.js | pickup/drop/feed, inPile, despawn timer |
| **Monsters** | Monster.js + 4 типа | Wisp/Crawler/Brute/Specter, eyes/legs в темноте |
| **WaveManager** | WaveManager.js | Time-based waves, night phases, difficulty scaling |
| **GameState** | GameState.js | Singleton: HP, fuel, logs, EXP, difficultyMultiplier |
| **SkillTree** | SkillTree.js | 9 perks, perk/upgrade types, K=toggle |

### Сцены (Scenes)

| Scene | Файл | Описание |
|-------|------|---------|
| **Boot** | BootScene.js | 13 процедурных текстур |
| **Game** | GameScene.js | Darkness overlay, entity management, event handling |
| **UI** | UIScene.js | HP bar, EXP, logs, phase/wave timer, skill hint |

---

## Текущее состояние

**Играбельна:** ✅ (базовое геймплейный цикл работает)

**Последний коммит:** `6c7ca97` — fix: lightRadius → outerRadius in Monster visibility check

---

## Известные баги / TODO

### Баги (не исправлены)
1. **Dawn monster cleanup** — монстры могут не исчезать на рассвете
2. **SkillTree K-toggle** — требует клик на canvas сначала (focus issue)
3. **Campfire ERASE depth** — слой тьмы может накладываться поверх света

### Не реализовано из дизайна
- Система перков (perks вместо скилл-поинтов) — только частично
- Campfire upgrades (Spark → Flame → Inferno → Eternal) — FUTURE_FEATURES.md
- Day/Night cycle UI timer в UIScene (только в game scene)
- Specter движение по Y (может всё ещё горизонтально)

---

## Репозиторий

```
https://github.com/Rem2222/openclaw-workspace
```

**Основная ветка:** `main`
**Последний коммит:** `6c7ca97` (2026-03-27)

---

## Как запустить

```bash
cd ~/.openclaw/workspace/projects/Campfire-Survival-Superpowers
npm run dev
# → http://localhost:3000
```

### Управление

| Клавиша | Дейшение |
|---------|---------|
| WASD / Arrows | Движение |
| SPACE | Атака / Рубка дерева (рядом) |
| E | Подобрать дрова |
| Q | Бросить дрова / Костровое топливо (если не неё) |
| K | СкиллTree UI |
| P × 3 | +10 EXP (чит для тестирования) |

---

## Дизайн-документ

Подробный дизайн: `docs/plans/2026-03-26-campfire-tales-design.md`
Будущие фичи: `docs/plans/FUTURE_FEATURES.md`
