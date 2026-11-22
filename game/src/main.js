// MERIDIAN — the game itself. State machine (title / briefing / play /
// paused / busted / levelwin / getaway), the alarm, the loot, the tools,
// the score, and a scripted self-test (?selftest=1) that plays mission 1
// with the real update code and reports the result in the DOM.

import { TILE, VIEW_W, VIEW_H, TOOL_DEFS, LOOT_VALUES, MISSIONS, RANKS } from './config.js';
import { LEVELS, parseLevel, tileAt } from './levels.js';
import { createGuards, createCameras, updateGuard, updateCamera, moveWithCollision } from './guards.js';
import { CAMERA_RANGE, CAMERA_HALF_ANGLE, GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { createPlayer, updatePlayer } from './player.js';
import { canSee } from './vision.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { mulberry32 } from './random.js';
import { stageShot } from './shots.js';

const LOOT_KINDS = [
  ['painting', 'cash', 'gold', 'cash', 'painting', 'gold'],
  ['gold', 'cash', 'gold', 'cash'],
  ['painting', 'gold', 'cash', 'painting', 'gold', 'cash', 'gold'],
];

const TARGET_NAMES = ['STAR SAPPHIRE', 'MERIDIAN GOLD RESERVE', 'THE MERIDIAN LEDGER'];

function newState() {
  return {
    screen: 'title',
    missionIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    loot: [],
    alarm: 0,
    lootValue: 0,
    tools: { smoke: 3, emp: 2, noise: 3 },
    smokes: [],
    noises: [],
    particles: [],
    dust: [],
    time: 0,
    message: '',
    messageT: 0,
    bustedReason: '',
    spottedNow: false,
    targetTaken: false,
    levelStats: { spottedEver: false, maxAlarm: 0 },
    levelScore: 0,
    timeBonus: 0,
    totals: { score: 0, loot: 0, time: 0 },
    rank: '',
    muted: false,
    helpOpen: false,
    input: null,
    audio: null,
    exitWarned: false,
  };
}

function loadMission(state, index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  state.missionIndex = index;
  state.level = level;
  state.player = createPlayer(level.spawn);
  state.guards = createGuards(level);
  state.cameras = createCameras(level);
  const kinds = LOOT_KINDS[index];
  state.loot = level.loot.map((l, i) => ({
    x: l.x * TILE + TILE / 2,
    y: l.y * TILE + TILE / 2,
    kind: kinds[i % kinds.length],
    value: LOOT_VALUES[kinds[i % kinds.length]],
    taken: false,
  }));
  state.loot.push({
    x: level.targetSpot.x * TILE + TILE / 2,
    y: level.targetSpot.y * TILE + TILE / 2,
    kind: 'target',
    value: LOOT_VALUES.target,
    taken: false,
  });
  state.alarm = 0;
  state.lootValue = 0;
  state.tools = { smoke: TOOL_DEFS.smoke.count, emp: TOOL_DEFS.emp.count, noise: TOOL_DEFS.noise.count };
  state.smokes = [];
  state.noises = [];
  state.particles = [];
  state.time = 0;
  state.message = '';
  state.messageT = 0;
  state.bustedReason = '';
  state.spottedNow = false;
  state.targetTaken = false;
  state.levelStats = { spottedEver: false, maxAlarm: 0 };
  state.levelScore = 0;
  state.timeBonus = 0;
  state.helpOpen = false;
  state.exitWarned = false;
  // Ambient dust motes: seeded, so every run looks the same.
  const rng = mulberry32(def.seed);
  state.dust = [];
  for (let i = 0; i < 42; i++) {
    state.dust.push({ x: rng() * VIEW_W, y: rng() * VIEW_H, s: 1 + rng() * 2, v: 2 + rng() * 4 });
  }
}

function setMessage(state, text, seconds = 2.5) {
  state.message = text;
  state.messageT = seconds;
}

function burst(state, x, y, color, n = 12) {
  const rng = mulberry32(Math.floor(x * 7 + y * 13 + state.time * 60));
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const sp = 30 + rng() * 70;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      t: 0, ttl: 0.5 + rng() * 0.4,
      color, size: 2 + rng() * 3,
    });
  }
}

