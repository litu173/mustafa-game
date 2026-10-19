'use strict';
/* =========================================================
   MUSTAFA — art. Everything is drawn in code (no ripped assets):
   comic-book anatomy, ink outlines and 3-tone cel shading,
   rendered into a low-res buffer for the 16-bit arcade look.
   Local coordinates: feet at (0,0), facing +x, ~170 units tall.
   ========================================================= */
const OUT = '#140d0b';

function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// Path2D helpers. Multi-part shapes are unioned, so every sub-path is wound clockwise.
function rrPath(p, x, y, w, h, r) {
  p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
}
function polyPath(p, pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const q = pts[i], r = pts[(i + 1) % pts.length]; a += q[0] * r[1] - r[0] * q[1]; }
  const list = a < 0 ? pts.slice().reverse() : pts;
  p.moveTo(list[0][0], list[0][1]);
  for (let i = 1; i < list.length; i++) p.lineTo(list[i][0], list[i][1]);
  p.closePath();
  return p;
}
function ellPath(p, x, y, rx, ry) { p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, 0, 0, TAU); return p; }

/* Cel shading: dark crescent on the back/bottom, light rim on the front/top. */
function cel(c, path, base, k = 1) {
  const dx = -3 * k, dy = 2.4 * k;
  c.fillStyle = shade(base, -0.34); c.fill(path);
  c.save(); c.clip(path);
  c.translate(-dx, -dy); c.clip(path);
  c.fillStyle = shade(base, 0.24); c.fillRect(-3000, -3000, 6000, 6000);
  c.translate(dx * 1.45, dy * 1.45);
  c.fillStyle = base; c.fill(path);
  c.restore();
}
// Ink outline (stroke first so overlapping sub-paths merge), then cel fill
function part(c, path, base, k = 1, lw = 2.1) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = lw * 2; c.stroke(path);
  cel(c, path, base, k);
}

/* Tapered limb segment with a muscle bulge. a: 0 = down, +PI/2 = forward. */
function segPath(p, x1, y1, a, len, wa, wb, bf = 0.12, bb = 0.05) {
  const dx = Math.sin(a), dy = Math.cos(a), nx = Math.cos(a), ny = -Math.sin(a);
  const x2 = x1 + dx * len, y2 = y1 + dy * len;
  const mx = x1 + dx * len * 0.42, my = y1 + dy * len * 0.42;
  const avg = (wa + wb) / 4, wf = avg * (1 + bf * 2), wk = avg * (1 + bb * 2);
  const fx0 = x1 + nx * wa / 2, fy0 = y1 + ny * wa / 2, fx1 = x2 + nx * wb / 2, fy1 = y2 + ny * wb / 2;
  const bx0 = x1 - nx * wa / 2, by0 = y1 - ny * wa / 2, bx1 = x2 - nx * wb / 2, by1 = y2 - ny * wb / 2;
  const fmx = mx + nx * wf, fmy = my + ny * wf, bmx = mx - nx * wk, bmy = my - ny * wk;
  p.moveTo(fx0, fy0);
  p.quadraticCurveTo(2 * fmx - (fx0 + fx1) / 2, 2 * fmy - (fy0 + fy1) / 2, fx1, fy1);
  p.lineTo(bx1, by1);
  p.quadraticCurveTo(2 * bmx - (bx0 + bx1) / 2, 2 * bmy - (by0 + by1) / 2, bx0, by0);
  p.closePath();
  p.moveTo(x2 + wb / 2, y2); p.arc(x2, y2, wb / 2, 0, TAU);
  p.moveTo(x1 + wa / 2, y1); p.arc(x1, y1, wa / 2, 0, TAU);
  return [x2, y2];
}

const WHITE_KEYS = ['skin', 'hair', 'cap', 'shirt', 'pants', 'boots', 'belt', 'gloves', 'coat', 'helmet', 'sash', 'hat', 'bandana', 'strap', 'suspenders', 'holster', 'lips'];
const _tint = new Map();
function tintLook(L, col) {
  let m = _tint.get(col); if (!m) { m = new WeakMap(); _tint.set(col, m); }
  let w = m.get(L);
  if (!w) { w = { ...L }; for (const k of WHITE_KEYS) if (w[k]) w[k] = col; m.set(L, w); }
  return w;
}
const whiteLook = L => tintLook(L, '#fff1dc');

/* ---------------- weapons (drawn along +x from the grip) ---------------- */
function metal(c, y0, y1, a = '#e6ebf2', b = '#6f7884') {
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function drawWeapon(c, kind, x, y, ang, o = {}) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.6;
  const box = (x0, y0, w, h, f) => { c.fillStyle = f; c.fillRect(x0, y0, w, h); c.strokeRect(x0, y0, w, h); };
  switch (kind) {
    case 'knife':
      box(-5, -3, 11, 6, '#4a2a14');
      c.fillStyle = metal(c, -4, 4); c.beginPath(); c.moveTo(6, -4); c.lineTo(30, 0); c.lineTo(6, 4); c.closePath(); c.fill(); c.stroke();
      break;
    case 'machete':
      box(-5, -3, 14, 6, '#3a2210');
      c.fillStyle = metal(c, -6, 8); c.beginPath(); c.moveTo(9, -5); c.quadraticCurveTo(30, -8, 46, -4); c.quadraticCurveTo(48, 2, 42, 6); c.lineTo(9, 4); c.closePath(); c.fill(); c.stroke();
      break;
    case 'pipe':
      box(-10, -4, 60, 8, metal(c, -4, 4, '#d5dae2', '#3d434c'));
      box(44, -6, 9, 12, '#50565f');
      break;
    case 'chain': {
      box(-4, -3, 12, 6, '#2a2a2a');
      const ext = o.ext || 0;
      c.strokeStyle = '#9aa2ad'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(8, 0);
      if (ext > 0) c.quadraticCurveTo(8 + ext * 0.5, -18, 8 + ext, 4); else { c.quadraticCurveTo(16, 20, 4, 24); c.quadraticCurveTo(-6, 18, 2, 10); }
      c.setLineDash([4, 2]); c.stroke(); c.setLineDash([]);
      break;
    }
    case 'whip': {
      box(-4, -3, 14, 6, '#3a2210');
      const ext = o.ext || 0;
      c.strokeStyle = '#2a160a'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(10, 0);
      if (ext > 0) c.quadraticCurveTo(10 + ext * 0.5, -16, 10 + ext, 4); else { c.quadraticCurveTo(18, 22, 4, 26); c.quadraticCurveTo(-6, 20, 2, 12); }
      c.stroke();
      break;
    }
    case 'pistol':
      c.fillStyle = '#5a3a1e'; c.beginPath(); c.moveTo(-2, -2); c.lineTo(4, -2); c.lineTo(1, 12); c.lineTo(-6, 11); c.closePath(); c.fill(); c.stroke();
      box(-2, -7, 14, 8, '#3a3d45');
      box(10, -6, 18, 5, metal(c, -6, -1, '#c8ced8', '#4a505a'));
      c.beginPath(); c.arc(5, 3, 4, 0, Math.PI); c.stroke();
      break;
    case 'uzi':
      box(-4, -7, 24, 10, '#2a2c32');
      box(20, -5, 8, 5, '#555a64');
      box(5, 3, 6, 13, '#1c1d21');
      c.strokeStyle = '#555'; c.lineWidth = 2; line(c, -4, -2, -16, -2); line(c, -16, -2, -16, 4);
      break;
    case 'rifle':
      c.fillStyle = '#6b3d1c'; c.beginPath(); c.moveTo(-32, -3); c.lineTo(-8, -5); c.lineTo(-8, 5); c.lineTo(-32, 10); c.closePath(); c.fill(); c.stroke();
      box(-9, -6, 30, 10, '#24262b');
      box(20, -4, 36, 5, metal(c, -4, 1, '#9aa2ad', '#3a3d44'));
      box(2, 3, 7, 12, '#1a1b1f');
      box(0, -12, 16, 5, '#4a4e57');
      break;
    case 'shotgun':
      c.fillStyle = '#7a4520'; c.beginPath(); c.moveTo(-34, -2); c.lineTo(-8, -4); c.lineTo(-8, 5); c.lineTo(-34, 11); c.closePath(); c.fill(); c.stroke();
      box(-9, -6, 20, 10, '#2c2e34');
      box(10, -6, 40, 4, metal(c, -6, -2, '#b8c0ca', '#40454e'));
      box(10, -2, 40, 4, metal(c, -2, 2, '#9aa2ad', '#30343b'));
      box(16, 2, 16, 6, '#8a5428');
      break;
    case 'bazooka':
      c.fillStyle = metal(c, -9, 9, '#a3ae78', '#3e4a24'); rrect(c, -44, -9, 86, 17, 6); c.fill(); c.stroke();
      box(38, -11, 8, 21, '#2f3a1c');
      box(-48, -11, 7, 21, '#2f3a1c');
      box(-6, 8, 6, 12, '#222');
      box(4, -16, 10, 7, '#222');
      c.fillStyle = '#d4c24a'; c.font = '700 7px Teko, sans-serif'; c.fillText('HE', -24, 3);
      break;
    case 'grenade':
      c.fillStyle = '#4e5a2c'; c.beginPath(); c.ellipse(4, 0, 6, 8, 0, 0, TAU); c.fill(); c.stroke();
      box(1, -11, 6, 4, '#888');
      c.strokeStyle = '#2e361a'; c.lineWidth = 1; line(c, -1, -2, 9, -2); line(c, -1, 3, 9, 3);
      break;
    case 'rock':
      c.fillStyle = '#8a8478'; c.beginPath(); c.moveTo(-2, -7); c.lineTo(9, -9); c.lineTo(15, -1); c.lineTo(11, 8); c.lineTo(0, 8); c.lineTo(-5, 1); c.closePath(); c.fill(); c.stroke();
      break;
  }
  c.restore();
}

