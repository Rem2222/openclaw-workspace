import Monster from './Monster.js';

export default class Specter extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'specter', {
      hp: 10,
      speed: 220,
      damage: 2,
      target: 'player'
    });
    
    // Ethereal transparency
    this.setAlpha(0.7);
  }
}
