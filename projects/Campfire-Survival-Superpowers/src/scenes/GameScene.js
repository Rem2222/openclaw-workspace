import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Campfire from '../entities/Campfire.js';
import Tree from '../entities/Tree.js';
import Log from '../entities/Log.js';
import WaveManager from '../systems/WaveManager.js';
import SkillTree from '../systems/SkillTree.js';
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
    
    // Skill tree
    this.skillTree = new SkillTree(this);
    
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
    
    // Create darkness overlay
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
    const lightGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    lightGraphics.fillStyle(0xffffff);
    lightGraphics.fillCircle(CAMPFIRE_X, CAMPFIRE_Y, 150);
    lightGraphics.generateTexture('lightMask', 1280, 720);
    
    const texture = this.textures.get('lightMask');
    const maskImage = texture.getSourceImage();
    this.darkness.setMask(new Phaser.Display.Masks.BitmapMask(this, maskImage));
  }

  update(time, delta) {
    if (this.gameOver) return;
    
    // Check game over conditions
    if (gameState.gameOver) {
      this.endGame();
      return;
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
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
}