/* ---------------- head ---------------- */
function drawHead(c, L, o = {}) {
  const hs = L.hairStyle, hair = L.hair, ex = L.extra || [], fem = !!L.female, t = o.t || 0;
  c.lineJoin = 'round'; c.lineCap = 'round';
  // hair behind the head
  if (hs === 'wavy') {
    const sw = Math.sin(t * 0.09) * 2;
    const p = new Path2D();
    p.moveTo(6, -12); p.quadraticCurveTo(-3, -20, -13, -12); p.quadraticCurveTo(-21, -4, -17, 6);
    p.quadraticCurveTo(-23, 14, -16, 21); p.quadraticCurveTo(-20, 30 + sw, -9, 34 + sw); p.quadraticCurveTo(-3, 30, -2, 23);
    p.quadraticCurveTo(-7, 18, -3, 11); p.quadraticCurveTo(-1, 4, 3, -3); p.closePath();
    part(c, p, hair, 0.8);
    c.strokeStyle = shade(hair, 0.35); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-10, -10); c.quadraticCurveTo(-17, 2, -12, 14); c.stroke();
    c.beginPath(); c.moveTo(-14, 16); c.quadraticCurveTo(-16, 24, -9, 30); c.stroke();
  }
  if (hs === 'long') {
    const p = new Path2D();
    p.moveTo(4, -12); p.quadraticCurveTo(-14, -16, -15, 0); p.lineTo(-16, 30); p.lineTo(-5, 27); p.quadraticCurveTo(-4, 10, 0, 2); p.closePath();
    part(c, p, hair, 0.8);
  }
  if (hs === 'bandana') {
    const p = new Path2D(); polyPath(p, [[-10, -6], [-21, 3], [-18, -1], [-22, -9]]); part(c, p, L.bandana, 0.5);
  }
  // face: cranium + jaw
  const face = new Path2D();
  ellPath(face, -0.5, -2.5, 10.6, 11.6);
  polyPath(face, fem ? [[10.5, 1], [9.2, 8.5], [4.5, 12.3], [-1.5, 10.6], [-6, 3]] : [[10.8, 0.5], [11.2, 7.6], [8.6, 12.6], [2, 13.6], [-4, 11], [-7, 3]]);
  part(c, face, L.skin, 0.9);
  // ear
  const ear = new Path2D(); ellPath(ear, -2.6, 1.4, 2.6, 3.7); part(c, ear, L.skin, 0.35, 1.4);
  c.strokeStyle = shade(L.skin, -0.45); c.lineWidth = 0.9; c.beginPath(); c.arc(-2.6, 1.4, 1.3, -1, 1.6); c.stroke();
  // brow ridge shadow + eyebrow
  c.fillStyle = shade(L.skin, -0.32);
  c.beginPath(); c.moveTo(2.5, -4.6); c.lineTo(11, -3.8); c.lineTo(10.6, -2.4); c.lineTo(3, -2.8); c.closePath(); c.fill();
  const browCol = hs === 'bald' || hs === 'wild' ? shade(L.skin, -0.6) : hair;
  c.strokeStyle = browCol; c.lineWidth = fem ? 1.2 : 2;
  line(c, 3.4, -5.3, 10.3, fem ? -5.2 : -4.3);
  // eye
  if (ex.includes('shades')) {
    c.fillStyle = '#0d0d12'; rrect(c, 3.5, -4.4, 9, 4.2, 1.5); c.fill();
    c.fillStyle = 'rgba(160,200,255,0.75)'; c.fillRect(5, -3.6, 3, 1);
  } else if (ex.includes('eyepatch')) {
    c.strokeStyle = '#111'; c.lineWidth = 1.2; line(c, -9, -7, 11, -1);
    c.fillStyle = '#111'; c.beginPath(); c.ellipse(7.8, -1.6, 3.4, 2.7, 0, 0, TAU); c.fill();
  } else {
    c.fillStyle = '#fbf6ec'; c.beginPath(); c.ellipse(7.7, -1.5, 2.2, 1.35, 0, 0, TAU); c.fill();
    if (o.glowEyes) { c.fillStyle = '#ff2f5f'; c.shadowColor = '#ff2f5f'; c.shadowBlur = 8; } else c.fillStyle = '#1a120c';
    c.beginPath(); c.arc(8.5, -1.4, 1.05, 0, TAU); c.fill(); c.shadowBlur = 0;
    if (fem) { c.strokeStyle = OUT; c.lineWidth = 1.2; line(c, 5.6, -2.8, 10, -2.6); }
  }
  // nose
  const nose = new Path2D(); polyPath(nose, [[9.8, -2.6], [13, 3.6], [11.8, 5], [9.4, 4.6]]); part(c, nose, L.skin, 0.25, 1.1);
  // cheek / mouth
  c.strokeStyle = shade(L.skin, -0.42); c.lineWidth = 0.9; line(c, 6.2, 3.8, 8, 7);
  if (L.lips) { c.fillStyle = L.lips; c.beginPath(); c.ellipse(9.9, 8.5, 2, 1.1, -0.1, 0, TAU); c.fill(); }
  else { c.strokeStyle = shade(L.skin, -0.6); c.lineWidth = 1.1; line(c, 7.8, 8.8, 11, 8.3); }
  if (ex.includes('glasses')) {
    c.strokeStyle = '#111'; c.lineWidth = 1.1; c.fillStyle = 'rgba(170,225,255,0.35)';
    c.beginPath(); c.arc(8, -1.6, 3.4, 0, TAU); c.fill(); c.stroke(); line(c, 4.6, -1.8, -2, -2.5);
  }
  if (ex.includes('scar')) { c.strokeStyle = '#8a2b2b'; c.lineWidth = 1.1; line(c, 4, 1, 7.5, 6); }
  // facial hair
  if (ex.includes('beard')) {
    const p = new Path2D();
    p.moveTo(-5, 2); p.quadraticCurveTo(-4, 14, 3, 15.5); p.quadraticCurveTo(10, 15, 11.6, 7.5); p.lineTo(8.5, 9.4);
    p.quadraticCurveTo(5, 10, 3, 6); p.quadraticCurveTo(-1, 6, -2, 2); p.closePath();
    part(c, p, L.beard || hair, 0.5, 1.3);
  }
  if (ex.includes('mustache')) {
    const p = new Path2D(); p.moveTo(7, 6.6); p.quadraticCurveTo(10, 5, 12.4, 6.4); p.lineTo(12, 8.2); p.quadraticCurveTo(10, 7.4, 7.4, 8.4); p.closePath();
    c.fillStyle = hair; c.fill(p);
  }
  // hair / headwear on top
  switch (hs) {
    case 'cap': {
      const back = new Path2D(); polyPath(back, [[-11, -3], [-11.4, 6], [-7.5, 8], [-6, 0]]); part(c, back, hair, 0.4, 1.4);
      const crown = new Path2D();
      crown.moveTo(-11.8, 0); crown.quadraticCurveTo(-13, -16.5, 0, -17); crown.quadraticCurveTo(11.5, -16.5, 11.4, -4.5); crown.lineTo(-11.8, 0); crown.closePath();
      part(c, crown, L.cap, 0.9);
      const brim = new Path2D(); polyPath(brim, [[5, -6.4], [23, -4.6], [22.4, -1.6], [5, -3.2]]); part(c, brim, shade(L.cap, -0.12), 0.4, 1.6);
      c.strokeStyle = shade(L.cap, -0.4); c.lineWidth = 0.8; line(c, -1, -16.5, 2, -1.8); line(c, -8, -12, -6, -0.5);
      c.fillStyle = shade(L.cap, -0.35); c.beginPath(); c.arc(-0.5, -17, 1.6, 0, TAU); c.fill();
      break;
    }
    case 'slick': {
      const p = new Path2D();
      p.moveTo(10, -6.5); p.quadraticCurveTo(9, -15, -1, -15.5); p.quadraticCurveTo(-12.5, -14, -12.4, -2); p.quadraticCurveTo(-12, 5, -8.5, 8);
      p.lineTo(-5.6, 2); p.quadraticCurveTo(-6, -6, 0, -9); p.quadraticCurveTo(6, -10.5, 10, -6.5); p.closePath();
      part(c, p, hair, 0.7);
      c.strokeStyle = shade(hair, 0.45); c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-8, -10); c.quadraticCurveTo(0, -14, 8, -9); c.stroke();
      break;
    }
    case 'wavy': {
      const p = new Path2D();
      p.moveTo(10.6, -4.5); p.quadraticCurveTo(10, -14.5, 0, -15); p.quadraticCurveTo(-11, -14, -12, -3);
      p.lineTo(-6.5, -5.5); p.quadraticCurveTo(-1, -9, 3, -6.5); p.quadraticCurveTo(7, -9.5, 10.6, -4.5); p.closePath();
      part(c, p, hair, 0.6);
      c.strokeStyle = shade(hair, 0.4); c.lineWidth = 0.9; c.beginPath(); c.moveTo(-6, -11); c.quadraticCurveTo(0, -14, 6, -10); c.stroke();
      break;
    }
    case 'long': {
      const p = new Path2D(); p.moveTo(10.4, -4.5); p.quadraticCurveTo(9.5, -15, -1, -15); p.quadraticCurveTo(-12, -14, -12, -2); p.lineTo(-5, -6); p.quadraticCurveTo(3, -10, 10.4, -4.5); p.closePath();
      part(c, p, hair, 0.6);
      break;
    }
    case 'flattop': {
      const p = new Path2D(); polyPath(p, [[-11.2, 4], [-11.8, -12], [-9.5, -18], [8.8, -18], [10.8, -13.5], [10.4, -6.6], [5, -8], [-3, -7.2], [-7, -3], [-8, 5]]);
      part(c, p, hair, 0.6);
      c.strokeStyle = shade(hair, 0.45); c.lineWidth = 0.8; line(c, -8, -16.5, 7.5, -16.5);
      break;
    }
    case 'bald':
      c.fillStyle = 'rgba(255,255,255,0.32)'; c.beginPath(); c.ellipse(-1, -10.5, 4.6, 2, -0.3, 0, TAU); c.fill();
      break;
    case 'bandana': {
      const p = new Path2D(); p.moveTo(-11.6, 0); p.quadraticCurveTo(-12.5, -15.5, 0, -15.8); p.quadraticCurveTo(11, -15.5, 11, -5.5); p.lineTo(-11.6, 0); p.closePath();
      part(c, p, L.bandana, 0.7);
      c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-6 + i * 4.5, -9 - (i % 2) * 3, 0.9, 0, TAU); c.fill(); }
      break;
    }
    case 'safari': {
      const crown = new Path2D(); polyPath(crown, [[-8.5, -8], [-7.5, -20], [7.5, -20], [8.6, -8]]); part(c, crown, L.hat, 0.7);
      c.fillStyle = shade(L.hat, -0.45); c.fillRect(-8.3, -11.5, 16.8, 3);
      const brim = new Path2D(); ellPath(brim, 0, -8.5, 19, 3.6); part(c, brim, shade(L.hat, -0.06), 0.4, 1.6);
      break;
    }
    case 'helmet': {
      const p = new Path2D(); p.moveTo(-12.5, 4); p.quadraticCurveTo(-14, -18, 1, -17.5); p.quadraticCurveTo(13, -16, 12.6, -5); p.lineTo(4, -5); p.lineTo(3, 1); p.lineTo(-6, 6); p.closePath();
      part(c, p, L.helmet, 0.9);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-3, -12, 5, 2, -0.4, 0, TAU); c.fill();
      break;
    }
    case 'mohawk': {
      const p = new Path2D(); polyPath(p, [[-10, -4], [-14, -14], [-7, -12], [-6, -22], [-1, -13], [2, -23], [5, -13], [9, -18], [9, -8]]);
      part(c, p, hair, 0.6);
      break;
    }
    case 'wild': {
      const p = new Path2D(); p.moveTo(-6, 9);
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.7 + i * (Math.PI * 1.25 / 10), rr = i % 2 ? 11.5 : 19 + Math.sin(t * 0.2 + i) * 1.5;
        p.lineTo(Math.cos(a) * rr - 3, Math.sin(a) * rr - 2);
      }
      p.lineTo(7, -7); p.closePath();
      part(c, p, hair, 0.6);
      break;
    }
  }
  if (ex.includes('earring')) { c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(-2.4, 5.6, 1.4, 0, TAU); c.fill(); }
}

