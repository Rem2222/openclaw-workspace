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
    
    // Base light settings
    this.baseLightRadius = 120;
    this.maxLightRadius = 400;
    
    // GRADIENT LIGHT SYSTEM:
    // Inner 80%: BRIGHT - monsters CAN'T pass (ERASE blend)
    // Outer 20%: DIM - monsters CAN pass but are visible
    
    // Inner bright light (ERASE - removes darkness)
    const innerRadius = this.getInnerRadius();
    this.innerLight = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, innerRadius, 0x000000, 0);
    this.innerLight.setBlendMode(Phaser.BlendModes.ERASE);
    this.innerLight.setDepth(10); // ERASE depth
    
    // Outer dim light (visibility zone - semi-transparent)
    const outerRadius = this.getLightRadius();
    this.outerLight = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, outerRadius, 0xFFAA44, 0.08);
    this.outerLight.setDepth(9); // Below ERASE
    this.outerLight.setBlendMode(Phaser.BlendModes.ADD);
    
    // Ambient glow (visual, around campfire)
    this.lightCircle = scene.add.circle(CAMPFIRE_X, CAMPFIRE_Y, this.getLightRadius() * 0.3, 0xFF9500, 0.15);
    this.lightCircle.setDepth(2);
    
    // Animated glow
    this.createGlow();
    
    // Fuel drain settings
    this.fuelDrainRate = 0.3; // per second during day
    this.fuelDrainNightRate = 0.8; // faster at night
  }

  getLightRadius() {
    // Total light radius (inner + outer)
    const fuelRatio = this.fuel / 100;
    return Math.max(60, this.baseLightRadius + (this.maxLightRadius - this.baseLightRadius) * fuelRatio);
  }

  getInnerRadius() {
    // Inner bright zone = 80% of total radius
    return this.getLightRadius() * 0.8;
  }

  getOuterRadius() {
    // Outer dim zone = 20% of total radius
    return this.getLightRadius();
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
    const totalRadius = this.getLightRadius();
    const innerRadius = this.getInnerRadius();
    
    // Update inner (barrier) light
    if (this.innerLight) {
      this.innerLight.setRadius(innerRadius + 30); // +30 for the barrier offset
    }
    
    // Update outer (visibility) light
    if (this.outerLight) {
      this.outerLight.setRadius(totalRadius);
      const fuelRatio = this.fuel / 100;
      this.outerLight.setAlpha(fuelRatio * 0.1 + 0.02);
    }
    
    // Update ambient glow
    if (this.lightCircle) {
      this.lightCircle.setRadius(totalRadius * 0.3);
      this.lightCircle.setAlpha((this.fuel / 100) * 0.15 + 0.05);
    }
  }

  update(time, delta) {
    // Fuel consumption (scales with difficulty)
    const difficultyRate = gameState.fuelConsumptionRate || 1.0;
    const isNight = gameState.dayPhase === 'night';
    const drainRate = isNight ? this.fuelDrainNightRate : this.fuelDrainRate;
    const drainAmount = drainRate * difficultyRate * (delta / 1000);
    
    this.fuel = Math.max(0, this.fuel - drainAmount);
    
    // Check if campfire died
    if (this.fuel <= 0 && this.alive !== false) {
      this.extinguish();
    }
    
    this.updateVisuals();
    
    // Animate glow
    if (this.glow) {
      this.glow.setPosition(this.x, this.y - 10);
    }
    
    // Sync light circles with campfire position
    if (this.innerLight) this.innerLight.setPosition(this.x, this.y);
    if (this.outerLight) this.outerLight.setPosition(this.x, this.y);
    if (this.lightCircle) this.lightCircle.setPosition(this.x, this.y);
  }

  extinguish() {
    this.alive = false;
    
    // Fade out visual
    this.scene.tweens.add({
      targets: [this, this.glow, this.lightCircle],
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        if (this.glow) this.glow.destroy();
        if (this.lightCircle) this.lightCircle.destroy();
        if (this.innerLight) this.innerLight.destroy();
        if (this.outerLight) this.outerLight.destroy();
      }
    });
    
    // Extinguish particles
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const smoke = this.scene.add.circle(
          this.x + Phaser.Math.Between(-20, 20),
          this.y - 10,
          Phaser.Math.Between(8, 15),
          0x444444,
          0.4
        );
        smoke.setDepth(5);
        
        this.scene.tweens.add({
          targets: smoke,
          y: smoke.y - 80,
          alpha: 0,
          scale: 2,
          duration: 1500,
          onComplete: () => smoke.destroy()
        });
      });
    }
    
    gameState.gameOver = true;
  }

  destroy() {
    if (this.innerLight) this.innerLight.destroy();
    if (this.outerLight) this.outerLight.destroy();
    if (this.lightCircle) this.lightCircle.destroy();
    if (this.glow) this.glow.destroy();
    super.destroy();
  }
}
