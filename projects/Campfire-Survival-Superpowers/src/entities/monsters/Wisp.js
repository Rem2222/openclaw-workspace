import Monster from './Monster.js';

export default class Wisp extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'wisp', {
      hp: 15,
      speed: 120,
      damage: 3,
      target: 'player',
      eyes: 2, // 2 glowing eyes
      legs: 0 // Floating, no legs
    });
    
    this.bobPhase = Math.random() * Math.PI * 2;
    this.baseY = y;
  }

  update(time, delta) {
    if (!this.alive) return;
    
    // Visual bob — just offset sprite Y from physics body Y
    this.bobPhase += delta * 0.005;
    const bobOffset = Math.sin(this.bobPhase) * 6;
    
    // Don't interfere with physics body — just offset sprite render
    // The physics body moves freely in X and Y
    // We need to offset the visual
    this.setScale(1, 1 + bobOffset * 0.02);
    
    super.update(time, delta);
    
    // Update eye positions to follow bob
    if (this.eyes && this.scene) {
      this.eyes.forEach((eye, i) => {
        eye.x = this.x + (i - 0.5) * 10;
        eye.y = this.y - 8 + bobOffset * 0.5;
      });
    }
  }
}
