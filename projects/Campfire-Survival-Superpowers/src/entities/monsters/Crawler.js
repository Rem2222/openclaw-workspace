import Monster from './Monster.js';

export default class Crawler extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'crawler', {
      hp: 25,
      speed: 80,
      damage: 5,
      target: 'player',
      eyes: 2, // 2 angry eyes
      legs: 6 // Many legs!
    });
  }
}
