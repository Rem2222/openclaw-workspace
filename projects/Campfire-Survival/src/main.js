import Phaser from 'phaser';
import { CONFIG } from './config.js';
import GameScene from './GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: CONFIG.CANVAS_WIDTH,
  height: CONFIG.CANVAS_HEIGHT,
  parent: 'game',
  backgroundColor: '#000005',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);
