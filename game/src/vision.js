// MERIDIAN — seeing. Line of sight, vision cones, and the cone polygons the
// renderer draws. Walls, crates, display cases and statues block sight;
// vents and smoke do not block the ray itself (smoke is checked separately).

import { TILE } from './config.js';
import { isBlocking } from './levels.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Step along the segment in 4px hops; blocked if any hop lands in a sight-blocking tile.
export function hasLOS(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    if (isBlocking(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

function segmentThroughSmoke(smokes, x0, y0, x1, y1) {
  for (const s of smokes) {
    // Distance from the smoke centre to the segment; inside the puff = hidden.
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((s.x - x0) * dx + (s.y - y0) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    if (Math.hypot(s.x - cx, s.y - cy) < 70) return true;
  }
  return false;
}

// Can `eye` (with a facing angle, range and half-angle cone) see `target`?
// Returns false in vents, behind walls, outside the cone, or through smoke.
export function canSee(grid, eye, target, range, halfAngle, smokes) {
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 1 && Math.abs(angleDiff(Math.atan2(dy, dx), eye.angle)) > halfAngle) return false;
  if (!hasLOS(grid, eye.x, eye.y, target.x, target.y)) return false;
  if (smokes && segmentThroughSmoke(smokes, eye.x, eye.y, target.x, target.y)) return false;
  return true;
}

// Raycast one ray; returns the distance until a blocking tile or `range`.
export function castRay(grid, x0, y0, angle, range) {
  const step = 4;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let x = x0;
  let y = y0;
  let d = 0;
  while (d < range) {
    x += dx;
    y += dy;
    d += step;
    if (isBlocking(grid, Math.floor(x / TILE), Math.floor(y / TILE))) break;
  }
  return { x, y, d: Math.min(d, range) };
}

// Polygon of the visible cone: rays fanned across the arc, each stopped by walls.
export function conePolygon(grid, ox, oy, angle, range, halfAngle, rays = 26) {
  const pts = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    pts.push(castRay(grid, ox, oy, a, range));
  }
  return pts;
}
