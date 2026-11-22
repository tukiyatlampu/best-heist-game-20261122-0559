// MERIDIAN — staged screenshot states. Each shot is a real render of the
// game's own code at a fixed, deterministic state: no mockups, no edits.
//   start — title screen over the gallery, guards mid-patrol
//   play  — mid-heist: thief crossing the gallery, cones sweeping, loot half-grabbed
//   alert — vault floor, alarm high, a guard in full chase, camera on the thief
//   win   — the getaway screen after all three jobs
// The page renders the staged state once on load (?shot=<name>).

import { TILE } from './config.js';

function at(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function setGuard(g, tx, ty, angle, state, suspicion) {
  const p = at(tx, ty);
  g.x = p.x;
  g.y = p.y;
  g.angle = angle;
  g.state = state;
  g.suspicion = suspicion;
  g.lastSeen = null;
  g.loseT = 0;
}

export function stageShot(state, name) {
  if (name === 'start') {
    state.screen = 'title';
    state.time = 12;
    setGuard(state.guards[0], 24, 12, Math.PI / 2, 'patrol', 0);
    setGuard(state.guards[1], 26, 21, 0, 'patrol', 0);
    state.cameras[0].angle = Math.PI / 2 + 0.5;
    return;
  }
  if (name === 'play') {
    state.screen = 'play';
    state.time = 47;
    const p = at(20, 13);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.dir = -Math.PI / 2;
    state.player.sneaking = true;
    state.player.inVent = false;
    setGuard(state.guards[0], 24, 12, Math.PI * 0.75, 'suspicious', 0.62);
    state.guards[0].lastSeen = { x: p.x, y: p.y - 60 };
    setGuard(state.guards[1], 14, 21, -Math.PI / 2, 'patrol', 0);
    state.cameras[0].angle = Math.PI / 2 - 0.4;
    // Two small loot already grabbed, target still glowing.
    state.loot[0].taken = true;
    state.loot[1].taken = true;
    state.lootValue = state.loot[0].value + state.loot[1].value;
    state.alarm = 18;
    state.levelStats.maxAlarm = 18;
    return;
  }
  if (name === 'alert') {
    // Mission 2 is loaded by the caller below; stage on top of it.
    state.screen = 'play';
    state.time = 96;
    const p = at(20, 18);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.dir = Math.PI;
    state.player.sneaking = false;
    state.player.inVent = false;
    setGuard(state.guards[0], 24, 16, Math.PI / 2, 'chase', 1);
    state.guards[0].lastSeen = { x: p.x, y: p.y };
    setGuard(state.guards[1], 12, 14, 0, 'suspicious', 0.8);
    state.guards[1].lastSeen = { x: p.x, y: p.y };
    setGuard(state.guards[2], 30, 23, -Math.PI / 2, 'patrol', 0);
    state.cameras[0].angle = Math.PI / 4;
    state.cameras[1].angle = -Math.PI / 2 + 0.3;
    state.loot[0].taken = true;
    state.loot[1].taken = true;
    state.loot[2].taken = true;
    state.lootValue = state.loot[0].value + state.loot[1].value + state.loot[2].value;
    state.targetTaken = false;
    state.alarm = 78;
    state.levelStats.maxAlarm = 78;
    state.levelStats.spottedEver = true;
    state.spottedNow = true;
    setMessage(state, 'SPOTTED BY A GUARD — RUN!', 30);
    return;
  }
  if (name === 'win') {
    state.screen = 'getaway';
    state.time = 412;
    state.lootValue = 18300;
    state.totals = { score: 21400, loot: 18300, time: 412 };
    state.rank = 'A — MASTERMIND';
    return;
  }
  // Unknown shot name: fall back to the title screen.
  state.screen = 'title';
}

function setMessage(state, text, seconds) {
  state.message = text;
  state.messageT = seconds;
}
