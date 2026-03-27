import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import { NIGHT_WAVES } from '../config/constants.js';

const PHASE_LABELS = {
  day: { icon: '☀️', text: 'DAY', color: '#87CEEB' },
  dusk: { icon: '🌅', text: 'DUSK', color: '#FFA500' },
  night: { icon: '🌙', text: 'NIGHT', color: '#8888FF' },
  dawn: { icon: '🌄', text: 'DAWN', color: '#FFD700' }
};

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.lastHP = -1;
    this.lastWave = -1;
    this.lastLogs = -1;
  }

  create() {
    // Campfire HP bar background
    this.add.rectangle(640, 25, 300, 30, 0x333333).setOrigin(0.5);
    this.campfireHPBar = this.add.rectangle(640, 25, 296, 26, 0x00FF00).setOrigin(0.5, 0.5);
    this.campfireHPBar.setName('campfireHPBar');
    
    this.add.text(640, 25, '🔥 CAMPFIRE', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(1);
    
    // Fuel bar
    this.add.rectangle(640, 48, 200, 8, 0x333333).setOrigin(0.5);
    this.fuelBar = this.add.rectangle(640, 48, 198, 6, 0xFF9500).setOrigin(0.5);
    this.fuelLabel = this.add.text(530, 48, '⛽Fuel', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#CCCCCC'
    }).setOrigin(0.5);
    
    // Player HP bar background
    this.add.rectangle(150, 25, 200, 20, 0x333333).setOrigin(0.5);
    this.playerHPBar = this.add.rectangle(150, 25, 196, 16, 0xFF9500).setOrigin(0.5, 0.5);
    
    this.add.text(150, 25, '⚔️ PLAYER', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(1);
    
    // Phase indicator (top center)
    this.phaseDisplay = this.add.text(640, 60, '', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FFFFFF',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2);
    
    // Phase timer / message (upper right)
    this.phaseMessage = this.add.text(1230, 50, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(1, 0.5);
    
    // Wave indicator (upper right)
    this.waveText = this.add.text(1230, 80, '', {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#FF9500',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(1, 0.5);
    
    // Rest timer (upper right)
    this.restTimerText = this.add.text(1230, 110, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 0.5);
    
    // Monsters remaining (upper right)
    this.monstersText = this.add.text(1230, 140, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FF6666',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 0.5);
    
    // Logs counter + Woodpile (bottom left)
    this.logsText = this.add.text(20, 680, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#8B4513',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0, 0.5);
    
    // Carried log indicator (bottom center)
    this.carryText = this.add.text(640, 680, '', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FF9500',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    // Experience points (bottom right)
    this.expText = this.add.text(1260, 680, '⭐ EXP: 0', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(1, 0.5).setDepth(100);
  }

  updateUI() {
    // Phase display
    const phase = gameState.dayPhase;
    const label = PHASE_LABELS[phase];
    if (label) {
      this.phaseDisplay.setText(`${label.icon} ${label.text} ${gameState.dayNumber}`);
      this.phaseDisplay.setColor(label.color);
    }
    
    // Phase message & timer
    const remaining = gameState.getPhaseRemaining();
    const remainingSec = Math.ceil(remaining / 1000);
    
    if (phase === 'day') {
      this.phaseMessage.setText(`Prepare for the night! ${remainingSec}s`).setColor('#FFFFFF').setStroke('#000000', 3);
    } else if (phase === 'dusk') {
      this.phaseMessage.setText(`Night approaches... ${remainingSec}s`).setColor('#FFA500').setStroke('#000000', 3);
    } else if (phase === 'night') {
      this.phaseMessage.setText('Survive the night!').setColor('#8888FF').setStroke('#000000', 3);
    } else if (phase === 'dawn') {
      this.phaseMessage.setText(`Night survived! ${remainingSec}s`).setColor('#FFD700').setStroke('#000000', 3);
    }
    
    // Campfire HP bar
    const campfirePercent = gameState.campfireHP / gameState.maxCampfireHP;
    this.campfireHPBar.width = 296 * campfirePercent;
    if (campfirePercent > 0.6) {
      this.campfireHPBar.fillColor = 0x00FF00;
    } else if (campfirePercent > 0.3) {
      this.campfireHPBar.fillColor = 0xFFFF00;
    } else {
      this.campfireHPBar.fillColor = 0xFF0000;
    }
    
    // Campfire fuel bar
    const fuelPercent = gameState.campfireFuel / 100;
    this.fuelBar.width = 198 * fuelPercent;
    if (fuelPercent > 0.4) {
      this.fuelBar.fillColor = 0xFF9500;
    } else if (fuelPercent > 0.15) {
      this.fuelBar.fillColor = 0xFF6600;
    } else {
      this.fuelBar.fillColor = 0xFF0000;
    }
    
    // Player HP bar
    const playerPercent = gameState.playerHP / gameState.maxPlayerHP;
    this.playerHPBar.width = 196 * playerPercent;
    
    // Wave info (only during night)
    if (phase === 'night') {
      if (gameState.currentWave > 0) {
        this.waveText.setText(`WAVE ${gameState.currentWave}/${NIGHT_WAVES}`);
      }
      
      if (!gameState.waveInProgress && gameState.currentWave > 0 && gameState.currentWave < NIGHT_WAVES) {
        const restRem = Math.ceil(gameState.getRestRemaining() / 1000);
        this.restTimerText.setText(`Next wave in ${restRem}s`);
        this.monstersText.setText('');
      } else if (gameState.waveInProgress) {
        const waveRemaining = Math.ceil(gameState.getWaveRemaining() / 1000);
        this.restTimerText.setText(`SURVIVE: ${waveRemaining}s`);
        this.monstersText.setText(`Monsters: ${gameState.monstersAlive}`);
      } else {
        this.restTimerText.setText('');
        this.monstersText.setText('');
      }
    } else {
      this.waveText.setText('');
      this.restTimerText.setText('');
      this.monstersText.setText('');
    }
    
    // Logs + Woodpile
    const pileCount = gameState.getPileCount ? gameState.getPileCount() : 0;
    const maxPile = gameState.maxLogsCapacity || 3;
    const pileText = pileCount > 0 ? ` | 🪵 Pile: ${pileCount}/${maxPile}` : '';
    this.logsText.setText(`🪵 Logs: ${gameState.logs}${pileText}`);
    
    // Experience points
    this.expText.setText(`⭐ EXP: ${gameState.experience}`);
    
    // Carried log indicator + pile hint
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.player && gameScene.player.carriedLog) {
      this.carryText.setText('🪵 Carrying | Q: drop/feed');
    } else if (pileCount > 0) {
      this.carryText.setText(`🪨 ${pileCount} in pile | Q: feed 1 to fire`);
    } else {
      this.carryText.setText('');
    }
  }

  update() {
    this.updateUI();
  }
}