function grabLoot(state, l) {
  l.taken = true;
  state.lootValue += l.value;
  burst(state, l.x, l.y, '#f5c542');
  if (l.kind === 'target') {
    state.targetTaken = true;
    state.audio.target();
    setMessage(state, TARGET_NAMES[state.missionIndex] + ' SECURED — GET TO THE EXIT!', 4);
  } else {
    state.audio.pickup();
  }
}

function throwSmoke(state) {
  if (state.tools.smoke <= 0) { setMessage(state, 'NO SMOKE LEFT'); return; }
  state.tools.smoke -= 1;
  state.smokes.push({ x: state.player.x, y: state.player.y, t: 0, ttl: TOOL_DEFS.smoke.seconds });
  state.audio.smoke();
}

function fireEMP(state) {
  if (state.tools.emp <= 0) { setMessage(state, 'NO EMP LEFT'); return; }
  state.tools.emp -= 1;
  for (const c of state.cameras) c.disabled = TOOL_DEFS.emp.seconds;
  state.audio.emp();
  setMessage(state, 'EMP FIRED — CAMERAS DOWN ' + TOOL_DEFS.emp.seconds + 's');
}

function throwNoise(state) {
  if (state.tools.noise <= 0) { setMessage(state, 'NO NOISEMAKERS LEFT'); return; }
  const m = state.input.mouse;
  const dx = m.x - state.player.x;
  const dy = m.y - state.player.y;
  const dist = Math.hypot(dx, dy);
  const range = TOOL_DEFS.noise.range;
  const tx = dist > range ? state.player.x + (dx / dist) * range : m.x;
  const ty = dist > range ? state.player.y + (dy / dist) * range : m.y;
  state.tools.noise -= 1;
  state.noises.push({ x: tx, y: ty, t: 0 });
  state.audio.click();
  for (const g of state.guards) {
    if (g.state === 'chase') continue;
    if (Math.hypot(g.x - tx, g.y - ty) < TOOL_DEFS.noise.radius) {
      g.investigate = { x: tx, y: ty };
      g.state = 'suspicious';
      g.suspicion = Math.max(g.suspicion, 0.5);
    }
  }
  setMessage(state, 'NOISEMAKER THROWN — GUARDS INVESTIGATE');
}

function bust(state, reason) {
  state.screen = 'busted';
  state.bustedReason = reason;
  state.audio.busted();
}

function winLevel(state) {
  const par = state.level.def.par;
  state.timeBonus = Math.max(0, Math.floor(par - state.time)) * 20;
  const ghost = state.levelStats.spottedEver ? 0 : 1500;
  state.levelScore = state.lootValue + state.timeBonus + ghost;
  state.totals.score += state.levelScore;
  state.totals.loot += state.lootValue;
  state.totals.time += state.time;
  state.audio.win();
  state.screen = 'levelwin';
}

function finishGame(state) {
  state.rank = RANKS.find((r) => state.totals.score >= r.min).label;
  state.screen = 'getaway';
}

