import Phaser from 'phaser';
import Log from './Log.js';

export default class Tree extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'tree');
    scene.add.existing(this);
    // No physics body - trees are just visual/interaction objects
    // Monsters pass through them
    
    this.setDepth(2);
    
    this.active = true;
    this.chopProgress = 0;
    this.chopTime = 2000; // 2 seconds to chop
    this.isChopping = false;
  }

  startChopping(time, player) {
    if (this.isChopping) return;
    
    this.isChopping = true;
    this.chopStartTime = time;
    
    // Visual feedback - shake
    this.scene.tweens.add({
      targets: this,
      x: this.x + 3,
      duration: 100,
      yoyo: true,
      repeat: -1
    });
  }

  update(time) {
    if (!this.isChopping) return;
    
    const elapsed = time - this.chopStartTime;
    this.chopProgress = Math.min(1, elapsed / this.chopTime);
    
    if (this.chopProgress >= 1) {
      this.chop();
    }
  }

  chop() {
    this.isChopping = false;
    this.active = false;
    
    // Stop shake tween
    this.scene.tweens.killTweensOf(this);
    
    // Drop log
    const log = new Log(this.scene, this.x, this.y);
    this.scene.logs.add(log);
    
    // Fall animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      }
    });
  }
}
