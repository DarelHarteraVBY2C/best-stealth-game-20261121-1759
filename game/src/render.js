// Silent Shadow — the drawing.
// One canvas, scaled to the window, with the logical field (960 by 640)
// letterboxed inside it. Paint order matters: the floor, the exit and
// the gems, then each guard's vision cone (as a polygon ray-cast against
// the walls, so a cone stops where a wall or crate stands), then the
// walls and crates on top, then the guards, the thief, the light and the
// HUD. Screens (title, paused, caught, level clear, win) are drawn over
// the same field.
import { TILE, FIELD_W, FIELD_H, COLORS, GUARD } from './config.js';
import { isOpaque } from './level.js';
import { GUARD_CHASE } from './guards.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_CAUGHT = 3;
export const SCREEN_CLEAR = 4;
export const SCREEN_WIN = 5;

const CONE_RAYS = 26;
const RAY_STEP = 8;

/** March a ray from (x, y) along `angle` until it hits an opaque tile or `max` px. */
function rayHit(level, x, y, angle, max) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let d = 0;
  while (d < max) {
    d += RAY_STEP;
    const px = x + dx * d;
    const py = y + dy * d;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (isOpaque(level, col, row)) return d;
  }
  return max;
}

/** The cone's outline: the guard plus one point per ray across the cone. */
function conePoints(level, guard, range) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a = guard.angle - GUARD.halfAngle + (2 * GUARD.halfAngle * i) / CONE_RAYS;
    const d = rayHit(level, guard.x, guard.y, a, range);
    points.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return points;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(canvas.width / FIELD_W, 0, 0, canvas.height / FIELD_H, 0, 0);
  }

  function drawFloor(level) {
    for (let row = 0; row < level.tiles.length; row += 1) {
      for (let col = 0; col < level.tiles[row].length; col += 1) {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
  }

  function drawExit(exit, time) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 3);
    ctx.save();
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillStyle = COLORS.exitGlow;
    ctx.fillRect(exit.x - 34, exit.y - 34, 68, 68);
    ctx.restore();
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(exit.x - 20, exit.y - 22, 40, 44);
    ctx.fillStyle = '#0c2b18';
    ctx.fillRect(exit.x - 14, exit.y - 16, 28, 32);
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', exit.x, exit.y - 32);
  }

  function drawGems(gems, time) {
    for (const gem of gems) {
      if (gem.taken) continue;
      const bob = Math.sin(time * 2 + gem.x) * 2;
      const s = 9;
      ctx.save();
      ctx.translate(gem.x, gem.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.gem;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  function drawCone(level, guard, range, hot) {
    const pts = conePoints(level, guard, range);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = hot ? COLORS.coneHot : COLORS.coneCalm;
    ctx.fill();
  }

  function drawWalls(level) {
    for (let row = 0; row < level.tiles.length; row += 1) {
      for (let col = 0; col < level.tiles[row].length; col += 1) {
        const ch = level.tiles[row][col];
        if (ch === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(col * TILE, row * TILE, TILE, 4);
        } else if (ch === 'C') {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);
          ctx.beginPath();
          ctx.moveTo(col * TILE + 2, row * TILE + 2);
          ctx.lineTo(col * TILE + TILE - 2, row * TILE + TILE - 2);
          ctx.moveTo(col * TILE + TILE - 2, row * TILE + 2);
          ctx.lineTo(col * TILE + 2, row * TILE + TILE - 2);
          ctx.stroke();
        }
      }
    }
  }

  function drawGuard(level, guard, sightBoost) {
    const hot = guard.mode === GUARD_CHASE || guard.suspicion > 55;
    drawCone(level, guard, GUARD.sightRange * sightBoost, hot);
    ctx.fillStyle = guard.mode === GUARD_CHASE ? COLORS.guard : COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick, so the patrol direction reads at a glance.
    ctx.strokeStyle = '#ffd6d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 6), guard.y + Math.sin(guard.angle) * (GUARD.radius + 6));
    ctx.stroke();
    // Suspicion: "!" when it has you, "?" while it is losing you.
    if (guard.mode === GUARD_CHASE) {
      drawMark(guard.x, guard.y - 26, '!', '#ff5040');
    } else if (guard.suspicion > 25) {
      drawMark(guard.x, guard.y - 26, '?', '#ffd65a');
    }
    // Suspicion bar under a guard that is onto something.
    if (guard.suspicion > 5) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(guard.x - 16, guard.y + 18, 32, 5);
      ctx.fillStyle = guard.suspicion > 55 ? '#ff5040' : '#ffd65a';
      ctx.fillRect(guard.x - 16, guard.y + 18, 32 * (guard.suspicion / 100), 5);
    }
  }

  function drawMark(x, y, text, colour) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  }

  function drawPlayer(player) {
    if (player.sneaking) {
      ctx.strokeStyle = 'rgba(232,228,216,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 18 + Math.sin(player.stepPhase * 2) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.playerRim;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    // Hood peak: a small pale triangle pointing where the thief faces.
    ctx.fillStyle = COLORS.playerRim;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(8,10,14,0.72)';
    ctx.fillRect(0, 0, FIELD_W, 34);
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`LEVEL ${state.levelIndex + 1} — ${state.levelName}`, 12, 17);
    ctx.fillText(`GEMS ${state.gemsGot}/${state.gemsTotal}`, 330, 17);
    ctx.fillText(`SCORE ${state.score}`, 470, 17);
    // Alarm meter.
    ctx.fillStyle = COLORS.hudDim;
    ctx.fillText('ALARM', 640, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(700, 10, 130, 14);
    ctx.fillStyle = state.alarm > 70 ? COLORS.alarm : '#ffd65a';
    ctx.fillRect(700, 10, 130 * Math.min(1, state.alarm / 100), 14);
    if (state.alarmLockdown) {
      ctx.fillStyle = COLORS.alarm;
      ctx.textAlign = 'right';
      ctx.fillText('LOCKDOWN', FIELD_W - 12, 17);
      ctx.textAlign = 'left';
    }
    // Controls hint along the bottom edge, over the border wall.
    ctx.fillStyle = 'rgba(8,10,14,0.72)';
    ctx.fillRect(0, FIELD_H - 24, FIELD_W, 24);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows move · hold SHIFT to sneak · P pause · R restart · M mute', FIELD_W / 2, FIELD_H - 12);
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, lines) {
    ctx.fillStyle = 'rgba(6,8,12,0.72)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, FIELD_W / 2, FIELD_H / 2 - 70);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = COLORS.hudDim;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD_W / 2, FIELD_H / 2 - 18 + i * 28);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, time) {
    resize();
    const level = state.level;
    const sightBoost = state.alarmLockdown ? 1.2 : 1;
    drawFloor(level);
    drawExit(level.exit, time);
    drawGems(level.gems, time);
    for (const guard of state.guards) drawGuard(level, guard, sightBoost);
    drawWalls(level);
    drawPlayer(state.player);
    // Soft dark edge so the centre of the room reads as lit.
    const grad = ctx.createRadialGradient(FIELD_W / 2, FIELD_H / 2, FIELD_H * 0.35, FIELD_W / 2, FIELD_H / 2, FIELD_H * 0.85);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawOverlay('SILENT SHADOW', [
        'A thief, a museum, and three floors of guards.',
        'Reach the green EXIT unseen. Gems are optional — and risky.',
        'WASD or arrows to move · hold SHIFT to sneak · M to mute',
        'Press SPACE or click to begin',
      ]);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Press P or SPACE to keep sneaking.']);
    } else if (screen === SCREEN_CAUGHT) {
      drawOverlay('CAUGHT!', [
        `A guard laid hands on you on level ${state.levelIndex + 1}.`,
        'Press R to try the floor again.',
      ]);
    } else if (screen === SCREEN_CLEAR) {
      drawOverlay('FLOOR CLEAR', [
        `${state.levelName} done. Score ${state.score}.`,
        'Press SPACE for the next floor.',
      ]);
    } else if (screen === SCREEN_WIN) {
      drawOverlay('GHOST OF THE MUSEUM', [
        `All three floors cleared. Final score ${state.score}.`,
        'Not a single alarm that mattered. Press SPACE to play again.',
      ]);
    }
  }

  return { draw, resize };
}
