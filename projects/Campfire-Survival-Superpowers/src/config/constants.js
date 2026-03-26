export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HP = 100;
export const PLAYER_ATTACK_DAMAGE = 10;
export const PLAYER_ATTACK_RANGE = 50;
export const PLAYER_ATTACK_COOLDOWN = 500;

export const CAMPFIRE_MAX_HP = 100;
export const CAMPFIRE_X = GAME_WIDTH / 2;
export const CAMPFIRE_Y = GAME_HEIGHT / 2;
export const CAMPFIRE_LIGHT_RADIUS = 300;

export const TREE_CHOP_TIME = 2000;
export const TREE_COUNT = 15;
export const TREE_SPAWN_MIN_DISTANCE = 200;

export const LOG_HEAL_VALUE = 10;
export const LOG_PICKUP_RANGE = 30;

export const MONSTER_SPAWN_MARGIN = 100;

export const PHASE_DURATIONS = {
  DAY: 60000,
  DUSK: 15000,
  DAWN: 10000
};

export const PHASE_COLORS = {
  DAY: 0x87CEEB,
  DUSK_START: 0x87CEEB,
  DUSK_END: 0x1a0a2e,
  NIGHT: 0x0a0a1e,
  DAWN_START: 0x0a0a1e,
  DAWN_END: 0x87CEEB
};

export const DARKNESS_ALPHA = {
  DAY: 0,
  DUSK: 0.6,
  NIGHT: 0.6,
  DAWN: 0
};

export const NIGHT_WAVES = 3;
