import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y, CAMPFIRE_MAX_HP } from '../config/constants.js';
import gameState from '../systems/GameState.js';

export default class Campfire extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    super(scene, CAMPFIRE_X, CAMPFIRE_Y, 'campfire');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setDepth(1);
    this.body.setSize(60, 50);
    this.body.setOffset(10, 10);
    this.body.setImmovable(true);
    
    this.maxHP = CAMPFIRE_MAX_HP;
    this.fuel = 100; // Current fuel level (0-100), determines light radius
    
    // Light circle (visual only)
    this.baseLightRadius = 120;
    this.maxLightRadius = 400;
    this.lightCircle = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, this.getLightRadius(), 0xFF9500, 0.25);
    this.lightCircle.setDepth(0);
    
    // ERASE circle for darkness mask
    this.campfireLight = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, this.getLightRadius() + 40, 0x000000, 0);
    this.campfireLight.setBlendMode(Phaser.BlendModes.ERASE);
    this.campfireLight.setDepth(11);
    
    // Animated glow
    this.createGlow();
    
    // Fuel drain timer — campfire slowly dies
    this.fuelDrainRate = 0.3; // fuel per second during day
    this.fuelDrainNightRate = 0.8; // faster at night
  }

  getLightRadius() {
    const ratio = this.fuel / 100;
    return Math.max(60, this.baseLightRadius + (this.maxLightRadius - this.baseLightRadius) * ratio);
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

  // Called when player drops a log into campfire
  addFuel(amount) {
    this.fuel = Math.min(100, this.fuel + amount);
    this.updateVisuals();
    return this.fuel;
  }

  takeDamage(amount) {
    this.fuel = Math.max(0, this.fuel - amount);
    this.updateVisuals();
    
    // Flash red
    this.scene.tweens.add({
      targets: this,
      tint: 0xFF0000,
      duration: 100,
      yoyo: true
    });
    
    return this.fuel;
  }

  updateVisuals() {
    const radius = this.getLightRadius();
    const ratio = this.fuel / 100;
    
    this.lightCircle.setRadius(radius);
    this.lightCircle.setAlpha(ratio * 0.25 + 0.05);
    
    if (this.campfireLight) {
      this.campfireLight.setRadius(radius + 40);
    }
    
    // Glow intensity
    if (this.glow) {
      this.glow.setScale(0.5 + ratio * 0.7);
    }
  }

  update(time, delta) {
    // Drain fuel over time
    const isNight = gameState.dayPhase === 'night';
    const drainRate = isNight ? this.fuelDrainNightRate : this.fuelDrainRate;
    const drain = drainRate * (delta / 1000);
    
    this.fuel = Math.max(0, this.fuel - drain);
    gameState.campfireFuel = this.fuel;
    
    // Update visuals if changed significantly
    this.updateVisuals();
    
    // Game over if fuel hits 0 and it's night
    if (this.fuel <= 0 && isNight) {
      // Don't immediately game over — give a chance, but no more light protection
      // Light is at minimum radius
    }
  }
}
