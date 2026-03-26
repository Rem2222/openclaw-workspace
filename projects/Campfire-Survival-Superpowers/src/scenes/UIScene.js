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
    
    // Phase timer / message
    this.phaseMessage = this.add.text(640, 90, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Wave indicator
    this.waveText = this.add.text(640, 115, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#FF9500'
    }).setOrigin(0.5);
    
    // Rest timer (between waves)
    this.restTimerText = this.add.text(640, 140, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Monsters remaining
    this.monstersText = this.add.text(640, 162, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FF6666'
    }).setOrigin(0.5);
    
    // Logs counter
    this.logsText = this.add.text(50, 695, '🪵 Logs: 0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#8B4513'
    }).setOrigin(0, 0.5);
    
    // Skill points
    this.skillPointsText = this.add.text(1230, 695, '⭐ SP: 0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FFD700'
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
      this.phaseMessage.setText('Prepare for the night!').setColor('#87CEEB');
      this.phaseMessage.setText(`Prepare for the night! ${remainingSec}s`);
    } else if (phase === 'dusk') {
      this.phaseMessage.setText(`Night approaches... ${remainingSec}s`).setColor('#FFA500');
    } else if (phase === 'night') {
      this.phaseMessage.setText('Survive the night!').setColor('#8888FF');
    } else if (phase === 'dawn') {
      this.phaseMessage.setText(`Night survived! ${remainingSec}s`).setColor('#FFD700');
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
    
    // Logs
    if (gameState.logs !== this.lastLogs) {
      this.lastLogs = gameState.logs;
      this.logsText.setText(`🪵 Logs: ${gameState.logs}`);
    }
    
    // Skill points
    this.skillPointsText.setText(`⭐ SP: ${gameState.skillPoints}`);
  }

  update() {
    this.updateUI();
  }
}
