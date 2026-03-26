# Campfire Tales MVP — Implementation Plan

**Цель:** Рабочий прототип с волнами монстров, игроком, костром и базовым skill tree

**Архитектура:** Phaser 3 с Arcade Physics, Vite bundler, компонентная структура сцена/сущность/система

**Технологии:** Phaser 3.60+, JavaScript ES6+, Vite 5+, Arcade Physics

---

## Файловая структура

```
src/
├── main.js                 # Entry point, game config
├── scenes/
│   ├── BootScene.js        # Asset loading (procedural)
│   ├── GameScene.js        # Core gameplay
│   └── UIScene.js          # HUD overlay (campfire HP, wave info)
├── entities/
│   ├── Player.js           # Woodsman player entity
│   ├── Campfire.js         # Campfire with HP
│   ├── Tree.js             # Choppable tree
│   ├── Log.js              # Resource dropped from tree
│   └── monsters/
│       ├── Monster.js      # Base monster class
│       ├── Wisp.js         # Fast, low HP
│       ├── Crawler.js      # Medium speed/HP
│       ├── Brute.js        # Slow, high HP
│       └── Specter.js      # Very fast, very low HP
├── systems/
│   ├── WaveManager.js      # Wave spawning logic
│   ├── SkillTree.js        # Progression system (localStorage)
│   └── GameState.js        # Shared state between scenes
└── config/
    └── constants.js        # Game constants (speeds, HP values, etc.)
```

---

## Задачи

### Задача 1: Project Setup

**Файлы:**
- Создать: `package.json`
- Создать: `vite.config.js`
- Создать: `index.html`
- Создать: `src/main.js`

- [ ] **Шаг 1: Инициализировать проект**

```bash
npm init -y
npm install phaser@^3.70 vite@^5
npm install --save-dev vite
```

- [ ] **Шаг 2: Создать package.json**

```json
{
  "name": "campfire-tales",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.70.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

- [ ] **Шаг 3: Создать vite.config.js**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true
  }
});
```

- [ ] **Шаг 4: Создать index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campfire Tales</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1a1a2e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    #game-container {
      box-shadow: 0 0 40px rgba(255, 149, 0, 0.3);
      border-radius: 8px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Шаг 5: Создать src/main.js**

```javascript
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

export default game;
```

- [ ] **Шаг 6: Создать src/config/constants.js**

```javascript
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HP = 100;
export const PLAYER_ATTACK_DAMAGE = 10;
export const PLAYER_ATTACK_RANGE = 50;
export const PLAYER_ATTACK_COOLDOWN = 500;

export const CAMPFIRE_MAX_HP = 100;
export const CAMPFIRE_X = GAME_WIDTH / 2;
export const CAMPFIRE_Y = GAME_HEIGHT / 2;
export const CAMPFIRE_LIGHT_RADIUS = 150;

export const TREE_CHOP_TIME = 2000;
export const TREE_COUNT = 15;
export const TREE_SPAWN_MIN_DISTANCE = 200;

export const LOG_HEAL_VALUE = 10;
export const LOG_PICKUP_RANGE = 30;

export const MONSTER_SPAWN_MARGIN = 100;
```

- [ ] **Шаг 7: Commit**

```bash
git add package.json vite.config.js index.html src/
git commit -m "feat: initial project setup with Phaser 3 + Vite"
```

---

### Задача 2: BootScene (Procedural Assets)

**Файлы:**
- Создать: `src/scenes/BootScene.js`

- [ ] **Шаг 1: Создать BootScene.js**

