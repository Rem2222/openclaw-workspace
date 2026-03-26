import Monster from './Monster.js';

export default class Brute extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'brute', {
      hp: 60,
      speed: 100,
      damage: 40,
      target: 'campfire'
    });
    
    this.setScale(1.2);
  }
}
