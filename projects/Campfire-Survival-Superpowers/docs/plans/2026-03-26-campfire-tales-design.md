# Campfire Tales — Design Document

**Created:** 2026-03-26
**Author:** Romul (via Superpowers Brainstorming)
**Status:** Draft — awaiting approval

---

## 1. Concept & Vision

**Campfire Tales** is a cozy survival roguelite set in an infinite, procedurally-generated forest at night.

The player tends a campfire that serves as their base hub. During peaceful nights, they explore, gather resources, and upgrade their camp. When monsters attack in waves, they must defend their hearth while managing resources.

**Tagline:** *"Where every campfire tells a story."*

**Emotional Arc:**
- 🌅 **Evening** — Arrival, setting up camp, peaceful exploration
- 🌙 **Night** — Wave-based monster attacks, tension, cooperation with the fire
- 🌄 **Dawn** — Victory or defeat, progress saved, new run begins

**Core Fantasy:** A meditative yet engaging experience where the campfire is both literal warmth and symbolic hope against the darkness.

---

## 2. Core Gameplay Loop (MVP: Waves)

### Phase Structure

```
Wave 1 → Rest → Wave 2 → Rest → Wave 3 → ... → Victory/Defeat
```

**During Wave:**
- Monsters spawn at edge of campfire light
- Move toward campfire (attacking it) and player (attacking player)
- Player must defeat monsters (melee/ranged based on build)
- Campfire has HP; if it reaches 0 = Game Over

**During Rest:**
- Short break between waves (10-15 seconds)
- Player can reposition, prepare
- Optional: auto-heal slightly

### Wave Progression

| Wave | Monster Count | Types | Behavior |
|------|--------------|-------|----------|
| 1 | 3-5 | Slow, basic | Direct path to campfire |
| 2 | 5-8 | Mix slow + fast | Some target player |
| 3 | 8-12 | All types | Coordinated, varied speeds |
| 4+ | Scales | All types | Increasing difficulty |

### Future: Day/Night Cycle (Post-MVP)

- **Day** (2-3 min): Peaceful — gather resources, upgrade camp, explore
- **Dusk** (30 sec): Warning — prepare for night
- **Night** (2-3 min): Wave-based combat
- **Dawn** (30 sec): Results, loot, progress

---

## 3. Game Systems

### 3.1 Campfire (Base Hub)

**Role:** Coordination center, defensive target, upgradeable hub

**Properties:**
- `hp` — Monster attacks reduce HP; 0 = Game Over
- `level` — Determines upgrades available
- `lightRadius` — Visual only (no gameplay effect in MVP)

**Upgrades (Permanent between runs):**
- Stone base (less damage taken)
- Larger flames (bigger light radius, cosmetic)
- Fire poker (campfire attacks nearby monsters)
- Supply cache (bonus resources at start of run)

**Visual:** Animated flames, particle effects, grows with upgrades

### 3.2 Player (Woodsman)

**Role:** Resource gatherer, combatant, campfire defender

**Abilities:**
- Move (WASD / Arrows)
- Attack (Space / Click) — melee in MVP
- Interact (E) — gather, upgrade, enter camp

**Stats (from Skill Tree):**
- `health` — Hit points
- `attackDamage` — Damage per hit
- `attackSpeed` — Attacks per second
- `moveSpeed` — Movement speed
- `carryCapacity` — Resources carried at once
- `chopSpeed` — Time to chop a tree

### 3.3 Monster Waves

**Design Principles:**
- **Beautiful variety** — Each monster type has distinct, appealing visual design (no generic slimes)
- **Speed differentiation** — Slow brutes + fast runners + aerial/swimming types
- **Behavioral variety** — Some target player, some target campfire, some support

**Monster Types (MVP):**

| Type | Speed | HP | Behavior | Visual |
|------|-------|----|----------|--------|
| Wisp | Fast | Low | Slight homing to player | Glowing orb, blue-white |
| Crawler | Medium | Medium | Ground path to campfire | Multi-legged, forest colors |
| Brute | Slow | High | Direct to campfire, high damage | Large, hulking silhouette |
| Specter | Fast | Very Low | Phases through obstacles | Ghostly, translucent |

**Future Types:**
- Aquatic (for marsh biomes)
- Flying (bypass ground obstacles)
- Swarmer (spawns in groups)

### 3.4 Skill Tree (Meta-Progression)

**Unlocks between runs, persists permanently**

**Branches:**

```
                    [Root]
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    [Combat]      [Gathering]    [Survival]
         │             │             │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │         │   │         │   │         │
 [+Damage] [+Speed] [+Chop] [+Carry] [+HP] [+Camp]
```

**Example Skills:**

| Skill | Branch | Effect | Cost |
|-------|--------|--------|------|
| Sharp Axe | Combat | +25% attack damage | 3 pts |
| Swift Feet | Combat | +15% attack speed | 3 pts |
| Lumberjack | Gathering | -30% chop time | 2 pts |
| Pack Mule | Gathering | +1 carry capacity | 4 pts |
| Survivor | Survival | +25 max HP | 3 pts |
| Mason | Survival | Campfire +20% HP | 5 pts |

### 3.5 Biome System (Post-MVP)

**Procedurally generated forest types**

