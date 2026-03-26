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
    
    // Light circle (visual only)
    this.lightCircle = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, 150, 0xFF9500, 0.15);
    this.lightCircle.setDepth(0);
    
    // Animated glow
    this.createGlow();
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
    // Glow animation handled by tweens
  }
}
