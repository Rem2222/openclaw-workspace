import gameState from './GameState.js';

export const SKILL_TREE = {
  combat: {
    name: 'Combat',
    color: 0xFF4444,
    skills: [
      { id: 'attack_speed', name: 'Quick Strike', desc: '+20% attack speed', cost: 1, effect: () => { gameState.attackSpeed *= 1.2; }, perk: false },
      { id: 'damage', name: 'Power Hit', desc: '+5 damage per hit', cost: 2, effect: () => { gameState.damageBonus += 5; }, perk: false },
      { id: 'crit', name: 'Critical Eye', desc: '10% chance for 2x damage', cost: 3, effect: () => { gameState.critChance += 0.1; }, perk: true }
    ]
  },
  gathering: {
    name: 'Gathering',
    color: 0x44FF44,
    skills: [
      { id: 'auto_chop', name: 'Swift Chop', desc: 'Chop faster', cost: 1, effect: () => { gameState.chopSpeed *= 1.5; }, perk: true },
      { id: 'woodpile', name: 'Woodpile', desc: '+2 woodpile capacity', cost: 2, effect: () => { gameState.maxLogsCapacity += 2; }, perk: true },
      { id: 'more_logs', name: 'Lucky Logger', desc: '+1 log per tree', cost: 3, effect: () => { gameState.logsPerTree += 1; }, perk: false },
      { id: 'exp_boost', name: 'Explorer', desc: '+1 EXP per wave', cost: 4, effect: () => { gameState.expPerWave += 1; }, perk: false }
    ]
  },
  survival: {
    name: 'Survival',
    color: 0x4444FF,
    skills: [
      { id: 'campfire_hp', name: 'Sturdy Fire', desc: '+20 max campfire HP', cost: 1, effect: () => { gameState.maxCampfireHP += 20; }, perk: true },
      { id: 'player_hp', name: 'Vitality', desc: '+10 max player HP', cost: 2, effect: () => { gameState.maxPlayerHP += 10; }, perk: true },
      { id: 'regen', name: 'Recovery', desc: 'Slowly recover HP', cost: 3, effect: () => { gameState.regenRate += 1; }, perk: true }
    ]
  }
};

export default class SkillTree {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.buttons = [];
    
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
    
    // EXP display
    const spent = gameState.unlockedSkills?.length || 0;
    const available = gameState.experience;
    const total = spent + available;
    const expText = available > 0 
      ? `EXP: ${available} available / ${total} total` 
      : `All EXP spent (${spent} points)`;
    const expDisplay = this.scene.add.text(0, -185, expText, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: available > 0 ? '#44FF44' : '#888888'
    }).setOrigin(0.5);
    this.container.add(expDisplay);
    
    // Perk indicator
    const perkHint = this.scene.add.text(0, -160, '⚡ = Passive Perk (always active)', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888'
    }).setOrigin(0.5);
    this.container.add(perkHint);
    
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
    const branchTitle = this.scene.add.text(xOffset, -120, branch.name, {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#' + branch.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    this.container.add(branchTitle);
    
    // Skills
    let yOffset = -50;
    branch.skills.forEach((skill, index) => {
      const unlocked = gameState.unlockedSkills?.includes(skill.id);
      const canAfford = gameState.experience >= skill.cost;
      
      // Skill box
      const boxColor = unlocked ? branch.color : (canAfford ? 0x555555 : 0x333333);
      const box = this.scene.add.rectangle(xOffset, yOffset, 180, 60, boxColor);
      box.setStrokeStyle(2, unlocked ? 0xFFD700 : 0x666666);
      box.setInteractive({ useHandCursor: true });
      this.container.add(box);
      
      // Perk indicator
      const perkIcon = skill.perk ? ' ⚡' : '';
      const nameColor = unlocked ? '#FFFFFF' : '#AAAAAA';
      const name = this.scene.add.text(xOffset, yOffset - 12, skill.name + perkIcon, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: nameColor
      }).setOrigin(0.5);
      this.container.add(name);
      
      // Description
      const descColor = unlocked ? '#AADDAA' : '#666666';
      const desc = this.scene.add.text(xOffset, yOffset + 2, skill.desc, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: descColor
      }).setOrigin(0.5);
      this.container.add(desc);
      
      // Cost (only show if not unlocked)
      if (!unlocked) {
        const costText = this.scene.add.text(xOffset, yOffset + 20, `${skill.cost} EXP`, {
          fontSize: '12px',
          fontFamily: 'Arial',
          color: canAfford ? '#FFD700' : '#FF6666'
        }).setOrigin(0.5);
        this.container.add(costText);
      }
      
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
    if (gameState.experience < skill.cost) return;
    
    gameState.experience -= skill.cost;
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
    // Skill tree passive effects are applied via gameState modifiers
    // No per-frame logic needed
  }
}