```javascript
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createProceduralTextures();
  }

  create() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  createProceduralTextures() {
    // Player (rectangle + circle head)
    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0x8B4513, 1); // Brown body
    playerGfx.fillRect(12, 20, 24, 32);
    playerGfx.fillStyle(0xFFDBB4, 1); // Skin head
    playerGfx.fillCircle(24, 12, 12);
    playerGfx.generateTexture('player', 48, 52);
    playerGfx.destroy();

    // Campfire base
    const campfireGfx = this.make.graphics({ x: 0, y: 0, add: false });
    campfireGfx.fillStyle(0x8B4513, 1);
    campfireGfx.fillRect(20, 40, 8, 20);
    campfireGfx.fillRect(52, 40, 8, 20);
    campfireGfx.fillStyle(0x8B0000, 1);
    campfireGfx.fillCircle(40, 45, 15);
    campfireGfx.generateTexture('campfire', 80, 60);
    campfireGfx.destroy();

    // Tree (brown trunk + green circle top)
    const treeGfx = this.make.graphics({ x: 0, y: 0, add: false });
    treeGfx.fillStyle(0x654321, 1);
    treeGfx.fillRect(18, 30, 14, 40);
    treeGfx.fillStyle(0x228B22, 1);
    treeGfx.fillCircle(25, 25, 22);
    treeGfx.generateTexture('tree', 50, 70);
    treeGfx.destroy();

    // Log (small brown rectangle)
    const logGfx = this.make.graphics({ x: 0, y: 0, add: false });
    logGfx.fillStyle(0x8B4513, 1);
    logGfx.fillRoundedRect(0, 5, 30, 14, 7);
    logGfx.generateTexture('log', 30, 24);
    logGfx.destroy();

    // Wisp (blue-white glowing orb)
    const wispGfx = this.make.graphics({ x: 0, y: 0, add: false });
    wispGfx.fillStyle(0x87CEEB, 0.8);
    wispGfx.fillCircle(16, 16, 12);
    wispGfx.fillStyle(0xFFFFFF, 0.5);
    wispGfx.fillCircle(16, 16, 6);
    wispGfx.generateTexture('wisp', 32, 32);
    wispGfx.destroy();

    // Crawler (multi-legged)
    const crawlerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    crawlerGfx.fillStyle(0x4A7023, 1);
    crawlerGfx.fillEllipse(20, 20, 30, 20);
    // Legs
    crawlerGfx.lineStyle(2, 0x2D4A0E);
    for (let i = 0; i < 6; i++) {
      crawlerGfx.lineBetween(8 + i * 5, 20, 4 + i * 5, 30);
      crawlerGfx.lineBetween(8 + i * 5, 20, 12 + i * 5, 30);
    }
    crawlerGfx.generateTexture('crawler', 40, 35);
    crawlerGfx.destroy();

    // Brute (large hulking)
    const bruteGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bruteGfx.fillStyle(0x3D3D3D, 1);
    bruteGfx.fillRoundedRect(5, 15, 50, 45, 8);
    bruteGfx.fillStyle(0xFF4444, 1);
    bruteGfx.fillCircle(15, 30, 5);
    bruteGfx.fillCircle(45, 30, 5);
    bruteGfx.generateTexture('brute', 60, 60);
    bruteGfx.destroy();

    // Specter (ghostly translucent)
    const specterGfx = this.make.graphics({ x: 0, y: 0, add: false });
    specterGfx.fillStyle(0xE8E8E8, 0.6);
    specterGfx.fillEllipse(20, 25, 30, 35);
    specterGfx.fillStyle(0xFFFFFF, 0.3);
    specterGfx.fillCircle(12, 20, 5);
    specterGfx.fillCircle(28, 20, 5);
    specterGfx.generateTexture('specter', 40, 45);
    specterGfx.destroy();

    // UI elements
    const hpBarGfx = this.make.graphics({ x: 0, y: 0, add: false });
    hpBarGfx.fillStyle(0x333333, 1);
    hpBarGfx.fillRect(0, 0, 200, 20);
    hpBarGfx.fillStyle(0xFF4444, 1);
    hpBarGfx.fillRect(2, 2, 196, 16);
    hpBarGfx.generateTexture('hp_bar', 200, 20);
    hpBarGfx.destroy();
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/scenes/BootScene.js
git commit -m "feat: add BootScene with procedural textures"
```

---

### Задача 3: GameState (Shared State)

**Файлы:**
- Создать: `src/systems/GameState.js`

- [ ] **Шаг 1: Создать GameState.js**