/* ---------------- body ---------------- */
function torsoPath(b, fem, fat) {
  const hw = (fem ? 12.5 : 14.5) * b, ww = (fem ? 10.5 : 13) * b, sw = (fem ? 17 : 24.5) * b, TH = 50;
  const p = new Path2D();
  p.moveTo(-hw, 4);
  p.quadraticCurveTo(-ww - 1.5, -TH * 0.45, -sw * 0.86, -TH + 4);
  p.quadraticCurveTo(-sw * 0.78, -TH - 6, -sw * 0.2, -TH - 7);
  p.quadraticCurveTo(sw * 0.55, -TH - 9, sw * 0.95, -TH - 1);
  p.quadraticCurveTo(sw * (fem ? 1.25 : 1.16), -TH * 0.62, sw * 0.8, -TH * 0.38);
  if (fat) p.quadraticCurveTo(sw * 1.75, -TH * 0.05, hw * 1.15, 6);
  else p.quadraticCurveTo(ww * 1.02, -TH * 0.25, hw, 4);
  p.closePath();
  return p;
}
function drawTorso(c, L, P, hipY, b, fem) {
  const hw = (fem ? 12.5 : 14.5) * b, sw = (fem ? 17 : 24.5) * b, TH = 50, top = L.top;
  c.save(); c.translate(0, hipY); c.rotate(P.lean);
  // pelvis
  const pel = new Path2D(); rrPath(pel, -hw - 1.5, -8, (hw + 1.5) * 2, 22, 8); part(c, pel, L.pants);
  const tp = torsoPath(b, fem, L.fat);
  const skinBase = top === 'bare' || top === 'vest' || top === 'knot';
  const baseCol = skinBase ? L.skin : top === 'labcoat' ? L.coat : L.shirt;
  part(c, tp, baseCol);
  c.save(); c.clip(tp);
  const ink = (w, col = OUT) => { c.strokeStyle = col; c.lineWidth = w; };
  const dark = shade(baseCol, -0.42);
  switch (top) {
    case 'bare': case 'tee': {
      ink(1.2, dark);
      c.beginPath(); c.moveTo(sw * 0.05, -TH + 4); c.quadraticCurveTo(sw * 0.5, -TH + 18, sw * 0.95, -TH + 10); c.stroke();
      if (top === 'bare' || L.fat) {
        line(c, sw * 0.42, -TH + 22, sw * 0.42, -6);
        for (let i = 0; i < 3; i++) line(c, sw * 0.18, -TH + 24 + i * 7, sw * 0.68, -TH + 23 + i * 7);
      } else {
        c.beginPath(); c.moveTo(sw * 0.35, -26); c.quadraticCurveTo(sw * 0.5, -18, sw * 0.4, -8); c.stroke();
        ink(2.2, shade(baseCol, -0.25)); c.beginPath(); c.arc(sw * 0.15, -TH - 7, 9 * b, 0.1, 2.2); c.stroke();
      }
      break;
    }
    case 'military': case 'dress': case 'safari': {
      const vx = sw * 0.38;
      const v = new Path2D(); polyPath(v, [[vx - 9, -TH - 8], [vx + 7, -TH - 8], [vx, -TH + 13]]); c.fillStyle = L.skin; c.fill(v);
      c.fillStyle = shade(L.skin, -0.25); c.beginPath(); c.moveTo(vx - 9, -TH - 8); c.lineTo(vx - 2, -TH - 8); c.lineTo(vx, -TH + 13); c.closePath(); c.fill();
      // collar flaps
      for (const s of [-1, 1]) {
        const cf = new Path2D(); polyPath(cf, [[vx + s * 1, -TH - 6], [vx + s * 10, -TH - 9], [vx + s * 7, -TH + 3]]); part(c, cf, shade(baseCol, 0.08), 0.3, 1.2);
      }
      ink(1);
      if (top !== 'dress' || true) {
        const pk = new Path2D(); rrPath(pk, sw * 0.52, -TH + 13, 10 * b, 11, 2); part(c, pk, baseCol, 0.3, 1.1);
        ink(1, dark); line(c, sw * 0.52, -TH + 17, sw * 0.52 + 10 * b, -TH + 17);
        if (top !== 'dress') { const pk2 = new Path2D(); rrPath(pk2, -sw * 0.15, -TH + 13, 9 * b, 11, 2); part(c, pk2, shade(baseCol, -0.12), 0.3, 1.1); }
      }
      c.fillStyle = shade(baseCol, -0.5); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(vx + 1, -TH + 16 + i * 9, 0.9, 0, TAU); c.fill(); }
      ink(1, dark); line(c, vx + 2.5, -TH + 13, vx + 2.5, 2);
      if (top === 'safari' && L.strap) {
        c.fillStyle = L.strap; c.beginPath(); c.moveTo(-sw, -TH - 2); c.lineTo(-sw + 7, -TH - 6); c.lineTo(sw * 1.1, -4); c.lineTo(sw * 1.1, 4); c.closePath(); c.fill();
        c.fillStyle = '#e0c060'; for (let i = 0; i < 6; i++) c.fillRect(-sw + 8 + i * 7, -TH + 2 + i * 6.2, 2.4, 4);
      }
      ink(1.1, dark); c.beginPath(); c.moveTo(-sw * 0.6, -6); c.quadraticCurveTo(0, -12, sw * 0.6, -5); c.stroke();
      break;
    }
    case 'knot': {
      const sh = new Path2D();
      polyPath(sh, [[-sw - 6, -TH - 12], [sw * 0.18, -TH - 12], [sw * 0.42, -24], [sw * 0.72, -TH - 12], [sw + 10, -TH - 12], [sw + 10, -21], [sw * 0.5, -19], [-sw - 6, -17]]);
      part(c, sh, L.shirt, 0.8);
      const kn = new Path2D(); ellPath(kn, sw * 0.5, -20, 4, 3.4); polyPath(kn, [[sw * 0.42, -18], [sw * 0.3, -9], [sw * 0.4, -8], [sw * 0.52, -17]]);
      polyPath(kn, [[sw * 0.56, -18], [sw * 0.72, -10], [sw * 0.8, -11], [sw * 0.64, -18]]);
      part(c, kn, L.shirt, 0.4, 1.2);
      ink(0.9, shade(L.skin, -0.4)); line(c, sw * 0.5, -10, sw * 0.5, -6);
      break;
    }
    case 'tank': {
      const sk = new Path2D(); ellPath(sk, sw * 0.25, -TH - 4, sw * 0.5, 10); c.fillStyle = L.skin; c.fill(sk);
      ink(1.4); c.beginPath(); c.ellipse(sw * 0.25, -TH - 4, sw * 0.5, 10, 0, 0.1, Math.PI - 0.1); c.stroke();
      break;
    }
    case 'vest': case 'jacket': {
      const vcol = top === 'vest' ? (L.vest || L.shirt) : L.shirt;
      if (top === 'vest') {
        const v = new Path2D(); rrPath(v, -sw - 6, -TH - 10, sw * 1.12, TH + 16, 2); rrPath(v, sw * 0.68, -TH - 10, sw * 0.7, TH + 16, 2);
        part(c, v, vcol, 0.8);
        c.fillStyle = '#c8c8d0'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(sw * 0.72, -TH + i * 10, 1, 0, TAU); c.fill(); }
      } else {
        ink(1, '#9aa2ad'); line(c, sw * 0.42, -TH - 6, sw * 0.42, 2);
        const lap = new Path2D(); polyPath(lap, [[sw * 0.2, -TH - 8], [sw * 0.45, -TH - 8], [sw * 0.42, -TH + 10]]); part(c, lap, shade(vcol, 0.12), 0.3, 1);
      }
      break;
    }
    case 'labcoat': {
      const sh = new Path2D(); polyPath(sh, [[sw * 0.15, -TH - 9], [sw * 0.6, -TH - 9], [sw * 0.42, -6]]); part(c, sh, L.shirt, 0.4, 1);
      ink(1.2, '#8a1c1c'); line(c, sw * 0.38, -TH, sw * 0.4, -18);
      ink(1, shade(L.coat, -0.4)); line(c, sw * 0.62, -TH - 8, sw * 0.62, 4);
      break;
    }
  }
  if (L.suspenders) { c.fillStyle = L.suspenders; c.fillRect(-sw * 0.4, -TH - 8, 4, TH + 10); c.fillRect(sw * 0.62, -TH - 8, 4, TH + 10); }
  if (L.sash) {
    const g = c.createLinearGradient(-sw, -TH, sw, 0); g.addColorStop(0, '#fff1b0'); g.addColorStop(0.5, L.sash); g.addColorStop(1, '#8a6514');
    c.fillStyle = g; c.beginPath(); c.moveTo(-sw, -TH - 2); c.lineTo(-sw + 9, -TH - 6); c.lineTo(sw * 1.15, -6); c.lineTo(sw * 1.15, 3); c.closePath(); c.fill();
  }
  c.restore();
  if (L.necklace === 'skull') {
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-sw * 0.3, -TH - 5); c.quadraticCurveTo(sw * 0.3, -TH + 18, sw * 0.85, -TH - 2); c.stroke();
    for (let i = 0; i < 4; i++) { const sx = -sw * 0.1 + i * sw * 0.25, sy = -TH + 6 + Math.sin(i * 1.3) * 3; const sk = new Path2D(); ellPath(sk, sx, sy, 3.4, 3); part(c, sk, '#efe6cf', 0.3, 1); }
  }
  // belt, buckle, holster
  const bp = new Path2D(); rrPath(bp, -hw - 2, -6, (hw + 2) * 2, 8, 2); part(c, bp, L.belt || '#222', 0.3, 1.4);
  c.fillStyle = '#e8c35a'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(hw - 8, -6, 7, 8); c.strokeRect(hw - 8, -6, 7, 8);
  if (L.holster) { const h = new Path2D(); rrPath(h, -hw - 6, -2, 10, 22, 3); part(c, h, L.holster, 0.4, 1.4); c.fillStyle = '#3a3d45'; c.fillRect(-hw - 4, -8, 6, 7); }
  c.restore();
}

