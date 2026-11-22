// Silent Shadow — the screenshot scenes behind ?shot=cover|patrol|alarm|win.
// Each one plays the real rules forward from a fresh level for a fixed
// time, steered by a cautious autopilot (walk toward the next waypoint,
// freeze the moment any guard's cone touches you), so the frame is what
// a real game looks like and the same seed always gives the same frame.
// ?shot= also paints the scene twice and sets window.__shotReady.
import { STEP, GUARD, TILE } from './config.js';
import { inVisionCone } from './sight.js';
import { EVENT_CAUGHT, EVENT_CLEAR } from './game.js';
import { SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_WIN, SCREEN_TITLE } from './render.js';

function seesThief(state) {
  const p = state.player;
  for (const guard of state.guards) {
    if (inVisionCone(state.level, guard.x, guard.y, guard.angle,
      GUARD.sightRange, GUARD.halfAngle, p.x, p.y, p.sneaking ? 0.7 : 1)) return true;
  }
  return false;
}

/** Toward `target` (tile coords) when unseen, still when a cone touches you. */
function cautious(state, target) {
  if (seesThief(state)) return { x: 0, y: 0 };
  const tx = target[0] * TILE + TILE / 2;
  const ty = target[1] * TILE + TILE / 2;
  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 8) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}

function toTile(state, target) {
  const tx = target[0] * TILE + TILE / 2;
  const ty = target[1] * TILE + TILE / 2;
  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 8) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}

function runSteps(game, seconds, drive) {
  const steps = Math.round(seconds / STEP);
  let events = 0;
  for (let i = 0; i < steps; i += 1) {
    const dir = drive(game.state);
    events = game.step(STEP, dir, false);
    if (events & (EVENT_CAUGHT | EVENT_CLEAR)) break;
  }
  return events;
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * cover: mid-level sneak. patrol: the opening, a cone sweeping by.
 * alarm: the thief stands in a cone until a guard gives chase. win: the
 * thief clears the first floor (cautious autopilot, up to 90 seconds).
 */
export function stageShot(name, game) {
  if (name === 'alarm') {
    game.loadLevel(1);
    // Walk onto guard A's patrol line and stand there until it chases.
    runSteps(game, 6, (s) => toTile(s, [7, 10]));
    let chased = false;
    for (let i = 0; i < 600 && !chased; i += 1) {
      game.step(STEP, { x: 0, y: 0 }, false);
      chased = game.state.guards.some((g) => g.mode === 1);
    }
    // Let the chase run a beat so the red cone and alarm read clearly.
    for (let i = 0; i < 45; i += 1) game.step(STEP, { x: 0, y: 0 }, false);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    game.loadLevel(0);
    // Down the clear left edge, then right along the clear bottom row to
    // the exit door itself (tile 23,18): both legs are axis-aligned
    // through open floor, so the thief never pushes against a crate.
    // The cautious pilot still waits out cones.
    const path = [[1, 18], [23, 18]];
    let leg = 0;
    let events = 0;
    for (let i = 0; i < 90 / STEP; i += 1) {
      const dir = cautious(game.state, path[leg]);
      events = game.step(STEP, dir, false);
      if (events & EVENT_CLEAR) break;
      if (events & EVENT_CAUGHT) break;
      const tx = path[leg][0] * TILE + TILE / 2;
      const ty = path[leg][1] * TILE + TILE / 2;
      if (Math.hypot(tx - game.state.player.x, ty - game.state.player.y) < 10 && leg < path.length - 1) leg += 1;
    }
    return { screen: events & EVENT_CLEAR ? SCREEN_CLEAR : SCREEN_PLAY };
  }
  if (name === 'patrol') {
    game.loadLevel(0);
    runSteps(game, 7, (s) => cautious(s, [10, 6]));
    return { screen: SCREEN_PLAY };
  }
  // cover (and anything else): a mid-level sneak with a cone nearby.
  game.loadLevel(0);
  runSteps(game, 14, (s) => cautious(s, [16, 8]));
  return { screen: SCREEN_PLAY };
}