```javascript
import { PLAYER_MAX_HP, CAMPFIRE_MAX_HP } from '../config/constants.js';

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.playerHP = PLAYER_MAX_HP;
    this.campfireHP = CAMPFIRE_MAX_HP;
    this.currentWave = 0;
    this.waveInProgress = false;
    this.gameOver = false;
    this.score = 0;
    this.skillPoints = 0;
    this.skills = {};
  }

  damagePlayer(amount) {
    this.playerHP = Math.max(0, this.playerHP - amount);
    if (this.playerHP <= 0) {
      this.gameOver = true;
    }
    return this.playerHP;
  }

  damageCampfire(amount) {
    this.campfireHP = Math.max(0, this.campfireHP - amount);
    if (this.campfireHP <= 0) {
      this.gameOver = true;
    }
    return this.campfireHP;
  }

  healPlayer(amount) {
    this.playerHP = Math.min(PLAYER_MAX_HP, this.playerHP + amount);
    return this.playerHP;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveInProgress = true;
  }

  endWave() {
    this.waveInProgress = false;
    this.skillPoints += 1; // 1 point per wave survived
  }

  getSkill(skillId) {
    return this.skills[skillId] || 0;
  }

  addSkill(skillId, points) {
    if (this.skills[skillId]) {
      this.skills[skillId] += points;
    } else {
      this.skills[skillId] = points;
    }
  }
}

// Singleton
export const gameState = new GameState();
export default gameState;
```

- [ ] **Шаг 2: Commit**

```bash
git add src/systems/GameState.js
git commit -m "feat: add GameState singleton for shared state"
```

---

### Задача 4: Player Entity

**Файлы:**
- Создать: `src/entities/Player.js`

- [ ] **Шаг 1: Создать Player.js**

```javascript
import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_ATTACK_RANGE, PLAYER_ATTACK_COOLDOWN } from '../config/constants.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.addEntity(this);
    scene.physics.add.existing(this);
    
    this.setCollideWorldBounds(true);
    this.body.setSize(30, 40);
    this.body.setOffset(9, 12);
    
    this.lastAttackTime = 0;
    this.isAttacking = false;
    
    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  update(time) {
    if (this.scene.gameOver) return;
    
    this.setVelocity(0);
    
    // Movement
    let vx = 0;
    let vy = 0;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    
    if (vx !== 0 || vy !== 0) {
      this.setVelocity(PLAYER_SPEED * vx, PLAYER_SPEED * vy);
    }
    
    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.wasd.attack) && time > this.lastAttackTime + PLAYER_ATTACK_COOLDOWN) {
      this.attack(time);
    }
  }

  attack(time) {
    this.lastAttackTime = time;
    this.isAttacking = true;
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.isAttacking = false;
      }
    });
    
    // Find monsters in range
    const monsters = this.scene.monsters.getChildren().filter(m => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      return dist < PLAYER_ATTACK_RANGE && m.alive;
    });
    
    monsters.forEach(monster => {
      monster.takeDamage(10);
    });
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/entities/Player.js
git commit -m "feat: add Player entity with movement and attack"
```

---

### Задача 5: Campfire Entity

**Файлы:**
- Создать: `src/entities/Campfire.js`

- [ ] **Шаг 1: Создать Campfire.js**

```javascript
import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y, CAMPFIRE_MAX_HP } from '../config/constants.js';

export default class Campfire extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    super(scene, CAMPFIRE_X, CAMPFIRE_Y, 'campfire');
    scene.addEntity(this);
    scene.physics.add.existing(this);
    
    this.setDepth(1);
    this.body.setSize(60, 50);
    this.body.setOffset(10, 10);
    this.body.setImmovable(true);
    
    this.maxHP = CAMPFIRE_MAX_HP;
    this.hp = this.maxHP;
    
    // Animated glow
    this.createGlow();
    
    // Light circle (visual only)
    this.lightCircle = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, 150, 0xFF9500, 0.15);
    this.lightCircle.setDepth(0);
  }

  createGlow() {
    this.glow = this.scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y - 10, 30, 0xFF9500, 0.3);
    this.glow.setDepth(2);
    
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 1, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    
    // Flash red
    this.scene.tweens.add({
      targets: this,
      tint: 0xFF0000,
      duration: 100,
      yoyo: true
    });
    
    // Update light based on HP
    const hpPercent = this.hp / this.maxHP;
    this.lightCircle.setRadius(50 + hpPercent * 100);
    this.lightCircle.setAlpha(hpPercent * 0.3);
    
    return this.hp;
  }

  update() {
    // Flicker animation handled by tweens
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/entities/Campfire.js
git commit -m "feat: add Campfire entity with HP and glow animation"
```

