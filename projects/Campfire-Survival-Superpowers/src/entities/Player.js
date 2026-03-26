import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_ATTACK_RANGE, PLAYER_ATTACK_COOLDOWN } from '../config/constants.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setCollideWorldBounds(true);
    this.body.setSize(30, 40);
    this.body.setOffset(9, 12);
    
    this.lastAttackTime = 0;
    this.isAttacking = false;
    
    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  update(time) {
    if (this.scene.gameOver) return;
    
    this.setVelocity(0);
    
    // Movement
    let vx = 0;
    let vy = 0;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    
    if (vx !== 0 || vy !== 0) {
      this.setVelocity(PLAYER_SPEED * vx, PLAYER_SPEED * vy);
    }
    
    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.wasd.attack) && time > this.lastAttackTime + PLAYER_ATTACK_COOLDOWN) {
      this.attack(time);
    }
  }

  attack(time) {
    this.lastAttackTime = time;
    this.isAttacking = true;
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.isAttacking = false;
      }
    });
    
    // Find monsters in range
    if (!this.scene.monsters) return;
    
    const monsters = this.scene.monsters.getChildren().filter(m => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      return dist < PLAYER_ATTACK_RANGE && m.alive;
    });
    
    monsters.forEach(monster => {
      monster.takeDamage(10);
    });
  }
}
