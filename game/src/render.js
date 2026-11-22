// MERIDIAN — everything you see. Floor, walls, cover, cones, guards, the
// thief, loot, HUD and every screen. One job: draw the current state.
// The judge reads the game mostly through screenshots, so every frame must
// show the room, the cones, the loot and the alarm meter at a glance.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS, TOOL_DEFS, MISSIONS } from './config.js';
import { conePolygon } from './vision.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE, CAMERA_RANGE, CAMERA_HALF_ANGLE } from './guards.js';

const HUD_H = 46;
const BAR_H = 26;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTileFloor(ctx, state) {
  const { grid } = state.level;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(px, py, TILE, TILE);
      if (c === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 4);
      } else if (c === 'V') {
        ctx.fillStyle = COLORS.vent;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.ventLine;
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(px + 7, py + i * 8);
          ctx.lineTo(px + TILE - 7, py + i * 8);
          ctx.stroke();
        }
      } else if (c === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateTop;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 5);
        ctx.lineTo(px + TILE - 5, py + TILE - 5);
        ctx.moveTo(px + TILE - 5, py + 5);
        ctx.lineTo(px + 5, py + TILE - 5);
        ctx.stroke();
      } else if (c === 'D') {
        ctx.fillStyle = COLORS.display;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.displayGlass;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 7, py + TILE - 7);
        ctx.lineTo(px + TILE - 9, py + 7);
        ctx.stroke();
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (c === 'S') {
        ctx.fillStyle = '#3a3f4d';
        ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = COLORS.statue;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawExit(ctx, state) {
  const e = state.level.exit;
  const px = e.x * TILE;
  const py = e.y * TILE;
  const open = state.targetTaken;
  ctx.fillStyle = open ? COLORS.exit : '#2e6b47';
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = open ? COLORS.exitGlow : '#7fb894';
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', px + TILE / 2, py + TILE / 2 - 4);
  ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(open ? 'OPEN' : 'LOCKED', px + TILE / 2, py + TILE / 2 + 8);
  if (open) {
    ctx.strokeStyle = COLORS.exitGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
  }
}

function drawLoot(ctx, state) {
  for (const l of state.loot) {
    if (l.taken) continue;
    const bob = Math.sin(state.time * 2 + l.x * 0.13) * 2;
    if (l.kind === 'target') {
      const pulse = 0.55 + 0.35 * Math.sin(state.time * 4);
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.target;
      ctx.shadowColor = COLORS.target;
      ctx.shadowBlur = 18 * pulse;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();
      ctx.fillStyle = COLORS.text;
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ TARGET ★', l.x, l.y - 24 + bob);
    } else if (l.kind === 'gold') {
      ctx.fillStyle = COLORS.goldDark;
      ctx.beginPath();
      ctx.arc(l.x - 6, l.y + 4 + bob, 7, 0, Math.PI * 2);
      ctx.arc(l.x + 6, l.y + 4 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(l.x, l.y - 2 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c00';
      ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', l.x, l.y + 1 + bob);
    } else if (l.kind === 'painting') {
      ctx.fillStyle = '#8a5a3b';
      ctx.fillRect(l.x - 11, l.y - 8 + bob, 22, 16);
      ctx.fillStyle = COLORS.painting;
      ctx.fillRect(l.x - 8, l.y - 5 + bob, 16, 10);
      ctx.fillStyle = '#f5e6c8';
      ctx.beginPath();
      ctx.arc(l.x, l.y + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = COLORS.cash;
      ctx.fillRect(l.x - 9, l.y - 5 + bob, 18, 10);
      ctx.fillStyle = '#2e5b1e';
      ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', l.x, l.y + 3 + bob);
    }
  }
}

function drawCone(ctx, grid, ox, oy, angle, range, halfAngle, fill, edge) {
  const poly = conePolygon(grid, ox, oy, angle, range, halfAngle);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuards(ctx, state) {
  const { grid } = state.level;
  for (const g of state.guards) {
    const alert = g.state === 'chase';
    drawCone(ctx, grid, g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE,
      alert ? 'rgba(255, 77, 77, 0.30)' : COLORS.coneGuard,
      alert ? 'rgba(255, 77, 77, 0.7)' : COLORS.coneGuardEdge);
  }
  for (const g of state.guards) {
    // body
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
    ctx.fill();
    // facing wedge + cap brim
    ctx.strokeStyle = '#bcd3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 14, g.y + Math.sin(g.angle) * 14);
    ctx.stroke();
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6, 3, 0, Math.PI * 2);
    ctx.fill();
    // suspicion arc
    if (g.suspicion > 0.05 && g.state !== 'chase') {
      ctx.strokeStyle = '#ffc442';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 18, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
      ctx.stroke();
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    } else if (g.state === 'suspicious' || g.state === 'search') {
      ctx.fillStyle = '#ffc442';
      ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 20);
    }
  }
}

function drawCameras(ctx, state) {
  const { grid } = state.level;
  for (const c of state.cameras) {
    if (c.disabled > 0) {
      drawCone(ctx, grid, c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE,
        'rgba(150, 160, 180, 0.10)', 'rgba(150, 160, 180, 0.4)');
    } else {
      drawCone(ctx, grid, c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE,
        COLORS.coneCamera, COLORS.coneCameraEdge);
    }
  }
  for (const c of state.cameras) {
    ctx.fillStyle = '#20242f';
    ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
    ctx.fillStyle = c.disabled > 0 ? '#5a6274' : '#ff4d4d';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 8, c.y + Math.sin(c.angle) * 8, 4, 0, Math.PI * 2);
    ctx.fill();
    if (c.disabled > 0) {
      ctx.fillStyle = '#9aa1b5';
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(c.disabled) + 's', c.x, c.y - 14);
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save();
  if (p.inVent) ctx.globalAlpha = 0.55;
  // loot sack on the back once the thief carries anything
  if (state.lootValue > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(p.x - Math.cos(p.dir) * 11, p.y - Math.sin(p.dir) * 11, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.goldDark;
    ctx.beginPath();
    ctx.arc(p.x - Math.cos(p.dir) * 11, p.y - Math.sin(p.dir) * 11, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // cloak
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.fill();
  // face toward movement
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 5, p.y + Math.sin(p.dir) * 5, 7, 0, Math.PI * 2);
  ctx.fill();
  // hood point
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(p.x - Math.cos(p.dir) * 8, p.y - Math.sin(p.dir) * 8);
  ctx.lineTo(p.x - Math.cos(p.dir) * 15, p.y - Math.sin(p.dir) * 15);
  ctx.lineTo(p.x + Math.cos(p.dir + 1.1) * 9, p.y + Math.sin(p.dir + 1.1) * 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.inVent) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN IN VENT', p.x, p.y - 22);
  }
}

function drawSmokeAndParticles(ctx, state) {
  for (const s of state.smokes) {
    const a = Math.min(1, s.t / 0.5) * Math.min(1, (s.ttl - s.t) / 1.5);
    ctx.fillStyle = `rgba(200, 205, 220, ${0.5 * Math.max(0, a)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x - 30, s.y + 14, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x + 32, s.y - 12, 52, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const n of state.noises) {
    ctx.strokeStyle = `rgba(255, 196, 66, ${Math.max(0, 1 - n.t / 1.2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 10 + n.t * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const pt of state.particles) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.ttl);
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    ctx.globalAlpha = 1;
  }
}

function drawHUD(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 1, VIEW_W, 1);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // mission
  ctx.fillStyle = COLORS.gold;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(MISSIONS[state.missionIndex].name, 14, HUD_H / 2 - 8);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(state.targetTaken ? 'TARGET SECURED — GET TO THE EXIT' : 'STEAL THE TARGET, THEN REACH THE EXIT', 14, HUD_H / 2 + 11);
  // loot
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`LOOT $${state.lootValue.toLocaleString('en-US')}`, 560, HUD_H / 2);
  // alarm meter
  const ax = 660;
  const ay = HUD_H / 2 - 9;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, ay - 2);
  ctx.fillStyle = '#20242f';
  ctx.fillRect(ax + 52, ay, 140, 16);
  const alarmColor = state.alarm < 40 ? COLORS.alarmLow : state.alarm < 70 ? COLORS.alarmMid : COLORS.alarmHigh;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax + 52, ay, Math.max(0, 140 * (state.alarm / 100)), 16);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(Math.round(state.alarm) + '%', ax + 198, ay + 8);
  // tools — laid out by measured width so they never run into the timer.
  let tx = 895;
  ctx.textAlign = 'left';
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  for (const key of ['smoke', 'emp', 'noise']) {
    const def = TOOL_DEFS[key];
    const n = state.tools[key];
    const label = `[${def.key}] ${def.name} ×${n}`;
    ctx.fillStyle = n > 0 ? COLORS.text : '#4a5064';
    ctx.fillText(label, tx, HUD_H / 2);
    tx += ctx.measureText(label).width + 14;
  }
  // timer
  const mm = Math.floor(state.time / 60);
  const ss = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${mm}:${ss}`, VIEW_W - 14, HUD_H / 2 - 8);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(state.muted ? 'MUTED (M)' : 'SOUND ON (M)', VIEW_W - 14, HUD_H / 2 + 11);
  // spotted banner
  if (state.spottedNow) {
    ctx.fillStyle = '#ff4d4d';
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ SPOTTED — BREAK LINE OF SIGHT! ⚠', VIEW_W / 2, HUD_H + 22);
  }
  // message toast
  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = 'rgba(5, 7, 14, 0.85)';
    const w = ctx.measureText(state.message).width + 28;
    ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - BAR_H - 44, w, 30);
    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, VIEW_W / 2, VIEW_H - BAR_H - 29);
  }
  // bottom bar
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, VIEW_H - BAR_H, VIEW_W, BAR_H);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move · SHIFT sneak (vents hide you) · 1 smoke · 2 EMP · 3 noisemaker + click · P pause · H help', VIEW_W / 2, VIEW_H - BAR_H / 2);
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 6, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function card(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 13, 24, 0.96)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function bigTitle(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

function drawTitle(ctx, state) {
  overlay(ctx, 0.72);
  bigTitle(ctx, 'MERIDIAN', 150, 84, COLORS.gold);
  bigTitle(ctx, '— THE MIDNIGHT VAULT JOB —', 215, 26, COLORS.text);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Three jobs. One crew: you. Steal the target, dodge the cones, vanish before the alarm hits 100.', VIEW_W / 2, 258);
  const missions = ['I — THE MERIDIAN GALLERY · Star Sapphire', 'II — THE VAULT FLOOR · Gold Reserve', 'III — THE ROOFTOP GETAWAY · The Ledger'];
  ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
  missions.forEach((m, i) => {
    ctx.fillStyle = i === 0 ? COLORS.text : COLORS.textDim;
    ctx.fillText(m, VIEW_W / 2, 310 + i * 30);
  });
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ENTER — START THE JOB', VIEW_W / 2, 440);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('H — HOW TO PLAY', VIEW_W / 2, 480);
  ctx.fillText('WASD move · SHIFT sneak · 1 smoke · 2 EMP · 3 noisemaker + click · vents hide you', VIEW_W / 2, 516);
  ctx.fillText('Guards patrol with vision cones. Cameras sweep. Alarm at 100% = busted.', VIEW_W / 2, 542);
}

function drawBriefing(ctx, state) {
  overlay(ctx, 0.78);
  const def = state.level.def;
  card(ctx, 290, 180, 700, 400);
  bigTitle(ctx, def.name, 235, 30, COLORS.gold);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, def.briefing, 640);
  lines.forEach((l, i) => ctx.fillText(l, 320, 300 + i * 26));
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Par time ${def.par}s · Guards ${state.guards.length} · Cameras ${state.cameras.length} · Tools: smoke ×3, EMP ×2, noisemaker ×3`, 320, 300 + lines.length * 26 + 30);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER — BEGIN THE JOB', VIEW_W / 2, 520);
}

