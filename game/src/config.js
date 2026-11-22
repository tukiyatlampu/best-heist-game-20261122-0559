// MERIDIAN — shared constants: tile size, palette, tools, scoring.
// One job: every number the rest of the game agrees on lives here.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 25;
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const COLORS = {
  floorA: '#171b28',
  floorB: '#141824',
  wall: '#2c3350',
  wallTop: '#454f78',
  rug: '#3a2330',
  crate: '#5a4632',
  crateTop: '#7a6248',
  display: '#1d2f45',
  displayGlass: '#9fd8ff',
  statue: '#6b7280',
  vent: '#232838',
  ventLine: '#3d4459',
  exit: '#1fae5f',
  exitGlow: '#46e08a',
  gold: '#f5c542',
  goldDark: '#c9931a',
  painting: '#e07a5f',
  cash: '#7ec850',
  target: '#ff5d8f',
  player: '#e8e6df',
  playerCloak: '#23283a',
  guard: '#3f6fb5',
  guardDark: '#2a4a7d',
  coneGuard: 'rgba(255, 196, 66, 0.20)',
  coneGuardEdge: 'rgba(255, 196, 66, 0.55)',
  coneCamera: 'rgba(255, 77, 77, 0.20)',
  coneCameraEdge: 'rgba(255, 77, 77, 0.55)',
  coneSafe: 'rgba(120, 220, 160, 0.10)',
  smoke: 'rgba(200, 205, 220, 0.55)',
  hudBg: 'rgba(5, 7, 14, 0.88)',
  hudLine: '#2c3350',
  text: '#e8e6df',
  textDim: '#9aa1b5',
  alarmLow: '#46e08a',
  alarmMid: '#f5c542',
  alarmHigh: '#ff4d4d',
};

// Tools: key, name, starting count, what it costs the player.
export const TOOL_DEFS = {
  smoke: { key: '1', name: 'SMOKE', count: 3, radius: 95, seconds: 6 },
  emp: { key: '2', name: 'EMP', count: 2, seconds: 8 },
  noise: { key: '3', name: 'NOISE', count: 3, radius: 280, range: 340 },
};

export const LOOT_VALUES = {
  cash: 300,
  painting: 500,
  gold: 800,
  target: 5000,
};

export const MISSIONS = [
  { name: 'I — THE MERIDIAN GALLERY', par: 150 },
  { name: 'II — THE VAULT FLOOR', par: 180 },
  { name: 'III — THE ROOFTOP GETAWAY', par: 180 },
];

// Final rank bands on total score.
export const RANKS = [
  { min: 24000, label: 'S — GHOST LEGEND' },
  { min: 19000, label: 'A — MASTERMIND' },
  { min: 14000, label: 'B — CLEAN PROFESSIONAL' },
  { min: 9000, label: 'C — LOUD AMATEUR' },
  { min: 0, label: 'D — BARELY MADE IT OUT' },
];
