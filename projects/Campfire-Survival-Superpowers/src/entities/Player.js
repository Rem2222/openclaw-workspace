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
    
    // Visual sword slash effect
    this.showSwordSlash();
    
    // Scale feedback
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
  
  showSwordSlash() {
    // Get attack direction (toward nearest monster or last movement direction)
    let angle = 0;
    let targetX = this.x;
    let targetY = this.y;
    
    if (this.scene.monsters) {
      const monsters = this.scene.monsters.getChildren().filter(m => m.alive);
      if (monsters.length > 0) {
        // Find nearest monster
        let nearest = null;
        let nearestDist = Infinity;
        monsters.forEach(m => {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
          if (dist < nearestDist && dist < PLAYER_ATTACK_RANGE * 1.5) {
            nearestDist = dist;
            nearest = m;
          }
        });
        if (nearest) {
          targetX = nearest.x;
          targetY = nearest.y;
        }
      }
    }
    
    angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    
    // Create sword slash graphics
    const slash = this.scene.add.graphics();
    slash.setPosition(this.x, this.y);
    slash.setDepth(5);
    
    // Draw arc slash
    slash.lineStyle(4, 0xFFFFFF, 1);
    slash.beginPath();
    const arcRadius = 35;
    const arcStart = angle - Math.PI / 3;
    const arcEnd = angle + Math.PI / 3;
    slash.arc(0, 0, arcRadius, arcStart, arcEnd);
    slash.strokePath();
    
    // Add glow
    slash.lineStyle(8, 0xFFDD44, 0.5);
    slash.beginPath();
    slash.arc(0, 0, arcRadius, arcStart, arcEnd);
    slash.strokePath();
    
    // Animate and destroy
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => slash.destroy()
    });
  }
}
