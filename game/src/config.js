// Silent Shadow — the numbers every other file agrees on.
// One logical field: 30 by 20 tiles of 32 px (960 by 640), scaled to the window.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const FIELD_W = COLS * TILE;
export const FIELD_H = ROWS * TILE;

export const STEP = 1 / 60;
export const BEST_KEY = 'silent-shadow-best';

// The player: quick on foot, half speed and harder to spot while sneaking.
export const PLAYER = {
  radius: 12,
  walk: 150,
  sneak: 74,
  // A sneaking player is spotted from this much less far away.
  sneakVeil: 0.7,
};

// A guard: patrol speed, chase speed, how far and wide it sees, and how
// fast suspicion grows while it watches you (faster the closer you are).
export const GUARD = {
  radius: 13,
  patrol: 56,
  chase: 98,
  sightRange: 172,
  halfAngle: 0.66,
  pause: 0.8,
  suspicionRate: 58,
  suspicionClose: 95,
  suspicionDrain: 26,
  chaseGiveUp: 3.0,
  touch: 26,
};

// The alarm: rises while any guard is suspicious or chasing, falls when calm.
// At full it locks the museum down until it drains back.
export const ALARM = {
  rise: 13,
  fall: 9,
  lockdownAt: 100,
  lockdownUntil: 30,
  lockdownSpeed: 1.25,
  lockdownSight: 1.2,
};

export const SCORE = {
  gem: 100,
  level: 250,
  timeBonus: 150,
  timeBonusSeconds: 90,
};

// Colours, kept in one place so the look stays consistent.
export const COLORS = {
  floorA: '#20242e',
  floorB: '#232833',
  wall: '#3a4152',
  wallTop: '#4d5870',
  crate: '#7a5a34',
  crateEdge: '#a07d4a',
  exit: '#37d67a',
  exitGlow: '#1d7a44',
  gem: '#59d6ff',
  player: '#14161f',
  playerRim: '#e8e4d8',
  guard: '#e2483d',
  guardDark: '#8f1f18',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneHot: 'rgba(255, 80, 60, 0.30)',
  hud: '#e8e4d8',
  hudDim: '#9aa3b2',
  alarm: '#ff5040',
};
