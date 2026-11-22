// Silent Shadow — the game itself: state, levels, alarm and score.
// No drawing and no browser in here: step() advances one fixed step from
// a movement direction and returns what happened as flags, so the live
// loop and the screenshot autopilot drive the same rules. The alarm is
// the museum's mood: it rises while any guard is suspicious or chasing
// and falls when things calm down; at full it locks down (guards faster,
// sharper eyes) until it drains back.
import { ALARM, SCORE } from './config.js';
import { LEVELS, parseLevel } from './level.js';
import { createGuard, stepGuard, GUARD_CHASE } from './guards.js';
import { createPlayer, resetPlayer, stepPlayer, onExit } from './player.js';

export const EVENT_NONE = 0;
export const EVENT_GEM = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_CLEAR = 4;

export function createGame() {
  const state = {
    levelIndex: 0,
    levelName: '',
    level: null,
    player: null,
    guards: [],
    score: 0,
    gemsGot: 0,
    gemsTotal: 0,
    alarm: 0,
    alarmLockdown: false,
    levelTime: 0,
    time: 0,
  };

  function loadLevel(index) {
    state.levelIndex = index;
    const parsed = parseLevel(LEVELS[index]);
    state.levelName = parsed.name;
    state.level = parsed;
    state.gemsTotal = parsed.gems.length;
    state.gemsGot = 0;
    state.alarm = 0;
    state.alarmLockdown = false;
    state.levelTime = 0;
    state.player = createPlayer(parsed.start);
    state.guards = parsed.patrols.map((def, i) => createGuard(def, parsed, i));
  }

  function reset() {
    state.score = 0;
    loadLevel(0);
  }

  function step(dt, dir, sneaking) {
    state.time += dt;
    state.levelTime += dt;
    let events = EVENT_NONE;
    const picked = stepPlayer(state.player, dt, dir, sneaking, state.level, state.level.gems);
    if (picked.length > 0) {
      state.gemsGot += picked.length;
      state.score += SCORE.gem * picked.length;
      events |= EVENT_GEM;
    }
    const alarmState = {
      lockdown: state.alarmLockdown,
      speedBoost: ALARM.lockdownSpeed,
      sightBoost: ALARM.lockdownSight,
    };
    let anyHot = false;
    for (const guard of state.guards) {
      const result = stepGuard(guard, dt, state.level, state.player, alarmState);
      if (result === 'caught') events |= EVENT_CAUGHT;
      if (guard.mode === GUARD_CHASE || guard.suspicion > 50) anyHot = true;
    }
    if (anyHot) state.alarm = Math.min(100, state.alarm + ALARM.rise * dt);
    else state.alarm = Math.max(0, state.alarm - ALARM.fall * dt);
    if (!state.alarmLockdown && state.alarm >= ALARM.lockdownAt) state.alarmLockdown = true;
    if (state.alarmLockdown && state.alarm <= ALARM.lockdownUntil) state.alarmLockdown = false;
    if (events & EVENT_CAUGHT) return events;
    if (onExit(state.player, state.level.exit)) {
      const bonus = Math.max(0, SCORE.timeBonus - Math.floor(state.levelTime / 10) * 10);
      state.score += SCORE.level + bonus;
      events |= EVENT_CLEAR;
    }
    return events;
  }

  reset();
  return { state, loadLevel, reset, step };
}
