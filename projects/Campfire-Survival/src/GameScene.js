import { CONFIG } from './config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.gameState = {
      timeElapsed: 0,
      bestTime: parseInt(localStorage.getItem('campfireBest') || '0'),
      gameOver: false,
      burnLevel: CONFIG.INITIAL_BURN,
      playerCarrying: false
    };
    
    this.trees = [];
    this.logs = [];
    this.monsters = [];
    this.lastMonsterSpawn = 0;
    this.isChopping = false;
    this.chopProgress = 0;
  }

  preload() {
    // Ничего не загружаем - всё процедурное
  }

  create() {
    // 1. Создаём костёр (в центре)
    this.createCampfire();
    
    // 2. Создаём деревья
    this.createTrees();
    
    // 3. Создаём игрока
    this.createPlayer();
    
    // 4. Создаём UI
    this.createUI();
    
    // 5. Создаём систему освещения (тёмный оверлей с дыркой)
    this.createLighting();
    
    // 6. Настраиваем ввод
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  update(time, delta) {
    if (this.gameState.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    // 1. Update время
    this.gameState.timeElapsed += delta / 1000;
    
    // 2. Update костёр (угасание)
    this.gameState.burnLevel -= CONFIG.DECAY_RATE * (delta / 1000);
    if (this.gameState.burnLevel <= 0) {
      this.gameState.burnLevel = 0;
      this.triggerGameOver();
      return;
    }
    
    // 2.1. Перерисовываем костёр при изменении
    this.drawCampfire();
    
    // 3. Update игрока
    this.updatePlayer(delta);
    
    // 4. Update рубку деревьев
    this.updateChopping(delta);
    
    // 5. Update логи
    this.updateLogs();
    
    // 6. Update монстров
    this.updateMonsters(delta);
    
    // 7. Спавн монстров
    this.trySpawnMonster(time);
    
    // 8. Update освещение
    this.updateLighting();
    
    // 9. Update UI
    this.updateUI();
    
    // 10. Check game over (монстр коснулся игрока)
    this.checkMonsterCollision();
  }
  
  // === СОЗДАНИЕ ОБЪЕКТОВ ===
  
  createCampfire() {
    this.campfireX = CONFIG.CANVAS_WIDTH / 2;
    this.campfireY = CONFIG.CANVAS_HEIGHT / 2;
    
    // Процедурный костёр - несколько кругов разных цветов
    this.campfire = this.add.graphics();
    this.drawCampfire();
  }
  
  drawCampfire() {
    const x = this.campfireX;
    const y = this.campfireY;
    const intensity = this.gameState.burnLevel / 100;
    
    this.campfire.clear();
    
    // Основа (брёвна)
    this.campfire.fillStyle(0x4a3520, 1);
    this.campfire.fillRect(x - 20, y + 5, 40, 10);
    
    // Огонь (3 слоя)
    const baseSize = 8 + intensity * 12;
    
    // Внешний (жёлтый)
    this.campfire.fillStyle(0xffcc00, 0.6 + intensity * 0.4);
    this.campfire.fillCircle(x, y, baseSize + 6);
    
    // Средний (оранжевый)
    this.campfire.fillStyle(0xff6600, 0.7 + intensity * 0.3);
    this.campfire.fillCircle(x, y - 2, baseSize + 3);
    
    // Внутренний (белый)
    this.campfire.fillStyle(0xffffee, 0.8);
    this.campfire.fillCircle(x, y - 4, baseSize - 2);
  }
  
  createTrees() {
    this.trees = [];
    
    for (let i = 0; i < CONFIG.TREE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Phaser.Math.Between(CONFIG.TREE_RADIUS_MIN, CONFIG.TREE_RADIUS_MAX);
      const x = this.campfireX + Math.cos(angle) * radius;
      const y = this.campfireY + Math.sin(angle) * radius;
      
      const tree = this.add.graphics();
      this.drawTree(tree, x, y);
      
      this.trees.push({
        x, y,
        graphics: tree,
        alive: true
      });
    }
  }
  
  drawTree(graphics, x, y) {
    graphics.clear();
    
    // Ствол
    graphics.fillStyle(0x5c4033, 1);
    graphics.fillRect(x - 4, y - 5, 8, 20);
    
    // Листва (3 треугольника)
    graphics.fillStyle(0x228b22, 1);
    graphics.fillTriangle(x, y - 35, x - 15, y - 5, x + 15, y - 5);
    graphics.fillTriangle(x, y - 28, x - 12, y - 8, x + 12, y - 8);
    graphics.fillStyle(0x2d5a27, 1);
    graphics.fillTriangle(x, y - 20, x - 8, y - 5, x + 8, y - 5);
  }
  
  createPlayer() {
    this.player = this.add.graphics();
    this.drawPlayer();
  }
  
  drawPlayer() {
    const x = this.campfireX;
    const y = this.campfireY + 50;
    
    this.player.clear();
    
    // Тело (прямоугольник)
    this.player.fillStyle(0x4a7ab8, 1);
    this.player.fillRect(x - 8, y - 12, 16, 20);
    
    // Голова (круг)
    this.player.fillStyle(0xe8c4a0, 1);
    this.player.fillCircle(x, y - 18, 8);
    
    // Если несёт бревно - показать
    if (this.gameState.playerCarrying) {
      this.player.fillStyle(0x654321, 1);
      this.player.fillRect(x + 8, y - 5, 18, 6);
    }
    
    // Сохраняем позицию для collision
    this.playerX = x;
    this.playerY = y;
  }
  
  createUI() {
    // Burn meter (полоска слева)
    this.burnBarBg = this.add.graphics();
    this.burnBarBg.fillStyle(0x333333, 1);
    this.burnBarBg.fillRect(20, 20, 20, 150);
    
    this.burnBar = this.add.graphics();
    
    // Таймер (вверху по центру)
    this.timerText = this.add.text(CONFIG.CANVAS_WIDTH / 2, 20, '00:00', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5, 0);
    
    // Статус переноски (внизу)
    this.carryingText = this.add.text(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 30, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaaaa'
    }).setOrigin(0.5, 0.5);
    
    // Best time
    this.bestText = this.add.text(CONFIG.CANVAS_WIDTH - 20, 20, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888'
    }).setOrigin(1, 0);
    
    if (this.gameState.bestTime > 0) {
      this.bestText.setText(`Best: ${this.formatTime(this.gameState.bestTime)}`);
    }
  }
  
  createLighting() {
    // Darkness слой
    this.darkness = this.add.graphics();
    this.darkness.setDepth(100);
    
    // Свечение костра
    this.lightGlow = this.add.graphics();
    this.lightGlow.setDepth(99);
  }
  
  // === UPDATE методы ===
  
  updatePlayer(delta) {
    const speed = CONFIG.PLAYER_SPEED;
    let vx = 0, vy = 0;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;
    
    // Нормализация диагонали
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }
    
    // Применяем движение
    this.playerX += vx * (delta / 1000);
    this.playerY += vy * (delta / 1000);
    
    // Границы
    this.playerX = Phaser.Math.Clamp(this.playerX, 20, CONFIG.CANVAS_WIDTH - 20);
    this.playerY = Phaser.Math.Clamp(this.playerY, 60, CONFIG.CANVAS_HEIGHT - 20);
    
    // Перерисовываем
    this.drawPlayer();
  }
  
  updateChopping(delta) {
    if (this.gameState.playerCarrying) {
      this.isChopping = false;
      this.chopProgress = 0;
      return;
    }
    
    // Ищем ближайшее живое дерево
    let nearestTree = null;
    let nearestDist = Infinity;
    
    for (const tree of this.trees) {
      if (!tree.alive) continue;
      const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, tree.x, tree.y);
      if (dist < CONFIG.CHOP_DISTANCE && dist < nearestDist) {
        nearestDist = dist;
        nearestTree = tree;
      }
    }
    
    if (nearestTree) {
      this.isChopping = true;
      this.chopProgress += delta;
      
      if (this.chopProgress >= CONFIG.CHOP_DURATION) {
        // Срубили дерево!
        nearestTree.alive = false;
        nearestTree.graphics.clear();
        
        // Спавним лог
        this.spawnLog(nearestTree.x, nearestTree.y);
        
        this.isChopping = false;
        this.chopProgress = 0;
      }
    } else {
      this.isChopping = false;
      this.chopProgress = 0;
    }
  }
  
  spawnLog(x, y) {
    const log = this.add.graphics();
    log.fillStyle(0x654321, 1);
    log.fillRect(x - 10, y - 5, 20, 10);
    log.fillStyle(0x8b6914, 1);
    log.fillCircle(x - 7, y, 3);
    log.fillCircle(x + 7, y, 3);
    
    this.logs.push({
      x, y,
      graphics: log,
      collected: false
    });
  }
  
  updateLogs() {
    for (const log of this.logs) {
      if (log.collected) continue;
      
      // Подбор
      if (!this.gameState.playerCarrying) {
        const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, log.x, log.y);
        if (dist < CONFIG.PICKUP_DISTANCE) {
          log.collected = true;
          log.graphics.destroy();
          this.gameState.playerCarrying = true;
          this.drawPlayer();
        }
      }
      
      // Дроп у костра
      if (this.gameState.playerCarrying) {
        const distToFire = Phaser.Math.Distance.Between(this.playerX, this.playerY, this.campfireX, this.campfireY);
        if (distToFire < 40) {
          this.gameState.playerCarrying = false;
          this.gameState.burnLevel = Math.min(100, this.gameState.burnLevel + CONFIG.LOG_VALUE);
          this.drawPlayer();
          this.drawCampfire();
        }
      }
    }
  }
  
  updateMonsters(delta) {
    const burnLevel = this.gameState.burnLevel;
    
    for (const monster of this.monsters) {
      // Цель — игрок
      const dx = this.playerX - monster.x;
      const dy = this.playerY - monster.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        let speed = CONFIG.MONSTER_SPEED;
        
        // Если огонь сильный - монстр боится
        if (burnLevel > 50) {
          speed = -CONFIG.MONSTER_SPEED * 0.5; // Отступление
        }
        
        monster.x += (dx / dist) * speed * (delta / 1000);
        monster.y += (dy / dist) * speed * (delta / 1000);
      }
      
      // Перерисовка
      this.drawMonster(monster);
    }
  }
  
  trySpawnMonster(time) {
    if (time - this.lastMonsterSpawn < CONFIG.SPAWN_INTERVAL) return;
    if (this.monsters.length >= CONFIG.MAX_MONSTERS) return;
    
    // Радиус света
    const lightRadius = this.getLightRadius();
    
    // Спавним за пределами света
    let x, y, dist;
    let attempts = 0;
    
    do {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = lightRadius + CONFIG.SPAWN_MARGIN + Math.random() * 50;
      x = this.campfireX + Math.cos(angle) * spawnDist;
      y = this.campfireY + Math.sin(angle) * spawnDist;
      dist = Phaser.Math.Distance.Between(x, y, this.campfireX, this.campfireY);
      attempts++;
    } while (dist < lightRadius + CONFIG.SPAWN_MARGIN && attempts < 10);
    
    // Проверяем что не спавним на игроке
    const distToPlayer = Phaser.Math.Distance.Between(x, y, this.playerX, this.playerY);
    if (distToPlayer < 50) return;
    
    const monster = { x, y, graphics: this.add.graphics() };
    this.monsters.push(monster);
    this.lastMonsterSpawn = time;
  }
  
  drawMonster(monster) {
    monster.graphics.clear();
    
    // Треугольник (глаза спереди)
    monster.graphics.fillStyle(0x8b0000, 1);
    monster.graphics.fillTriangle(
      monster.x, monster.y - 12,
      monster.x - 10, monster.y + 8,
      monster.x + 10, monster.y + 8
    );
    
    // Глаза
    monster.graphics.fillStyle(0xffff00, 1);
    monster.graphics.fillCircle(monster.x - 3, monster.y - 2, 2);
    monster.graphics.fillCircle(monster.x + 3, monster.y - 2, 2);
  }
  
  getLightRadius() {
    const burnLevel = this.gameState.burnLevel;
    return CONFIG.MIN_LIGHT_RADIUS + (CONFIG.MAX_LIGHT_RADIUS - CONFIG.MIN_LIGHT_RADIUS) * (burnLevel / 100);
  }
  
  updateLighting() {
    const lightRadius = this.getLightRadius();
    
    // Рисуем тьму 4мя прямоугольниками вокруг круга (без маски)
    this.darkness.clear();
    this.darkness.fillStyle(0x000033, 0.92);
    
    const cx = this.campfireX;
    const cy = this.campfireY;
    const r = lightRadius;
    
    // Верх (от 0 до верха круга)
    if (cy - r > 0) {
      this.darkness.fillRect(0, 0, CONFIG.CANVAS_WIDTH, cy - r);
    }
    // Низ (от низа круга до низа экрана)
    if (cy + r < CONFIG.CANVAS_HEIGHT) {
      this.darkness.fillRect(0, cy + r, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - (cy + r));
    }
    // Лево (от верха круга до низа, но только слева от него)
    if (cx - r > 0) {
      this.darkness.fillRect(0, Math.max(0, cy - r), cx - r, Math.min(CONFIG.CANVAS_HEIGHT, cy + r) - Math.max(0, cy - r));
    }
    // Право (от верха круга до низа, но только справа от него)
    if (cx + r < CONFIG.CANVAS_WIDTH) {
      this.darkness.fillRect(cx + r, Math.max(0, cy - r), CONFIG.CANVAS_WIDTH - (cx + r), Math.min(CONFIG.CANVAS_HEIGHT, cy + r) - Math.max(0, cy - r));
    }
    
    // Свечение костра (рисуем поверх тьмы вокруг, но под костром)
    this.lightGlow.clear();
    // Внешнее свечение (большой полупрозрачный круг)
    this.lightGlow.fillStyle(0xffaa33, 0.4);
    this.lightGlow.fillCircle(cx, cy, lightRadius * 0.8);
    // Среднее свечение
    this.lightGlow.fillStyle(0xff8800, 0.5);
    this.lightGlow.fillCircle(cx, cy, lightRadius * 0.5);
    // Яркий центр
    this.lightGlow.fillStyle(0xffdd44, 0.6);
    this.lightGlow.fillCircle(cx, cy, lightRadius * 0.2);
  }
  
  updateUI() {
    // Burn bar
    this.burnBar.clear();
    const burnHeight = (this.gameState.burnLevel / 100) * 150;
    
    let burnColor = 0x44ff44;
    if (this.gameState.burnLevel < 30) burnColor = 0xff4444;
    else if (this.gameState.burnLevel < 60) burnColor = 0xffaa00;
    
    this.burnBar.fillStyle(burnColor, 1);
    this.burnBar.fillRect(20, 20 + (150 - burnHeight), 20, burnHeight);
    
    // Timer
    this.timerText.setText(this.formatTime(this.gameState.timeElapsed));
    
    // Carrying
    if (this.gameState.playerCarrying) {
      this.carryingText.setText('🪵 Несу бревно к костру!');
    } else {
      this.carryingText.setText('');
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  checkMonsterCollision() {
    for (const monster of this.monsters) {
      const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, monster.x, monster.y);
      if (dist < CONFIG.PLAYER_SIZE + CONFIG.MONSTER_SIZE * 0.5) {
        this.triggerGameOver();
        return;
      }
    }
  }
  
  triggerGameOver() {
    this.gameState.gameOver = true;
    
    // Сохраняем best time
    if (this.gameState.timeElapsed > this.gameState.bestTime) {
      this.gameState.bestTime = Math.floor(this.gameState.timeElapsed);
      localStorage.setItem('campfireBest', this.gameState.bestTime.toString());
    }
    
    // Overlay
    const overlay = this.add.graphics();
    overlay.setDepth(200);
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Текст
    const title = this.add.text(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 60, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff4444',
      bold: true
    }).setOrigin(0.5).setDepth(201);
    
    const survived = this.add.text(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 
      `Продержался: ${this.formatTime(this.gameState.timeElapsed)}`, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(201);
    
    const best = this.add.text(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 40,
      `Рекорд: ${this.formatTime(this.gameState.bestTime)}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(201);
    
    const restart = this.add.text(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 90,
      'Нажми R для рестарта', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#888888'
    }).setOrigin(0.5).setDepth(201);
  }
}
