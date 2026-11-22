// Silent Shadow — the thief.
// Moves with a direction vector (from the keys), walks fast, sneaks at
// half speed, and slides along walls instead of sticking to them. Picks
// up a gem by walking over it, and wins the level by reaching the exit.
import { PLAYER } from './config.js';
import { hitsWall } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    sneaking: false,
    moving: false,
    stepPhase: 0,
  };
}

export function resetPlayer(player, start) {
  player.x = start.x;
  player.y = start.y;
  player.sneaking = false;
  player.moving = false;
  player.stepPhase = 0;
}

/**
 * Move the thief one step. `dir` is { x, y } already normalised (or zero).
 * Returns the gems picked up this step.
 */
export function stepPlayer(player, dt, dir, sneaking, level, gems) {
  player.sneaking = sneaking;
  const speed = sneaking ? PLAYER.sneak : PLAYER.walk;
  const len = Math.hypot(dir.x, dir.y);
  player.moving = len > 0;
  if (player.moving) {
    const nx = player.x + (dir.x / len) * speed * dt;
    const ny = player.y + (dir.y / len) * speed * dt;
    if (!hitsWall(level, nx, player.y, PLAYER.radius)) player.x = nx;
    if (!hitsWall(level, player.x, ny, PLAYER.radius)) player.y = ny;
    player.stepPhase += (speed * dt) / 26;
  }
  const picked = [];
  for (const gem of gems) {
    if (gem.taken) continue;
    if (Math.hypot(gem.x - player.x, gem.y - player.y) < PLAYER.radius + 14) {
      gem.taken = true;
      picked.push(gem);
    }
  }
  return picked;
}

/** True when the thief stands on the exit door. */
export function onExit(player, exit) {
  return Math.hypot(exit.x - player.x, exit.y - player.y) < 26;
}
