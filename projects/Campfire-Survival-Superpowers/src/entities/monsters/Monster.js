import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../../config/constants.js';
import gameState from '../../systems/GameState.js';

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setDepth(3);
    this.body.setImmovable(true);
    
    this.maxHP = config.hp || 20;
    this.hp = this.maxHP;
    // ±15% speed variation per monster
    const baseSpeed = config.speed || 100;
    const variation = 0.85 + Math.random() * 0.30;
    this.speed = Math.round(baseSpeed * variation);
    this.damage = config.damage || 5;
    
    this.alive = true;
    this.attackCooldown = 0;
    this.lightDamageCooldown = 0;
    this.facingAngle = 0;
    
    // HP bar above monster
    this.hpBarBg = scene.add.rectangle(x, y - 25, 40, 6, 0x333333).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(x - 20, y - 25, 40, 4, 0x00FF00).setOrigin(0, 0.5);
    this.hpBar.setName('hpBar');
  }

  takeDamage(amount) {
    if (!this.alive) return;
    
    this.hp -= amount;
    
    const percent = Math.max(0, this.hp / this.maxHP);
    this.hpBar.width = 40 * percent;
    if (percent > 0.5) {
      this.hpBar.fillColor = 0x00FF00;
    } else if (percent > 0.25) {
      this.hpBar.fillColor = 0xFFFF00;
    } else {
      this.hpBar.fillColor = 0xFF0000;
    }
    
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
    
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    
    const particles = this.scene.add.circle(this.x, this.y, 5, 0xFF6666, 0.8);
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => particles.destroy()
    });
    
    this.scene.events.emit('monsterKilled');
  }

  getCampfireLightRadius() {
    const campfire = this.scene.campfire;
    if (!campfire) return 120;
    return campfire.getLightRadius();
  }

  update(time, delta) {
    if (!this.alive || !this.scene || !this.scene.player) return;
    
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.lightDamageCooldown = Math.max(0, this.lightDamageCooldown - delta);
    
    const distToCampfire = Phaser.Math.Distance.Between(this.x, this.y, CAMPFIRE_X, CAMPFIRE_Y);
    const lightRadius = this.getCampfireLightRadius();
    
    // HARD BARRIER: Monsters cannot enter the light radius
    if (distToCampfire < lightRadius + 30) {
      // Push monster OUT of light zone with BOTH X and Y
      const pushAngle = Phaser.Math.Angle.Between(CAMPFIRE_X, CAMPFIRE_Y, this.x, this.y);
      const pushDist = lightRadius + 35;
      const targetX = CAMPFIRE_X + Math.cos(pushAngle) * pushDist;
      const targetY = CAMPFIRE_Y + Math.sin(pushAngle) * pushDist;
      
      // Use velocity for smooth Y movement
      const pushSpeed = 120;
      this.body.setVelocity(
        Math.cos(pushAngle) * pushSpeed,
        Math.sin(pushAngle) * pushSpeed
      );
      
      // Take light damage if very close
      if (distToCampfire < lightRadius + 60 && this.lightDamageCooldown === 0) {
        this.takeDamage(1);
        this.lightDamageCooldown = 500;
      }
      
      // Update facing
      this.facingAngle = pushAngle;
      this.updateFacing();
      return;
    }
    
    // Chase player — guaranteed X AND Y velocity
    const targetX = this.scene.player.x;
    const targetY = this.scene.player.y;
    
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.facingAngle = angle;
    
    // Always set BOTH velocity components
    this.body.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
    
    this.updateFacing();
    
    // Attack player when close enough
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    if (distToPlayer < 40 && this.attackCooldown === 0) {
      this.attackPlayer();
    }
    
    // Update HP bar position
    if (this.hpBar) {
      this.hpBar.setPosition(this.x - 20, this.y - 25);
      this.hpBarBg.setPosition(this.x, this.y - 25);
    }
    
    // Visibility: glowing eyes in darkness, full body in light
    if (distToCampfire > lightRadius) {
      this.setAlpha(0.2);
    } else {
      this.setAlpha(1.0);
    }
  }

  // Update sprite facing based on movement angle
  updateFacing() {
    // For asymmetric sprites — flip horizontally based on angle
    // But don't flip for sprites that should rotate freely
    // For now, just ensure body velocity reflects direction
  }

  attackPlayer() {
    this.attackCooldown = 1000;
    gameState.damagePlayer(this.damage);
  }
}
