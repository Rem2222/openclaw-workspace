import Phaser from 'phaser';
import { CAMPFIRE_X, CAMPFIRE_Y } from '../../config/constants.js';
import gameState from '../../systems/GameState.js';

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setOrigin(0.5, 0.5);
    this.setDepth(3);
    this.body.setImmovable(true);
    
    // Apply difficulty scaling from gameState
    const difficulty = gameState.difficultyMultiplier || 1.0;
    
    this.maxHP = Math.round((config.hp || 20) * difficulty);
    this.hp = this.maxHP;
    // ±15% speed variation per monster (speed also scales with difficulty)
    const baseSpeed = (config.speed || 100) * difficulty;
    const variation = 0.85 + Math.random() * 0.30;
    this.speed = Math.round(baseSpeed * variation);
    this.damage = Math.round((config.damage || 5) * difficulty);
    
    this.alive = true;
    this.attackCooldown = 0;
    this.lightDamageCooldown = 0;
    this.facingAngle = 0;
    this.legPhase = Math.random() * Math.PI * 2; // For leg animation
    
    // HP bar above monster
    this.hpBarBg = scene.add.rectangle(x, y - 25, 40, 6, 0x333333).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(x - 20, y - 25, 40, 4, 0x00FF00).setOrigin(0, 0.5);
    this.hpBar.setName('hpBar');
    
    // SCARY EYES — glow in darkness
    this.eyeCount = config.eyes || 2;
    this.eyes = [];
    for (let i = 0; i < this.eyeCount; i++) {
      const eyeX = x + (i - (this.eyeCount - 1) / 2) * 8;
      const eye = scene.add.circle(eyeX, y - 5, 3, 0xFF0000);
      eye.setBlendMode(Phaser.BlendModes.ADD);
      eye.setDepth(4);
      eye.setVisible(false); // Hidden in light
      this.eyes.push(eye);
    }
    
    // LEGS — creepy animated legs
    this.legCount = config.legs || 4;
    this.legs = [];
    for (let i = 0; i < this.legCount; i++) {
      const legX = x + (i - (this.legCount - 1) / 2) * 6;
      const leg = scene.add.rectangle(legX, y + 15, 3, 15, 0x221111);
      leg.setOrigin(0.5, 0);
      leg.setDepth(2);
      leg.setBlendMode(Phaser.BlendModes.NORMAL);
      leg.setVisible(false); // Hidden in light
      this.legs.push(leg);
    }
    
    // In-light state (for toggling visibility)
    this.inLight = false;
  }

  // Update scary parts based on light exposure
  // Zones: 'inner' (80% bright), 'outer' (20% dim), 'dark' (outside)
  updateScaryVisibility(zone) {
    if (this.visibilityZone === zone) return;
    this.visibilityZone = zone;
    
    // In 'inner': fully visible, no scary parts
    // In 'outer': slightly dimmed, no scary parts
    // In 'dark': eyes + legs visible, body hidden
    
    if (zone === 'dark') {
      // Darkness mode: hide body, show eyes + legs
      this.setVisible(false);
      this.setAlpha(0);
      if (this.hpBar) this.hpBar.setVisible(false);
      if (this.hpBarBg) this.hpBarBg.setVisible(false);
      
      this.eyes.forEach(eye => eye.setVisible(true));
      this.legs.forEach(leg => leg.setVisible(true));
    } else if (zone === 'outer') {
      // Outer zone: visible but dim
      this.setVisible(true);
      this.setAlpha(0.5);
      if (this.hpBar) this.hpBar.setVisible(true);
      if (this.hpBarBg) this.hpBarBg.setVisible(true);
      
      this.eyes.forEach(eye => eye.setVisible(true));
      this.legs.forEach(leg => leg.setVisible(true));
    } else {
      // Inner zone: fully visible
      this.setVisible(true);
      this.setAlpha(1);
      if (this.hpBar) this.hpBar.setVisible(true);
      if (this.hpBarBg) this.hpBarBg.setVisible(true);
      
      this.eyes.forEach(eye => eye.setVisible(false));
      this.legs.forEach(leg => leg.setVisible(false));
    }
  }

  takeDamage(amount, isCrit = false) {
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
    
    // Show crit text if critical hit
    if (isCrit) {
      this.scene.events.emit('critHit', amount, this.x, this.y);
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
    
    // Destroy scary parts
    this.eyes.forEach(eye => eye.destroy());
    this.legs.forEach(leg => leg.destroy());
    
    const particles = this.scene.add.circle(this.x, this.y, 5, 0xFF6666, 0.8);
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => particles.destroy()
    });
    
    this.scene.events.emit('monsterKilled', this.maxHP, this.x, this.y);
  }

  getCampfireLightRadius() {
    const campfire = this.scene.campfire;
    if (!campfire) return 120;
    return campfire.getLightRadius();
  }

  getCampfireInnerRadius() {
    const campfire = this.scene.campfire;
    if (!campfire) return 96;
    return campfire.getInnerRadius();
  }

  getCampfireOuterRadius() {
    const campfire = this.scene.campfire;
    if (!campfire) return 120;
    return campfire.getOuterRadius();
  }

  update(time, delta) {
    if (!this.alive || !this.scene || !this.scene.player) return;
    
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.lightDamageCooldown = Math.max(0, this.lightDamageCooldown - delta);
    
    const distToCampfire = Phaser.Math.Distance.Between(this.x, this.y, CAMPFIRE_X, CAMPFIRE_Y);
    const outerRadius = this.getCampfireOuterRadius();
    const innerRadius = this.getCampfireInnerRadius();
    
    // Update scary visibility based on light exposure
    // In inner zone (80%): visible, full brightness
    // In outer zone (20%): visible but dim
    // Outside outer zone: darkness (eyes + legs only)
    let visibilityZone = 'dark';
    if (distToCampfire < innerRadius) {
      visibilityZone = 'inner';
    } else if (distToCampfire < outerRadius) {
      visibilityZone = 'outer';
    }
    this.updateScaryVisibility(visibilityZone);
    
    // Animate legs when in darkness
    if (visibilityZone === 'dark') {
      this.legPhase += delta * 0.01;
      this.legs.forEach((leg, i) => {
        const legOffset = Math.sin(this.legPhase + i * 0.8) * 5;
        leg.setAngle(legOffset);
        leg.y = this.y + 12;
        leg.x = this.x + (i - (this.legCount - 1) / 2) * 6;
      });
      
      // Pulse eyes in darkness
      this.eyes.forEach((eye, i) => {
        const pulse = 0.7 + Math.sin(time * 0.005 + i) * 0.3;
        eye.setAlpha(pulse);
        eye.x = this.x + (i - (this.eyeCount - 1) / 2) * 8;
        eye.y = this.y - 5;
      });
    }
    
    // HARD BARRIER: Monsters cannot enter the INNER light zone (80%)
    if (distToCampfire < innerRadius + 30) {
      // Push monster OUT of inner light zone
      const pushAngle = Phaser.Math.Angle.Between(CAMPFIRE_X, CAMPFIRE_Y, this.x, this.y);
      const pushDist = innerRadius + 35;
      
      const pushSpeed = 120;
      this.body.setVelocity(
        Math.cos(pushAngle) * pushSpeed,
        Math.sin(pushAngle) * pushSpeed
      );
      
      // Take light damage if very close (inner zone)
      if (distToCampfire < innerRadius + 40 && this.lightDamageCooldown === 0) {
        this.takeDamage(1);
        this.lightDamageCooldown = 3000; // 3 seconds between damage
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
    if (distToCampfire > outerRadius) {
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
