// MERIDIAN — the thief. WASD/arrows to move, Shift to sneak, E to grab the
// target loot, 1/2/3 for tools, click to throw a noisemaker. One job:
// turn input into motion, loot and tool use.

import { TILE } from './config.js';
import { tileAt } from './levels.js';
import { moveWithCollision } from './guards.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x * TILE + TILE / 2,
    y: spawn.y * TILE + TILE / 2,
    r: 11,
    dir: -Math.PI / 2,
    moving: false,
    sneaking: false,
    inVent: false,
    speed: 165,
  };
}

export function updatePlayer(grid, player, input, dt) {
  let mx = 0;
  let my = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
  player.sneaking = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  player.moving = mx !== 0 || my !== 0;
  if (!player.moving) return;
  const len = Math.hypot(mx, my);
  const speed = player.speed * (player.sneaking ? 0.52 : 1);
  moveWithCollision(grid, player, (mx / len) * speed * dt, (my / len) * speed * dt, player.r);
  player.dir = Math.atan2(my, mx);
  player.inVent = tileAt(grid, player.x, player.y) === 'V';
}