---

### Задача 6: Monster Base Class

**Файлы:**
- Создать: `src/entities/monsters/Monster.js`

- [ ] **Шаг 1: Создать Monster.js**

```javascript
import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../../config/constants.js';

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config) {
    super(scene, x, y, texture);
    scene.addEntity(this);
    scene.physics.add.existing(this);
    
    this.setDepth(3);
    this.body.setImmovable(true);
    
    this.maxHP = config.hp || 20;
    this.hp = this.maxHP;
    this.speed = config.speed || 100;
    this.damage = config.damage || 5;
    this.target = config.target || 'campfire'; // 'campfire' or 'player'
    
    this.alive = true;
    this.attackCooldown = 0;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    
    this.hp -= amount;
    
    // Flash white
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true
    });
    
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    
    // Death particles
    const particles = this.scene.add.circle(this.x, this.y, 5, 0xFF6666, 0.8);
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => particles.destroy()
    });
  }

  update(time, delta) {
    if (!this.alive || !this.scene) return;
    
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    
    // Move toward target
    const targetX = this.target === 'player' ? this.scene.player.x : CAMPFIRE_X;
    const targetY = this.target === 'player' ? this.scene.player.y : CAMPFIRE_Y;
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
    
    // Check collision with player
    if (this.target === 'player' && this.body) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
      if (dist < 40 && this.attackCooldown === 0) {
        this.attackPlayer();
      }
    }
    
    // Check collision with campfire
    const distToCampfire = Phaser.Math.Distance.Between(this.x, this.y, CAMPFIRE_X, CAMPFIRE_Y);
    if (distToCampfire < 50 && this.attackCooldown === 0) {
      this.attackCampfire();
    }
  }

  attackPlayer() {
    this.attackCooldown = 1000;
    this.scene.gameState.damagePlayer(this.damage);
  }

  attackCampfire() {
    this.attackCooldown = 1500;
    this.scene.gameState.damageCampfire(this.damage);
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/entities/monsters/Monster.js
git commit -m "feat: add Monster base class with targeting AI"
```

---

### Задача 7: Monster Types (Wisp, Crawler, Brute, Specter)

**Файлы:**
- Создать: `src/entities/monsters/Wisp.js`
- Создать: `src/entities/monsters/Crawler.js`
- Создать: `src/entities/monsters/Brute.js`
- Создать: `src/entities/monsters/Specter.js`

- [ ] **Шаг 1: Создать Wisp.js**

```javascript
import Monster from './Monster.js';

export default class Wisp extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'wisp', {
      hp: 15,
      speed: 150,
      damage: 3,
      target: 'player'
    });
    
    // Floating bob animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
```

- [ ] **Шаг 2: Создать Crawler.js**

```javascript
import Monster from './Monster.js';

export default class Crawler extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'crawler', {
      hp: 30,
      speed: 80,
      damage: 5,
      target: 'campfire'
    });
  }
}
```

- [ ] **Шаг 3: Создать Brute.js**

```javascript
import Monster from './Monster.js';

export default class Brute extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'brute', {
      hp: 60,
      speed: 40,
      damage: 15,
      target: 'campfire'
    });
    
    this.setScale(1.2);
  }
}
```

- [ ] **Шаг 4: Создать Specter.js**

```javascript
import Monster from './Monster.js';

export default class Specter extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'specter', {
      hp: 10,
      speed: 180,
      damage: 2,
      target: 'player'
    });
    
    // Ethereal transparency
    this.setAlpha(0.7);
  }
}
```

- [ ] **Шаг 5: Commit**

```bash
git add src/entities/monsters/Wisp.js src/entities/monsters/Crawler.js src/entities/monsters/Brute.js src/entities/monsters/Specter.js
git commit -m "feat: add 4 monster types (Wisp, Crawler, Brute, Specter)"
```

