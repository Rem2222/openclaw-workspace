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
    
    this.active = true;
    
    // Bounce in animation
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    // Auto-despawn after 30 seconds
    this.scene.time.delayedCall(30000, () => {
      this.pickup();
    });
  }

  pickup() {
    if (!this.active) return;
    this.active = false;
    
    // Feedback
    const text = this.scene.add.text(this.x, this.y - 20, '+1', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#8B4513'
    });
    text.setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: text,
      y: this.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy()
    });
    
    // Add to game state
    gameState.addLog();
    
    // Pickup animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
      }
    });
  }
}
