import Monster from './Monster.js';

export default class Specter extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'specter', {
      hp: 10,
      speed: 140,
      damage: 4,  // was 20, now 4
      target: 'player'
    });
    
    // Specter has a ghostly float effect
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  update(time, delta) {
    if (!this.alive) return;
    
    // Ghostly float visual
    this.floatPhase += delta * 0.003;
    const floatOffset = Math.sin(this.floatPhase) * 4;
    
    // Slight horizontal wobble
    const wobble = Math.sin(this.floatPhase * 1.3) * 2;
    
    // Apply wobble visually — only modify sprite X, not body
    this.setScale(1 + wobble * 0.03, 1);
    
    super.update(time, delta);
  }
}