---

### Задача 8: WaveManager

**Файлы:**
- Создать: `src/systems/WaveManager.js`

- [ ] **Шаг 1: Создать WaveManager.js**

```javascript
import Wisp from '../entities/monsters/Wisp.js';
import Crawler from '../entities/monsters/Crawler.js';
import Brute from '../entities/monsters/Brute.js';
import Specter from '../entities/monsters/Specter.js';
import { GAME_WIDTH, GAME_HEIGHT, MONSTER_SPAWN_MARGIN } from '../config/constants.js';

const MONSTER_TYPES = {
  wisp: Wisp,
  crawler: Crawler,
  brute: Brute,
  specter: Specter
};

export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWave = 0;
    this.maxWaves = 3;
    this.waveInProgress = false;
    this.restDuration = 10000; // 10 seconds between waves
    this.monstersAlive = 0;
  }

  startNextWave() {
    this.currentWave++;
    
    if (this.currentWave > this.maxWaves) {
      this.onAllWavesComplete();
      return;
    }
    
    this.waveInProgress = true;
    this.scene.gameState.startWave(this.currentWave);
    
    const waveConfig = this.getWaveConfig(this.currentWave);
    this.spawnWave(waveConfig);
    
    this.showWaveText();
  }

  getWaveConfig(wave) {
    const configs = {
      1: [
        { type: 'crawler', count: 3 }
      ],
      2: [
        { type: 'crawler', count: 4 },
        { type: 'wisp', count: 2 }
      ],
      3: [
        { type: 'crawler', count: 4 },
        { type: 'wisp', count: 3 },
        { type: 'brute', count: 1 },
        { type: 'specter', count: 2 }
      ]
    };
    
    return configs[wave] || configs[3];
  }

  spawnWave(config) {
    let totalMonsters = 0;
    
    config.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        const pos = this.getSpawnPosition();
        const monsterClass = MONSTER_TYPES[type];
        const monster = new monsterClass(this.scene, pos.x, pos.y);
        this.scene.monsters.add(monster);
        totalMonsters++;
      }
    });
    
    this.monstersAlive = totalMonsters;
  }

  getSpawnPosition() {
    const margin = MONSTER_SPAWN_MARGIN;
    const side = Phaser.Math.Between(0, 3);
    
    switch (side) {
      case 0: // Top
        return { x: Phaser.Math.Between(margin, GAME_WIDTH - margin), y: margin };
      case 1: // Right
        return { x: GAME_WIDTH - margin, y: Phaser.Math.Between(margin, GAME_HEIGHT - margin) };
      case 2: // Bottom
        return { x: Phaser.Math.Between(margin, GAME_WIDTH - margin), y: GAME_HEIGHT - margin };
      case 3: // Left
        return { x: margin, y: Phaser.Math.Between(margin, GAME_HEIGHT - margin) };
    }
  }

  onMonsterKilled() {
    this.monstersAlive--;
    
    if (this.monstersAlive <= 0 && this.waveInProgress) {
      this.waveInProgress = false;
      this.scene.gameState.endWave();
      
      if (this.currentWave >= this.maxWaves) {
        this.onAllWavesComplete();
      } else {
        this.scene.time.delayedCall(this.restDuration, () => {
          if (!this.scene.gameOver) {
            this.startNextWave();
          }
        });
      }
    }
  }

  onAllWavesComplete() {
    // Victory!
    this.scene.showVictory();
  }

  showWaveText() {
    const text = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `WAVE ${this.currentWave}`, {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#FF9500',
      stroke: '#000',
      strokeThickness: 6
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/systems/WaveManager.js
git commit -m "feat: add WaveManager with 3 waves (increasing difficulty)"
```

---

### Задача 9: GameScene

**Файлы:**
- Создать: `src/scenes/GameScene.js`

- [ ] **Шаг 1: Создать GameScene.js**

