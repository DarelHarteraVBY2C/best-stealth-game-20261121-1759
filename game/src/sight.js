// Silent Shadow — what a guard can see.
// A guard sees the thief when the thief is inside its vision cone (close
// enough and inside the angle) and no wall or crate stands between them.
// Sight is tested by walking the segment in small steps and asking the
// level whether each step lands inside an opaque tile.
import { TILE } from './config.js';
import { isOpaque } from './level.js';

const STEP_PX = 6;

/** True when the straight line from (x0, y0) to (x1, y1) crosses no opaque tile. */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / STEP_PX));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const col = Math.floor((x0 + dx * t) / TILE);
    const row = Math.floor((y0 + dy * t) / TILE);
    if (isOpaque(level, col, row)) return false;
  }
  return true;
}

/**
 * True when a guard at (gx, gy) facing `angle` can see a point (px, py):
 * inside `range`, inside the cone's half-angle, and with a clear line.
 * `veil` shrinks the range (a sneaking thief is harder to spot).
 */
export function inVisionCone(level, gx, gy, angle, range, halfAngle, px, py, veil = 1) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > range * veil) return false;
  if (dist < 1) return true;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  return hasLineOfSight(level, gx, gy, px, py);
}
