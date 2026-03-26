import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../../config/constants.js';
import gameState from '../../systems/GameState.js';

// Monsters take light damage only when very close to campfire (inside visual glow)
const LIGHT_DAMAGE_RADIUS = 180;

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setDepth(3);
    this.body.setImmovable(true);
    
    this.maxHP = config.hp || 20;
    this.hp = this.maxHP;
    this.speed = config.speed || 100;
    this.damage = config.damage || 5;
    this.target = config.target || 'campfire'; // 'campfire' or 'player'
    
    this.alive = true;
    this.attackCooldown = 0;
    this.lightDamageCooldown = 0;
    
    // HP bar above monster
    this.hpBarBg = scene.add.rectangle(x, y - 25, 40, 6, 0x333333).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(x - 20, y - 25, 40, 4, 0x00FF00).setOrigin(0, 0.5);
    this.hpBar.setName('hpBar');
  }

  takeDamage(amount) {
    if (!this.alive) return;
    
    this.hp -= amount;
    
    // Update HP bar
    const percent = Math.max(0, this.hp / this.maxHP);
    this.hpBar.width = 40 * percent;
    if (percent > 0.5) {
      this.hpBar.fillColor = 0x00FF00;
    } else if (percent > 0.25) {
      this.hpBar.fillColor = 0xFFFF00;
    } else {
      this.hpBar.fillColor = 0xFF0000;
    }
    
    // Flash white
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true
    });
    
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    
    // Remove HP bars
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    
    // Death particles
    const particles = this.scene.add.circle(this.x, this.y, 5, 0xFF6666, 0.8);
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => particles.destroy()
    });
    
    // Emit event for wave manager
    this.scene.events.emit('monsterKilled');
  }

  update(time, delta) {
    if (!this.alive || !this.scene) return;
    
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.lightDamageCooldown = Math.max(0, this.lightDamageCooldown - delta);
    
    // Check if in campfire light zone (only take damage when very close, ~80px)
    const distToCampfire = Phaser.Math.Distance.Between(this.x, this.y, CAMPFIRE_X, CAMPFIRE_Y);
    const LIGHT_ZONE = 80; // Only damage inside the bright glow
    
    if (distToCampfire < LIGHT_ZONE) {
      // Monster takes light damage when inside glow
      if (this.lightDamageCooldown === 0) {
        this.takeDamage(3);
        this.lightDamageCooldown = 500;
      }
      // Don't push away - they can fight through the light
    }
    
    // Move toward target (only if not in light)
    const targetX = this.target === 'player' ? this.scene.player.x : CAMPFIRE_X;
    const targetY = this.target === 'player' ? this.scene.player.y : CAMPFIRE_Y;
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
    
    // Check collision with player
    if (this.target === 'player' && this.body) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
      if (dist < 40 && this.attackCooldown === 0) {
        this.attackPlayer();
      }
    }
    
    // Check collision with campfire
    if (distToCampfire < 50 && this.attackCooldown === 0) {
      this.attackCampfire();
    }
    
    // Update HP bar position to follow monster
    if (this.hpBar) {
      this.hpBar.setPosition(this.x - 20, this.y - 25);
      this.hpBarBg.setPosition(this.x, this.y - 25);
    }
  }

  attackPlayer() {
    this.attackCooldown = 1000;
    gameState.damagePlayer(this.damage);
  }

  attackCampfire() {
    this.attackCooldown = 1500;
    gameState.damageCampfire(this.damage);
  }
}