| Biome | Theme | Monster Mix | Resource Density |
|-------|-------|------------|------------------|
| Oakwood | Classic forest | Balanced | Medium |
| Pine Hollow | Dense evergreen | More Crawlers | High wood |
| Misty Marsh | Foggy wetland | Wisps + Aquatic | Medium |
| Frozen Tundra | Snowy wilderness | More Brutes | Low wood, high gems |
| Ancient Ruins | Old structures | All types | High gems |

---

## 4. Progression

### 4.1 Between Runs

- **Skill Points** — Earned per wave survived, spent in skill tree
- **Gems** — Rare currency for unlockables, found in ruins
- **Unlocks** — New biomes, decorations, camp upgrades

### 4.2 Within Run

- **Resources** — Wood (from trees), Gems (from special nodes)
- **Inventory** — Carry limit (upgradeable)
- **Scrap** — Crafting material for camp upgrades

### 4.3 Unlockable Content

- **Biomes** — Unlocked via milestones
- **Camp Decorations** — Purely cosmetic, persist between runs
- **Character Skins** — Different woodsman appearances
- **Monster Variants** — Alternative visual themes

---

## 5. Audio & Visual

### 5.1 Aesthetic

**Style:** Hand-drawn, soft edges, warm palette

**Color Palette:**
- Primary: Warm oranges (#FF9500), amber (#FFB800)
- Secondary: Deep forest greens (#2D5A27), midnight blues (#1A1A2E)
- Accent: Firefly yellows (#FFE066), ghost whites (#E8E8E8)

### 5.2 Sound Design

**Principle:** No harsh sounds. Everything is soft, natural, or musical.

| Sound Type | Examples |
|------------|----------|
| Ambient | Crackling fire, crickets, wind through trees, owl hoots |
| Combat | Soft thuds, whooshes, gentle impacts |
| UI | Wooden clicks, cloth rustles |
| Music | Acoustic guitar, soft piano, nature flute |

**No:** Screaming, explosions, harsh metallic sounds

### 5.3 Animations

- **Player:** Smooth walk cycle, satisfying chop animation
- **Monsters:** Varied gaits — Wisps bob, Crawlers skitter, Brutes lumber
- **Campfire:** Constant subtle animation — flickering, particle embers
- **Transitions:** Fade between phases, no jarring cuts

---

## 6. Technical Architecture

### 6.1 Technology Stack

- **Engine:** Phaser 3 (HTML5 2D)
- **Language:** JavaScript (ES6+)
- **Renderer:** WebGL / Canvas (Phaser AUTO)
- **Physics:** Phaser Arcade Physics
- **Build Tool:** Vite
- **Target:** Browser (desktop-first, mobile-friendly later)

### 6.2 Component Structure

```
src/
├── scenes/
│   ├── BootScene.js      # Asset loading
│   ├── MenuScene.js       # Main menu
│   ├── GameScene.js       # Core gameplay
│   └── UIScene.js         # HUD overlay
├── entities/
│   ├── Player.js
│   ├── Campfire.js
│   ├── Tree.js
│   ├── Log.js
│   └── monsters/
│       ├── Monster.js      # Base class
│       ├── Wisp.js
│       ├── Crawler.js
│       ├── Brute.js
│       └── Specter.js
├── systems/
│   ├── WaveManager.js     # Wave spawning logic
│   ├── SkillTree.js       # Progression system
│   ├── BiomeGenerator.js  # Procedural generation
│   └── SaveManager.js     # Persistence
├── ui/
│   ├── HUD.js
│   ├── SkillTreeUI.js
│   └── CampUpgradeUI.js
└── assets/
    └── (procedural graphics — no external assets)
```

### 6.3 Key Systems

**WaveManager:**
- Tracks current wave, spawns monsters at intervals
- Defines wave composition (type, count, spawn positions)
- Manages rest periods between waves

**SkillTree:**
- Stores skill points, purchased skills
- Persists to localStorage between sessions
- Applies stat modifiers to Player/Campfire entities

**BiomeGenerator:**
- Procedurally places trees, resources, spawn points
- Seeded random for reproducible runs
- Different configs per biome type

---

## 7. MVP Scope

### MVP Goals

**Deliver:**
- Player movement + attack
- Campfire with HP
- 4 monster types (Wisp, Crawler, Brute, Specter)
- Wave system (3 waves, increasing difficulty)
- Basic skill tree (3 skills per branch)
- Game Over screen with restart
- Procedural tree placement

**Deferred (Post-MVP):**
- Day/Night cycle
- Biome system
- Permanent camp upgrades
- Unlockable content
- Sound design
- Mobile controls

### MVP Success Criteria

1. ✅ Player can move and attack monsters
2. ✅ Campfire takes damage and can be destroyed
3. ✅ At least 4 distinct monster types with different behaviors
4. ✅ Wave system with 3+ waves scales properly
5. ✅ Skill tree persists between runs
6. ✅ Game Over → Restart → New run works
7. ✅ No external assets (procedural graphics)

---

## 8. Open Questions

1. **Combat style:** Pure melee (MVP) or add ranged later?
2. **Resource gathering:** Manual chop (MVP) or instant (future)?
3. **Wave difficulty:** Manual scaling (MVP) or adaptive (future)?
4. **Multiplayer:** Not in scope, but consider architecture for future?

---

## 9. Next Steps

1. **Approve this document** → Proceed to Writing Plans
2. **Write Plans** → Break down MVP into 2-5 minute tasks
3. **Implement** → Subagent-driven development with TDD

---

*This document is the result of Superpowers brainstorming session on 2026-03-26.*