function drawArm(c, L, sx, sy, a1, a2, w, far, weapon, o) {
  const skin = far ? shade(L.skin, -0.2) : L.skin;
  const shirtCol = L.top === 'labcoat' ? L.coat : L.shirt;
  const sc = far ? shade(shirtCol, -0.2) : shirtCol;
  const arm = new Path2D();
  const k = segPath(arm, sx, sy, a1, 26, w * 1.15, w * 0.86, 0.26, 0.07);
  const e = segPath(arm, k[0], k[1], a2, 24, w * 0.95, w * 0.66, 0.14, 0.06);
  part(c, arm, skin);
  const sl = L.sleeves;
  if (sl === 'short' || sl === 'rolled' || sl === 'long') {
    const sp = new Path2D();
    segPath(sp, sx, sy, a1, sl === 'short' ? 13 : 23, w * 1.4, w * 1.22, 0.1, 0.06);
    if (sl === 'long') segPath(sp, k[0], k[1], a2, 20, w * 1.1, w * 0.9, 0.06, 0.04);
    part(c, sp, sc, 0.8);
    if (sl === 'rolled') {
      const cuff = new Path2D(); segPath(cuff, sx + Math.sin(a1) * 18, sy + Math.cos(a1) * 18, a1, 7, w * 1.36, w * 1.32, 0, 0); part(c, cuff, shade(sc, 0.06), 0.4, 1.4);
    }
  }
  const ang = Math.atan2(Math.cos(a2), Math.sin(a2));
  if (weapon && weapon !== 'bazooka') drawWeapon(c, weapon, e[0], e[1], ang, o);
  // fist
  c.save(); c.translate(e[0], e[1]); c.rotate(ang);
  const r = w * 0.64, hp = new Path2D(); rrPath(hp, -3, -r * 0.85, r * 1.75, r * 1.7, r * 0.55);
  const glove = L.gloves ? (far ? shade(L.gloves, -0.2) : L.gloves) : skin;
  part(c, hp, glove, 0.4, 1.6);
  c.strokeStyle = shade(glove, -0.45); c.lineWidth = 0.9; line(c, r * 1.05, -r * 0.6, r * 1.05, r * 0.6); line(c, r * 0.2, -r * 0.1, r * 1.0, -r * 0.1);
  c.restore();
}
function drawLeg(c, L, hx, hy, a1, a2, w, far) {
  const pants = far ? shade(L.pants, -0.2) : L.pants, boots = far ? shade(L.boots, -0.2) : L.boots;
  const leg = new Path2D();
  const k = segPath(leg, hx, hy, a1, 37, w * 1.15, w * 0.78, 0.16, 0.05);
  segPath(leg, k[0], k[1], a2, 34, w * 0.82, w * 0.56, 0.03, 0.2);
  part(c, leg, pants);
  c.strokeStyle = shade(pants, -0.45); c.lineWidth = 1;
  c.beginPath(); c.moveTo(k[0] - 4, k[1] - 6); c.quadraticCurveTo(k[0] + 2, k[1] - 2, k[0] + 5, k[1] - 7); c.stroke();
  const bx = k[0] + Math.sin(a2) * 13, by = k[1] + Math.cos(a2) * 13;
  const bp = new Path2D();
  const end = segPath(bp, bx, by, a2, 21, w * 0.74, w * 0.6, 0.02, 0.08);
  const fx = Math.cos(a2), fy = -Math.sin(a2), dx = Math.sin(a2), dy = Math.cos(a2);
  const P = (u, v) => [end[0] + fx * u + dx * v, end[1] + fy * u + dy * v];
  polyPath(bp, [P(-7, -4), P(5, -5), P(13, -1), P(16, 3), P(15, 6.5), P(-8, 6.5)]);
  part(c, bp, boots);
  c.strokeStyle = shade(boots, -0.5); c.lineWidth = 1.6; const s0 = P(-8, 5), s1 = P(15, 5); line(c, s0[0], s0[1], s1[0], s1[1]);
}

/* Full fighter. P = pose from getPose(). o: { weapon, weapon2, aura, glowEyes, t, ext } */
function drawFigure(c, L, P, x, y, facing, s, o = {}) {
  const b = L.build || 1, fem = !!L.female;
  c.save(); c.translate(x, y); c.scale(facing * s, s);
  if (P.rot) { c.translate(0, -(P.lift || 0)); c.rotate(P.rot); }
  if (o.aura) {
    const pulse = 0.32 + 0.14 * Math.sin((o.t || 0) * 0.1);
    const ag = c.createRadialGradient(0, -90, 10, 0, -90, 125);
    ag.addColorStop(0, rgba(o.aura, pulse)); ag.addColorStop(1, rgba(o.aura, 0));
    c.fillStyle = ag; c.fillRect(-140, -220, 280, 230);
  }
  const hipY = -76 + P.by, lean = P.lean, cl = Math.cos(lean), sl = Math.sin(lean);
  const tf = (u, v) => [u * cl - v * sl, hipY + u * sl + v * cl];
  const sw = (fem ? 17 : 24.5) * b;
  const armW = (fem ? 10 : 13.5) * b, legW = (fem ? 15 : 18.5) * b * (L.fat ? 1.15 : 1);
  const farSh = tf(sw * 0.5, -46), nearSh = tf(-sw * 0.45, -45);
  // far arm + far leg
  drawArm(c, L, farSh[0], farSh[1], P.ab[0], P.ab[1], armW, true, o.weapon2, o);
  drawLeg(c, L, 6 * b, hipY + 4, P.lb[0], P.lb[1], legW, true);
  // coat tail
  if (L.top === 'labcoat') {
    c.save(); c.translate(0, hipY); c.rotate(lean);
    const ct = new Path2D(); polyPath(ct, [[-15 * b, -4], [-24 * b, 54], [6, 50], [8, -2]]); part(c, ct, shade(L.coat, -0.1), 0.8);
    c.restore();
  }
  // neck
  const nk = tf(sw * 0.1, -50);
  c.save(); c.translate(nk[0], nk[1]); c.rotate(lean + P.head * 0.5);
  const np = new Path2D(); rrPath(np, -(fem ? 5.5 : 7.5) * b, -16, (fem ? 11 : 15) * b, 20, 4); part(c, np, L.skin, 0.6);
  c.restore();
  drawTorso(c, L, P, hipY, b, fem);
  drawLeg(c, L, -5 * b, hipY + 4, P.lf[0], P.lf[1], legW, false);
  // extra mutant heads
  const hc = tf(sw * 0.16, -66);
  if (L.heads3) {
    for (const [u, sc] of [[sw * 0.85, 0.82], [-sw * 0.75, 0.78]]) {
      const hp2 = tf(u, -60);
      c.save(); c.translate(hp2[0], hp2[1]); c.rotate(lean + (u > 0 ? 0.35 : -0.3)); c.scale(sc, sc);
      drawHead(c, { ...L, hairStyle: 'bald', extra: [] }, { t: o.t, glowEyes: true });
      c.restore();
    }
  }
  c.save(); c.translate(hc[0], hc[1]); c.rotate(lean + P.head); c.scale(1.1, 1.1);
  drawHead(c, L, o);
  c.restore();
  if (o.weapon === 'bazooka') {
    const bz = tf(sw * 0.2, -44);
    drawWeapon(c, 'bazooka', bz[0] + 6, bz[1], lean * 0.5, o);
  }
  drawArm(c, L, nearSh[0], nearSh[1], P.af[0], P.af[1], armW, false, o.weapon, o);
  c.restore();
}

