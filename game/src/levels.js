// MERIDIAN — the three jobs. Each map is 40 x 25 tiles, one character per tile:
//   # wall   . floor   C crate (cover)   D display case (cover)
//   S statue (cover)   V vent shaft (you cannot be seen standing in one)
//   E exit door   P player start   T target loot   G guard start
//   K camera mount   L loot   (gold / painting / cash assigned per level)
// Guards patrol the waypoint loops; cameras sweep between two angles.
// Tile coordinates are (col, row); pixel centre is (col*32+16, row*32+16).

export const LEVELS = [
  {
    name: 'I — THE MERIDIAN GALLERY',
    briefing:
      'The Meridian Gallery hangs the Star Sapphire tonight. Two guards walk the floor, one camera watches the vault door. Slip in through the service entrance, lift the sapphire, and leave by the south door.',
    par: 150,
    seed: 101,
    map: [
      '########################################',
      '#VVVV.....#.........#........VVVV......#',
      '#.........#....T....#..................#',
      '#....D....#.........#....L........L....#',
      '#.........#.........#..................#',
      '#....S....D....D....D....S........D....#',
      '#.........#.........#..................#',
      '#.###.....#.........#.....###......#...#',
      '#......................................#',
      '#..L.....C.....C........C.....C.....L..#',
      '#......................................#',
      '#.###...S..........S...........S...###.#',
      '#......................................#',
      '#....D.....D.....G......D.....D.....D..#',
      '#......................................#',
      '#.###..........#.....#...........###...#',
      '#.......L.......#..G..#.......L........#',
      '#...............#.....#................#',
      '#...C....C......#.....#......C....C....#',
      '#...............#.....#................#',
      '#......D....S...#..K..#...S....D.......#',
      '#......................................#',
      '#......................................#',
      '#..P.................................E.#',
      '########################################',
    ],
    guards: [
      { x: 17, y: 13, waypoints: [[17, 12], [30, 12], [30, 10], [12, 10], [12, 12]], pause: 1.4 },
      { x: 19, y: 16, waypoints: [[19, 21], [30, 21], [30, 23], [8, 23], [8, 21]], pause: 1.0 },
    ],
    cameras: [
      { x: 20, y: 20, base: Math.PI / 2, sweep: 1.1, speed: 0.45 },
    ],
  },
  {
    name: 'II — THE VAULT FLOOR',
    briefing:
      'Below the gallery sits the vault floor: the Meridian Gold Reserve. Three guards, two cameras, and a lot of open marble. The vents along the north wall are your friends — nobody can see you inside one.',
    par: 180,
    seed: 202,
    map: [
      '########################################',
      '#VVVV....VVVV....VVVV....VVVV..........#',
      '#......................................#',
      '#..#....#....#.....#.....#....#....#...#',
      '#..#....#....#..T..#.....#....#....#...#',
      '#..#....#....#.....#.....#....#....#...#',
      '#..#....#....#.....#.....#....#....#...#',
      '#..#....#....#.....#.....#....#....#...#',
      '#......................................#',
      '#...D......D.......D.......D......D....#',
      '#......................................#',
      '#..L....C....S.........S....C....L.....#',
      '#......................................#',
      '#....###.........G.........###.........#',
      '#......................................#',
      '#..C.....D....#.......#....D.....C.....#',
      '#.............#..K....#................#',
      '#..L..........#.......#..........L.....#',
      '#.............#.......#................#',
      '#....S....#...#...G...#...#....S.......#',
      '#.........#...#.......#...#............#',
      '#..C......#...#...K...#...#......C.....#',
      '#......................................#',
      '#..P................G................E.#',
      '########################################',
    ],
    guards: [
      { x: 17, y: 13, waypoints: [[17, 12], [33, 12], [33, 10], [6, 10], [6, 12]], pause: 1.2 },
      { x: 18, y: 19, waypoints: [[18, 14], [30, 14], [30, 12], [9, 12], [9, 14]], pause: 1.0 },
      { x: 20, y: 23, waypoints: [[20, 23], [36, 23], [36, 17], [24, 17], [24, 23]], pause: 1.6 },
    ],
    cameras: [
      { x: 18, y: 16, base: Math.PI / 2, sweep: 1.2, speed: 0.5 },
      { x: 18, y: 21, base: -Math.PI / 2, sweep: 1.2, speed: 0.5 },
    ],
  },
  {
    name: 'III — THE ROOFTOP GETAWAY',
    briefing:
      'Last job: the penthouse roof. The Meridian Ledger sits in the sky lounge, and the helicopter waits on the pad. Three guards, three cameras, one way out — grab the ledger and run for the pad.',
    par: 180,
    seed: 303,
    map: [
      '########################################',
      '#VVVV.....#..........#......VVVV.......#',
      '#.........#....T.....#.................#',
      '#....L....#..........#....L........L...#',
      '#.........#..........#.................#',
      '#....S....D....D.....D....S........D...#',
      '#.........#..........#.................#',
      '#.###.....#..........#.....###.....#...#',
      '#......................................#',
      '#..L....C.....C..........C.....C....L..#',
      '#......................................#',
      '#.###...S......G....K......S....###....#',
      '#......................................#',
      '#....D.....D..........D.....D......D...#',
      '#......................................#',
      '#..C....#....#....#....#....#....C.....#',
      '#.......#....#..K.#....#....#..........#',
      '#..L....#....#....#....#....#....L.....#',
      '#.......#....#....#....#....#..........#',
      '#....S..#....#..G.#....#..S....D.......#',
      '#.......#....#....#....#....#..........#',
      '#..C....#....#..K.#....#....#....C.....#',
      '#......................................#',
      '#..P................G................E.#',
      '########################################',
    ],
    guards: [
      { x: 15, y: 11, waypoints: [[15, 11], [24, 11], [24, 8], [10, 8], [10, 11]], pause: 1.2 },
      { x: 16, y: 19, waypoints: [[16, 23], [34, 23], [34, 22], [16, 22]], pause: 1.0 },
      { x: 20, y: 23, waypoints: [[20, 14], [32, 14], [32, 12], [10, 12], [10, 14]], pause: 1.4 },
    ],
    cameras: [
      { x: 16, y: 16, base: Math.PI / 2, sweep: 1.0, speed: 0.55 },
      { x: 16, y: 21, base: -Math.PI / 2, sweep: 1.0, speed: 0.55 },
      { x: 20, y: 11, base: 0, sweep: 1.3, speed: 0.4 },
    ],
  },
];