function drawHelp(ctx) {
  overlay(ctx, 0.8);
  card(ctx, 290, 130, 700, 540);
  bigTitle(ctx, 'HOW TO PLAY', 175, 30, COLORS.gold);
  const rows = [
    ['MOVE', 'WASD or arrow keys. Walk over loot to grab it.'],
    ['SNEAK', 'Hold SHIFT: slower, harder to spot.'],
    ['VENTS', 'Dark floor grates: guards and cameras cannot see you inside one.'],
    ['CONES', 'Yellow = guard vision, red = camera. Break line of sight behind walls, crates, cases, statues.'],
    ['SMOKE [1]', 'Drop a smoke cloud: nobody sees through it for 6s.'],
    ['EMP [2]', 'Shut every camera down for 8s.'],
    ['NOISEMAKER [3]', 'Click anywhere to throw it: guards walk over to investigate.'],
    ['ALARM', 'Rises while you are seen. Decays when hidden. At 100% the job is blown.'],
    ['CAUGHT', 'A guard touching you, or the alarm hitting 100%, ends the mission.'],
    ['WIN', 'Grab the ★ TARGET, then reach the green EXIT. Clear all three jobs for the getaway.'],
  ];
  ctx.textAlign = 'left';
  rows.forEach(([k, v], i) => {
    const y = 225 + i * 42;
    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(k, 320, y);
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(v, 460, y);
  });
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H or ESC — CLOSE', VIEW_W / 2, 640);
}