```javascript
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Campfire from '../entities/Campfire.js';
import Tree from '../entities/Tree.js';
import Log from '../entities/Log.js';
import WaveManager from '../systems/WaveManager.js';
import gameState from '../systems/GameState.js';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../config/constants.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Reset state
    gameState.reset();
    this.gameOver = false;
    
    // Groups
    this.monsters = this.add.group();
    this.trees = this.add.group();
    this.logs = this.add.group();
    
    // Create entities
    this.campfire = new Campfire(this);
    this.player = new Player(this, CAMPFIRE_X, CAMPFIRE_Y + 80);
    
    // Generate trees
    this.generateTrees();
    
    // Wave manager
    this.waveManager = new WaveManager(this);
    
    // Start first wave after delay
    this.time.delayedCall(2000, () => {
      if (!this.gameOver) {
        this.waveManager.startNextWave();
      }
    });
    
    // Listen for monster deaths
    this.events.on('monsterKilled', () => {
      this.waveManager.onMonsterKilled();
    });
    
    // Dark overlay for atmosphere
    this.createDarkness();
  }

  generateTrees() {
    const count = 15;
    const minDist = 200;
    
    for (let i = 0; i < count; i++) {
      let x, y, valid;
      let attempts = 0;
      
      do {
        x = Phaser.Math.Between(50, 1230);
        y = Phaser.Math.Between(50, 670);
        
        // Check distance from campfire
        const distToCampfire = Phaser.Math.Distance.Between(x, y, CAMPFIRE_X, CAMPFIRE_Y);
        valid = distToCampfire > minDist;
        
        // Check distance from other trees
        if (valid) {
          this.trees.getChildren().forEach(tree => {
            if (Phaser.Math.Distance.Between(x, y, tree.x, tree.y) < 80) {
              valid = false;
            }
          });
        }
        
        attempts++;
      } while (!valid && attempts < 50);
      
      if (valid) {
        const tree = new Tree(this, x, y);
        this.trees.add(tree);
      }
    }
  }

  createDarkness() {
    // Full screen dark overlay
    this.darkness = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      1280,
      720,
      0x000000,
      0.6
    );
    this.darkness.setDepth(10);
    
    // Cut out campfire light area
    this.darkness.setMask(new Phaser.Display.Masks.GeometryMask(this, this.createLightMask()));
  }

  createLightMask() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(CAMPFIRE_X, CAMPFIRE_Y, 150);
    graphics.generateTexture('lightMask', 1280, 720);
    
    const texture = this.textures.get('lightMask');
    const maskImage = texture.getSourceImage();
    
    return new Phaser.Display.Masks.BitmapMask(this, maskImage);
  }

  update(time, delta) {
    if (this.gameOver) return;
    
    // Check game over conditions
    if (gameState.gameOver) {
      this.endGame();
    }
    
    // Update entities
    this.player.update(time);
    this.campfire.update();
    
    this.monsters.getChildren().forEach(monster => {
      if (monster.alive) {
        monster.update(time, delta);
      }
    });
    
    // Check player-log collisions
    this.physics.overlap(this.player, this.logs, (player, log) => {
      if (log.active) {
        log.pickup();
      }
    });
    
    // Check player-tree collisions (auto chop)
    this.trees.getChildren().forEach(tree => {
      if (tree.active) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.x, tree.y);
        if (dist < 50) {
          tree.startChopping(time, this.player);
        }
      }
    });
  }

  endGame() {
    this.gameOver = true;
    
    const text = this.add.text(640, 360, 'GAME OVER', {
      fontSize: '72px',
      fontFamily: 'Arial Black',
      color: '#FF4444',
      stroke: '#000',
      strokeThickness: 8
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    // Fade in
    text.setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 500
    });
    
    // Restart hint
    const restartText = this.add.text(640, 440, 'Press R to restart', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(100);
    
    // R to restart
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart();
    });
  }

  showVictory() {
    this.gameOver = true;
    
    const text = this.add.text(640, 360, 'VICTORY!', {
      fontSize: '72px',
      fontFamily: 'Arial Black',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 8
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    const waveText = this.add.text(640, 440, `Survived ${this.waveManager.currentWave} waves!`, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    });
    waveText.setOrigin(0.5);
    waveText.setDepth(100);
    
    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: add GameScene with full gameplay loop"
```

---

### Задача 10: Tree and Log Entities

**Файлы:**
- Создать: `src/entities/Tree.js`
- Создать: `src/entities/Log.js`

