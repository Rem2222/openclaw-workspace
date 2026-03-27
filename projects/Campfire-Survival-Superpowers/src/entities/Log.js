import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../config/constants.js';

const WOODPILE_RANGE = 80; // distance from campfire to be in woodpile zone
const PILE_SPACING = 25; // spacing between logs in pile

export default class Log extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'log');
    scene.add.existing(this);
    
    this.setDepth(6); // Above player
    
    this.active = true;
    this.isCarried = false;
    this.isInPile = false;
    
    // Bounce in animation
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    // Auto-despawn after 30 seconds ONLY if not in pile and not carried
    this.despawnTimer = this.scene.time.delayedCall(30000, () => {
      if (this.active && !this.isCarried && !this.isInPile) {
        this.fadeOut();
      }
    });
  }

  // Player presses E near log
  pickup() {
    if (!this.active || this.isCarried) return false;
    this.isCarried = true;
    this.isInPile = false; // no longer in pile if picked up
    
    // Cancel despawn timer
    if (this.despawnTimer) {
      this.despawnTimer.remove();
      this.despawnTimer = null;
    }
    return true;
  }

  // Player presses Q — drop log, check if in woodpile zone
  drop(x, y) {
    if (!this.isCarried) return;
    this.isCarried = false;
    this.setPosition(x, y);
    
    // Check if near campfire — add to woodpile
    const distToCampfire = Phaser.Math.Distance.Between(x, y, CAMPFIRE_X, CAMPFIRE_Y);
    if (distToCampfire < WOODPILE_RANGE) {
      this.addToPile();
    } else {
      // Start despawn timer if outside pile
      this.despawnTimer = this.scene.time.delayedCall(30000, () => {
        if (this.active && !this.isCarried && !this.isInPile) {
          this.fadeOut();
        }
      });
    }
  }

  // Add this log to the woodpile
  addToPile() {
    const added = gameState.addLogToPile(this.x, this.y);
    if (added) {
      this.isInPile = true;
      this.isCarried = false;
      
      // Position in pile formation
      const pileIndex = gameState.getPileCount() - 1;
      const angle = -Math.PI / 2 + (pileIndex * 0.3 - 0.15); // slight arc
      const pileX = CAMPFIRE_X + Math.cos(angle) * 50;
      const pileY = CAMPFIRE_Y + 30 + Math.sin(pileIndex * 0.8) * 10;
      
      this.setPosition(pileX, pileY);
      this.setAngle(Phaser.Math.Between(-15, 15));
      
      // Show "+1 to pile" text
      const text = this.scene.add.text(pileX, pileY - 20, `+1 Woodpile (${gameState.getPileCount()}/${gameState.maxLogsCapacity})`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#8B4513',
        stroke: '#000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(15);
      
      this.scene.tweens.add({
        targets: text,
        y: pileY - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => text.destroy()
      });
      
      // Cancel despawn timer — it's safe in pile
      if (this.despawnTimer) {
        this.despawnTimer.remove();
        this.despawnTimer = null;
      }
    } else {
      // Pile full — drop on ground, start despawn
      this.scene.time.delayedCall(100, () => {
        if (this.despawnTimer) this.despawnTimer.remove();
        this.despawnTimer = this.scene.time.delayedCall(30000, () => {
          if (this.active && !this.isCarried && !this.isInPile) {
            this.fadeOut();
          }
        });
      });
    }
  }

  // Feed LOG from pile to campfire — consumes one log from pile
  feedFromPile() {
    const log = gameState.removeLogFromPile();
    if (log) {
      // Animate log from pile to fire
      const startX = log.x || CAMPFIRE_X;
      const startY = log.y || CAMPFIRE_Y;
      
      const logEntity = this.scene.add.sprite(startX, startY, 'log');
      logEntity.setDepth(8);
      logEntity.setAngle(Phaser.Math.Between(-15, 15));
      
      this.scene.tweens.add({
        targets: logEntity,
        x: CAMPFIRE_X,
        y: CAMPFIRE_Y - 10,
        scale: 0.3,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.burnEffect(CAMPFIRE_X, CAMPFIRE_Y);
          logEntity.destroy();
        }
      });
      
      // Update pile display
      this.updatePileDisplay();
    }
  }

  updatePileDisplay() {
    // Visual update for pile (could add more logs display here)
  }

  // Feed to campfire from player hands (Q while carrying)
  feedToCampfire() {
    if (!this.active) return;
    this.active = false;
    this.isCarried = false;
    
    // Clear player's carriedLog reference
    if (this.scene.player) {
      this.scene.player.carriedLog = null;
    }
    
    // Animate to campfire
    this.scene.tweens.add({
      targets: this,
      x: CAMPFIRE_X,
      y: CAMPFIRE_Y - 10,
      scale: 0.3,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.burnEffect(CAMPFIRE_X, CAMPFIRE_Y);
        this.destroy();
      }
    });
  }

  burnEffect(x, y) {
    // Fire burst particles
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.circle(
        x + Phaser.Math.Between(-15, 15),
        y + Phaser.Math.Between(-20, -5),
        Phaser.Math.Between(4, 10),
        Phaser.Utils.Array.GetRandom([0xFF6600, 0xFF9500, 0xFFCC00, 0xFF4400])
      );
      particle.setDepth(12);
      
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - Phaser.Math.Between(60, 100),
        x: particle.x + Phaser.Math.Between(-40, 40),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Ember sparks
    for (let i = 0; i < 12; i++) {
      const spark = this.scene.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y - 5,
        Phaser.Math.Between(1, 3),
        0xFFDD44
      );
      spark.setDepth(13);
      
      this.scene.tweens.add({
        targets: spark,
        y: spark.y - Phaser.Math.Between(80, 140),
        x: spark.x + Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        delay: i * 30,
        onComplete: () => spark.destroy()
      });
    }
    
    // Fuel the campfire
    const campfire = this.scene.campfire;
    if (campfire) {
      campfire.addFuel(15);
    }
    
    // Small heal
    gameState.healPlayer(5);
    
    // "+🔥" floating text
    const text = this.scene.add.text(x, y - 50, '+🔥 +5HP', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FF9500',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);
    
    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  fadeOut() {
    if (!this.active) return;
    this.active = false;
    
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  update() {
    // Follow player when carried
    if (this.isCarried && this.scene.player) {
      this.setPosition(this.scene.player.x, this.scene.player.y - 10);
    }
  }
}