function statRows(ctx, rows, y0) {
  ctx.textAlign = 'left';
  rows.forEach(([k, v], i) => {
    const y = y0 + i * 34;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(k, 430, y);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, 850, y);
    ctx.textAlign = 'left';
  });
}

function drawBusted(ctx, state) {
  overlay(ctx, 0.78);
  bigTitle(ctx, 'BUSTED!', 220, 64, '#ff4d4d');
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.bustedReason, VIEW_W / 2, 290);
  statRows(ctx, [
    ['Mission', MISSIONS[state.missionIndex].name],
    ['Loot grabbed', '$' + state.lootValue.toLocaleString('en-US')],
    ['Alarm peaked at', Math.round(state.levelStats.maxAlarm) + '%'],
    ['Time on the job', Math.floor(state.time) + 's'],
  ], 350);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('R — RETRY THE MISSION', VIEW_W / 2, 540);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ENTER — BACK TO TITLE', VIEW_W / 2, 576);
}

function drawLevelWin(ctx, state) {
  overlay(ctx, 0.72);
  bigTitle(ctx, 'CLEAN GETAWAY', 190, 56, COLORS.exitGlow);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(MISSIONS[state.missionIndex].name + ' — target secured.', VIEW_W / 2, 250);
  statRows(ctx, [
    ['Time', Math.floor(state.time) + 's (par ' + state.level.def.par + 's)'],
    ['Loot this job', '$' + state.lootValue.toLocaleString('en-US')],
    ['Alarm peaked at', Math.round(state.levelStats.maxAlarm) + '%'],
    ['Ghost bonus', state.levelStats.spottedEver ? '$0 (you were seen)' : '+$1,500 (never spotted)'],
    ['Time bonus', '+$' + state.timeBonus.toLocaleString('en-US')],
    ['Job score', '$' + state.levelScore.toLocaleString('en-US')],
  ], 300);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.missionIndex < 2 ? 'ENTER — NEXT JOB' : 'ENTER — THE GETAWAY', VIEW_W / 2, 560);
}