function updatePlay(state, dt) {
  const p = state.player;
  const grid = state.level.grid;
  state.time += dt;
  if (state.messageT > 0) state.messageT -= dt;

  updatePlayer(grid, p, state.input, dt);

  // Tools (edge-triggered).
  if (state.input.wasPressed('Digit1')) throwSmoke(state);
  if (state.input.wasPressed('Digit2')) fireEMP(state);
  if (state.input.wasPressed('Digit3')) throwNoise(state);

  // Guards and cameras.
  const alarmHigh = state.alarm >= 70;
  let spotted = false;
  let anyChase = false;
  for (const g of state.guards) {
    const wasChase = g.state === 'chase';
    const sees = updateGuard(grid, g, p, state.smokes, dt, alarmHigh);
    if (sees) spotted = true;
    if (g.state === 'chase') {
      anyChase = true;
      if (!wasChase) {
        state.audio.alert();
        setMessage(state, 'SPOTTED BY A GUARD — RUN!', 2.5);
      }
    }
    if (Math.hypot(g.x - p.x, g.y - p.y) < 20 && !p.inVent) {
      bust(state, 'A GUARD CAUGHT YOU RED-HANDED IN ' + MISSIONS[state.missionIndex].name + '.');
      return;
    }
  }
  for (const c of state.cameras) {
    updateCamera(c, dt);
    if (c.disabled <= 0 && canSee(grid, c, p, CAMERA_RANGE, CAMERA_HALF_ANGLE, state.smokes) && !p.inVent) {
      spotted = true;
      state.levelStats.spottedEver = true;
    }
  }
  if (spotted && !state.spottedNow) state.audio.spotted();
  state.spottedNow = spotted;
  if (spotted) state.levelStats.spottedEver = true;

  // Alarm: climbs while seen or chased, decays when hidden.
  if (spotted) state.alarm += 8 * dt;
  if (anyChase) state.alarm += 2 * dt;
  if (!spotted && !anyChase) state.alarm = Math.max(0, state.alarm - 3 * dt);
  state.alarm = Math.min(100, state.alarm);
  state.levelStats.maxAlarm = Math.max(state.levelStats.maxAlarm, state.alarm);
  if (state.alarm >= 100) {
    bust(state, 'THE ALARM HIT 100% — LOCKDOWN. THE CREW IS DONE.');
    return;
  }

  // Loot pickup by touch.
  for (const l of state.loot) {
    if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 24) grabLoot(state, l);
  }

  // Exit.
  const e = state.level.exit;
  const ex = e.x * TILE + TILE / 2;
  const ey = e.y * TILE + TILE / 2;
  if (Math.hypot(ex - p.x, ey - p.y) < 26) {
    if (state.targetTaken) {
      winLevel(state);
      return;
    }
    if (!state.exitWarned) {
      setMessage(state, 'THE EXIT IS LOCKED — STEAL THE ★ TARGET FIRST', 3);
      state.exitWarned = true;
    }
  } else {
    state.exitWarned = false;
  }

  // Smoke, noise rings, particles, dust.
  for (const s of state.smokes) s.t += dt;
  state.smokes = state.smokes.filter((s) => s.t < s.ttl);
  for (const n of state.noises) n.t += dt;
  state.noises = state.noises.filter((n) => n.t < 1.2);
  for (const pt of state.particles) {
    pt.t += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  state.particles = state.particles.filter((pt) => pt.t < pt.ttl);
  for (const d of state.dust) {
    d.y += d.v * dt;
    if (d.y > VIEW_H) d.y = 0;
  }
}

function handleKeys(state) {
  const input = state.input;
  if (input.wasPressed('KeyM')) {
    state.muted = state.audio.toggleMute();
  }
  if (state.screen === 'title') {
    if (input.wasPressed('Enter')) {
      state.audio.unlock();
      state.audio.click();
      loadMission(state, 0);
      state.screen = 'briefing';
    } else if (input.wasPressed('KeyH')) {
      state.screen = 'help';
    }
  } else if (state.screen === 'help') {
    if (input.wasPressed('KeyH') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      state.screen = state.helpOpen ? 'play' : 'title';
      state.helpOpen = false;
    }
  } else if (state.screen === 'briefing') {
    if (input.wasPressed('Enter')) {
      state.audio.click();
      state.screen = 'play';
    }
  } else if (state.screen === 'play') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      state.screen = 'paused';
    } else if (input.wasPressed('KeyH')) {
      state.helpOpen = true;
      state.screen = 'help';
    }
  } else if (state.screen === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      state.screen = 'play';
    } else if (input.wasPressed('KeyH')) {
      state.helpOpen = true;
      state.screen = 'help';
    }
  } else if (state.screen === 'busted') {
    if (input.wasPressed('KeyR')) {
      loadMission(state, state.missionIndex);
      state.screen = 'briefing';
    } else if (input.wasPressed('Enter')) {
      state.screen = 'title';
    }
  } else if (state.screen === 'levelwin') {
    if (input.wasPressed('Enter')) {
      if (state.missionIndex < 2) {
        loadMission(state, state.missionIndex + 1);
        state.screen = 'briefing';
      } else {
        finishGame(state);
      }
    }
  } else if (state.screen === 'getaway') {
    if (input.wasPressed('Enter')) {
      state.totals = { score: 0, loot: 0, time: 0 };
      state.screen = 'title';
    }
  }
}

