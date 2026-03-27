import { PLAYER_MAX_HP, CAMPFIRE_MAX_HP, PHASE_DURATIONS } from '../config/constants.js';

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
    this.experience = 0; // renamed from skillPoints
    this.expPerKill = 0; // EXP per kill (scales with monster maxHP)
    this.skills = {};
    this.monstersAlive = 0;
    
    // Rest timer between waves
    this.restStartTime = 0;
    this.restDuration = 10000; // 10 seconds
    
    // Wave timer (time-based waves)
    this.waveStartTime = 0;
    this.waveDuration = 30000; // 30 seconds per wave
    
    // SkillTree system properties
    this.attackSpeed = 1;
    this.damageBonus = 0;
    this.critChance = 0;
    this.chopSpeed = 1;
    this.logsPerTree = 1;
    this.expPerWave = 1; // EXP earned per wave survived
    this.regenRate = 0;
    this.maxPlayerHP = PLAYER_MAX_HP;
    this.maxCampfireHP = CAMPFIRE_MAX_HP;
    this.unlockedSkills = [];
    
    // Day/Night cycle
    this.dayPhase = 'day'; // 'day', 'dusk', 'night', 'dawn'
    this.dayNumber = 1;
    this.phaseStartTime = 0;
    this.phaseDurations = {
      day: PHASE_DURATIONS.DAY,
      dusk: PHASE_DURATIONS.DUSK,
      night: 0, // depends on waves
      dawn: PHASE_DURATIONS.DAWN
    };
    this.totalDaysSurvived = 0;
    
    // Campfire fuel (managed by Campfire entity, but tracked here for UI)
    this.campfireFuel = 100;
    
    // Woodpile system — logs stored near campfire don't despawn
    this.maxLogsCapacity = 3; // base capacity
    this.logsPile = []; // array of {x, y} positions
    
    // Progressive difficulty — increases each day
    this.difficultyMultiplier = 1.0; // 1.0 = base, 1.3 = +30% per day
    this.fuelConsumptionRate = 1.0; // how fast fuel burns
  }

  // Add a log to the woodpile (returns true if successful)
  addLogToPile(x, y) {
    if (this.logsPile.length >= this.maxLogsCapacity) {
      return false; // pile full
    }
    this.logsPile.push({ x, y, active: true });
    return true;
  }

  // Remove a log from pile (for feeding campfire)
  removeLogFromPile() {
    if (this.logsPile.length > 0) {
      return this.logsPile.pop();
    }
    return null;
  }

  // Get pile count
  getPileCount() {
    return this.logsPile.filter(l => l.active).length;
  }

  // Increase difficulty for new day
  onNewDay() {
    this.difficultyMultiplier += 0.15; // +15% per day
    this.fuelConsumptionRate += 0.1; // +10% fuel burn per day
    console.log(`Day ${this.dayNumber}: Difficulty ${this.difficultyMultiplier.toFixed(2)}x, Fuel rate ${this.fuelConsumptionRate.toFixed(2)}x`);
  }

  startDay() {
    this.dayPhase = 'day';
    this.phaseStartTime = Date.now();
  }

  startDusk() {
    this.dayPhase = 'dusk';
    this.phaseStartTime = Date.now();
  }

  startNight() {
    this.dayPhase = 'night';
    this.phaseStartTime = Date.now();
  }

  startDawn() {
    this.dayPhase = 'dawn';
    this.phaseStartTime = Date.now();
    this.totalDaysSurvived++;
  }

  getPhaseRemaining() {
    const duration = this.phaseDurations[this.dayPhase];
    if (!duration) return Infinity; // night has no fixed duration
    const elapsed = Date.now() - this.phaseStartTime;
    return Math.max(0, duration - elapsed);
  }

  isPhaseComplete() {
    if (this.dayPhase === 'night') return false; // night ends via WaveManager
    const remaining = this.getPhaseRemaining();
    return remaining <= 0;
  }

  getPhaseProgress() {
    const duration = this.phaseDurations[this.dayPhase];
    if (!duration) return 1;
    const elapsed = Date.now() - this.phaseStartTime;
    return Math.min(1, elapsed / duration);
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
    this.playerHP = Math.min(this.maxPlayerHP, this.playerHP + amount);
    return this.playerHP;
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.waveInProgress = true;
  }

  endWave() {
    this.waveInProgress = false;
    this.experience += this.expPerWave; // EXP per wave survived
    this.restStartTime = Date.now();
  }
  
  // Called when a monster is killed - gives EXP based on monster's maxHP
  onMonsterKill(monsterMaxHP) {
    const expGained = Math.ceil(monsterMaxHP / 5); // 1 EXP per 5 HP (e.g., 15 HP = 3 EXP)
    this.experience += expGained;
    return expGained;
  }
  
  startRest(duration) {
    this.restDuration = duration;
    this.restStartTime = Date.now();
  }
  
  getRestRemaining() {
    if (this.restStartTime === 0) return 0;
    const elapsed = Date.now() - this.restStartTime;
    return Math.max(0, this.restDuration - elapsed);
  }
  
  getWaveRemaining() {
    if (this.waveStartTime === 0) return 0;
    const elapsed = Date.now() - this.waveStartTime;
    return Math.max(0, this.waveDuration - elapsed);
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
