import Monster from './Monster.js';

export default class Wisp extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'wisp', {
      hp: 15,
      speed: 200,
      damage: 3,
      target: 'player'
    });
    
    // Floating bob animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
