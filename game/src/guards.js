// MERIDIAN — the people and machines watching you. Guards patrol, grow
// suspicious, chase, search and give up; cameras sweep and never blink
// (until an EMP). One job: move the watchers and report what they see.

import { TILE } from './config.js';
import { isBlocking } from './levels.js';
import { angleDiff, canSee } from './vision.js';

export const GUARD_RANGE = 175;
export const GUARD_HALF_ANGLE = 0.61; // ~70 degrees of cone
export const CAMERA_RANGE = 205;
export const CAMERA_HALF_ANGLE = 0.5;

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function createGuards(level) {
  return level.def.guards.map((g) => {
    const p = tileCentre(g.x, g.y);
    return {
      x: p.x,
      y: p.y,
      angle: -Math.PI / 2,
      wpIndex: 0,
      pauseT: 0,
      state: 'patrol', // patrol | suspicious | chase | search
      suspicion: 0,
      lastSeen: null,
      loseT: 0,
      searchT: 0,
      investigate: null,
      waypoints: g.waypoints.map(([tx, ty]) => tileCentre(tx, ty)),
      pause: g.pause,
      speed: 58,
    };
  });
}

export function createCameras(level) {
  return level.def.cameras.map((c) => {
    const p = tileCentre(c.x, c.y);
    return {
      x: p.x,
      y: p.y,
      angle: c.base,
      base: c.base,
      sweep: c.sweep,
      speed: c.speed,
      phase: 0,
      disabled: 0,
    };
  });
}

// Slide a circle of radius r through the tile grid, axis by axis.
export function moveWithCollision(grid, body, dx, dy, r) {
  let nx = body.x + dx;
  if (!circleHitsWall(grid, nx, body.y, r)) body.x = nx;
  let ny = body.y + dy;
  if (!circleHitsWall(grid, body.x, ny, r)) body.y = ny;
}

export function circleHitsWall(grid, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isBlocking(grid, tx, ty)) return true;
    }
  }
  return false;
}

function turnToward(body, targetAngle, rate, dt) {
  const d = angleDiff(targetAngle, body.angle);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  body.angle += step;
}

function moveToward(grid, body, tx, ty, speed, dt) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  moveWithCollision(grid, body, (dx / dist) * step, (dy / dist) * step, 12);
  turnToward(body, Math.atan2(dy, dx), 6, dt);
  return dist <= speed * dt + 2;
}

// Update one guard. Returns 'spotted' when it has eyes on the player now.
export function updateGuard(grid, guard, player, smokes, dt, alarmHigh) {
  const speedMul = alarmHigh ? 1.18 : 1;
  const sees = canSee(grid, guard, player, GUARD_RANGE, GUARD_HALF_ANGLE, smokes);
  const inVent = player.inVent;

  if (sees && !inVent) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const rate = (player.sneaking ? 0.55 : 1.1) * (1.5 - dist / GUARD_RANGE);
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseT = 0;
    if (guard.suspicion >= 1 && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.investigate = null;
    }
    if (guard.state === 'patrol' || guard.state === 'search') guard.state = 'suspicious';
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 0.45 * dt);
    if (guard.state === 'suspicious' && guard.suspicion <= 0.05) guard.state = 'patrol';
    if (guard.state === 'chase') {
      guard.loseT += dt;
      if (guard.loseT > 2.5) {
        guard.state = 'search';
        guard.searchT = 3;
      }
    }
  }

  if (guard.state === 'patrol') {
    const wp = guard.waypoints[guard.wpIndex];
    if (guard.pauseT > 0) {
      guard.pauseT -= dt;
      turnToward(guard, guard.angle + 0.6 * dt, 0.6, dt);
    } else if (moveToward(grid, guard, wp.x, wp.y, guard.speed * speedMul, dt)) {
      guard.pauseT = guard.pause;
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
    }
  } else if (guard.state === 'suspicious') {
    if (guard.lastSeen) {
      turnToward(guard, Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x), 5, dt);
      moveToward(grid, guard, guard.lastSeen.x, guard.lastSeen.y, guard.speed * 0.9 * speedMul, dt);
    }
  } else if (guard.state === 'chase') {
    const target = guard.lastSeen || player;
    moveToward(grid, guard, target.x, target.y, 138 * speedMul, dt);
  } else if (guard.state === 'search') {
    guard.searchT -= dt;
    turnToward(guard, guard.angle + 1.8 * dt, 1.8, dt);
    if (guard.searchT <= 0) {
      guard.state = 'patrol';
      guard.investigate = null;
    }
  }

  // A noisemaker pull: walk to the noise, look around, then resume patrol.
  if (guard.investigate && guard.state !== 'chase') {
    const done = moveToward(grid, guard, guard.investigate.x, guard.investigate.y, guard.speed * 1.25 * speedMul, dt);
    if (done) {
      guard.investigate = null;
      guard.state = 'search';
      guard.searchT = 2.5;
    }
  }
  return sees && !inVent;
}

export function updateCamera(camera, dt) {
  if (camera.disabled > 0) {
    camera.disabled -= dt;
    return;
  }
  camera.phase += camera.speed * dt;
  camera.angle = camera.base + Math.sin(camera.phase) * camera.sweep;
}