/* ---------------- poses ---------------- */
function basePose() {
  return { by: 0, lean: 0.06, head: 0, af: [0.5, 2.5], ab: [0.3, 2.35], lf: [0.3, 0.06], lb: [-0.24, -0.34], rot: 0, lift: 0 };
}
const LONG_GUNS = ['rifle', 'shotgun', 'uzi', 'pistol'];
function getPose(f) {
  const P = basePose(), t = f.t, st = f.state, wpn = f.weapon;
  const hold = LONG_GUNS.includes(wpn), bz = wpn === 'bazooka';
  const brt = Math.sin((G.t + f.id * 17) * 0.08);
  const guard = () => {
    if (bz) { P.af = [1.2, 2.4]; P.ab = [1.0, 2.2]; }
    else if (hold) { P.af = [0.95, 1.42]; P.ab = [0.8, 1.5]; }
    else if (wpn) P.af = [0.55, 1.6];
  };
  switch (st) {
    case 'idle': P.by = brt * 1.4; guard(); break;
    case 'walk': case 'enter': case 'charge': {
      const ph = f.walkPh, s = Math.sin(ph), cph = Math.cos(ph), run = f.running || st === 'charge';
      const amp = run ? 0.75 : 0.5;
      P.lf = [amp * s, amp * s - 0.65 * Math.max(0, cph)];
      P.lb = [-amp * s, -amp * s - 0.65 * Math.max(0, -cph)];
      P.by = -Math.abs(cph) * 3;
      if (run) { P.lean = 0.32; P.af = [0.3 - 0.9 * s, 1.9]; P.ab = [0.3 + 0.9 * s, 1.8]; }
      else { P.af = [0.5 - 0.25 * s, 2.4]; P.ab = [0.3 + 0.25 * s, 2.3]; }
      if (st === 'charge' && t < 26) { P.lean = 0.45; P.by = 6; P.lf = [0.8, -0.2]; P.lb = [-0.6, -0.9]; P.af = [-0.6, 0]; P.ab = [-0.8, -0.2]; }
      else guard();
      break;
    }
    case 'jump': case 'drop':
      if (f.jatk) { P.lf = [1.45, 1.55]; P.lb = [-0.2, -0.95]; P.lean = -0.2; P.af = [0.6, 2.5]; P.ab = [-0.5, 0.3]; }
      else { P.lf = [0.9, -0.15]; P.lb = [0.25, -0.7]; P.af = [0.7, 2.7]; P.ab = [0.5, 2.6]; guard(); }
      break;
    case 'hurt': case 'grabbed':
      P.lean = -0.32; P.head = -0.25; P.af = [-0.35, 0.25]; P.ab = [-0.55, 0.05]; P.by = 2; P.lf = [0.35, 0.2]; P.lb = [-0.3, -0.2];
      break;
    case 'fall':
      P.rot = -1.45 * Math.min(1, t / 10); P.af = [-1.2, -1.6]; P.ab = [-1.5, -2.0]; P.lf = [0.6, 0.3]; P.lb = [0.2, -0.2]; P.head = 0.3;
      break;
    case 'down': case 'dead':
      P.rot = -1.52; P.lift = 12; P.af = [-2.2, -2.6]; P.ab = [-2.4, -2.8]; P.lf = [0.15, 0.1]; P.lb = [-0.05, -0.1]; P.head = 0.2;
      break;
    case 'getup': { const k = t / 18; P.rot = -1.52 * (1 - k); P.lift = 12 * (1 - k); P.by = 8 * (1 - k); P.af = [0.4, 1.2]; P.lf = [0.9, -0.3]; break; }
    case 'grab':
      P.af = [1.25, 1.0]; P.ab = [1.15, 1.05]; P.lean = 0.12;
      if (f.sub > 0 && f.subKind === 'knee') { const k = Math.sin((14 - f.sub) / 14 * Math.PI); P.lf = [0.3 + 1.2 * k, 0.1 - 0.3 * k]; P.lean = 0.12 + 0.15 * k; }
      break;
    case 'win': P.af = [3.0, 3.1]; P.ab = [0.3, 2.2]; P.by = brt; break;
    case 'taunt': P.af = [2.5, 2.9]; P.ab = [2.3, 2.8]; P.lean = -0.22; P.head = -0.25; P.by = Math.sin(t * 0.5) * 1.5; break;
    case 'ride': P.lf = [1.35, 0.25]; P.lb = [1.2, 0.15]; P.af = [1.35, 1.7]; P.ab = [1.25, 1.65]; P.lean = 0.18; P.by = 4; break;
    case 'attack': attackPose(P, f); break;
  }
  return P;
}
function attackPose(P, f) {
  const m = f.move || {}, t = f.t, a0 = m.a0 || m.fire || 1, a1 = m.a1 || a0 + 3, dur = m.dur || 20;
  const pre = Math.min(1, t / a0);
  const act = t < a0 ? 0 : t <= a1 + 2 ? 1 : Math.max(0, 1 - (t - a1 - 2) / Math.max(1, dur - a1 - 2));
  switch (m.pose) {
    case 'jab':
      if (t < a0) { P.af = [0.4, 2.6]; P.lean = 0.02; } else { P.af = [lerp(0.6, 1.57, act), lerp(2.4, 1.57, act)]; P.lean = 0.08 + 0.14 * act; }
      break;
    case 'cross': P.ab = [lerp(0.3, 1.55, act), lerp(2.3, 1.57, act)]; P.af = [0.4, 2.6]; P.lean = 0.1 + 0.2 * act; P.lf = [0.45, 0.15]; break;
    case 'uppercut':
      if (t < a0) { P.by = 7 * pre; P.af = [0.1, 0.7]; P.lean = 0.15; }
      else { P.af = [lerp(0.1, 2.7, act), lerp(0.7, 3.05, act)]; P.lean = 0.15 - 0.3 * act; P.by = -4 * act; P.lf = [0.2, 0.05]; P.lb = [-0.4, -0.5]; }
      break;
    case 'rising':
      P.af = [2.75, 3.08]; P.ab = [0.4, 1.4]; P.lf = [1.1, 0.2]; P.lb = [0.2, -0.6]; P.lean = -0.12; P.head = -0.2;
      break;
    case 'kick':
      if (t < a0) P.lf = [0.9 * pre, -0.6 * pre]; else P.lf = [lerp(0.3, 1.5, act), lerp(0.08, 1.62, act)];
      P.lean = -0.28 * act; P.lb = [-0.1, -0.15]; P.af = [0.5, 2.4]; P.ab = [-0.4, 0.6];
      break;
    case 'spinkick':
      P.lf = [lerp(0.3, 1.75, act), lerp(0.1, 1.8, act)]; P.lean = -0.35 * act; P.ab = [-1.2, -1.0]; P.af = [1.0, 1.4]; P.lb = [-0.05, -0.1];
      break;
    case 'slam':
      if (t < a0) { P.af = [lerp(0.5, 3.0, pre), lerp(2.5, 3.1, pre)]; P.ab = [lerp(0.3, 2.9, pre), lerp(2.3, 3.05, pre)]; P.lean = -0.2 * pre; }
      else { P.af = [1.2, 1.0]; P.ab = [1.1, 0.95]; P.lean = 0.42 * act; P.by = 9 * act; P.lf = [0.6, 0.2]; }
      break;
    case 'dash': P.lean = 0.42; P.af = [1.0, 1.9]; P.ab = [-0.4, 0.6]; P.lf = [0.95, 0.35]; P.lb = [-0.65, -0.95]; break;
    case 'swing':
      if (t < a0) { P.af = [lerp(0.5, 2.9, pre), lerp(2.0, 3.0, pre)]; P.lean = -0.15 * pre; }
      else { const k = Math.min(1, (t - a0) / 3); P.af = [lerp(2.9, 1.2, k), lerp(3.0, 0.9, k)]; P.lean = 0.22 * act; }
      break;
    case 'whip':
      if (t < a0) { P.af = [lerp(0.5, 2.6, pre), lerp(2.0, 2.9, pre)]; P.lean = -0.15 * pre; } else { P.af = [1.6, 1.55]; P.lean = 0.15 * act; }
      break;
    case 'shoot': P.af = [1.52, 1.54]; P.ab = [1.28, 1.5]; P.lean = t >= a0 && t < a0 + 4 ? -0.08 : 0.02; break;
    case 'bazooka': P.af = [1.2, 2.4]; P.ab = [1.0, 2.2]; P.lean = t >= a0 && t < a0 + 8 ? -0.2 : 0.02; P.lb = [-0.45, -0.5]; break;
    case 'toss':
      if (t < a0) { P.af = [lerp(0.5, -0.9, pre), lerp(2.4, 1.0, pre)]; P.lean = -0.1 * pre; } else { P.af = [1.8, 1.7]; P.lean = 0.15; }
      break;
    case 'cast': P.af = [lerp(0.5, 1.6, pre), lerp(2.4, 1.8, pre)]; P.ab = [lerp(0.3, 1.4, pre), lerp(2.3, 1.7, pre)]; P.lean = -0.1; break;
    case 'throw': {
      const k = t / dur; P.lean = lerp(0.25, -0.35, k);
      P.af = [lerp(1.2, 3.0, k), lerp(1.0, 3.0, k)]; P.ab = [lerp(1.1, 2.8, k), lerp(1.0, 2.9, k)];
      break;
    }
    case 'special': P.af = [1.6, 1.6]; P.ab = [-1.6, -1.6]; P.by = -6; P.lf = [0.45, 0.25]; P.lb = [-0.45, -0.25]; P.lean = 0; break;
  }
}

