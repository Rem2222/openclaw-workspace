import Monster from './Monster.js';

export default class Crawler extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, 'crawler', {
      hp: 25,
      speed: 80,
      damage: 5,  // was 25, now 5
      target: 'player'
    });
  }
}
