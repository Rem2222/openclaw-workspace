import Phaser from 'phaser';
import Log from './Log.js';

export default class Tree extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, type) {
    // Random type if not specified
    const treeTypes = ['tree', 'pine', 'bush', 'rock'];
    const treeType = type || treeTypes[Phaser.Math.Between(0, treeTypes.length - 1)];
    super(scene, x, y, treeType);
    scene.add.existing(this);
    
    this.setOrigin(0.5, 1); // Bottom-center — tree grows UP from spawn point
    this.setDepth(2);
    
    // Random scale variation
    const scales = { tree: [0.8, 1.3], pine: [0.7, 1.2], bush: [0.6, 1.1], rock: [0.7, 1.3] };
    const [minS, maxS] = scales[treeType] || [0.8, 1.2];
    this.setScale(Phaser.Math.FloatBetween(minS, maxS));
    
    this.active = true;
    this.isChopping = false;
    this.chopProgress = 0;
    this.chopTime = 1500;
    this.shakeTween = null;
    this.treeType = treeType;
    this.chipsSpawned = 0;
  }

  startChopping(time, player) {
    // Guard: don't reset if already chopping (prevents timer reset every frame)
    if (this.isChopping) return;
    
    this.isChopping = true;
    this.chopStartTime = time;
    this.lastChipTime = time;
    
    // Start shake
    this.shakeTween = this.scene.tweens.add({
      targets: this,
      angle: { from: -10, to: 10 },
      duration: 70,
      yoyo: true,
      repeat: 14,  // ~1 second of shaking
      ease: 'Sine.easeInOut',
      onComplete: () => { this.angle = 0; }
    });
    
    // Initial chip burst
    this.spawnWoodChips();
  }

  stopChopping() {
    if (!this.isChopping) return;
    this.isChopping = false;
    
    if (this.shakeTween) {
      this.shakeTween.stop();
      this.shakeTween = null;
    }
    this.angle = 0;
    this.chopProgress = 0;
  }

  spawnWoodChips() {
    const count = Phaser.Math.Between(2, 4);
    const colors = this.treeType === 'rock' ? [0x888888, 0x777777, 0x999999] 
                   : this.treeType === 'pine' ? [0x5d4037, 0x4a3728, 0x3d5c3d]
                   : this.treeType === 'bush' ? [0x2d6a2d, 0x3d8a3d, 0x4a9a4a]
                   : [0x8B4513, 0x654321, 0x5d4037];
    
    for (let i = 0; i < count; i++) {
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-25, 5),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(2, 4),
        Phaser.Utils.Array.GetRandom(colors)
      );
      particle.setAngle(Phaser.Math.Between(0, 360));
      particle.setDepth(6);
      
      const vx = Phaser.Math.Between(-100, 100);
      const vy = Phaser.Math.Between(-150, -60);
      const spin = Phaser.Math.Between(-400, 400);
      
      particle._vx = vx;
      particle._vy = vy;
      particle._spin = spin;
      
      this.scene.tweens.add({
        targets: particle,
        _vx: vx * 0.3,
        _vy: vy + 60,
        angle: particle.angle + spin * 0.6,
        alpha: 0,
        duration: 700,
        ease: 'Quad.easeOut',
        onUpdate: (tween) => {
          particle.x += (tween.data[0].current - vx * 0.3) * 0.1;
          particle.y += 2;
        },
        onComplete: () => particle.destroy()
      });
    }
  }

  update(time) {
    if (!this.isChopping || !this.active) return;
    
    // Check if player walked away
    const dist = Phaser.Math.Distance.Between(
      this.scene.player.x, this.scene.player.y,
      this.x, this.y
    );
    if (dist > 55) {
      this.stopChopping();
      return;
    }
    
    const elapsed = time - this.chopStartTime;
    this.chopProgress = Math.min(1, elapsed / this.chopTime);
    
    // Spawn chips every ~500ms while chopping
    if (time - this.lastChipTime > 400) {
      this.spawnWoodChips();
      this.lastChipTime = time;
    }
    
    if (this.chopProgress >= 1) {
      this.chop();
    }
  }

  chop() {
    this.isChopping = false;
    this.active = false;
    
    if (this.shakeTween) {
      this.shakeTween.stop();
      this.shakeTween = null;
    }
    
    // Big chip burst
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 30, () => this.spawnWoodChips());
    }
    
    // Floating text "+1 LOG"
    const floatingText = this.scene.add.text(this.x, this.y - 60, '⬆ +1 LOG', {
      fontSize: '16px',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 3
    });
    floatingText.setDepth(20);
    floatingText.setOrigin(0.5);
    this.scene.tweens.add({
      targets: floatingText,
      y: this.y - 100,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => floatingText.destroy()
    });
    
    // Spawn log — auto-pickup if player is close
    const dist = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, this.x, this.y);
    const log = new Log(this.scene, this.x, this.y);
    this.scene.logs.add(log);
    
    if (dist < 60 && !this.scene.player.carriedLog) {
      // Auto pickup if player is close AND not already carrying a log
      this.scene.player.carriedLog = log;
      log.isCarried = true;
      log.setDepth(6);
    }
    
    // Fall + fade
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: Phaser.Math.Between(-30, 30),
      duration: 400,
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      }
    });
  }
}