/* ---------------- dinosaurs ---------------- */
function dinoPose(f) {
  const P = { ph: f.walkPh, jaw: 0.12 + 0.06 * Math.sin(G.t * 0.1 + f.id), lean: 0, rot: 0, lift: 0, head: 0 };
  const t = f.t;
  if (f.docile && (f.state === 'idle' || f.state === 'walk')) { P.head = 0.35 + Math.sin(G.t * 0.05 + f.id) * 0.08; P.jaw = 0.2; }
  switch (f.state) {
    case 'attack': {
      const m = f.move;
      if (m.pose === 'bite') {
        if (t < m.a0) { P.jaw = 0.15 + 0.6 * (t / m.a0); P.lean = -0.12; P.head = -0.2; }
        else if (t <= m.a1) { P.jaw = 0.04; P.lean = 0.2; P.head = 0.25; } else P.jaw = 0.25;
      } else if (m.pose === 'stomp') {
        if (t < m.a0) { P.lean = -0.28 * (t / m.a0); P.jaw = 0.75; } else { P.lean = 0.12; P.jaw = 0.8; }
      }
      break;
    }
    case 'taunt': P.jaw = 0.85; P.lean = -0.18; P.head = -0.3; break;
    case 'charge': if (t < 26) { P.jaw = 0.85; P.lean = -0.15; } else { P.lean = 0.18; P.head = 0.3; } break;
    case 'hurt': P.jaw = 0.5; P.lean = -0.15; break;
    case 'fall': P.rot = -Math.min(0.5, t * 0.05); P.jaw = 0.6; break;
    case 'down': case 'dead': P.rot = -0.5; P.lift = 8; P.jaw = 0.6; break;
    case 'getup': P.rot = -0.5 * (1 - t / 18); break;
  }
  return P;
}
// Two-legged dinosaurs: kind 'raptor' or 'rex'
function drawTheropod(c, x, y, facing, s, P, o) {
  const rex = o.kind === 'rex';
  const base = o.flash ? '#fff1dc' : o.col;
  const far = shade(base, -0.22), belly = o.flash ? '#fff1dc' : shade(base, 0.42);
  const stripe = o.flash ? '#fff1dc' : o.stripe || shade(base, -0.45);
  c.save(); c.translate(x, y); c.scale(facing * s, s);
  if (P.rot) { c.translate(0, -(P.lift || 0)); c.rotate(P.rot); }
  const sn = Math.sin(P.ph), legK = rex ? 1.2 : 1;
  const hipY = rex ? -72 : -64;
  theroLeg(c, -2, hipY, -sn * 0.5, far, legK, !rex);
  c.save(); c.translate(0, hipY); c.rotate(P.lean); c.translate(0, -hipY);
  // tail
  const tw = Math.sin(G.t * 0.09 + P.ph * 0.5) * 8;
  const tail = new Path2D();
  tail.moveTo(-14, hipY - 20); tail.quadraticCurveTo(-72, hipY - 28 + tw * 0.5, -(rex ? 150 : 132), hipY - 12 + tw);
  tail.quadraticCurveTo(-74, hipY - 2 + tw * 0.5, -12, hipY + 10); tail.closePath();
  part(c, tail, base);
  // body
  const body = new Path2D();
  const bs = rex ? 1.25 : 1;
  body.moveTo(-26 * bs, hipY - 16 * bs); body.quadraticCurveTo(0, hipY - 34 * bs, 32 * bs, hipY - 24 * bs);
  body.quadraticCurveTo(48 * bs, hipY - 10 * bs, 36 * bs, hipY + 6 * bs); body.quadraticCurveTo(10 * bs, hipY + 20 * bs, -20 * bs, hipY + 10 * bs);
  body.quadraticCurveTo(-32 * bs, hipY - 2, -26 * bs, hipY - 16 * bs); body.closePath();
  part(c, body, base);
  c.save(); c.clip(body);
  c.fillStyle = belly; c.beginPath(); c.ellipse(8 * bs, hipY + 14 * bs, 40 * bs, 13 * bs, -0.1, 0, TAU); c.fill();
  c.fillStyle = stripe;
  for (let k = 0; k < 6; k++) { const sx = -24 * bs + k * 10 * bs; c.beginPath(); c.moveTo(sx, hipY - 34 * bs); c.lineTo(sx + 6, hipY - 34 * bs); c.lineTo(sx + 1, hipY - 6 * bs); c.closePath(); c.fill(); }
  c.restore();
  c.save(); c.clip(tail); c.fillStyle = stripe;
  for (let k = 0; k < 5; k++) { const sx = -40 - k * 18; c.beginPath(); c.moveTo(sx, hipY - 30); c.lineTo(sx + 6, hipY - 30); c.lineTo(sx - 2, hipY); c.closePath(); c.fill(); }
  c.restore();
  if (o.crest) {
    for (let k = 0; k < 6; k++) { const sx = -40 + k * 13; const sp = new Path2D(); polyPath(sp, [[sx, hipY - 28], [sx + 6, hipY - 44 - (k % 2) * 4], [sx + 11, hipY - 30]]); part(c, sp, '#e2b43a', 0.3, 1.2); }
  }
  // neck + head
  const nb = rex ? [34, hipY - 18] : [24, hipY - 20];
  const nt = rex ? [58, hipY - 42] : [50, hipY - 50];
  const neck = new Path2D();
  const nw = rex ? 24 : 15;
  polyPath(neck, [[nb[0] - nw * 0.5, nb[1] - 4], [nt[0] - nw * 0.4, nt[1]], [nt[0] + nw * 0.55, nt[1] + 6], [nb[0] + nw * 0.7, nb[1] + 22]]);
  part(c, neck, base);
  c.save(); c.translate(nt[0] + 2, nt[1] - 2); c.rotate(P.head); c.scale(rex ? 1.55 : 1, rex ? 1.55 : 1);
  // mouth interior
  c.save(); c.translate(-4, 3); c.rotate(P.jaw);
  c.fillStyle = '#5a1414'; c.beginPath(); c.moveTo(-4, -3); c.lineTo(38, -4); c.lineTo(38, 1); c.closePath(); c.fill();
  const jaw = new Path2D(); polyPath(jaw, [[-6, 0], [38, 1], [36, 6], [12, 10.5], [-6, 7]]);
  part(c, jaw, belly, 0.5, 1.6);
  c.fillStyle = '#fffbe8'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(8 + k * 5, 1); c.lineTo(10.5 + k * 5, -4); c.lineTo(13 + k * 5, 1); c.fill(); }
  c.restore();
  const skull = new Path2D();
  skull.moveTo(-12, -6); skull.quadraticCurveTo(-6, -18, 10, -15); skull.quadraticCurveTo(28, -12, 42, -5); skull.lineTo(43, 2);
  skull.lineTo(-6, 6); skull.quadraticCurveTo(-15, 3, -12, -6); skull.closePath();
  part(c, skull, base, 0.8);
  c.fillStyle = '#fffbe8'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(9 + k * 5.4, 4); c.lineTo(11.5 + k * 5.4, 9.5); c.lineTo(14 + k * 5.4, 4); c.fill(); }
  c.fillStyle = stripe; c.beginPath(); c.moveTo(-8, -12); c.lineTo(0, -15); c.lineTo(-4, -6); c.closePath(); c.fill();
  c.fillStyle = '#ffd23a'; c.strokeStyle = OUT; c.lineWidth = 1.4;
  if (o.sil) { c.shadowColor = '#ffb020'; c.shadowBlur = 12; }
  c.beginPath(); c.ellipse(7, -7, 3.6, 2.8, 0, 0, TAU); c.fill(); c.shadowBlur = 0; c.stroke();
  c.fillStyle = '#000'; c.fillRect(6.4, -9.4, 1.4, 4.8);
  c.strokeStyle = OUT; c.lineWidth = 2.6; line(c, 1, -11.5, 15, -9);
  c.fillStyle = OUT; c.beginPath(); c.ellipse(39, -4, 1.8, 1.2, 0.3, 0, TAU); c.fill();
  c.restore();
  // arm
  const arm = new Path2D(), ak = rex ? 0.55 : 1;
  const ka = segPath(arm, (rex ? 40 : 32), hipY + 2, 0.9, 13 * ak, 8 * ak, 6 * ak, 0.2, 0.05);
  const kb = segPath(arm, ka[0], ka[1], 0.3, 11 * ak, 6 * ak, 4 * ak, 0.1, 0.05);
  part(c, arm, far, 0.5, 1.4);
  c.strokeStyle = OUT; c.lineWidth = 1.6; for (let k = -1; k <= 1; k++) line(c, kb[0], kb[1], kb[0] + 5 + k, kb[1] + 6 + k * 2);
  c.restore();
  theroLeg(c, 6, hipY + 2, sn * 0.5, base, legK, !rex);
  c.restore();
}
function theroLeg(c, x, y, a, col, k, sickle) {
  const thigh = new Path2D();
  c.save(); c.translate(x, y); c.rotate(-a * 0.8);
  ellPath(thigh, 0, 8 * k, 15 * k, 24 * k);
  c.restore();
  const kx = x + Math.sin(a) * 26 * k, ky = y + Math.cos(a) * 26 * k;
  const leg = new Path2D();
  const s1 = segPath(leg, kx, ky, a - 0.9, 24 * k, 12 * k, 8 * k, 0.1, 0.12);
  const s2 = segPath(leg, s1[0], s1[1], a + 0.6, 21 * k, 8 * k, 6.5 * k, 0.05, 0.05);
  // thigh drawn in world frame
  const th = new Path2D(); const ca = Math.cos(-a * 0.8), sa = Math.sin(-a * 0.8);
  th.moveTo(x + 15 * k * ca - 8 * k * sa, y + 15 * k * sa + 8 * k * ca);
  th.ellipse(x - 8 * k * sa, y + 8 * k * ca, 15 * k, 24 * k, -a * 0.8, 0, TAU);
  part(c, leg, col);
  part(c, th, col);
  c.strokeStyle = OUT; c.lineWidth = 3.5 * k;
  line(c, s2[0], s2[1], s2[0] + 16 * k, s2[1] + 1);
  c.strokeStyle = col; c.lineWidth = 2.2 * k; line(c, s2[0], s2[1], s2[0] + 16 * k, s2[1] + 1);
  c.strokeStyle = '#f2ead6'; c.lineWidth = 1.6;
  line(c, s2[0] + 16 * k, s2[1] + 1, s2[0] + 20 * k, s2[1] + 3);
  if (sickle) { c.beginPath(); c.moveTo(s2[0] + 3, s2[1] - 1); c.quadraticCurveTo(s2[0] + 8, s2[1] - 10, s2[0] + 12, s2[1] - 6); c.stroke(); }
}
function drawTrike(c, x, y, facing, s, P, o) {
  const base = o.flash ? '#fff1dc' : o.col, far = shade(base, -0.22), frillCol = o.flash ? '#fff1dc' : '#c8642c';
  c.save(); c.translate(x, y); c.scale(facing * s, s);
  if (P.rot) { c.translate(0, -(P.lift || 0)); c.rotate(P.rot * 0.6); }
  const sn = Math.sin(P.ph) * 0.3;
  const leg = (lx, ly, a, col) => { const p = new Path2D(); const k = segPath(p, lx, ly, a, 22, 24, 18, 0.1, 0.1); segPath(p, k[0], k[1], -a * 0.4, 18, 18, 16, 0.05, 0.05); part(c, p, col); };
  leg(36, -40, -sn, far); leg(-34, -44, sn, far);
  const tail = new Path2D(); polyPath(tail, [[-50, -70], [-104, -40], [-50, -42]]); part(c, tail, base);
  const body = new Path2D(); ellPath(body, -2, -62, 64, 34); part(c, body, base);
  c.save(); c.clip(body); c.fillStyle = shade(base, 0.32); c.beginPath(); c.ellipse(0, -36, 56, 12, 0, 0, TAU); c.fill();
  c.strokeStyle = shade(base, -0.4); c.lineWidth = 1.4; for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(-40 + k * 13, -84, 6, 0.2, 2.6); c.stroke(); }
  c.restore();
  leg(30, -36, sn, base); leg(-40, -40, -sn, base);
  c.save(); c.translate(62, -56); c.rotate(P.head * 0.6 + P.lean);
  const frill = new Path2D(); frill.moveTo(4, -6); frill.quadraticCurveTo(-6, -50, -30, -36); frill.quadraticCurveTo(-36, -12, -16, 8); frill.closePath();
  part(c, frill, frillCol, 0.8);
  c.fillStyle = '#f2d36a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(-26 + k * 3, -36 + k * 7.5, 2.2, 0, TAU); c.fill(); }
  const head = new Path2D(); polyPath(head, [[-8, -10], [16, -14], [34, -4], [40, 6], [30, 12], [6, 14], [-10, 8]]); part(c, head, base, 0.8);
  const beak = new Path2D(); polyPath(beak, [[30, -2], [44, 4], [36, 12], [28, 10]]); part(c, beak, '#5a4a3a', 0.4, 1.4);
  const h1 = new Path2D(); polyPath(h1, [[8, -12], [14, -14], [48, -36], [12, -6]]); part(c, h1, '#f2ead6', 0.4, 1.4);
  const h2 = new Path2D(); polyPath(h2, [[30, -6], [34, -6], [40, -20]]); part(c, h2, '#f2ead6', 0.3, 1.2);
  c.fillStyle = o.docile ? '#2a1a10' : '#ffd23a'; c.beginPath(); c.arc(10, -4, 2.6, 0, TAU); c.fill();
  c.restore();
  c.restore();
}
function drawPtera(c, x, y, facing, s, flap, o) {
  const base = o.flash ? '#fff1dc' : o.col, wing = o.flash ? '#fff1dc' : shade(o.col, -0.15);
  c.save(); c.translate(x, y); c.scale(facing * s, s);
  const f = Math.sin(flap);
  const wingP = (dir) => {
    const p = new Path2D();
    p.moveTo(-6, -2); p.quadraticCurveTo(-10, -26 - f * 30 * dir, -70, -30 - f * 40); p.quadraticCurveTo(-30, -6, 8, 2); p.closePath();
    return p;
  };
  part(c, wingP(1), shade(wing, -0.2), 0.6);
  const body = new Path2D(); ellPath(body, 0, 0, 20, 8); part(c, body, base, 0.6);
  c.save(); c.translate(18, -4);
  const head = new Path2D(); polyPath(head, [[-4, -4], [6, -6], [40, 0], [6, 3], [-4, 3]]); part(c, head, base, 0.5, 1.6);
  const crest = new Path2D(); polyPath(crest, [[0, -4], [-22, -14], [4, -6]]); part(c, crest, '#d24a2a', 0.4, 1.4);
  c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(5, -2, 1.6, 0, TAU); c.fill();
  c.restore();
  const w2 = new Path2D(); w2.moveTo(4, -2); w2.quadraticCurveTo(10, -26 - f * 26, 64, -34 - f * 36); w2.quadraticCurveTo(26, -8, -6, 3); w2.closePath();
  part(c, w2, wing, 0.6);
  c.strokeStyle = OUT; c.lineWidth = 2; line(c, -8, 6, -12, 16); line(c, -2, 6, -4, 16);
  c.restore();
}

