import gameState from './GameState.js';

export const SKILL_TREE = {
  combat: {
    name: 'Combat',
    color: 0xFF4444,
    skills: [
      { id: 'attack_speed', name: 'Attack Speed', desc: '+20% attack speed', cost: 1, effect: () => { gameState.attackSpeed *= 1.2; } },
      { id: 'damage', name: 'Damage+', desc: '+5 damage per hit', cost: 2, effect: () => { gameState.damageBonus += 5; } },
      { id: 'crit', name: 'Critical Hit', desc: '10% chance for 2x damage', cost: 3, effect: () => { gameState.critChance += 0.1; } }
    ]
  },
  gathering: {
    name: 'Gathering',
    color: 0x44FF44,
    skills: [
      { id: 'auto_chop', name: 'Auto Chop', desc: 'Trees chop faster', cost: 1, effect: () => { gameState.chopSpeed *= 1.3; } },
      { id: 'more_logs', name: 'More Logs', desc: '+1 log per tree', cost: 2, effect: () => { gameState.logsPerTree += 1; } },
      { id: 'forest_wisdom', name: 'Forest Wisdom', desc: '+1 skill point per wave', cost: 3, effect: () => { gameState.spPerWave += 1; } }
    ]
  },
  survival: {
    name: 'Survival',
    color: 0x4444FF,
    skills: [
      { id: 'campfire_hp', name: 'Campfire HP', desc: '+20 max campfire HP', cost: 1, effect: () => { gameState.maxCampfireHP += 20; } },
      { id: 'player_hp', name: 'Player HP', desc: '+10 max player HP', cost: 2, effect: () => { gameState.maxPlayerHP += 10; } },
      { id: 'regen', name: 'Regeneration', desc: 'Slowly recover HP', cost: 3, effect: () => { gameState.regenRate += 1; } }
    ]
  }
};

export default class SkillTree {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.buttons = [];
    
    // Skill point gain per wave
    this.spPerWave = 1;
    
    this.createUI();
    
    // Toggle with K key (not TAB - it shifts browser focus)
    this.scene.input.keyboard.on('keydown-K', () => this.toggle());
  }

  createUI() {
    // Container
    this.container = this.scene.add.container(640, 360);
    this.container.setDepth(200);
    this.container.setVisible(false);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 800, 500, 0x111111, 0.95);
    bg.setStrokeStyle(2, 0xFFD700);
    this.container.add(bg);
    
    // Title
    const title = this.scene.add.text(0, -220, 'SKILL TREE', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#FFD700'
    }).setOrigin(0.5);
    this.container.add(title);
    
    // Close hint
    const hint = this.scene.add.text(0, 220, 'Press K to close', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888'
    }).setOrigin(0.5);
    this.container.add(hint);
    
    // Create skill branches
    let xOffset = -300;
    Object.entries(SKILL_TREE).forEach(([branchKey, branch]) => {
      this.createBranch(branchKey, branch, xOffset);
      xOffset += 250;
    });
  }

  createBranch(branchKey, branch, xOffset) {
    // Branch title
    const branchTitle = this.scene.add.text(xOffset, -150, branch.name, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#' + branch.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    this.container.add(branchTitle);
    
    // Skills
    let yOffset = -80;
    branch.skills.forEach((skill, index) => {
      const unlocked = gameState.unlockedSkills?.includes(skill.id);
      const canAfford = gameState.skillPoints >= skill.cost;
      
      // Skill box
      const boxColor = unlocked ? branch.color : (canAfford ? 0x555555 : 0x333333);
      const box = this.scene.add.rectangle(xOffset, yOffset, 180, 50, boxColor);
      box.setStrokeStyle(2, unlocked ? 0xFFD700 : 0x666666);
      box.setInteractive({ useHandCursor: true });
      this.container.add(box);
      
      // Skill name
      const nameColor = unlocked ? '#FFFFFF' : '#AAAAAA';
      const name = this.scene.add.text(xOffset, yOffset - 10, skill.name, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: nameColor
      }).setOrigin(0.5);
      this.container.add(name);
      
      // Cost
      const costText = this.scene.add.text(xOffset, yOffset + 12, `${skill.cost} SP`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: unlocked ? '#FFD700' : '#888888'
      }).setOrigin(0.5);
      this.container.add(costText);
      
      // Click handler
      if (!unlocked && canAfford) {
        box.on('pointerdown', () => this.unlockSkill(branchKey, skill));
        box.on('pointerover', () => box.setStrokeStyle(3, 0xFFFFFF));
        box.on('pointerout', () => box.setStrokeStyle(2, 0x666666));
      }
      
      yOffset += 70;
    });
  }

  unlockSkill(branchKey, skill) {
    if (!gameState.unlockedSkills) {
      gameState.unlockedSkills = [];
    }
    
    if (gameState.unlockedSkills.includes(skill.id)) return;
    if (gameState.skillPoints < skill.cost) return;
    
    gameState.skillPoints -= skill.cost;
    gameState.unlockedSkills.push(skill.id);
    skill.effect();
    
    // Refresh UI
    this.container.destroy();
    this.createUI();
    if (this.isOpen) this.container.setVisible(true);
    
    // Visual feedback
    const popup = this.scene.add.text(640, 300, `${skill.name} unlocked!`, {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#FFD700'
    }).setOrigin(0.5).setDepth(300);
    
    this.scene.tweens.add({
      targets: popup,
      y: 250,
      alpha: 0,
      duration: 1500,
      onComplete: () => popup.destroy()
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.container.setVisible(this.isOpen);
    
    if (this.isOpen) {
      // Refresh on open
      this.container.destroy();
      this.createUI();
      this.container.setVisible(true);
    }
  }

  update() {
    // Check SP per wave gain
    if (gameState.currentWave > 0 && this.spPerWave > 0) {
      // SP is granted in WaveManager
    }
  }
}
