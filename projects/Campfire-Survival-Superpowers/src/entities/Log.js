import Phaser from 'phaser';
import gameState from '../systems/GameState.js';

export default class Log extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'log');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setDepth(2);
    this.body.setSize(30, 20);
    this.body.setOffset(5, 10);
    this.body.setImmovable(false);
    
    this.active = true;
    this.isCarried = false; // True when player is carrying
    
    // Bounce in animation
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  // Called every frame while player is near and pressing E
  carry(player) {
    if (!this.active || this.isCarried) return false;
    this.isCarried = true;
    this.body.enable = false;
    return true;
  }

  // Drop log at current player position (press Q or automatically near campfire)
  drop(x, y) {
    if (!this.isCarried) return;
    this.isCarried = false;
    this.setPosition(x, y);
    this.body.enable = true;
    
    // Check if near campfire
    const { CAMPFIRE_X, CAMPFIRE_Y } = require('../config/constants.js');
    const dist = Phaser.Math.Distance.Between(x, y, CAMPFIRE_X, CAMPFIRE_Y);
    if (dist < 60) {
      this.feedToCampfire();
    }
  }

  feedToCampfire() {
    if (!this.active) return;
    this.active = false;
    
    // Fuel the campfire
    const campfire = this.scene.campfire;
    if (campfire) {
      campfire.addFuel(15);
    }
    
    // Heal player slightly
    gameState.healPlayer(5);
    
    // Visual feedback — fire burst
    const burst = this.scene.add.circle(
      this.scene.campfire.x, 
      this.scene.campfire.y, 
      50, 0xFFAA00, 0.5
    );
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => burst.destroy()
    });
    
    const text = this.scene.add.text(this.scene.campfire.x, this.scene.campfire.y - 50, '+🔥', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#FF9500'
    });
    text.setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy()
    });
    
    this.destroy();
  }

  update() {
    // Follow player when carried
    if (this.isCarried && this.scene.player) {
      this.setPosition(this.scene.player.x, this.scene.player.y + 20);
    }
  }
}