- [ ] **Шаг 1: Создать Tree.js**

```javascript
import Phaser from 'phaser';
import { TREE_CHOP_TIME } from '../config/constants.js';

export default class Tree extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'tree');
    scene.physics.add.existing(this);
    
    this.body.setImmovable(true);
    this.active = true;
    this.chopping = false;
    this.chopProgress = 0;
    this.chopper = null;
  }

  startChopping(time, player) {
    if (this.chopping || !this.active) return;
    
    this.chopping = true;
    this.chopProgress = 0;
    this.chopper = player;
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.9,
      scaleY: 1.1,
      duration: TREE_CHOP_TIME / 4,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.chop();
      }
    });
  }

  chop() {
    this.active = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    
    // Spawn log
    const log = new Log(this.scene, this.x, this.y);
    this.scene.logs.add(log);
    
    this.chopping = false;
  }
}
```

- [ ] **Шаг 2: Создать Log.js**

```javascript
import Phaser from 'phaser';
import { LOG_HEAL_VALUE, LOG_PICKUP_RANGE } from '../config/constants.js';

export default class Log extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'log');
    scene.physics.add.existing(this);
    
    this.body.setImmovable(true);
    this.active = true;
    
    // Bob animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Auto-destroy after 30 seconds if not picked up
    this.scene.time.delayedCall(30000, () => {
      this.destroy();
    });
  }

  pickup() {
    if (!this.active) return;
    
    this.active = false;
    
    // Heal player
    this.scene.gameState.healPlayer(LOG_HEAL_VALUE);
    
    // Pickup effect
    const particles = this.scene.add.circle(this.x, this.y, 8, 0x8B4513, 0.8);
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      scale: 3,
      duration: 300,
      onComplete: () => particles.destroy()
    });
    
    this.destroy();
  }
}
```

- [ ] **Шаг 3: Commit**

```bash
git add src/entities/Tree.js src/entities/Log.js
git commit -m "feat: add Tree and Log entities with chop/pickup mechanics"
```

---

### Задача 11: UIScene

**Файлы:**
- Создать: `src/scenes/UIScene.js`

- [ ] **Шаг 1: Создать UIScene.js**

```javascript
import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import { GAME_WIDTH, PLAYER_MAX_HP, CAMPFIRE_MAX_HP } from '../config/constants.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.hpBars = {};
    this.waveText = null;
    
    this.createUI();
  }

  createUI() {
    // Player HP bar (top-left)
    this.hpBars.player = this.createHPBar(20, 20, 'Player HP');
    
    // Campfire HP bar (below player HP)
    this.hpBars.campfire = this.createHPBar(20, 50, 'Campfire HP');
    
    // Wave indicator (top-center)
    this.waveText = this.add.text(GAME_WIDTH / 2, 20, 'Wave: 0', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FF9500',
      stroke: '#000',
      strokeThickness: 4
    });
    this.waveText.setOrigin(0.5, 0);
    
    // Skill points (top-right)
    this.skillPointsText = this.add.text(GAME_WIDTH - 20, 20, 'Skill Points: 0', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 3
    });
    this.skillPointsText.setOrigin(1, 0);
  }

  createHPBar(x, y, label) {
    const container = this.add.container(x, y);
    
    // Label
    const labelText = this.add.text(0, 0, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    });
    
    // Background bar
    const bgBar = this.add.rectangle(0, 22, 200, 16, 0x333333);
    bgBar.setOrigin(0, 0);
    
    // HP bar (red)
    const hpBar = this.add.rectangle(2, 24, 196, 12, 0xFF4444);
    hpBar.setOrigin(0, 0);
    
    container.add([labelText, bgBar, hpBar]);
    
    return { container, hpBar, labelText };
  }

  update() {
    // Update player HP
    const playerHPPercent = gameState.playerHP / PLAYER_MAX_HP;
    this.hpBars.player.hpBar.setSize(196 * playerHPPercent, 12);
    this.hpBars.player.hpBar.setFillStyle(playerHPPercent > 0.3 ? 0x44FF44 : 0xFF4444);
    
    // Update campfire HP
    const campfireHPPercent = gameState.campfireHP / CAMPFIRE_MAX_HP;
    this.hpBars.campfire.hpBar.setSize(196 * campfireHPPercent, 12);
    this.hpBars.campfire.hpBar.setFillStyle(campfireHPPercent > 0.3 ? 0xFF9500 : 0xFF4444);
    
    // Update wave
    this.waveText.setText(`Wave: ${gameState.currentWave}`);
    
    // Update skill points
    this.skillPointsText.setText(`Skill Points: ${gameState.skillPoints}`);
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add src/scenes/UIScene.js
git commit -m "feat: add UIScene with HP bars and wave indicator"
```