/* ---------------- vehicles ---------------- */
function wheel(c, x, y, r, t, white) {
  const p = new Path2D(); ellPath(p, x, y, r, r); part(c, p, '#1a1a1e', 0.5);
  if (white) { c.strokeStyle = '#f2f0ea'; c.lineWidth = r * 0.22; c.beginPath(); c.arc(x, y, r * 0.66, 0, TAU); c.stroke(); }
  c.fillStyle = metal(c, y - r * 0.45, y + r * 0.45, '#ffffff', '#7a828e'); c.beginPath(); c.arc(x, y, r * 0.45, 0, TAU); c.fill();
  c.strokeStyle = '#555'; c.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) { const a = t * 0.4 + k * Math.PI / 2; line(c, x, y, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42); }
}
// Classic 1950s finned convertible. Local: facing right, ground at 0, ~330 long.
function drawCar(c, x, y, s, o = {}) {
  const col = o.col || '#c0262e', t = o.t || 0;
  c.save(); c.translate(x, y + (o.bounce || 0)); c.scale(s, s);
  // seats & driver behind the body
  c.fillStyle = '#5a1418'; rrect(c, -78, -98, 36, 50, 8); c.fill(); rrect(c, -10, -96, 34, 46, 8); c.fill();
  c.save(); c.beginPath(); c.rect(-220, -400, 440, 352); c.clip();   // hide the occupants' legs inside the car
  if (o.driver) {
    c.save(); c.translate(6, 16); c.scale(0.9, 0.9);
    drawFigure(c, o.driver, o.driverPose, 0, 0, 1, 1, { t });
    c.restore();
  }
  if (o.passenger) {
    c.save(); c.translate(-60, 16); c.scale(0.86, 0.86);
    drawFigure(c, o.passenger, o.driverPose, 0, 0, 1, 1, { t });
    c.restore();
  }
  c.restore();
  // windshield
  c.strokeStyle = '#d8dee8'; c.lineWidth = 3; line(c, 52, -64, 40, -108); line(c, 40, -108, 62, -108);
  c.fillStyle = 'rgba(170,215,255,0.28)'; c.beginPath(); c.moveTo(52, -64); c.lineTo(40, -106); c.lineTo(60, -106); c.lineTo(70, -64); c.closePath(); c.fill();
  // body
  const body = new Path2D();
  body.moveTo(-172, -30); body.lineTo(-170, -56); body.lineTo(-160, -82); body.lineTo(-146, -70); body.quadraticCurveTo(-110, -66, -86, -62);
  body.lineTo(60, -64); body.quadraticCurveTo(110, -66, 150, -58); body.quadraticCurveTo(168, -54, 168, -40); body.lineTo(166, -26);
  body.lineTo(132, -26); body.arc(106, -26, 26, 0, Math.PI, true); body.lineTo(-84, -26); body.arc(-110, -26, 26, 0, Math.PI, true);
  body.lineTo(-172, -26); body.closePath();
  part(c, body, col);
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-140, -61, 260, 2);
  c.strokeStyle = metal(c, -46, -42, '#ffffff', '#8a929e'); c.lineWidth = 3.4; line(c, -150, -44, 140, -44);
  c.fillStyle = '#efe6d2'; c.beginPath(); c.moveTo(-150, -44); c.lineTo(-40, -44); c.lineTo(-60, -30); c.lineTo(-150, -30); c.closePath(); c.fill();
  // bumpers & lights
  c.fillStyle = metal(c, -40, -22, '#ffffff', '#6e7682'); rrect(c, 156, -40, 18, 16, 5); c.fill(); rrect(c, -180, -38, 16, 14, 5); c.fill();
  c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(162, -50, 6, 0, TAU); c.fill();
  c.fillStyle = '#ff3a2a'; c.beginPath(); c.ellipse(-162, -70, 3, 7, 0.4, 0, TAU); c.fill();
  // steering wheel
  c.strokeStyle = '#1a1a1a'; c.lineWidth = 3; c.beginPath(); c.ellipse(36, -74, 4, 12, 0.3, 0, TAU); c.stroke();
  wheel(c, -110, -22, 24, t, true); wheel(c, 106, -22, 24, t, true);
  c.restore();
}
function drawBike(c, x, y, s, o = {}) {
  const t = o.t || 0;
  c.save(); c.translate(x, y); c.scale(s, s);
  wheel(c, -70, -24, 24, t, false); wheel(c, 74, -24, 26, t, false);
  c.strokeStyle = metal(c, -90, -20, '#ffffff', '#6a727e'); c.lineWidth = 5;
  line(c, 74, -24, 46, -96); line(c, -70, -24, -10, -48); line(c, -10, -48, 40, -60);
  const tank = new Path2D(); tank.moveTo(-6, -64); tank.quadraticCurveTo(14, -86, 44, -72); tank.lineTo(40, -56); tank.lineTo(-6, -52); tank.closePath();
  part(c, tank, '#7a2ab0');
  c.fillStyle = '#ffb020'; c.beginPath(); c.moveTo(6, -64); c.quadraticCurveTo(20, -76, 36, -68); c.quadraticCurveTo(20, -70, 10, -60); c.fill();
  const seat = new Path2D(); rrPath(seat, -40, -64, 38, 10, 5); part(c, seat, '#1a1a1a', 0.4);
  c.fillStyle = metal(c, -40, -30, '#ffffff', '#555'); rrect(c, -64, -44, 60, 9, 4); c.fill();
  if (o.rider) {
    c.save(); c.translate(-18, 22);
    drawFigure(c, o.rider, o.riderPose, 0, 0, 1, 1, { t, glowEyes: o.glow });
    c.restore();
  }
  c.strokeStyle = '#1a1a1a'; c.lineWidth = 4; line(c, 46, -96, 30, -112);
  c.restore();
}

