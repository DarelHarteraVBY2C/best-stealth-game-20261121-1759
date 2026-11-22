// Silent Shadow — the guards.
// A guard walks its patrol route, pausing at each waypoint, and sweeps a
// vision cone ahead of it. When it sees the thief its suspicion rises
// (faster the closer the thief is); at full it gives chase to the last
// place it saw the thief. Lose it for a while and it goes back to its
// patrol, suspicion cooling — so a near miss is a scare, not a sentence.
// A guard that touches the thief catches them.
import { TILE } from './config.js';
import { GUARD } from './config.js';
import { inVisionCone } from './sight.js';
import { hitsWall } from './level.js';

export const GUARD_PATROL = 0;
export const GUARD_CHASE = 1;

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function turnToward(angle, target, maxTurn) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxTurn) return target;
  return angle + Math.sign(diff) * maxTurn;
}

export function createGuard(def, level, index) {
  const route = def.route.map(([col, row]) => ({
    x: col * TILE + TILE / 2,
    y: row * TILE + TILE / 2,
  }));
  return {
    x: def.at[0] * TILE + TILE / 2,
    y: def.at[1] * TILE + TILE / 2,
    angle: 0,
    route,
    leg: 1,
    pause: 0,
    mode: GUARD_PATROL,
    suspicion: 0,
    lastSeen: null,
    unseenFor: 0,
    index,
  };
}

/**
 * One step of a guard. Returns 'caught' when it touches the thief.
 * `thief` is { x, y, sneaking }. `alarm` carries the lockdown boost.
 */
export function stepGuard(guard, dt, level, thief, alarm) {
  const speedBoost = alarm.lockdown ? alarm.speedBoost : 1;
  const sightBoost = alarm.lockdown ? alarm.sightBoost : 1;
  const veil = thief.sneaking ? 0.7 : 1;
  const seen = inVisionCone(
    level, guard.x, guard.y, guard.angle,
    GUARD.sightRange * sightBoost, GUARD.halfAngle,
    thief.x, thief.y, veil,
  );
  const dist = Math.hypot(thief.x - guard.x, thief.y - guard.y);

  if (seen) {
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.unseenFor = 0;
    const closeness = Math.max(0, 1 - dist / (GUARD.sightRange * sightBoost));
    const rate = GUARD.suspicionRate + closeness * (GUARD.suspicionClose - GUARD.suspicionRate);
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    if (guard.suspicion >= 100 && guard.mode !== GUARD_CHASE) guard.mode = GUARD_CHASE;
  } else {
    guard.unseenFor += dt;
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDrain * dt);
    if (guard.mode === GUARD_CHASE && guard.unseenFor >= GUARD.chaseGiveUp) {
      guard.mode = GUARD_PATROL;
      guard.suspicion = 40;
      guard.lastSeen = null;
    }
  }

  if (guard.mode === GUARD_CHASE && guard.lastSeen) {
    const target = guard.lastSeen;
    const want = angleTo(guard, target);
    guard.angle = turnToward(guard.angle, want, dt * 6);
    moveToward(guard, target, GUARD.chase * speedBoost, dt, level);
    if (Math.hypot(target.x - guard.x, target.y - guard.y) < 6) {
      guard.lastSeen = null;
    }
  } else {
    const target = guard.route[guard.leg];
    if (guard.pause > 0) {
      guard.pause -= dt;
      const want = angleTo(guard, target);
      guard.angle = turnToward(guard.angle, want, dt * 2);
    } else {
      const want = angleTo(guard, target);
      guard.angle = turnToward(guard.angle, want, dt * 4);
      moveToward(guard, target, GUARD.patrol * speedBoost, dt, level);
      if (Math.hypot(target.x - guard.x, target.y - guard.y) < 4) {
        guard.leg = (guard.leg + 1) % guard.route.length;
        guard.pause = GUARD.pause;
      }
    }
  }

  if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.touch) return 'caught';
  return null;
}

function moveToward(guard, target, speed, dt, level) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  if (!hitsWall(level, nx, guard.y, GUARD.radius)) guard.x = nx;
  if (!hitsWall(level, guard.x, ny, GUARD.radius)) guard.y = ny;
}
