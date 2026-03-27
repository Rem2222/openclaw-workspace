import Monster from './Monster.js';

export default class Specter extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'specter', {
      hp: 10,
      speed: 140,
      damage: 4,
      target: 'player',
      eyes: 4, // 4 creepy ghost eyes!
      legs: 0 // Floating ghost
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
    
    // Update eye positions to follow float
    if (this.eyes && this.scene) {
      const eyeSpacing = 7;
      const startX = this.x - (4 - 1) / 2 * eyeSpacing;
      this.eyes.forEach((eye, i) => {
        eye.x = startX + i * eyeSpacing;
        eye.y = this.y - 5 + floatOffset;
        // Random eye blink
        if (Math.random() < 0.002) {
          eye.setRadius(0.5);
          this.scene.time.delayedCall(100, () => eye.setRadius(3));
        }
      });
    }
  }
}