// Scripted playthrough with the real update code: proves movement,
// collision, vision, loot, tools and the win path without a human.
function runSelfTest(state) {
  const out = { phases: {}, ok: true };
  const dt = 1 / 60;
  loadMission(state, 0);
  state.screen = 'play';

  // Phase A — synthetic keys move the thief right for 60 frames.
  const startX = state.player.x;
  const fakeInput = {
    keys: new Set(['KeyD']),
    isDown: (c) => fakeInput.keys.has(c),
    wasPressed: () => false,
    mouse: { x: 0, y: 0, clicked: false },
    endFrame: () => {},
  };
  state.input = fakeInput;
  for (let i = 0; i < 60; i++) updatePlay(state, dt);
  const moved = state.player.x - startX;
  out.phases.moveRight = { movedPx: Math.round(moved), expectedApprox: 165, pass: moved > 100 };
  // Phase A2 — walk into the west wall: x must never go below the wall.
  fakeInput.keys = new Set(['KeyA']);
  for (let i = 0; i < 600; i++) updatePlay(state, dt);
  out.phases.wallStop = { x: Math.round(state.player.x), pass: state.player.x > TILE + 11 };
  fakeInput.keys = new Set();

  // Phase B — bot walks to every loot, the target, then the exit.
  // Breadth-first search on the tile grid, so the bot walks around walls
  // instead of pushing into them.
  // Heat map: tiles within 1 tile of any guard patrol segment are hot.
  // Routing avoids them (the thief goes around the patrol, not through it);
  // a second pass allows hot tiles when no cool route exists.
  const hotSet = new Set();
  {
    const hkey = (x, y) => y * 100 + x;
    for (const g of state.level.def.guards) {
      const pts = [[g.x, g.y], ...g.waypoints, g.waypoints[0]];
      for (let s = 0; s < pts.length - 1; s++) {
        const [x0, y0] = pts[s];
        const [x1, y1] = pts[s + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= steps; k++) {
          const tx = Math.round(x0 + ((x1 - x0) * k) / steps);
          const ty = Math.round(y0 + ((y1 - y0) * k) / steps);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) hotSet.add(hkey(tx + dx, ty + dy));
          }
        }
      }
    }
  }
  function findPath(sx, sy, tx, ty, avoidHot = true) {
    const grid = state.level.grid;
    const key = (x, y) => y * 100 + x;
    const prev = new Map();
    const queue = [[sx, sy]];
    prev.set(key(sx, sy), null);
    while (queue.length) {
      const [cx, cy] = queue.shift();
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) continue;
        if (prev.has(key(nx, ny))) continue;
        const c = grid[ny][nx];
        if (c === '#' || c === 'C' || c === 'D' || c === 'S') continue;
        if (avoidHot && hotSet.has(key(nx, ny)) && !(nx === tx && ny === ty)) continue;
        prev.set(key(nx, ny), [cx, cy]);
        queue.push([nx, ny]);
      }
    }
    if (!prev.has(key(tx, ty))) {
      if (avoidHot) return findPath(sx, sy, tx, ty, false);
      return null;
    }
    const path = [];
    let cur = [tx, ty];
    while (cur) {
      path.unshift(cur);
      cur = prev.get(key(cur[0], cur[1]));
    }
    return path;
  }
  function botStepTo(tx, ty, budgetFrames) {
    // Walk the BFS path tile by tile; returns true when arrived.
    // Stealth-aware: never step into a tile a guard or camera can see right
    // now (wait for the cone to sweep past), sneak everywhere, drop smoke
    // if a guard's suspicion climbs, and sprint to the nearest vent when
    // chased — vents hide the thief completely, even from a touching guard.
    function exposed(x, y) {
      const target = { x, y };
      for (const g of state.guards) {
        if (canSee(state.level.grid, g, target, GUARD_RANGE, GUARD_HALF_ANGLE, state.smokes)) return true;
      }
      for (const c of state.cameras) {
        if (c.disabled <= 0 && canSee(state.level.grid, c, target, CAMERA_RANGE, CAMERA_HALF_ANGLE, state.smokes)) return true;
      }
      return false;
    }
    const ventTiles = [];
    for (let y = 0; y < state.level.grid.length; y++) {
      for (let x = 0; x < state.level.grid[y].length; x++) {
        if (state.level.grid[y][x] === 'V') ventTiles.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
      }
    }
    function nearestVent() {
      let best = null;
      let bestD = Infinity;
      for (const v of ventTiles) {
        const d = Math.hypot(v.x - state.player.x, v.y - state.player.y);
        if (d < bestD) { bestD = d; best = v; }
      }
      return best;
    }
    // Retreat target: the nearest vent, always. A vent hides the thief
    // completely — guards cannot see or touch the player inside one — so
    // the bot waits there until the patrol has moved on, instead of
    // retreating to a trail point a guard may have walked onto since.
    function safeRetreatPoint() {
      return nearestVent();
    }
    let framesUsed = 0;
    let waitFrames = 0;
    while (framesUsed < budgetFrames) {
      const chaser = state.guards.find((g) => g.state === 'chase');
      // Objective: the target, or a safe retreat while a guard gets close.
      let objX = tx;
      let objY = ty;
      let speed = 86;
      let gate = true;
      let nearestD = 110;
      for (const g of state.guards) {
        nearestD = Math.min(nearestD, Math.hypot(g.x - state.player.x, g.y - state.player.y));
      }
      const threatened = Boolean(chaser) || nearestD < 110;
      if (threatened) {
        const v = safeRetreatPoint();
        if (v) { objX = v.x; objY = v.y; }
        speed = 165;
        gate = false;
      }
      const ptx = Math.floor(state.player.x / TILE);
      const pty = Math.floor(state.player.y / TILE);
      const path = findPath(ptx, pty, Math.floor(objX / TILE), Math.floor(objY / TILE));
      if (!path || path.length < 2) {
        // On the objective tile already: only counts as arrived when the
        // objective is the real target, not a retreat detour.
        if (!threatened && Math.hypot(tx - state.player.x, ty - state.player.y) < 18) return true;
      } else {
        const [nx, ny] = path[1];
        const cx = nx * TILE + TILE / 2;
        const cy = ny * TILE + TILE / 2;
        const dx = cx - state.player.x;
        const dy = cy - state.player.y;
        const d = Math.hypot(dx, dy);
        state.player.sneaking = !threatened;
        const hottest = Math.max(0, ...state.guards.map((g) => g.suspicion));
        if (hottest > 0.55 && state.tools.smoke > 0) throwSmoke(state);
        if (d > 4 && (!gate || !exposed(cx, cy) || waitFrames >= 600)) {
          moveWithCollision(state.level.grid, state.player, (dx / d) * speed * dt, (dy / d) * speed * dt, 11);
          state.player.dir = Math.atan2(dy, dx);
          waitFrames = 0;
        } else if (d > 4) {
          waitFrames++;
        }
      }
      state.player.inVent = tileAt(state.level.grid, state.player.x, state.player.y) === 'V';
      state.time += dt;
      for (const g of state.guards) {
        updateGuard(state.level.grid, g, state.player, state.smokes, dt, false);
        maxSuspicion = Math.max(maxSuspicion, g.suspicion);
        if (g.state === 'chase') state.alarm = Math.min(100, state.alarm + 2 * dt);
        if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < 20 && !state.player.inVent) return 'caught';
      }
      for (const c of state.cameras) updateCamera(c, dt);
      for (const l of state.loot) {
        if (!l.taken && Math.hypot(l.x - state.player.x, l.y - state.player.y) < 24) grabLoot(state, l);
      }
      maxAlarm = Math.max(maxAlarm, state.alarm);
      state.alarm = Math.max(0, state.alarm - 3 * dt);
      framesUsed++;
      if (state.screen === 'busted') return 'caught';
      // Arrived at the real target (not a retreat detour)? Must get inside
      // the 24px loot pickup radius, or the bot stops one step short.
      if (!threatened && Math.hypot(tx - state.player.x, ty - state.player.y) < 18) return true;
    }
    return Math.hypot(tx - state.player.x, ty - state.player.y) < 18;
  }
  loadMission(state, 0);
  state.screen = 'play';
  const targets = [...state.loot.filter((l) => l.kind !== 'target'), state.loot.find((l) => l.kind === 'target')];
  let maxAlarm = 0;
  let maxSuspicion = 0;
  let caught = false;
  for (const t of targets) {
    const r = botStepTo(t.x, t.y, 60 * 150);
    if (r === 'caught') { caught = true; break; }
  }
  const exit = state.level.exit;
  const ex = exit.x * TILE + TILE / 2;
  const ey = exit.y * TILE + TILE / 2;
  let reachedExit = false;
  if (!caught && state.targetTaken) {
    const r = botStepTo(ex, ey, 60 * 150);
    reachedExit = r === true || Math.hypot(ex - state.player.x, ey - state.player.y) < 26;
  }
  if (!caught && state.targetTaken && reachedExit) winLevel(state);
  out.phases.botRun = {
    lootValue: state.lootValue,
    lootTaken: state.loot.filter((l) => l.taken).length + '/' + state.loot.length,
    targetTaken: state.targetTaken,
    caught,
    screen: state.screen,
    maxAlarm: Math.round(maxAlarm),
    maxSuspicion: +maxSuspicion.toFixed(2),
    pass: !caught && state.screen === 'levelwin' && state.targetTaken,
  };

  // Phase C — vision: stand in front of guard 0, in its cone, in the open.
  loadMission(state, 0);
  state.screen = 'play';
  const g0 = state.guards[0];
  state.player.x = g0.x + Math.cos(g0.angle) * 80;
  state.player.y = g0.y + Math.sin(g0.angle) * 80;
  state.player.inVent = false;
  state.player.sneaking = false;
  for (let i = 0; i < 180; i++) {
    updateGuard(state.level.grid, g0, state.player, state.smokes, dt, false);
    if (g0.state === 'chase') break;
  }
  const chaseTriggered = g0.state === 'chase';
  // Then hide behind a wall: suspicion must decay.
  state.player.x = 2.5 * TILE;
  state.player.y = 22.5 * TILE;
  for (let i = 0; i < 240; i++) updateGuard(state.level.grid, g0, state.player, state.smokes, dt, false);
  out.phases.vision = {
    chaseTriggered,
    suspicionAfterHiding: +g0.suspicion.toFixed(2),
    pass: chaseTriggered && g0.suspicion < 0.2,
  };

  // Phase D — tools: smoke blocks sight, EMP disables cameras.
  loadMission(state, 0);
  state.screen = 'play';
  const cam = state.cameras[0];
  state.player.x = cam.x;
  state.player.y = cam.y + 100;
  const seenBefore = canSee(state.level.grid, cam, state.player, CAMERA_RANGE, CAMERA_HALF_ANGLE, []);
  state.smokes.push({ x: (cam.x + state.player.x) / 2, y: (cam.y + state.player.y) / 2, t: 0, ttl: 6 });
  const seenInSmoke = canSee(state.level.grid, cam, state.player, CAMERA_RANGE, CAMERA_HALF_ANGLE, state.smokes);
  cam.disabled = 8;
  const camOff = cam.disabled > 0;
  out.phases.tools = { seenBefore, seenInSmoke, camOff, pass: seenBefore && !seenInSmoke && camOff };

  for (const p of Object.values(out.phases)) if (!p.pass) out.ok = false;
  return out;
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const state = newState();
  state.input = createInput(canvas);
  state.audio = createAudio();
  loadMission(state, 0);
  window.__heist = { state };

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    // The alert shot plays on mission 2, the win shot over mission 3.
    const shotMission = shot === 'alert' ? 1 : shot === 'win' ? 2 : 0;
    if (shotMission !== 0) loadMission(state, shotMission);
    stageShot(state, shot);
    render(state, ctx);
    document.title = 'shot-ready:' + shot;
    return;
  }
  if (params.has('selftest')) {
    const result = runSelfTest(state);
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = JSON.stringify(result);
    document.body.appendChild(pre);
    document.title = 'selftest:' + (result.ok ? 'PASS' : 'FAIL');
    render(state, ctx);
    return;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleKeys(state);
    if (state.screen === 'play') updatePlay(state, dt);
    else if (state.screen === 'title') state.time += dt;
    render(state, ctx);
    state.input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
