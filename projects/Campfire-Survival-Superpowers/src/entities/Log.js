import Phaser from 'phaser';
import gameState from '../systems/GameState.js';

export default class Log extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'log');
    scene.add.existing(this);
    
    this.setDepth(6); // Above player
    
    this.active = true;
    this.isCarried = false;
    
    // Bounce in animation
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    // Auto-despawn after 30 seconds if not carried
    this.scene.time.delayedCall(30000, () => {
      if (this.active && !this.isCarried) {
        this.fadeOut();
      }
    });
  }

  // Player presses E near log
  pickup() {
    if (!this.active || this.isCarried) return false;
    this.isCarried = true;
    return true;
  }

  // Player presses Q
  drop(x, y) {
    if (!this.isCarried) return;
    this.isCarried = false;
    this.setPosition(x, y);
  }

  // Feed to campfire — nice burn effect
  feedToCampfire() {
    if (!this.active) return;
    this.active = false;
    this.isCarried = false; // Mark as not carried (in case check happens before destroy)
    
    // Clear player's carriedLog reference so they can pick up another log
    if (this.scene.player) {
      this.scene.player.carriedLog = null;
    }
    
    const cx = this.scene.campfire ? this.scene.campfire.x : this.scene.campfireX || 640;
    const cy = this.scene.campfire ? this.scene.campfire.y : this.scene.campfireY || 360;
    
    // Move log to campfire center
    this.scene.tweens.add({
      targets: this,
      x: cx,
      y: cy - 10,
      scale: 0.3,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.burnEffect(cx, cy);
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
    // Follow player when carried — slightly above player center
    if (this.isCarried && this.scene.player) {
      this.setPosition(this.scene.player.x, this.scene.player.y - 10);
    }
  }
}
