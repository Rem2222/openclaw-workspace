import Wisp from '../entities/monsters/Wisp.js';
import Crawler from '../entities/monsters/Crawler.js';
import Brute from '../entities/monsters/Brute.js';
import Specter from '../entities/monsters/Specter.js';
import gameState from '../systems/GameState.js';
import { GAME_WIDTH, GAME_HEIGHT, MONSTER_SPAWN_MARGIN } from '../config/constants.js';

const MONSTER_TYPES = {
  wisp: Wisp,
  crawler: Crawler,
  brute: Brute,
  specter: Specter
};

export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWave = 0;
    this.maxWaves = 3;
    this.waveInProgress = false;
    this.restDuration = 10000; // 10 seconds between waves
    this.monstersAlive = 0;
  }

  startNextWave() {
    this.currentWave++;
    
    if (this.currentWave > this.maxWaves) {
      this.onAllWavesComplete();
      return;
    }
    
    this.waveInProgress = true;
    gameState.startWave(this.currentWave);
    
    const waveConfig = this.getWaveConfig(this.currentWave);
    this.spawnWave(waveConfig);
    
    this.showWaveText();
  }

  getWaveConfig(wave) {
    const configs = {
      1: [
        { type: 'crawler', count: 3 }
      ],
      2: [
        { type: 'crawler', count: 4 },
        { type: 'wisp', count: 2 }
      ],
      3: [
        { type: 'crawler', count: 4 },
        { type: 'wisp', count: 3 },
        { type: 'brute', count: 1 },
        { type: 'specter', count: 2 }
      ]
    };
    
    return configs[wave] || configs[3];
  }

  spawnWave(config) {
    let totalMonsters = 0;
    
    config.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        const pos = this.getSpawnPosition();
        const monsterClass = MONSTER_TYPES[type];
        const monster = new monsterClass(this.scene, pos.x, pos.y);
        this.scene.monsters.add(monster);
        totalMonsters++;
      }
    });
    
    this.monstersAlive = totalMonsters;
  }

  getSpawnPosition() {
    const margin = MONSTER_SPAWN_MARGIN;
    const side = Phaser.Math.Between(0, 3);
    
    switch (side) {
      case 0: // Top
        return { x: Phaser.Math.Between(margin, GAME_WIDTH - margin), y: margin };
      case 1: // Right
        return { x: GAME_WIDTH - margin, y: Phaser.Math.Between(margin, GAME_HEIGHT - margin) };
      case 2: // Bottom
        return { x: Phaser.Math.Between(margin, GAME_WIDTH - margin), y: GAME_HEIGHT - margin };
      case 3: // Left
        return { x: margin, y: Phaser.Math.Between(margin, GAME_HEIGHT - margin) };
    }
  }

  onMonsterKilled() {
    this.monstersAlive--;
    
    if (this.monstersAlive <= 0 && this.waveInProgress) {
      this.waveInProgress = false;
      this.scene.gameState.endWave();
      
      if (this.currentWave >= this.maxWaves) {
        this.onAllWavesComplete();
      } else {
        this.scene.time.delayedCall(this.restDuration, () => {
          if (!this.scene.gameOver) {
            this.startNextWave();
          }
        });
      }
    }
  }

  onAllWavesComplete() {
    // Victory!
    this.scene.showVictory();
  }

  showWaveText() {
    const text = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `WAVE ${this.currentWave}`, {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#FF9500',
      stroke: '#000',
      strokeThickness: 6
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }
}