// Parse one level map into a grid plus the things standing on it.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const loot = [];
  let spawn = { x: 2, y: 23 };
  let exit = { x: 37, y: 23 };
  let targetSpot = null;
  const guardSpawns = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c === 'P') { spawn = { x, y }; grid[y][x] = '.'; }
      if (c === 'E') { exit = { x, y }; grid[y][x] = '.'; }
      if (c === 'G') { guardSpawns.push({ x, y }); grid[y][x] = '.'; }
      if (c === 'K') { grid[y][x] = '.'; }
      if (c === 'T') { targetSpot = { x, y }; grid[y][x] = '.'; }
      if (c === 'L') { loot.push({ x, y, kind: 'loot' }); grid[y][x] = '.'; }
    }
  }
  return { def, grid, spawn, exit, targetSpot, guardSpawns, loot };
}

// A tile blocks movement and line of sight.
export function isBlocking(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return true;
  const c = grid[ty][tx];
  return c === '#' || c === 'C' || c === 'D' || c === 'S';
}

// A tile blocks sight only (same set for this game).
export function isSightBlocking(grid, tx, ty) {
  return isBlocking(grid, tx, ty);
}

export function tileAt(grid, px, py) {
  const tx = Math.floor(px / 32);
  const ty = Math.floor(py / 32);
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return '#';
  return grid[ty][tx];
}