---

### Задача 12: SkillTree System

**Файлы:**
- Создать: `src/systems/SkillTree.js`

- [ ] **Шаг 1: Создать SkillTree.js**

```javascript
import gameState from './GameState.js';

const SKILLS = {
  // Combat branch
  sharpAxe: { name: 'Sharp Axe', branch: 'combat', effect: { damage: 1.25 }, cost: 3, maxRank: 3 },
  swiftFeet: { name: 'Swift Feet', branch: 'combat', effect: { speed: 1.15 }, cost: 3, maxRank: 3 },
  
  // Gathering branch
  lumberjack: { name: 'Lumberjack', branch: 'gathering', effect: { chopSpeed: 0.7 }, cost: 2, maxRank: 3 },
  packMule: { name: 'Pack Mule', branch: 'gathering', effect: { carryCapacity: 1 }, cost: 4, maxRank: 2 },
  
  // Survival branch
  survivor: { name: 'Survivor', branch: 'survival', effect: { maxHP: 25 }, cost: 3, maxRank: 2 },
  mason: { name: 'Mason', branch: 'survival', effect: { campHP: 20 }, cost: 5, maxRank: 1 }
};

class SkillTree {
  constructor() {
    this.load();
  }

  load() {
    const saved = localStorage.getItem('campfireTales_skills');
    if (saved) {
      this.purchased = JSON.parse(saved);
    } else {
      this.purchased = {};
    }
  }

  save() {
    localStorage.setItem('campfireTales_skills', JSON.stringify(this.purchased));
  }

  getSkillRank(skillId) {
    return this.purchased[skillId] || 0;
  }

  canPurchase(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return false;
    
    const currentRank = this.getSkillRank(skillId);
    if (currentRank >= skill.maxRank) return false;
    
    return gameState.skillPoints >= skill.cost;
  }

  purchase(skillId) {
    if (!this.canPurchase(skillId)) return false;
    
    const skill = SKILLS[skillId];
    gameState.skillPoints -= skill.cost;
    this.purchased[skillId] = (this.purchased[skillId] || 0) + 1;
    this.save();
    
    this.applySkill(skillId);
    return true;
  }

  applySkill(skillId) {
    // Skills are applied when loading GameState
    // This is for immediate effects
  }

  getTotalBonus(effectKey) {
    let total = 0;
    for (const [skillId, rank] of Object.entries(this.purchased)) {
      const skill = SKILLS[skillId];
      if (skill && skill.effect[effectKey]) {
        total += (skill.effect[effectKey] - 1) * rank;
      }
    }
    return 1 + total;
  }

  getAllSkills() {
    return SKILLS;
  }
}

export const skillTree = new SkillTree();
export default skillTree;
```

- [ ] **Шаг 2: Commit**

```bash
git add src/systems/SkillTree.js
git commit -m "feat: add SkillTree with 3 branches and persistence"
```

---

## Проверка покрытия

| Секция дизайна | Задачи |
|----------------|--------|
| Player movement + attack | 1, 4 |
| Campfire with HP | 1, 5, 9 |
| 4 monster types | 6, 7 |
| Wave system (3 waves) | 8, 9 |
| Basic skill tree | 12 |
| Game Over screen | 9 |
| Procedural trees | 9, 10 |
| UI (HP, wave, skill points) | 11 |

**Все секции покрыты ✓**

---

## Запуск

```bash
npm install
npm run dev
```

Откроется http://localhost:3000 с игрой.

---

*План создан 2026-03-26 через Superpowers writing-plans*
