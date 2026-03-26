import { PLAYER_MAX_HP, CAMPFIRE_MAX_HP } from '../config/constants.js';

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.playerHP = PLAYER_MAX_HP;
    this.campfireHP = CAMPFIRE_MAX_HP;
    this.currentWave = 0;
    this.waveInProgress = false;
    this.gameOver = false;
    this.score = 0;
    this.skillPoints = 0;
    this.skills = {};
  }

  damagePlayer(amount) {
    this.playerHP = Math.max(0, this.playerHP - amount);
    if (this.playerHP <= 0) {
      this.gameOver = true;
    }
    return this.playerHP;
  }

  damageCampfire(amount) {
    this.campfireHP = Math.max(0, this.campfireHP - amount);
    if (this.campfireHP <= 0) {
      this.gameOver = true;
    }
    return this.campfireHP;
  }

  healPlayer(amount) {
    this.playerHP = Math.min(PLAYER_MAX_HP, this.playerHP + amount);
    return this.playerHP;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveInProgress = true;
  }

  endWave() {
    this.waveInProgress = false;
    this.skillPoints += 1; // 1 point per wave survived
  }

  getSkill(skillId) {
    return this.skills[skillId] || 0;
  }

  addSkill(skillId, points) {
    if (this.skills[skillId]) {
      this.skills[skillId] += points;
    } else {
      this.skills[skillId] = points;
    }
  }
}

// Singleton
export const gameState = new GameState();
export default gameState;
