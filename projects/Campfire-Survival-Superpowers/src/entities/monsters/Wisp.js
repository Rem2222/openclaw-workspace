import Monster from './Monster.js';

export default class Wisp extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'wisp', {
      hp: 15,
      speed: 120,
      damage: 3,
      target: 'player'
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
  }
}
