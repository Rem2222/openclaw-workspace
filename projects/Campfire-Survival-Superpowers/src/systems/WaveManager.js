import Wisp from '../entities/monsters/Wisp.js';
import Crawler from '../entities/monsters/Crawler.js';
import Brute from '../entities/monsters/Brute.js';
import Specter from '../entities/monsters/Specter.js';
import gameState from '../systems/GameState.js';
import { GAME_WIDTH, GAME_HEIGHT, MONSTER_SPAWN_MARGIN, NIGHT_WAVES } from '../config/constants.js';

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
    this.maxWaves = NIGHT_WAVES;
    this.waveInProgress = false;
    this.restDuration = 10000; // 10 seconds between waves
    this.waveDuration = 30000; // 30 seconds per wave
    this.monstersAlive = 0;
    this.waveTimer = null;
    this.waveStartTime = 0;
    this.nightComplete = false;
    this.wavesThisNight = 0;
    this.spEarnedThisNight = 0;
  }

  startNight() {
    this.nightComplete = false;
    this.currentWave = 0;
    this.wavesThisNight = 0;
    this.spEarnedThisNight = 0;
    this.startNextWave();
  }

  startNextWave() {
    this.currentWave++;
    this.wavesThisNight++;
    
    if (this.currentWave > this.maxWaves) {
      this.onAllWavesComplete();
      return;
    }
    
    this.waveInProgress = true;
    gameState.startWave(this.currentWave);
    
    const waveConfig = this.getWaveConfig(this.currentWave);
    this.spawnWave(waveConfig);
    
    this.showWaveText();
    
    // Scale difficulty with day number
    const dayMultiplier = 1 + (gameState.dayNumber - 1) * 0.3;
    const duration = this.waveDuration * Math.max(0.7, 1 - (gameState.dayNumber - 1) * 0.05);
    
    this.waveStartTime = Date.now();
    gameState.waveStartTime = this.waveStartTime;
    gameState.waveDuration = duration;
    
    this.waveTimer = this.scene.time.delayedCall(duration, () => {
      if (this.waveInProgress) {
        this.endWave();
      }
    });
  }

  getWaveConfig(wave) {
    const dayNum = gameState.dayNumber;
    const scale = 1 + (dayNum - 1) * 0.3;
    
    const configs = {
      1: [
        { type: 'crawler', count: Math.ceil(3 * scale) }
      ],
      2: [
        { type: 'crawler', count: Math.ceil(4 * scale) },
        { type: 'wisp', count: Math.ceil(2 * scale) }
      ],
      3: [
        { type: 'crawler', count: Math.ceil(4 * scale) },
        { type: 'wisp', count: Math.ceil(3 * scale) },
        { type: 'brute', count: Math.ceil(1 * scale) },
        { type: 'specter', count: Math.ceil(2 * scale) }
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
    gameState.monstersAlive = totalMonsters;
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
    gameState.monstersAlive = this.monstersAlive;
    
    if (this.monstersAlive <= 0 && this.waveInProgress) {
      this.endWave();
    }
  }
  
  endWave() {
    this.waveInProgress = false;
    if (this.waveTimer) {
      this.waveTimer.remove();
      this.waveTimer = null;
    }
    const spBefore = gameState.skillPoints;
    gameState.endWave();
    const spGained = gameState.skillPoints - spBefore;
    this.spEarnedThisNight += spGained;
    
    // Emit event so GameScene can show popup
    if (spGained > 0) {
      this.scene.events.emit('spEarned', spGained);
    }
    
    if (this.currentWave >= this.maxWaves) {
      this.onAllWavesComplete();
    } else {
      gameState.startRest(this.restDuration);
      this.scene.time.delayedCall(this.restDuration, () => {
        if (!this.scene.gameOver) {
          this.startNextWave();
        }
      });
    }
  }

  onAllWavesComplete() {
    this.nightComplete = true;
    gameState.score += this.wavesThisNight * 100;
    // Signal to GameScene via event
    this.scene.events.emit('nightComplete');
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