/* ---------------- items, props, projectiles ---------------- */
function drawItemSprite(c, kind, x, y, t) {
  if (drawItemSpr(c, kind, x, y, WEAPONS.includes(kind) ? 0.46 : 0.42)) { itemGlint(c, x, y, t); return; }
  c.save(); c.translate(x, y); c.scale(CS * 0.75, CS * 0.75); c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 2;
  const P = () => new Path2D();
  switch (kind) {
    case 'pizza': {
      const p = P(); polyPath(p, [[-16, -4], [18, -10], [14, 2]]); part(c, p, '#f4c24a', 0.5, 1.6);
      const cr = P(); polyPath(cr, [[13, -11], [19, -11], [16, 3], [12, 3]]); part(c, cr, '#c77a2a', 0.3, 1.4);
      c.fillStyle = '#c0262e'; [[0, -5], [8, -6], [6, -2]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 2, 0, TAU); c.fill(); });
      break;
    }
    case 'hotdog': {
      const bun = P(); rrPath(bun, -16, -12, 32, 11, 5); part(c, bun, '#e2a050', 0.5, 1.6);
      const sau = P(); rrPath(sau, -19, -14, 38, 6, 3); part(c, sau, '#b0402a', 0.4, 1.4);
      c.strokeStyle = '#f2d020'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(-14 + i * 5, -12 + (i % 2) * 2.5); c.stroke();
      break;
    }
    case 'meat': {
      const plate = P(); ellPath(plate, 0, 0, 26, 6); part(c, plate, '#ece7dc', 0.4, 1.6);
      const bone = P(); rrPath(bone, 10, -22, 14, 5, 2); ellPath(bone, 26, -22, 3.4, 3.4); ellPath(bone, 26, -17, 3.4, 3.4); part(c, bone, '#f5f0e6', 0.3, 1.4);
      const m = P(); ellPath(m, -3, -12, 19, 12); part(c, m, '#a8521e', 0.8);
      break;
    }
    case 'apple': {
      const a = P(); ellPath(a, 0, -11, 11, 11); part(c, a, '#d0202a', 0.6);
      const l = P(); ellPath(l, 5, -24, 5, 2.6); part(c, l, '#3aa34a', 0.3, 1.2);
      break;
    }
    case 'gem': {
      c.save(); c.globalCompositeOperation = 'lighter';
      const gl = c.createRadialGradient(0, -14, 0, 0, -14, 28); gl.addColorStop(0, 'rgba(120,230,255,0.6)'); gl.addColorStop(1, 'rgba(120,230,255,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(0, -14, 28, 0, TAU); c.fill(); c.restore();
      const g = P(); polyPath(g, [[0, -30], [13, -17], [0, 0], [-13, -17]]); part(c, g, '#3fd0ff', 0.6);
      break;
    }
    case 'gold': {
      const g = P(); polyPath(g, [[-14, 0], [-10, -12], [12, -12], [16, 0]]); part(c, g, '#e8b42a', 0.6);
      break;
    }
    default:
      drawWeapon(c, kind, -14, -8, -0.1, {});
  }
  if ((t % 80) < 14) {
    const k = Math.sin((t % 80) / 14 * Math.PI) * 8;
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, -28 - k); c.lineTo(14, -28); c.lineTo(12 + k, -26); c.lineTo(14, -24);
    c.lineTo(12, -24 + k); c.lineTo(10, -24); c.lineTo(12 - k, -26); c.lineTo(10, -28); c.closePath(); c.fill();
  }
  c.restore();
}
function drawPropSprite(c, pr, x, y) {
  if (OBJ_PROPS[pr.kind]) return drawObjProp(c, pr, x, y);
  const fl = pr.flash > 0;
  if (spritesReady('items')) { drawSprite(c, 'items', ITEM_IDX[pr.kind], x + (fl ? rand(-3, 3) : 0), y, 1, pr.kind === 'barrel' ? 0.6 : 0.62, { flash: fl }); return; }
  c.save(); c.translate(x + (fl ? rand(-2, 2) : 0), y); c.scale(CS * 0.85, CS * 0.85);
  if (pr.kind === 'barrel') {
    const p = new Path2D(); rrPath(p, -24, -72, 48, 72, 8);
    part(c, p, fl ? '#fff1dc' : '#3c6a8a');
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-24, -60, 48, 5); c.fillRect(-24, -18, 48, 5);
    const lid = new Path2D(); ellPath(lid, 0, -72, 23, 6); part(c, lid, '#4c7a9a', 0.3, 1.6);
    c.fillStyle = '#f2d23a'; c.beginPath(); c.moveTo(0, -48); c.lineTo(9, -32); c.lineTo(-9, -32); c.closePath(); c.fill();
    c.fillStyle = OUT; c.fillRect(-1, -45, 2, 7); c.fillRect(-1, -36, 2, 2);
  } else {
    const p = new Path2D(); rrPath(p, -32, -62, 64, 62, 2); part(c, p, fl ? '#fff1dc' : '#b47a3e');
    c.strokeStyle = '#6a4218'; c.lineWidth = 5; line(c, -28, -58, 28, -4); line(c, 28, -58, -28, -4);
    c.strokeStyle = OUT; c.lineWidth = 1.5; line(c, -32, -31, 32, -31);
  }
  c.restore();
}
function drawProjectile(c, b, x, y) {
  const d = Math.sign(b.vx) || 1;
  switch (b.kind) {
    case 'bullet': case 'pellet': {
      c.save(); c.globalCompositeOperation = 'lighter';
      const len = b.kind === 'pellet' ? 24 : 50;
      const g = c.createLinearGradient(x - d * len, y, x, y); g.addColorStop(0, 'rgba(255,190,80,0)'); g.addColorStop(1, 'rgba(255,240,190,1)');
      c.strokeStyle = g; c.lineWidth = 5; c.lineCap = 'round'; line(c, x - d * len, y, x, y);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
      c.restore();
      break;
    }
    case 'knife': if (drawItemSpr(c, 'knife', x, y + 20, 0.36)) break; c.save(); c.translate(x, y); c.scale(d * CS * 0.8, CS * 0.8); drawWeapon(c, 'knife', -14, 0, 0, {}); c.restore(); break;
    case 'rock': if (spritesReady('items')) { drawSprite(c, 'items', ITEM_IDX.rock, x, y + 20, 1, 0.3, { rot: G.t * 0.3 }); break; } c.save(); c.translate(x, y); c.rotate(G.t * 0.3); c.scale(CS * 0.8, CS * 0.8); drawWeapon(c, 'rock', -6, 0, 0, {}); c.restore(); break;
    case 'grenade': if (spritesReady('items')) { drawSprite(c, 'items', ITEM_IDX.grenade, x, y + 20, 1, 0.3, { rot: G.t * 0.25 }); break; } c.save(); c.translate(x, y); c.rotate(G.t * 0.25); c.scale(CS * 0.8, CS * 0.8); drawWeapon(c, 'grenade', -4, 0, 0, {}); c.restore(); break;
    case 'rocket': {
      c.save(); c.translate(x, y); c.scale(d * CS * 0.7, CS * 0.7);
      c.globalCompositeOperation = 'lighter'; glow(c, -30, 0, 26, 'rgba(255,170,60,0.9)'); c.globalCompositeOperation = 'source-over';
      const p = new Path2D(); polyPath(p, [[-22, -5], [12, -5], [22, 0], [12, 5], [-22, 5]]); part(c, p, '#6a7a3a', 0.3, 1.4);
      c.restore();
      break;
    }
    case 'orb': {
      c.save(); c.globalCompositeOperation = 'lighter';
      const r = 30 + Math.sin(G.t * 0.4) * 4;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(200,120,255,0.9)'); g.addColorStop(1, 'rgba(120,40,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.restore();
      break;
    }
  }
}

/* ---------------- text & UI primitives ---------------- */
function txt(c, s, x, y, o = {}) {
  c.font = o.font || '700 24px Cinzel, serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
  if (o.shadow) { c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillText(s, x + 2, y + 3); }
  if (o.stroke) { c.lineWidth = o.sw || 6; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = o.fill || '#fff'; c.fillText(s, x, y);
}
function goldGrad(c, y0, y1) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff7d1'); g.addColorStop(0.35, '#f3cf6a'); g.addColorStop(0.55, '#b8860b'); g.addColorStop(0.75, '#f7dc83'); g.addColorStop(1, '#8a5a0b');
  return g;
}
function panel(c, x, y, w, h, o = {}) {
  c.save();
  rrect(c, x, y, w, h, o.r || 12);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.top || 'rgba(28,20,14,0.88)'); g.addColorStop(1, o.bot || 'rgba(8,6,6,0.92)');
  c.fillStyle = g; c.fill();
  c.lineWidth = o.lw || 2; c.strokeStyle = o.border || goldGrad(c, y, y + h); c.stroke();
  if (!o.noInner) { rrect(c, x + 4, y + 4, w - 8, h - 8, Math.max(2, (o.r || 12) - 4)); c.lineWidth = 1; c.strokeStyle = 'rgba(212,175,55,0.25)'; c.stroke(); }
  c.restore();
}

function itemGlint(c, x, y, t) {
  if ((t % 80) >= 14) return;
  const k = Math.sin((t % 80) / 14 * Math.PI) * 14, cx = x + 22, cy = y - 50;
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx, cy - k); c.lineTo(cx + 2, cy - 2); c.lineTo(cx + k, cy); c.lineTo(cx + 2, cy + 2);
  c.lineTo(cx, cy + k); c.lineTo(cx - 2, cy + 2); c.lineTo(cx - k, cy); c.lineTo(cx - 2, cy - 2); c.closePath(); c.fill();
}
