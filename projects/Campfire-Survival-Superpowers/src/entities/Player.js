import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_ATTACK_RANGE, PLAYER_ATTACK_COOLDOWN, CAMPFIRE_X, CAMPFIRE_Y } from '../config/constants.js';
import gameState from '../systems/GameState.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setCollideWorldBounds(true);
    this.body.setSize(30, 40);
    this.body.setOffset(9, 12);
    
    this.lastAttackTime = 0;
    this.lastRegenTime = 0;
    this.isAttacking = false;
    this.carriedLog = null; // Reference to carried log
    
    // HP bar above player's head
    this.hpBarBg = scene.add.rectangle(x, y - 35, 50, 6, 0x333333).setOrigin(0.5);
    this.hpBarBg.setName('playerHpBarBg');
    this.hpBar = scene.add.rectangle(x - 25, y - 35, 50, 4, 0x00FF00).setOrigin(0, 0.5);
    this.hpBar.setName('playerHpBar');
    
    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      pickup: Phaser.Input.Keyboard.KeyCodes.E,
      drop: Phaser.Input.Keyboard.KeyCodes.Q
    });
  }

  update(time) {
    if (this.scene.gameOver) return;
    
    // Update carried log position
    if (this.carriedLog && this.carriedLog.active) {
      this.carriedLog.setPosition(this.x, this.y + 20);
    } else {
      this.carriedLog = null;
    }
    
    this.setVelocity(0);
    
    // Movement
    let vx = 0;
    let vy = 0;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    
    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }
    
    if (vx !== 0 || vy !== 0) {
      this.setVelocity(PLAYER_SPEED * vx, PLAYER_SPEED * vy);
    }
    
    // Attack (SPACE) - continuous when held
    if (this.wasd.attack.isDown && time > this.lastAttackTime + PLAYER_ATTACK_COOLDOWN) {
      this.attack(time);
    }
    
    // Always update HP bar position and color based on current HP
    if (this.hpBar && this.hpBarBg) {
      const percent = Math.max(0, this.hp / gameState.maxPlayerHP);
      this.hpBar.width = 50 * percent;
      // Color based on health
      if (percent > 0.5) {
        this.hpBar.fillColor = 0x00FF00;
      } else if (percent > 0.25) {
        this.hpBar.fillColor = 0xFFFF00;
      } else {
        this.hpBar.fillColor = 0xFF0000;
      }
      // Position above player
      this.hpBar.setPosition(this.x - 25, this.y - 35);
      this.hpBarBg.setPosition(this.x, this.y - 35);
    }
    
    // Regeneration (based on regenRate from Survival skill tree)
    if (gameState.regenRate > 0 && time > this.lastRegenTime + 1000) {
      this.lastRegenTime = time;
      if (this.hp < gameState.maxPlayerHP) {
        this.hp = Math.min(gameState.maxPlayerHP, this.hp + gameState.regenRate);
      }
    }
    
    // Pickup log (E) — pick up nearest log (if not already carrying an active log)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.pickup) && (!this.carriedLog || !this.carriedLog.active)) {
      this.tryPickupLog();
    }
    
    // Drop/Feed log (Q)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.drop)) {
      if (this.carriedLog) {
        this.dropLog();
      } else if (gameState.getPileCount() > 0) {
        // Feed from pile if not carrying anything
        this.feedFromPile();
      }
    }
  }

  tryPickupLog() {
    if (!this.scene.logs) return;
    
    const logs = this.scene.logs.getChildren().filter(l => l.active && !l.isCarried);
    let nearest = null;
    let nearestDist = Infinity;
    
    logs.forEach(log => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, log.x, log.y);
      if (dist < 50 && dist < nearestDist) {
        nearestDist = dist;
        nearest = log;
      }
    });
    
    if (nearest) {
      this.carriedLog = nearest;
      nearest.pickup();  // Sets isCarried=true, stops auto-despawn
    }
  }

  dropLog() {
    if (!this.carriedLog) return;
    
    const log = this.carriedLog;
    this.carriedLog = null;
    
    // Check if near campfire
    const dist = Phaser.Math.Distance.Between(this.x, this.y, CAMPFIRE_X, CAMPFIRE_Y);
    if (dist < 70) {
      // Feed to campfire — burn effect plays automatically
      log.feedToCampfire();
    } else {
      // Drop at current position
      log.drop(this.x, this.y + 20);
    }
  }

  // Feed one log from woodpile to campfire
  feedFromPile() {
    if (gameState.getPileCount() <= 0) return;
    if (!this.scene.logs) return;
    
    // Get the last log in pile
    const pileLogs = this.scene.logs.getChildren().filter(l => l.active && l.isInPile);
    if (pileLogs.length > 0) {
      const logToFeed = pileLogs[pileLogs.length - 1]; // Take most recent
      logToFeed.feedFromPile();
    }
  }

  attack(time) {
    this.lastAttackTime = time;
    this.isAttacking = true;
    
    this.showSwordSlash();
    
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
    
    if (!this.scene.monsters) return;
    
    const monsters = this.scene.monsters.getChildren().filter(m => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      return dist < PLAYER_ATTACK_RANGE && m.alive;
    });
    
    monsters.forEach(monster => {
      // Calculate damage with bonus and crit
      let damage = 10 + gameState.damageBonus;
      let isCrit = false;
      if (gameState.critChance > 0 && Math.random() < gameState.critChance) {
        damage = Math.floor(damage * gameState.critMultiplier);
        isCrit = true;
      }
      monster.takeDamage(damage, isCrit);
    });
  }
  
  showSwordSlash() {
    let angle = 0;
    
    if (this.scene.monsters) {
      const monsters = this.scene.monsters.getChildren().filter(m => m.alive);
      if (monsters.length > 0) {
        let nearest = null;
        let nearestDist = Infinity;
        monsters.forEach(m => {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
          if (dist < nearestDist && dist < PLAYER_ATTACK_RANGE * 1.5) {
            nearestDist = dist;
            nearest = m;
          }
        });
        if (nearest) {
          angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
        }
      }
    }
    
    const slash = this.scene.add.graphics();
    slash.setPosition(this.x, this.y);
    slash.setDepth(5);
    
    slash.lineStyle(4, 0xFFFFFF, 1);
    slash.beginPath();
    const arcRadius = 35;
    slash.arc(0, 0, arcRadius, angle - Math.PI / 3, angle + Math.PI / 3);
    slash.strokePath();
    
    slash.lineStyle(8, 0xFFDD44, 0.5);
    slash.beginPath();
    slash.arc(0, 0, arcRadius, angle - Math.PI / 3, angle + Math.PI / 3);
    slash.strokePath();
    
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => slash.destroy()
    });
  }
}
