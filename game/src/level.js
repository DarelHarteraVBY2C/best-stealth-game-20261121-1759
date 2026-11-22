// Silent Shadow — the three museum floors and the tile rules.
// A level is 20 rows of 30 characters. '#' is a wall, 'C' a crate: both
// block movement and block a guard's sight, so a crate is cover. '.' is
// floor. 'P' is where the thief starts, 'E' the exit door, '*' a gem to
// steal, 'G' where a guard starts (its patrol is listed beside the map).
import { COLS, ROWS, TILE } from './config.js';

export const SOLID = '#C';
export const OPAQUE = '#C';

const LEVEL_1 = {
  name: 'The Gallery',
  map: [
    '##############################',
    '#P..........C......*.........#',
    '#............................#',
    '#....C...........C...........#',
    '#............................#',
    '#.......G....................#',
    '#....C...........C.....C.....#',
    '#............................#',
    '#..........C.................#',
    '#............................#',
    '#....*...........C.....G.....#',
    '#............................#',
    '#....C...........C...........#',
    '#............................#',
    '#..........C..........C......#',
    '#............................#',
    '#....C......*......C.........#',
    '#............................#',
    '#......................E.....#',
    '##############################',
  ],
  guards: [
    { at: [8, 5], route: [[8, 5], [8, 14]] },
    { at: [22, 10], route: [[22, 10], [22, 16]] },
  ],
};

const LEVEL_2 = {
  name: 'The Vault',
  map: [
    '##############################',
    '#P.....C.......#......*......#',
    '#.............#..............#',
    '#..C.....C....#...C.....C....#',
    '#.............#..............#',
    '#......G......#......G.......#',
    '#..C.....C....#...C.....C....#',
    '#.............#..............#',
    '#.............#..C...........#',
    '#..C.....C...................#',
    '#.....*.......#......C....G..#',
    '#.............#..............#',
    '#..C.....C....#...C.....C....#',
    '#.............#..............#',
    '#......C......#......C.......#',
    '#.............#..............#',
    '#..C.....C....#...C.....C....#',
    '#.....*.......#..............#',
    '#.............#.........E....#',
    '##############################',
  ],
  guards: [
    { at: [7, 5], route: [[7, 5], [7, 12]] },
    { at: [21, 5], route: [[21, 5], [26, 5]] },
    { at: [26, 10], route: [[26, 10], [26, 17]] },
  ],
};

const LEVEL_3 = {
  name: 'The Rooftop',
  map: [
    '##############################',
    '#P...C....#.....*....C.......#',
    '#..........#.................#',
    '#..C....C..#..C....C....C....#',
    '#..........#.................#',
    '#....G.....#....G............#',
    '#..C....C..#..C....C....C....#',
    '#..........#.................#',
    '#....C.....#....C.....C......#',
    '#............................#',
    '#..*....C..#..C....C....G....#',
    '#..........#.................#',
    '#....C.....#....C.....C......#',
    '#..........#.................#',
    '#..C....C..#..C....C....C....#',
    '#..........#.................#',
    '#....G.....#....G.....C......#',
    '#..........#.................#',
    '#..*....C..#.......C....E....#',
    '##############################',
  ],
  guards: [
    { at: [5, 5], route: [[5, 5], [5, 7]] },
    { at: [16, 5], route: [[16, 5], [16, 7]] },
    { at: [26, 10], route: [[26, 10], [26, 13]] },
    { at: [5, 16], route: [[5, 16], [5, 18]] },
    { at: [16, 16], route: [[16, 16], [16, 18]] },
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

/** Read one level into the pieces the game plays with. */
export function parseLevel(def) {
  const tiles = def.map.map((row) => row.split(''));
  let start = null;
  let exit = null;
  const gems = [];
  const guardStarts = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tiles[row][col];
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      if (ch === 'P') start = { x: cx, y: cy };
      else if (ch === 'E') exit = { x: cx, y: cy, col, row };
      else if (ch === '*') gems.push({ x: cx, y: cy, taken: false });
      else if (ch === 'G') guardStarts.push({ x: cx, y: cy });
    }
  }
  return { name: def.name, tiles, start, exit, gems, guardStarts, patrols: def.guards };
}

export function tileAt(level, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return level.tiles[row][col];
}

export function isSolid(level, col, row) {
  return SOLID.includes(tileAt(level, col, row));
}

export function isOpaque(level, col, row) {
  return OPAQUE.includes(tileAt(level, col, row));
}

/** Does a circle of `radius` at (x, y) touch any solid tile? */
export function hitsWall(level, x, y, radius) {
  const c0 = Math.floor((x - radius) / TILE);
  const c1 = Math.floor((x + radius) / TILE);
  const r0 = Math.floor((y - radius) / TILE);
  const r1 = Math.floor((y + radius) / TILE);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      if (!isSolid(level, col, row)) continue;
      const left = col * TILE;
      const top = row * TILE;
      const nx = Math.max(left, Math.min(x, left + TILE));
      const ny = Math.max(top, Math.min(y, top + TILE));
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}
