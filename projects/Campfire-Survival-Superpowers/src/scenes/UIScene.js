import Phaser from 'phaser';
import gameState from '../systems/GameState.js';

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
    
    // Wave indicator
    this.waveText = this.add.text(640, 60, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#FF9500'
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
    
    // Listen to game state changes
    this.events.on('updateUI', () => this.updateUI());
  }

  updateUI() {
    // Update campfire HP bar
    const campfirePercent = gameState.campfireHP / gameState.maxCampfireHP;
    this.campfireHPBar.width = 296 * campfirePercent;
    
    // Color based on health
    if (campfirePercent > 0.6) {
      this.campfireHPBar.fillColor = 0x00FF00;
    } else if (campfirePercent > 0.3) {
      this.campfireHPBar.fillColor = 0xFFFF00;
    } else {
      this.campfireHPBar.fillColor = 0xFF0000;
    }
    
    // Update player HP bar
    const playerPercent = gameState.playerHP / gameState.maxPlayerHP;
    this.playerHPBar.width = 196 * playerPercent;
    
    // Update wave
    if (gameState.currentWave !== this.lastWave) {
      this.lastWave = gameState.currentWave;
      if (gameState.currentWave > 0) {
        this.waveText.setText(`WAVE ${gameState.currentWave}/${gameState.maxWaves}`);
      }
    }
    
    // Update logs
    if (gameState.logs !== this.lastLogs) {
      this.lastLogs = gameState.logs;
      this.logsText.setText(`🪵 Logs: ${gameState.logs}`);
    }
    
    // Update skill points
    this.skillPointsText.setText(`⭐ SP: ${gameState.skillPoints}`);
  }

  update() {
    this.updateUI();
  }
}
