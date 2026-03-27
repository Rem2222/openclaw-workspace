import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createProceduralTextures();
  }

  create() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  createProceduralTextures() {
    // Player (rectangle + circle head)
    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0x8B4513, 1); // Brown body
    playerGfx.fillRect(12, 20, 24, 32);
    playerGfx.fillStyle(0xFFDBB4, 1); // Skin head
    playerGfx.fillCircle(24, 12, 12);
    playerGfx.generateTexture('player', 48, 52);
    playerGfx.destroy();

    // Campfire base
    const campfireGfx = this.make.graphics({ x: 0, y: 0, add: false });
    campfireGfx.fillStyle(0x8B4513, 1);
    campfireGfx.fillRect(20, 40, 8, 20);
    campfireGfx.fillRect(52, 40, 8, 20);
    campfireGfx.fillStyle(0x8B0000, 1);
    campfireGfx.fillCircle(40, 45, 15);
    campfireGfx.generateTexture('campfire', 80, 60);
    campfireGfx.destroy();

    // Log (small brown rectangle)
    const logGfx = this.make.graphics({ x: 0, y: 0, add: false });
    logGfx.fillStyle(0x8B4513, 1);
    logGfx.fillRoundedRect(0, 5, 30, 14, 7);
    logGfx.generateTexture('log', 30, 24);
    logGfx.destroy();

    // Wisp (blue-white glowing orb)
    const wispGfx = this.make.graphics({ x: 0, y: 0, add: false });
    wispGfx.fillStyle(0x87CEEB, 0.8);
    wispGfx.fillCircle(16, 16, 12);
    wispGfx.fillStyle(0xFFFFFF, 0.5);
    wispGfx.fillCircle(16, 16, 6);
    wispGfx.generateTexture('wisp', 32, 32);
    wispGfx.destroy();

    // Crawler (multi-legged)
    const crawlerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    crawlerGfx.fillStyle(0x4A7023, 1);
    crawlerGfx.fillEllipse(20, 20, 30, 20);
    // Legs
    crawlerGfx.lineStyle(2, 0x2D4A0E);
    for (let i = 0; i < 6; i++) {
      crawlerGfx.lineBetween(8 + i * 5, 20, 4 + i * 5, 30);
      crawlerGfx.lineBetween(8 + i * 5, 20, 12 + i * 5, 30);
    }
    crawlerGfx.generateTexture('crawler', 40, 35);
    crawlerGfx.destroy();

    // Brute (large hulking)
    const bruteGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bruteGfx.fillStyle(0x3D3D3D, 1);
    bruteGfx.fillRoundedRect(5, 15, 50, 45, 8);
    bruteGfx.fillStyle(0xFF4444, 1);
    bruteGfx.fillCircle(15, 30, 5);
    bruteGfx.fillCircle(45, 30, 5);
    bruteGfx.generateTexture('brute', 60, 60);
    bruteGfx.destroy();

    // Specter (ghostly translucent)
    const specterGfx = this.make.graphics({ x: 0, y: 0, add: false });
    specterGfx.fillStyle(0xE8E8E8, 0.6);
    specterGfx.fillEllipse(20, 25, 30, 35);
    specterGfx.fillStyle(0xFFFFFF, 0.3);
    specterGfx.fillCircle(12, 20, 5);
    specterGfx.fillCircle(28, 20, 5);
    specterGfx.generateTexture('specter', 40, 45);
    specterGfx.destroy();

    // UI elements
    const hpBarGfx = this.make.graphics({ x: 0, y: 0, add: false });
    hpBarGfx.fillStyle(0x333333, 1);
    hpBarGfx.fillRect(0, 0, 200, 20);
    hpBarGfx.fillStyle(0xFF4444, 1);
    hpBarGfx.fillRect(2, 2, 196, 16);
    hpBarGfx.generateTexture('hp_bar', 200, 20);
    hpBarGfx.destroy();

    // Pine tree (tall triangle with trunk)
    const pineGfx = this.make.graphics({ x: 0, y: 0, add: false });
    pineGfx.fillStyle(0x654321, 1);
    pineGfx.fillRect(22, 55, 12, 25);
    pineGfx.fillStyle(0x1a4d1a, 1);
    pineGfx.fillTriangle(28, 5, 8, 60, 48, 60);
    pineGfx.fillStyle(0x2d5a2d, 1);
    pineGfx.fillTriangle(28, 15, 12, 55, 44, 55);
    pineGfx.generateTexture('pine', 56, 80);
    pineGfx.destroy();

    // Bush (round green shrub)
    const bushGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bushGfx.fillStyle(0x2d6a2d, 1);
    bushGfx.fillCircle(20, 25, 18);
    bushGfx.fillCircle(35, 22, 15);
    bushGfx.fillCircle(12, 30, 12);
    bushGfx.fillCircle(30, 32, 14);
    bushGfx.fillStyle(0x3d8a3d, 1);
    bushGfx.fillCircle(18, 20, 10);
    bushGfx.fillCircle(32, 18, 8);
    bushGfx.generateTexture('bush', 50, 45);
    bushGfx.destroy();

    // Rock (gray boulder)
    const rockGfx = this.make.graphics({ x: 0, y: 0, add: false });
    rockGfx.fillStyle(0x666666, 1);
    rockGfx.fillEllipse(30, 30, 55, 40);
    rockGfx.fillStyle(0x888888, 1);
    rockGfx.fillEllipse(28, 28, 40, 30);
    rockGfx.fillStyle(0x999999, 1);
    rockGfx.fillEllipse(25, 25, 20, 15);
    rockGfx.generateTexture('rock', 60, 45);
    rockGfx.destroy();

    // Oak tree (large round top)
    const oakGfx = this.make.graphics({ x: 0, y: 0, add: false });
    oakGfx.fillStyle(0x5d4037, 1);
    oakGfx.fillRect(22, 50, 16, 30);
    oakGfx.fillStyle(0x3e7a3e, 1);
    oakGfx.fillCircle(30, 30, 28);
    oakGfx.fillStyle(0x4a9a4a, 1);
    oakGfx.fillCircle(25, 25, 18);
    oakGfx.fillStyle(0x5aba5a, 1);
    oakGfx.fillCircle(35, 28, 12);
    oakGfx.generateTexture('tree', 60, 80);
    oakGfx.destroy();

    // Wood chip particle
    const chipGfx = this.make.graphics({ x: 0, y: 0, add: false });
    chipGfx.fillStyle(0x8B4513, 1);
    chipGfx.fillRect(0, 0, 6, 4);
    chipGfx.generateTexture('chip', 6, 4);
    chipGfx.destroy();
  }
}
