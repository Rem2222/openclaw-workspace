import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Campfire from '../entities/Campfire.js';
import Tree from '../entities/Tree.js';
import Log from '../entities/Log.js';
import WaveManager from '../systems/WaveManager.js';
import SkillTree from '../systems/SkillTree.js';
import gameState from '../systems/GameState.js';
import { CAMPFIRE_X, CAMPFIRE_Y, PHASE_COLORS, DARKNESS_ALPHA } from '../config/constants.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    gameState.reset();
    this.gameOver = false;
    
    // Day/Night background
    this.bgRect = this.add.rectangle(640, 360, 1280, 720, PHASE_COLORS.DAY);
    this.bgRect.setDepth(-10);
    
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
    
    // Skill tree
    this.skillTree = new SkillTree(this);
    
    // Listen for monster deaths
    this.events.on('monsterKilled', (monsterMaxHP, mx, my) => {
      // Give EXP for kill
      const expGained = gameState.onMonsterKill(monsterMaxHP);
      if (expGained > 0) {
        this.showExpPopup(expGained, mx, my);
      }
      this.waveManager.onMonsterKilled();
    });
    
    // Listen for night complete
    this.events.on('nightComplete', () => {
      this.startDawn();
    });
    
    // Listen for EXP earned (wave complete)
    this.events.on('expEarned', (amount) => {
      this.showExpPopup(amount);
    });
    
    // Listen for crit hit
    this.events.on('critHit', (amount, x, y) => {
      this.showCritText(amount, x, y);
    });
    
    // Create darkness overlay
    this.createDarkness();
    
    // Phase warning text
    this.phaseText = this.add.text(640, 300, '', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#FFA500',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
    
    // Controls hint (bottom left, semi-transparent)
    this.controlsText = this.add.text(350, 695, 'WASD/Arrows | SPACE: Attack/Chop | E: Pick | Q: Drop/Feed | K: Skills | Px3: +10 EXP', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // R to restart
    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver) {
        this.scene.restart();
      }
    });
    
    // Cheat code: P pressed 3 times quickly = +10 SP
    let pPressCount = 0;
    let pPressTimer = null;
    this.input.keyboard.on('keydown-P', () => {
      pPressCount++;
      if (pPressTimer) pPressTimer.remove();
      pPressTimer = this.time.delayedCall(800, () => { pPressCount = 0; });
      if (pPressCount >= 3) {
        gameState.experience += 10;
        pPressCount = 0;
        this.showExpPopup(10);
        console.log('CHEAT: +10 EXP activated!');
      }
    });
    
    // Start day cycle
    gameState.startDay();
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
        
        const distToCampfire = Phaser.Math.Distance.Between(x, y, CAMPFIRE_X, CAMPFIRE_Y);
        valid = distToCampfire > minDist;
        
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
    this.darkness = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      1280,
      720,
      0x000000,
      DARKNESS_ALPHA.DAY
    );
    this.darkness.setDepth(10);
    // campfireLight is now managed by Campfire entity
  }

  startDusk() {
    gameState.startDusk();
    this.bgRect.fillColor = PHASE_COLORS.NIGHT;
    this.tweens.add({
      targets: this.darkness,
      alpha: DARKNESS_ALPHA.DUSK,
      duration: 15000,
      ease: 'Sine.easeIn'
    });
    this.showPhaseText('Night is coming...', '#FFA500', 3000);
  }

  startNight() {
    gameState.startNight();
    this.bgRect.fillColor = PHASE_COLORS.NIGHT;
    this.darkness.alpha = DARKNESS_ALPHA.NIGHT;
    this.waveManager.nightComplete = false;
    this.waveManager.startNight();
  }

  startDawn() {
    gameState.startDawn();
    
    // Kill ALL remaining monsters
    this.monsters.getChildren().forEach(m => {
      if (m.alive) m.die();
    });
    
    this.tweens.add({
      targets: this.darkness,
      alpha: DARKNESS_ALPHA.DAWN,
      duration: 10000,
      ease: 'Sine.easeOut'
    });
    
    const exp = this.waveManager.expEarnedThisNight;
    this.showPhaseText(`Night survived! +${exp} EXP`, '#FFD700', 8000);
    
    // Respawn trees
    this.respawnTrees();
  }

  startNewDay() {
    gameState.dayNumber++;
    gameState.onNewDay(); // Increase difficulty
    gameState.startDay();
    this.bgRect.fillColor = PHASE_COLORS.DAY;
    this.darkness.alpha = DARKNESS_ALPHA.DAY;
    
    // Reset wave state
    gameState.currentWave = 0;
    gameState.waveInProgress = false;
    this.waveManager.currentWave = 0;
  }

  showPhaseText(message, color, duration) {
    this.phaseText.setText(message).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.phaseText,
      alpha: 0,
      delay: duration - 2000,
      duration: 2000
    });
  }

  respawnTrees() {
    const activeTrees = this.trees.getChildren().filter(t => t.active).length;
    const toSpawn = Math.max(0, 15 - activeTrees);
    
    for (let i = 0; i < toSpawn; i++) {
      let x, y, valid;
      let attempts = 0;
      
      do {
        x = Phaser.Math.Between(50, 1230);
        y = Phaser.Math.Between(50, 670);
        const distToCampfire = Phaser.Math.Distance.Between(x, y, CAMPFIRE_X, CAMPFIRE_Y);
        valid = distToCampfire > 200;
        attempts++;
      } while (!valid && attempts < 30);
      
      if (valid) {
        const tree = new Tree(this, x, y);
        this.trees.add(tree);
        tree.setAlpha(0);
        this.tweens.add({ targets: tree, alpha: 1, duration: 2000 });
      }
    }
  }

  update(time, delta) {
    if (this.gameOver) return;
    
    if (gameState.gameOver) {
      this.endGame();
      return;
    }
    
    // Phase management
    this.updatePhase(time);
    
    // Update entities
    this.player.update(time);
    this.campfire.update(time, delta);
    
    this.monsters.getChildren().forEach(monster => {
      if (monster.alive) {
        monster.update(time, delta);
      }
    });
    
    // Update carried log
    if (this.player.carriedLog) {
      this.player.carriedLog.update();
    }
    
    // Update trees (handles chop progress internally)
    this.trees.getChildren().forEach(tree => {
      if (tree.active) {
        tree.update(time);
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.x, tree.y);
        if (dist < 50 && this.player.wasd.attack.isDown) {
          tree.startChopping(time, this.player);
        } else if (dist >= 50) {
          tree.stopChopping();  // Stop if walked away
        }
      }
    });
  }

  updatePhase(time) {
    const phase = gameState.dayPhase;
    
    if (phase === 'day') {
      if (gameState.isPhaseComplete()) {
        this.startDusk();
      }
    } else if (phase === 'dusk') {
      if (gameState.isPhaseComplete()) {
        this.startNight();
      }
    } else if (phase === 'dawn') {
      if (gameState.isPhaseComplete()) {
        this.startNewDay();
      }
    }
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
    text.setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, duration: 500 });
    
    const dayText = this.add.text(640, 430, `Survived ${gameState.totalDaysSurvived} nights`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(100);
    
    const restartText = this.add.text(640, 470, 'Press R to restart', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#AAAAAA'
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(100);
    
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart();
    });
  }
  
  showExpPopup(amount, x = 640, y = 200) {
    const text = this.add.text(x, y, `+${amount} EXP`, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(300);
    
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }
  
  // Show crit text when a critical hit occurs
  showCritText(amount, x, y) {
    const text = this.add.text(x, y - 30, `CRIT! ${amount}`, {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FF4444',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(300);
    
    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }
}
