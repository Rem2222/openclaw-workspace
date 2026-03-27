import Monster from './Monster.js';

export default class Brute extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'brute', {
      hp: 60,
      speed: 50,
      damage: 8,  // was 40, now 8
      target: 'player'
    });
  }
}