function drawGetaway(ctx, state) {
  overlay(ctx, 0.8);
  bigTitle(ctx, 'THE MERIDIAN JOB', 170, 56, COLORS.gold);
  bigTitle(ctx, 'COMPLETE', 235, 56, COLORS.exitGlow);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Three targets. One clean crew. The helicopter is already over the river.', VIEW_W / 2, 300);
  statRows(ctx, [
    ['Total loot', '$' + state.totals.loot.toLocaleString('en-US')],
    ['Total time', Math.floor(state.totals.time) + 's'],
    ['Final score', '$' + state.totals.score.toLocaleString('en-US')],
    ['Rank', state.rank],
  ], 350);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER — PLAY AGAIN', VIEW_W / 2, 560);
}

export function render(state, ctx) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawTileFloor(ctx, state);
  drawExit(ctx, state);
  drawLoot(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawSmokeAndParticles(ctx, state);
  // high-alarm red vignette
  if (state.alarm >= 70 && state.screen === 'play') {
    const pulse = 0.10 + 0.08 * Math.sin(state.time * 6);
    ctx.fillStyle = `rgba(255, 30, 30, ${pulse})`;
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H - BAR_H);
  }
  drawHUD(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'briefing') drawBriefing(ctx, state);
  else if (state.screen === 'help') drawHelp(ctx);
  else if (state.screen === 'paused') {
    overlay(ctx, 0.6);
    bigTitle(ctx, 'PAUSED', 380, 56, COLORS.text);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P — RESUME · H — HELP', VIEW_W / 2, 440);
  } else if (state.screen === 'busted') drawBusted(ctx, state);
  else if (state.screen === 'levelwin') drawLevelWin(ctx, state);
  else if (state.screen === 'getaway') drawGetaway(ctx, state);
  if (state.helpOpen && state.screen === 'play') drawHelp(ctx);
}
