'use strict';
/* =========================================================
   MUSTAFA — stage backgrounds. Layered parallax, all procedural.
   cam = camera x in world space, t = frame counter.
   ========================================================= */
function skyGrad(c, stops, y1 = HORIZON) {
  const g = c.createLinearGradient(0, 0, 0, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  c.fillStyle = g; c.fillRect(0, 0, W, y1 + 2);
}
function glow(c, x, y, r, inner, outer = 'rgba(0,0,0,0)') {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function ridge(c, cam, f, base, amp, freq, seed, fill, sharp) {
  c.beginPath(); c.moveTo(-10, H);
  for (let sx = -10; sx <= W + 30; sx += 14) {
    const wx = (sx + cam * f) * freq;
    let n = vnoise(wx, seed) * 0.7 + vnoise(wx * 2.7, seed + 3) * 0.22 + vnoise(wx * 7.1, seed + 5) * 0.08;
    if (sharp) n = Math.pow(n, 1.5) * 1.4;
    c.lineTo(sx, base - n * amp);
  }
  c.lineTo(W + 30, H); c.closePath(); c.fillStyle = fill; c.fill();
}
function tiles(cam, f, tw, fn) {
  const off = cam * f, i0 = Math.floor(off / tw) - 1, i1 = Math.ceil((off + W) / tw) + 1;
  for (let i = i0; i <= i1; i++) fn(i * tw - off, i, hash(i * 7.31 + tw * 0.13));
}
function groundFill(c, stops, top = HORIZON) {
  const g = c.createLinearGradient(0, top, 0, H);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  c.fillStyle = g; c.fillRect(0, top, W, H - top);
}
function perspLines(c, cam, spacing, col, lw, top = HORIZON) {
  c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
  const i0 = Math.floor((cam - 500) / spacing), i1 = Math.ceil((cam + W + 500) / spacing);
  for (let i = i0; i <= i1; i++) {
    const wx = i * spacing - cam;
    c.moveTo(W / 2 + (wx - W / 2) * 0.62, top); c.lineTo(W / 2 + (wx - W / 2) * 1.3, H);
  }
  c.stroke();
}
function hLines(c, col, n, top = HORIZON) {
  c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
  for (let i = 1; i <= n; i++) { const y = top + Math.pow(i / n, 1.6) * (H - top); c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
}
function cloud(c, x, y, w, col, hi) {
  c.fillStyle = col;
  for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + (k - 2) * w * 0.22, y - Math.sin(k * 1.3) * w * 0.06, w * 0.24, w * 0.11, 0, 0, TAU); c.fill(); }
  if (hi) { c.fillStyle = hi; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + (k - 1.5) * w * 0.22, y - w * 0.07, w * 0.16, w * 0.045, 0, 0, TAU); c.fill(); } }
}
function palm(c, x, y, h, col, r, t, lit) {
  const bend = (r - 0.5) * 80;
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 12;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + bend * 0.2, y - h * 0.5, x + bend, y - h); c.stroke();
  if (lit) { c.strokeStyle = lit; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 4, y); c.quadraticCurveTo(x + bend * 0.2 + 4, y - h * 0.5, x + bend + 3, y - h); c.stroke(); }
  const tx = x + bend, ty = y - h; c.fillStyle = col;
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k - 3.5) * 0.48 + Math.sin(t * 0.02 + k + r * 9) * 0.05, len = 80 + ((k * 37) % 26);
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.42;
    c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - 20, ex, ey);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - 4, tx, ty); c.fill();
  }
}
function pterosaur(c, x, y, s, t, col) {
  const flap = Math.sin(t * 0.18) * 0.6;
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(-40, -14 - flap * 22); c.lineTo(-12, -2); c.lineTo(0, -4); c.lineTo(12, -2);
  c.lineTo(40, -14 - flap * 22); c.lineTo(6, 0); c.lineTo(16, 2); c.lineTo(0, 4); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(8, -3); c.lineTo(26, -6); c.lineTo(10, 0); c.fill();
  c.beginPath(); c.moveTo(-4, -3); c.lineTo(-16, -9); c.lineTo(-2, 0); c.fill();
  c.restore();
}
function bush(c, x, y, w, col, hi) {
  c.fillStyle = col;
  for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + (k - 2.5) * w * 0.17, y - Math.abs(Math.sin(k * 1.7)) * w * 0.16, w * 0.17, 0, TAU); c.fill(); }
  if (hi) { c.fillStyle = hi; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + (k - 2) * w * 0.17 - 3, y - w * 0.2 - Math.abs(Math.sin(k * 1.7)) * w * 0.12, w * 0.07, 0, TAU); c.fill(); } }
}

/* ================= 1 — City in the Sea (sunset rooftops) ================= */
function sunkenTower(c, x, base, w, h, col, seed, lit) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h);
  for (let k = 1; k <= 6; k++) c.lineTo(x + w * k / 6, base - h + hash(seed + k) * 34 - (k === 6 ? 0 : 8));
  c.lineTo(x + w, base); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,190,140,0.18)'; c.fillRect(x + w - 6, base - h + 10, 6, h - 10);
  for (let wy = base - h + 30; wy < base - 12; wy += 20) for (let wx = x + 7; wx < x + w - 9; wx += 14) {
    const hv = hash(seed * 3 + wx * 0.7 + wy);
    c.fillStyle = lit && hv > 0.86 ? 'rgba(255,214,140,0.85)' : 'rgba(0,0,0,0.35)'; c.fillRect(wx, wy, 7, 10);
  }
  c.strokeStyle = 'rgba(70,130,70,0.7)'; c.lineWidth = 3;
  for (let k = 0; k < 3; k++) { const vx = x + hash(seed + k * 9) * w; c.beginPath(); c.moveTo(vx, base - h + 8); c.quadraticCurveTo(vx + 8, base - h * 0.6, vx - 4, base - h * (0.2 + hash(seed + k) * 0.4)); c.stroke(); }
}
function bgSea(c, cam, t) {
  skyGrad(c, ['#25306a', '#5c4f96', '#c4708a', '#f6a36a', '#ffe0a0'], 330);
  const sx = W * 0.62 - cam * 0.01, sy = 285;
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sx, sy, 380, 'rgba(255,170,90,0.55)'); c.restore();
  const sg = c.createLinearGradient(0, sy - 80, 0, sy + 80); sg.addColorStop(0, '#fffbe6'); sg.addColorStop(1, '#ffb050');
  c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 78, 0, TAU); c.fill();
  tiles(cam, 0.03, 460, (x, i, r) => cloud(c, x + r * 160, 70 + r * 140, 260 + r * 180, 'rgba(120,70,140,0.55)', 'rgba(255,180,150,0.35)'));
  for (let k = 0; k < 3; k++) {
    const px = ((t * (0.8 + k * 0.3) + k * 520) % (W + 400)) - 200;
    pterosaur(c, px, 130 + k * 42 + Math.sin(t * 0.02 + k) * 15, 0.8 - k * 0.14, t + k * 20, '#2a1838');
  }
  const seaTop = 300;
  const sea = c.createLinearGradient(0, seaTop, 0, HORIZON); sea.addColorStop(0, '#5a6fa8'); sea.addColorStop(0.4, '#2c4f86'); sea.addColorStop(1, '#173058');
  c.fillStyle = sea; c.fillRect(0, seaTop, W, HORIZON - seaTop);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 20; k++) { const yy = seaTop + 4 + k * 6, w = 120 - k * 4 + Math.sin(t * 0.05 + k) * 12; c.fillStyle = `rgba(255,200,120,${0.5 - k * 0.022})`; c.fillRect(sx - w / 2, yy, w, 2); }
  c.restore();
  c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 1.5;
  tiles(cam, 0.15, 70, (x, i, r) => { const yy = seaTop + 10 + r * 100, o = Math.sin(t * 0.04 + i) * 8; line(c, x + o, yy, x + 24 + o, yy); });
  tiles(cam, 0.08, 150, (x, i, r) => { if (r < 0.6) sunkenTower(c, x, seaTop + 8, 60 + r * 50, 70 + r * 170, '#3a3060', i * 3.1, false); });
  tiles(cam, 0.22, 260, (x, i, r) => { if (r < 0.55) sunkenTower(c, x + r * 60, seaTop + 40, 90 + r * 50, 120 + r * 160, '#2a2048', i * 5.7, true); });
  groundFill(c, ['#9b9488', '#7a7468', '#4a463e']);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, HORIZON, W, 10);
  perspLines(c, cam, 170, 'rgba(0,0,0,0.18)', 2);
  hLines(c, 'rgba(0,0,0,0.14)', 7);
  tiles(cam, 1, 210, (x, i, r) => {
    c.strokeStyle = 'rgba(30,25,20,0.45)'; c.lineWidth = 1.6; const y0 = 470 + r * 200;
    c.beginPath(); c.moveTo(x, y0); c.lineTo(x + 20, y0 + 8); c.lineTo(x + 34, y0 + 4); c.lineTo(x + 52, y0 + 14); c.stroke();
    if (r > 0.6) { c.fillStyle = 'rgba(190,170,220,0.25)'; c.beginPath(); c.ellipse(x + 90, 520 + r * 140, 60, 10, 0, 0, TAU); c.fill(); }
    if (r < 0.3) { c.fillStyle = 'rgba(80,120,60,0.45)'; c.beginPath(); c.ellipse(x + 140, 480 + r * 200, 26, 6, 0, 0, TAU); c.fill(); }
  });
  c.fillStyle = '#6a6458'; c.fillRect(0, HORIZON - 26, W, 30);
  c.fillStyle = '#857f72'; c.fillRect(0, HORIZON - 26, W, 5);
  tiles(cam, 1, 90, (x) => { c.fillStyle = '#5a3a2a'; c.fillRect(x, HORIZON - 80, 5, 56); });
  c.fillStyle = '#7a4a32'; c.fillRect(0, HORIZON - 82, W, 5); c.fillRect(0, HORIZON - 56, W, 4);
  tiles(cam, 1, 700, (x, i, r) => {
    if (r > 0.55) return;
    const bx = x + 200;
    c.fillStyle = '#5c6a72'; c.fillRect(bx, HORIZON - 120, 110, 96); c.fillStyle = '#4a565e'; c.fillRect(bx + 8, HORIZON - 110, 94, 76);
    c.strokeStyle = '#2a3238'; c.lineWidth = 3; for (let k = 0; k < 6; k++) line(c, bx + 14 + k * 15, HORIZON - 106, bx + 14 + k * 15, HORIZON - 38);
    c.fillStyle = 'rgba(255,200,150,0.2)'; c.fillRect(bx + 104, HORIZON - 120, 6, 96);
  });
}

/* ================= 2 — Swamp Forest ================= */
function swampTree(c, x, base, w, h, col, t, i) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x - w * 0.9, base); c.quadraticCurveTo(x - w * 0.4, base - 30, x - w * 0.45, base - 60); c.lineTo(x - w * 0.42, base - h);
  c.lineTo(x + w * 0.42, base - h); c.lineTo(x + w * 0.45, base - 60); c.quadraticCurveTo(x + w * 0.4, base - 30, x + w * 0.9, base); c.closePath(); c.fill();
  c.fillStyle = 'rgba(160,200,120,0.12)'; c.fillRect(x + w * 0.15, base - h, w * 0.2, h - 40);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) line(c, x - w * 0.2 + k * w * 0.18, base - h, x - w * 0.25 + k * w * 0.2, base - 40);
  c.strokeStyle = 'rgba(120,150,90,0.65)'; c.lineWidth = 2.5;
  for (let k = 0; k < 5; k++) {
    const mx = x - w * 0.6 + k * w * 0.3, my = base - h * (0.55 + hash(i + k) * 0.35), len = 40 + hash(i * 3 + k) * 70;
    const sw = Math.sin(t * 0.03 + k + i) * 4;
    c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo(mx + sw, my + len * 0.5, mx + sw * 1.5, my + len); c.stroke();
  }
}
function bgSwamp(c, cam, t) {
  skyGrad(c, ['#0f1f16', '#24402a', '#4f7046', '#8aa070'], HORIZON);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const x = ((k * 330 - cam * 0.1) % (W + 300) + W + 300) % (W + 300) - 150;
    const g = c.createLinearGradient(x, 0, x + 160, HORIZON); g.addColorStop(0, 'rgba(230,255,190,0.16)'); g.addColorStop(1, 'rgba(230,255,190,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, 0); c.lineTo(x + 260, HORIZON); c.lineTo(x + 140, HORIZON); c.closePath(); c.fill();
  }
  c.restore();
  tiles(cam, 0.12, 90, (x, i, r) => swampTree(c, x + r * 30, HORIZON - 10, 20 + r * 14, 420, '#1c3020', t, i));
  tiles(cam, 0.12, 200, (x, i, r) => bush(c, x, 120 + r * 60, 220, '#22381f', 'rgba(140,180,100,0.25)'));
  tiles(cam, 0.35, 260, (x, i, r) => { if (r < 0.7) swampTree(c, x + r * 60, HORIZON + 8, 46 + r * 26, 520, '#13221a', t, i + 50); });
  tiles(cam, 0.35, 240, (x, i, r) => bush(c, x, 40 + r * 60, 300, '#162a18', 'rgba(150,190,110,0.2)'));
  groundFill(c, ['#3c5a44', '#24402e', '#0f2018']);
  c.save(); c.globalAlpha = 0.25;
  tiles(cam, 0.35, 260, (x, i, r) => { if (r < 0.7) { c.fillStyle = '#0a160e'; c.fillRect(x + r * 60 - 20, HORIZON + 6, 40 + r * 20, 120 + r * 80); } });
  c.restore();
  c.strokeStyle = 'rgba(200,240,200,0.28)'; c.lineWidth = 1.6;
  tiles(cam, 1, 110, (x, i, r) => { const yy = 440 + r * 260, o = Math.sin(t * 0.05 + i) * 10; line(c, x + o, yy, x + 34 + o, yy); });
  tiles(cam, 1, 300, (x, i, r) => {
    if (r < 0.5) { c.fillStyle = '#4a7a3a'; c.beginPath(); c.ellipse(x + 40, 460 + r * 220, 22, 7, 0, 0.3, TAU); c.lineTo(x + 40, 460 + r * 220); c.fill(); }
    if (r > 0.75) { c.fillStyle = '#3a2a1a'; rrect(c, x, 455 + r * 30, 160, 14, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + 6, 457 + r * 30, 150, 3); }
  });
}

/* ================= 3 — Hell Road (desert highway, car stage) ================= */
function mesa(c, x, base, w, h, col, lit) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, base); c.lineTo(x + w * 0.12, base - h); c.lineTo(x + w * 0.85, base - h); c.lineTo(x + w, base); c.closePath(); c.fill();
  c.fillStyle = lit; c.fillRect(x + w * 0.12, base - h, w * 0.73, 6);
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; for (let k = 1; k < 4; k++) line(c, x + w * 0.1, base - h + k * h / 4, x + w * 0.9, base - h + k * h / 4);
}
function cactus(c, x, y, h, col) {
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 12;
  line(c, x, y, x, y - h); c.lineWidth = 8;
  c.beginPath(); c.moveTo(x, y - h * 0.5); c.lineTo(x - 20, y - h * 0.5); c.lineTo(x - 20, y - h * 0.8); c.stroke();
  c.beginPath(); c.moveTo(x, y - h * 0.62); c.lineTo(x + 18, y - h * 0.62); c.lineTo(x + 18, y - h * 0.9); c.stroke();
}
function bgRoad(c, cam, t) {
  skyGrad(c, ['#3a78c8', '#79b0e4', '#c8def0', '#f5dca8'], HORIZON - 40);
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, W * 0.8, 70, 160, 'rgba(255,250,220,0.6)'); c.restore();
  tiles(cam, 0.02, 520, (x, i, r) => cloud(c, x, 60 + r * 80, 200 + r * 120, 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0.5)'));
  tiles(cam, 0.05, 420, (x, i, r) => { if (r < 0.7) mesa(c, x, HORIZON - 30, 260 + r * 160, 70 + r * 70, '#b8664a', '#e89a6a'); });
  tiles(cam, 0.14, 360, (x, i, r) => { if (r < 0.6) mesa(c, x + 80, HORIZON - 20, 160 + r * 120, 40 + r * 70, '#94503a', '#d0805a'); });
  groundFill(c, ['#e2b276', '#c89058', '#a06a3c'], HORIZON - 40);
  tiles(cam, 0.5, 300, (x, i, r) => { if (r < 0.6) cactus(c, x + r * 100, HORIZON + 6, 50 + r * 40, '#3f7a3a'); });
  tiles(cam, 0.8, 380, (x) => { c.fillStyle = '#5a3a24'; c.fillRect(x, HORIZON - 150, 7, 175); c.fillRect(x - 18, HORIZON - 140, 44, 5); });
  c.strokeStyle = 'rgba(40,30,20,0.55)'; c.lineWidth = 1.5;
  tiles(cam, 0.8, 380, (x) => { c.beginPath(); c.moveTo(x - 16, HORIZON - 137); c.quadraticCurveTo(x + 170, HORIZON - 110, x + 364, HORIZON - 137); c.stroke(); });
  const top = 462;
  const g = c.createLinearGradient(0, top, 0, H); g.addColorStop(0, '#4a4650'); g.addColorStop(1, '#25232a');
  c.fillStyle = g; c.fillRect(0, top, W, H - top - 8);
  c.fillStyle = '#c89058'; c.fillRect(0, H - 8, W, 8);
  c.fillStyle = '#efe8d8'; c.fillRect(0, top + 4, W, 4); c.fillRect(0, H - 16, W, 4);
  tiles(cam, 1, 150, (x) => { c.fillStyle = '#f2c42a'; c.fillRect(x, 588, 80, 6); });
  tiles(cam, 1, 260, (x, i, r) => { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + r * 60, 480 + r * 200, 50 + r * 40, 4); });
}

/* ================= 4 — Mustafa's Garage ================= */
function bricks(c, cam, f, y0, y1, col) {
  c.fillStyle = col; c.fillRect(0, y0, W, y1 - y0);
  const off = cam * f, bw = 64, bh = 22;
  for (let row = 0, y = y0; y < y1; row++, y += bh) {
    const shift = row % 2 ? bw / 2 : 0;
    for (let i = Math.floor((off - shift) / bw) - 1; i * bw + shift - off < W + bw; i++) {
      const x = i * bw + shift - off, hv = hash(i * 13 + row * 7);
      c.fillStyle = `rgba(${hv > 0.5 ? '255,180,140' : '0,0,0'},${0.04 + hv * 0.08})`; c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y, W, 2);
  }
}
function bgGarage(c, cam, t) {
  bricks(c, cam, 0.9, 0, HORIZON, '#7a3a2a');
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, W, 40);
  tiles(cam, 0.9, 520, (x) => {
    c.fillStyle = '#1e2a3a'; c.fillRect(x + 60, 70, 170, 90);
    c.fillStyle = 'rgba(200,230,255,0.55)'; for (let k = 0; k < 3; k++) c.fillRect(x + 66 + k * 56, 76, 50, 78);
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(x + 60, 160, x + 220, HORIZON); g.addColorStop(0, 'rgba(255,240,200,0.18)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x + 60, 160); c.lineTo(x + 230, 160); c.lineTo(x + 330, HORIZON); c.lineTo(x + 120, HORIZON); c.closePath(); c.fill();
    c.restore();
  });
  tiles(cam, 0.9, 1400, (x, i) => {
    const sx = x + 520, on = Math.sin(t * 0.09 + i) > -0.9;
    c.fillStyle = '#121218'; rrect(c, sx - 10, 186, 360, 70, 10); c.fill();
    c.save(); if (on) { c.shadowColor = '#ff4fa0'; c.shadowBlur = 20; }
    c.fillStyle = on ? '#ffd0ea' : '#4a2a3a'; c.font = '900 34px Cinzel, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText("MUSTAFA'S", sx + 170, 208); c.font = '700 22px Teko, sans-serif'; c.fillStyle = on ? '#9ff3ff' : '#2a4a4a'; c.fillText('GARAGE · SINCE 1993', sx + 170, 238);
    c.restore();
  });
  tiles(cam, 0.95, 700, (x) => {
    const bx = x + 40;
    c.fillStyle = '#3a2a1e'; c.fillRect(bx, 270, 180, 110);
    c.strokeStyle = '#c8ccd2'; c.lineWidth = 4;
    for (let k = 0; k < 5; k++) { const tx = bx + 22 + k * 32; line(c, tx, 286, tx, 330); c.beginPath(); c.arc(tx, 284, 6, Math.PI, 0); c.stroke(); }
    c.fillStyle = '#5a4a3a'; c.fillRect(bx - 10, HORIZON - 40, 200, 12);
    c.fillStyle = '#1a1a1e'; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(bx + 40 + k * 50, HORIZON - 60, 22, 22, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#c03a2a'; c.fillRect(bx + 150, HORIZON - 70, 22, 30);
  });
  tiles(cam, 1, 1500, (x, i) => {
    const lx = x + 260;
    c.fillStyle = '#e0b020'; c.fillRect(lx - 70, HORIZON - 4, 14, 40); c.fillRect(lx + 260, HORIZON - 4, 14, 40);
    c.fillStyle = '#c0c4ca'; c.fillRect(lx - 80, HORIZON - 44, 360, 8);
    drawCar(c, lx + 100, HORIZON - 44, 0.85, { col: i % 2 ? '#2f8aa0' : '#c0262e', t: 0 });
  });
  groundFill(c, ['#7c7a78', '#5a5856', '#33312f']);
  perspLines(c, cam, 220, 'rgba(0,0,0,0.18)', 2);
  c.fillStyle = 'rgba(240,200,40,0.7)'; c.fillRect(0, 470, W, 5);
  tiles(cam, 1, 330, (x, i, r) => { c.fillStyle = 'rgba(10,10,20,0.35)'; c.beginPath(); c.ellipse(x + r * 80, 520 + r * 160, 40 + r * 40, 10 + r * 6, 0, 0, TAU); c.fill(); });
}

/* ================= 5 — Village of Flame (night) ================= */
function flame(c, x, y, s, t, seed) {
  c.save(); c.globalCompositeOperation = 'lighter';
  glow(c, x, y - 30 * s, 110 * s, 'rgba(255,120,30,0.35)');
  for (let k = 0; k < 5; k++) {
    const ph = t * 0.25 + seed + k * 1.7, fx = x + (k - 2) * 12 * s + Math.sin(ph) * 4 * s, fh = (50 + Math.sin(ph * 1.3) * 14 + k % 2 * 20) * s;
    const g = c.createLinearGradient(0, y, 0, y - fh); g.addColorStop(0, 'rgba(255,230,140,0.9)'); g.addColorStop(0.5, 'rgba(255,120,30,0.75)'); g.addColorStop(1, 'rgba(200,40,10,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(fx - 12 * s, y); c.quadraticCurveTo(fx - 10 * s, y - fh * 0.6, fx, y - fh); c.quadraticCurveTo(fx + 10 * s, y - fh * 0.6, fx + 12 * s, y); c.closePath(); c.fill();
  }
  c.restore();
}
function thatchHut(c, x, base, r, t, burning) {
  const w = 170 + r * 50, h = 90;
  c.fillStyle = '#3a2418'; c.fillRect(x, base - h, w, h);
  c.fillStyle = 'rgba(255,140,60,0.12)'; c.fillRect(x + w - 30, base - h, 30, h);
  c.fillStyle = '#ffb050'; c.fillRect(x + 30, base - h + 26, 30, 26); c.fillStyle = '#1a0a06'; c.fillRect(x + w - 70, base - 64, 34, 64);
  c.fillStyle = '#5a3a1a'; c.beginPath(); c.moveTo(x - 24, base - h + 8); c.quadraticCurveTo(x + w * 0.5, base - h - 80, x + w + 24, base - h + 8); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (let k = 0; k < 12; k++) line(c, x - 20 + k * (w + 40) / 12, base - h + 6, x + w * 0.5, base - h - 60);
  if (burning) { flame(c, x + w * 0.25, base - h - 10, 1.7, t, r * 10); flame(c, x + w * 0.55, base - h - 40, 2.1, t, r * 20); flame(c, x + w * 0.85, base - h - 5, 1.5, t, r * 30); }
}
function bgVillage(c, cam, t) {
  skyGrad(c, ['#0c0614', '#2a0c22', '#6a1a1a', '#c0461a'], HORIZON);
  for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(255,240,220,${0.3 + 0.4 * Math.abs(Math.sin(t * 0.02 + k))})`; c.fillRect(((hash(k) * W * 2 - cam * 0.01) % W + W) % W, hash(k + 3) * 160, 1.6, 1.6); }
  for (let k = 0; k < 6; k++) {
    const ph = ((t * 0.3 + k * 50) % 300) / 300, x = ((k * 260 - cam * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
    c.fillStyle = `rgba(30,12,16,${0.5 * (1 - ph)})`; c.beginPath(); c.arc(x + ph * 80, 260 - ph * 260, 50 + ph * 80, 0, TAU); c.fill();
  }
  ridge(c, cam, 0.08, 330, 110, 0.004, 21, '#1a0a12');
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,100,30,0.18)'; c.fillRect(0, 280, W, 60); c.restore();
  tiles(cam, 0.3, 200, (x, i, r) => { if (r < 0.55) palm(c, x + r * 60, HORIZON + 4, 170 + r * 90, '#140810', r, t, 'rgba(255,120,50,0.35)'); });
  tiles(cam, 0.6, 360, (x, i, r) => { if (r < 0.85) thatchHut(c, x + r * 60, HORIZON + 12, r, t, r < 0.6); });
  groundFill(c, ['#6a4224', '#4a2c18', '#24140a']);
  perspLines(c, cam, 160, 'rgba(0,0,0,0.15)', 2);
  c.save(); c.globalCompositeOperation = 'lighter';
  tiles(cam, 1, 420, (x, i) => { const a = 0.14 + 0.06 * Math.sin(t * 0.2 + i); glow(c, x + 200, 520, 220, `rgba(255,120,40,${a})`); });
  c.restore();
  tiles(cam, 1, 600, (x) => {
    c.fillStyle = '#3a2414'; for (let k = 0; k < 6; k++) c.fillRect(x + k * 30, 438 - (k % 2) * 4, 8, 34);
    c.fillRect(x, 448, 180, 5);
  });
}

/* ================= 6 — The Lab ================= */
function tank(c, x, base, t, i) {
  const tw = 120, th = 230, tx = x, ty = base - th;
  c.fillStyle = '#20262c'; c.fillRect(tx - 14, ty - 26, tw + 28, 30); c.fillRect(tx - 14, base - 6, tw + 28, 24);
  const lg = c.createLinearGradient(0, ty, 0, base); lg.addColorStop(0, 'rgba(90,255,170,0.35)'); lg.addColorStop(1, 'rgba(20,150,90,0.85)');
  c.fillStyle = lg; c.fillRect(tx, ty, tw, th);
  c.fillStyle = 'rgba(0,30,15,0.7)';
  const bob = Math.sin(t * 0.03 + i) * 6;
  c.beginPath(); c.ellipse(tx + tw / 2, ty + 120 + bob, 26, 54, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(tx + tw / 2 + 8, ty + 58 + bob, 20, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,30,15,0.7)'; c.lineWidth = 7;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(tx + tw / 2, ty + 150 + bob); c.quadraticCurveTo(tx + 20 + k * 40, ty + 190, tx + 10 + k * 45 + Math.sin(t * 0.05 + k) * 8, base - 10); c.stroke(); }
  c.fillStyle = 'rgba(220,255,230,0.7)';
  for (let k = 0; k < 6; k++) { const by = base - ((t * 0.9 + k * 37 + i * 11) % th); c.beginPath(); c.arc(tx + 12 + hash(k + i) * (tw - 24), by, 2 + k % 3, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(tx + 10, ty + 6, 8, th - 12);
  c.strokeStyle = '#40484f'; c.lineWidth = 5; c.strokeRect(tx, ty, tw, th);
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, tx + tw / 2, ty + th / 2, 170, 'rgba(60,255,150,0.16)'); c.restore();
}
function bgLab(c, cam, t) {
  skyGrad(c, ['#0c1014', '#1a2026', '#14181c'], HORIZON);
  tiles(cam, 0.7, 120, (x) => {
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3; line(c, x, 0, x, HORIZON);
    c.fillStyle = 'rgba(150,170,190,0.18)'; for (let y = 20; y < HORIZON; y += 36) { c.beginPath(); c.arc(x + 8, y, 2.2, 0, TAU); c.fill(); }
  });
  c.fillStyle = '#2a3036'; c.fillRect(0, 60, W, 20); c.fillStyle = '#3a4048'; c.fillRect(0, 60, W, 4);
  c.fillStyle = '#26323a'; c.fillRect(0, 100, W, 12);
  tiles(cam, 0.7, 470, (x, i) => tank(c, x + 120, HORIZON + 10, t, i));
  tiles(cam, 0.7, 940, (x) => {
    const mx = x + 330;
    c.fillStyle = '#1a1e22'; c.fillRect(mx, 250, 120, 150); c.fillStyle = '#0a2a1a'; c.fillRect(mx + 10, 260, 100, 60);
    c.fillStyle = '#3aff8a'; for (let k = 0; k < 6; k++) c.fillRect(mx + 16, 266 + k * 9, 20 + ((t + k * 13) % 60), 3);
    for (let k = 0; k < 8; k++) { c.fillStyle = (t + k * 7) % 40 < 20 ? '#ff3a3a' : '#3a0a0a'; c.fillRect(mx + 14 + k * 12, 340, 6, 6); }
  });
  groundFill(c, ['#2c333a', '#1c2126', '#0c0f12']);
  perspLines(c, cam, 90, 'rgba(0,0,0,0.4)', 2);
  hLines(c, 'rgba(0,0,0,0.35)', 12);
  c.save(); c.globalCompositeOperation = 'lighter';
  const a = 0.35 + 0.25 * Math.sin(t * 0.06);
  c.fillStyle = `rgba(60,255,150,${a})`; c.fillRect(0, 478, W, 3); c.fillRect(0, 690, W, 3);
  c.restore();
}

function drawBackground(c, theme, cam, t, st) {
  if (SPR.bg[theme]) { if (st === false) drawPanorama(c, SPR.bg[theme], cam); else drawPanoramaLive(c, SPR.bg[theme], cam, theme, t, st); return; }
  switch (theme) {
    case 'sea': bgSea(c, cam, t); break;
    case 'swamp': bgSwamp(c, cam, t); break;
    case 'road': bgRoad(c, cam, t); break;
    case 'garage': bgGarage(c, cam, t); break;
    case 'village': bgVillage(c, cam, t); break;
    case 'lab': bgLab(c, cam, t); break;
  }
}

// Sparse silhouettes in front of the fighters for depth
function drawForeground(c, theme, cam, t) {
  if (SPR.bg[theme] && theme !== 'village' && theme !== 'swamp') return;
  if (SPR.bg[theme] && theme === 'swamp') { swampMotes(c, cam, t); return; }
  if (theme === 'swamp') {
    c.strokeStyle = 'rgba(30,50,25,0.9)'; c.lineWidth = 4;
    tiles(cam, 1.3, 260, (x, i, r) => {
      const len = 60 + r * 120, sw = Math.sin(t * 0.03 + i) * 6;
      c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + sw, len * 0.5, x + sw * 2, len); c.stroke();
    });
    tiles(cam, 1.4, 700, (x, i, r) => {
      if (r > 0.5) return;
      c.fillStyle = '#0a1a0e';
      for (let k = 0; k < 9; k++) { c.beginPath(); c.moveTo(x + k * 8, H); c.quadraticCurveTo(x + k * 8 + 6, H - 60, x + k * 8 + 14 + Math.sin(t * 0.04 + k) * 4, H - 110 - k % 3 * 20); c.lineTo(x + k * 8 + 6, H); c.fill(); }
    });
  } else if (theme === 'sea') {
    tiles(cam, 1.35, 1100, (x, i, r) => {
      if (r > 0.45) return;
      c.strokeStyle = '#2a1c18'; c.lineWidth = 6; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) line(c, x + k * 16, H, x + k * 22 + 10, H - 70 - k * 18);
    });
  } else if (theme === 'garage') {
    tiles(cam, 1.25, 640, (x) => {
      c.strokeStyle = '#0a0a0e'; c.lineWidth = 3; line(c, x, 0, x, 70);
      c.fillStyle = '#16161c'; c.beginPath(); c.moveTo(x - 30, 88); c.lineTo(x + 30, 88); c.lineTo(x + 14, 68); c.lineTo(x - 14, 68); c.closePath(); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, 88, 0, 560); g.addColorStop(0, 'rgba(255,240,190,0.2)'); g.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 28, 88); c.lineTo(x + 28, 88); c.lineTo(x + 160, 560); c.lineTo(x - 160, 560); c.closePath(); c.fill();
      c.restore();
    });
  } else if (theme === 'village') {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 40; k++) {
      const x = ((hash(k) * W * 1.3 + Math.sin(t * 0.01 + k) * 40 - cam * 0.25) % W + W) % W, y = H - ((t * (0.7 + hash(k + 3)) * 1.5 + hash(k + 7) * H) % H);
      c.fillStyle = `rgba(255,${130 + (k * 7) % 100},40,${0.5 + 0.5 * hash(k + 1)})`; c.fillRect(x, y, 3, 3);
    }
    c.restore();
  } else if (theme === 'lab') {
    tiles(cam, 1.3, 900, (x, i, r) => {
      if (r > 0.5) return;
      const g = c.createLinearGradient(x, 0, x + 40, 0); g.addColorStop(0, '#0e1215'); g.addColorStop(0.5, '#2a3238'); g.addColorStop(1, '#0e1215');
      c.fillStyle = g; c.fillRect(x, 0, 40, H);
    });
  }
}

let VIGNETTE = null;
function getVignette() {
  if (!VIGNETTE || VIGNETTE.width !== W) {
    VIGNETTE = document.createElement('canvas'); VIGNETTE.width = W; VIGNETTE.height = H;
    const v = VIGNETTE.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.98);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); v.fillStyle = g; v.fillRect(0, 0, W, H);
  }
  return VIGNETTE;
}
function drawGrade(c, theme, t, st) {
  if (st && st.look) gradeLook(c, st.look, t);
  const tint = (st && st.look) ? null : { sea: 'rgba(255,140,90,0.05)', swamp: 'rgba(40,120,60,0.08)', road: 'rgba(255,180,90,0.05)', garage: 'rgba(255,160,90,0.04)',
    village: `rgba(255,90,30,${0.07 + 0.03 * Math.sin(t * 0.2)})`, lab: 'rgba(40,255,140,0.05)' }[theme];
  if (tint) { c.fillStyle = tint; c.fillRect(0, 0, W, H); }
  c.drawImage(getVignette(), 0, 0);
}

// drifting fireflies over the painted swamp
function swampMotes(c, cam, t) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 22; k++) {
    const fx = ((hash(k) * W * 1.4 - cam * 0.5 + Math.sin(t * 0.01 + k) * 60) % W + W) % W, fy = 200 + hash(k + 2) * 300 + Math.sin(t * 0.03 + k) * 14;
    glow(c, fx, fy, 12, `rgba(200,255,120,${0.35 + 0.35 * Math.sin(t * 0.08 + k * 3)})`);
  }
  c.restore();
}

/* =========================================================
   LIVE BACKGROUNDS: the painted panoramas get depth and motion.
   The far part of each painting scrolls slower than the floor (parallax),
   and every stage gets its own moving life: clouds, glinting water,
   waterfalls, mist, searchlights, smoke, birds. Weather and time of day
   (rain, storm, fog, embers, fireflies / night, dusk, alarm) come from the mission.
   ========================================================= */
// The walkable floor in each painting (screen y of the feet), so nobody walks on walls, ledges or sky
const FLOOR = { sea: [448, 630], village: [468, 700], jungle: [480, 696], fortress: [478, 704], swamp: [470, 702], garage: [452, 704], lab: [462, 704], road: [482, 702] };
function setFloor(theme) {
  const f = FLOOR[theme] || [482, 702];
  BELT_TOP = f[0]; BELT_BOT = f[1];
  for (const p of G.props) p.y = clamp(p.y, BELT_TOP + 8, BELT_BOT - 8);
}
// where the far scenery ends and the walkable floor begins (fraction of image height), per painting
const BG_CUT = { sea: 0.49, village: 0.48, jungle: 0.54, fortress: 0.515, swamp: 0.5, garage: 0.5, lab: 0.52, road: 0.56 };
const BG_FAR = 0.55;   // far layer moves at 55% of the camera speed
function panoBand(c, img, cam, y0, y1, alpha) {
  const s = H / img.height, w = img.width * s, sy0 = y0 / s, sh = (y1 - y0) / s;
  const i0 = Math.floor(cam / w), i1 = Math.floor((cam + W) / w);
  if (alpha < 1) { c.save(); c.globalAlpha *= alpha; }
  for (let i = i0; i <= i1; i++) {
    const x = i * w - cam;
    if (((i % 2) + 2) % 2) { c.save(); c.translate(x + w, 0); c.scale(-1, 1); c.drawImage(img, 0, sy0, img.width, sh, 0, y0, w, y1 - y0); c.restore(); }
    else c.drawImage(img, 0, sy0, img.width, sh, x, y0, w, y1 - y0);
  }
  if (alpha < 1) c.restore();
}
function drawPanoramaLive(c, img, cam, theme, t, st) {
  // the painting scrolls as one solid piece, so the floor and everything standing on it stay together
  const cut = (BG_CUT[theme] || 0.5) * H;
  drawPanorama(c, img, cam);
  drawSkyLife(c, theme, cam, t, st, cut);                 // clouds, birds, water, falls...
  if (st && st.look === 'rift') drawRift(c, t, cut);
  drawFloorLife(c, theme, cam, t, st, cut);
}
function softCloud(c, x, y, w, col) {
  const g = c.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, w, w * 0.32, 0, 0, TAU); c.fill();
}
function drawSkyLife(c, theme, cam, t, st, cut) {
  const look = st && st.look, night = look === 'night';
  c.save();
  // drifting cloud banks across the sky
  if (theme !== 'garage' && theme !== 'lab') {
    const col = theme === 'village' ? 'rgba(40,10,6,0.35)' : night || theme === 'fortress' ? 'rgba(20,24,40,0.4)' : theme === 'sea' ? 'rgba(255,170,140,0.16)' : 'rgba(255,255,255,0.14)';
    for (let k = 0; k < 7; k++) {
      const w = 200 + hash(k + 40) * 260, x = ((hash(k) * 2600 - cam * 0.3 - t * (0.15 + hash(k + 9) * 0.25)) % (W + 2 * w) + W + 2 * w) % (W + 2 * w) - w;
      softCloud(c, x, 40 + hash(k + 20) * cut * 0.42, w, col);
    }
  }
  switch (theme) {
    case 'sea': {   // sun glints dancing on the water, distant pteranodons
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 60; k++) {
        const y = cut * 0.62 + hash(k + 3) * cut * 0.36, x = ((hash(k) * W * 1.3 + Math.sin(t * 0.02 + k) * 18 - cam) % W + W) % W;
        const a = Math.max(0, Math.sin(t * 0.06 + k * 2.3)) * (night ? 0.25 : 0.55);
        c.fillStyle = night ? `rgba(160,190,255,${a})` : `rgba(255,210,150,${a})`; c.fillRect(x, y, 8 + hash(k + 5) * 22, 2);
      }
      if (!night) glow(c, W * 0.35 - (cam * 0.05) % 40, cut * 0.42, 200 + Math.sin(t * 0.03) * 15, 'rgba(255,170,90,0.14)');
      c.globalCompositeOperation = 'source-over';
      skyFlyers(c, cam, t, cut, night ? 'rgba(10,10,20,0.8)' : 'rgba(40,20,30,0.75)');
      break;
    }
    case 'jungle': {   // the great waterfall pours, mist rolls, birds circle
      const im = SPR.bg.jungle, s = H / im.height, w = im.width * s;
      for (let tile = Math.floor(cam / w); tile <= Math.floor((cam + W) / w); tile++) {
        const mir = ((tile % 2) + 2) % 2, base = tile * w - cam;
        for (const fx of [0.46, 0.52, 0.36]) {
          const x0 = base + (mir ? 1 - fx : fx) * w, fw = 0.05 * w;
          c.save(); c.beginPath(); c.rect(x0 - fw / 2, 0.21 * H, fw, 0.25 * H); c.clip();
          c.globalCompositeOperation = 'lighter';
          for (let k = 0; k < 10; k++) {
            const y = 0.21 * H + ((t * 3.2 + k * 41) % (0.3 * H)), xx = x0 - fw / 2 + hash(k + fx * 10) * fw;
            c.fillStyle = 'rgba(220,240,255,0.18)'; c.fillRect(xx, y, 3, 26);
          }
          c.restore();
        }
      }
      for (let k = 0; k < 5; k++) softCloud(c, ((hash(k + 7) * 2000 + t * 0.35) % (W + 600)) - 300, cut * 0.82 + Math.sin(t * 0.01 + k) * 10, 260, 'rgba(235,245,240,0.22)');
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { c.save(); c.translate(W * (0.2 + k * 0.22) - (cam * 0.1) % 200, 0); c.rotate(0.25); c.fillStyle = `rgba(255,250,210,${0.04 + 0.03 * Math.sin(t * 0.02 + k)})`; c.fillRect(-30, -50, 60, cut * 1.3); c.restore(); }
      c.globalCompositeOperation = 'source-over';
      skyFlyers(c, cam, t, cut, 'rgba(20,40,30,0.7)');
      break;
    }
    case 'fortress': {   // sweeping searchlights, blinking warning lights, the dam spilling over
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const ox = ((k * 640 + 200 - cam) % (W + 400) + W + 400) % (W + 400) - 200, a = Math.sin(t * 0.012 + k * 2) * 0.7;
        c.save(); c.translate(ox, 110); c.rotate(a + 0.6);
        const g = c.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, 'rgba(230,240,255,0.28)'); g.addColorStop(1, 'rgba(230,240,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(120, 700); c.lineTo(-120, 700); c.closePath(); c.fill(); c.restore();
      }
      for (let k = 0; k < 14; k++) {
        if ((t + k * 23) % 90 > 45) continue;
        const x = ((hash(k) * W * 1.5 - cam) % W + W) % W; glow(c, x, 60 + hash(k + 1) * cut * 0.5, 14, 'rgba(255,40,30,0.8)');
      }
      for (let k = 0; k < 30; k++) { const x = ((hash(k + 50) * W * 1.6 - cam) % W + W) % W, y = cut * 0.45 + ((t * 4 + k * 30) % (cut * 0.4)); c.fillStyle = 'rgba(200,220,255,0.12)'; c.fillRect(x, y, 2, 30); }
      c.globalCompositeOperation = 'source-over';
      break;
    }
    case 'village': {   // smoke columns and flicker over the burning huts
      for (let k = 0; k < 6; k++) {
        const bx = ((hash(k + 3) * W * 1.4 - cam) % (W + 300) + W + 300) % (W + 300) - 150;
        for (let j = 0; j < 6; j++) { const yy = cut * 0.5 - ((t * 0.6 + j * 40 + k * 17) % 260); softCloud(c, bx + Math.sin(t * 0.01 + j) * 30 + j * 6, yy, 70 + j * 16, `rgba(30,12,10,${0.22 - j * 0.03})`); }
      }
      c.globalCompositeOperation = 'lighter';
      glow(c, W / 2, cut * 0.6, W * 0.7, `rgba(255,90,30,${0.05 + 0.04 * Math.sin(t * 0.21) + 0.03 * Math.sin(t * 0.53)})`);
      c.globalCompositeOperation = 'source-over';
      break;
    }
    case 'swamp': { for (let k = 0; k < 6; k++) softCloud(c, ((hash(k + 11) * 2200 + t * 0.25) % (W + 600)) - 300, cut * 0.8 + Math.sin(t * 0.012 + k) * 12, 300, 'rgba(160,200,170,0.16)'); break; }
    case 'lab': {
      c.globalCompositeOperation = 'lighter';
      const sx = (t * 2.2) % (W + 400) - 200;
      const g = c.createLinearGradient(sx - 120, 0, sx + 120, 0); g.addColorStop(0, 'rgba(60,255,150,0)'); g.addColorStop(0.5, 'rgba(60,255,150,0.08)'); g.addColorStop(1, 'rgba(60,255,150,0)');
      c.fillStyle = g; c.fillRect(sx - 120, 0, 240, cut);
      c.globalCompositeOperation = 'source-over';
      break;
    }
    case 'garage': {
      if (hash(Math.floor(t / 7)) > 0.93) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, W, H); }   // a failing tube light
      break;
    }
  }
  c.restore();
}
function skyFlyers(c, cam, t, cut, col) {
  for (let k = 0; k < 3; k++) {
    const sp = 0.8 + hash(k + 30) * 0.6, x = ((t * sp + k * 700 - cam * 0.2) % (W + 400)) - 200, y = 70 + hash(k + 31) * cut * 0.35 + Math.sin(t * 0.03 + k) * 14;
    if (has('ptera_f')) { const i = Math.floor((t * 0.35 + k * 3)) % 8; c.save(); c.globalAlpha = 0.7; c.filter = 'brightness(0.25)'; drawSprite(c, 'ptera_f', i, x, y, 1, 0.16 + k * 0.03); c.filter = 'none'; c.restore(); }
    else pterosaur(c, x, y, 0.4, t + k * 9, col);
  }
}
function drawFloorLife(c, theme, cam, t, st, cut) {
  const wet = st && (st.weather === 'rain' || st.weather === 'storm');
  if (theme === 'sea' || theme === 'fortress' || wet) {   // puddles shimmer
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) {
      const x = ((hash(k + 70) * W * 2 - cam) % (W + 200) + W + 200) % (W + 200) - 100, y = cut + 60 + hash(k + 71) * (H - cut - 80);
      c.fillStyle = `rgba(255,230,200,${0.05 + 0.05 * Math.sin(t * 0.07 + k)})`; c.beginPath(); c.ellipse(x, y, 40 + hash(k) * 40, 5, 0, 0, TAU); c.fill();
    }
    c.restore();
  }
}
// a swirling tear in time above the battlefield
function drawRift(c, t, cut) {
  const cx = W * 0.62, cy = cut * 0.36, R = Math.min(260, cut * 0.42);
  c.save(); c.globalCompositeOperation = 'lighter';
  const core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3); core.addColorStop(0, 'rgba(255,240,255,0.95)'); core.addColorStop(0.18, 'rgba(210,120,255,0.8)'); core.addColorStop(0.55, 'rgba(110,40,220,0.35)'); core.addColorStop(1, 'rgba(60,10,160,0)');
  c.fillStyle = core; c.beginPath(); c.ellipse(cx, cy, R * 1.3, R * 0.75, -0.2, 0, TAU); c.fill();
  for (let arm = 0; arm < 5; arm++) {
    c.strokeStyle = `rgba(${200 + arm * 10},${120 + arm * 20},255,${0.35 - arm * 0.04})`; c.lineWidth = 6 - arm; c.beginPath();
    for (let i = 0; i <= 60; i++) { const k = i / 60, a = t * 0.02 + arm * 1.256 + k * 5.5, r = R * (1 - k) * 1.1; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.55; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  if ((t % 90) < 6) { c.strokeStyle = 'rgba(240,200,255,0.9)'; c.lineWidth = 3; c.beginPath(); let x = cx + rand(-R, R) * 0.6, y = cy; c.moveTo(x, y); for (let i = 0; i < 6; i++) { x += rand(-40, 40); y += rand(30, 60); c.lineTo(x, y); } c.stroke(); }
  c.restore();
}
function gradeLook(c, look, t) {
  if (!look) return;
  c.save();
  if (look === 'night') {
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#9aa6d6'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(30,40,80,0.08)'; c.fillRect(0, 0, W, H);
  } else if (look === 'dusk') {
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#e6c8d4'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(80,30,10,0.12)'; c.fillRect(0, 0, W, H);
  } else if (look === 'rift') {
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#d4c8ec'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(140,60,255,${0.05 + 0.04 * Math.sin(t * 0.05)})`; c.fillRect(0, 0, W, H);
  } else if (look === 'alarm') {
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#efdcdc'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,20,10,${0.06 + 0.06 * Math.max(0, Math.sin(t * 0.08))})`; c.fillRect(0, 0, W, H);
  }
  c.restore();
}
// rain, storm, fog, embers and fireflies over everything; lightning lights up the whole scene
function drawWeather(c, st, cam, t) {
  const w = st && st.weather; if (!w) return;
  c.save();
  if (w === 'rain' || w === 'storm') {
    const n = w === 'storm' ? 160 : 110;
    c.strokeStyle = 'rgba(200,215,240,0.35)'; c.lineWidth = 1.5; c.beginPath();
    for (let k = 0; k < n; k++) {
      const sp = 22 + hash(k + 1) * 10, x = ((hash(k) * W * 1.3 + t * 5 - cam * 0.9) % (W + 100) + W + 100) % (W + 100) - 50, y = (hash(k + 2) * H + t * sp) % (H + 60) - 30;
      c.moveTo(x, y); c.lineTo(x - 7, y + 26);
    }
    c.stroke();
    c.fillStyle = 'rgba(220,230,255,0.35)';
    for (let k = 0; k < 26; k++) { if ((t + k * 7) % 12 > 5) continue; const x = hash(k * 3 + Math.floor(t / 12)) * W, y = BELT_TOP + hash(k * 5 + Math.floor(t / 12)) * (H - BELT_TOP); c.beginPath(); c.ellipse(x, y, 7, 2, 0, 0, TAU); c.fill(); }
    if (w === 'storm') {
      const cyc = t % 400, strike = hash(Math.floor(t / 400)) > 0.25;
      if (strike && cyc < 14) {
        c.fillStyle = `rgba(230,235,255,${(cyc % 6 < 3 ? 0.55 : 0.2) * (1 - cyc / 14)})`; c.fillRect(0, 0, W, H);
        if (cyc === 0 && G.scene === 'play') Sound.play('boom');
      }
    }
  } else if (w === 'fog') {
    for (let k = 0; k < 5; k++) softCloud(c, ((hash(k + 90) * 2400 + t * (0.4 + k * 0.1) - cam * 0.3) % (W + 800) + W + 800) % (W + 800) - 400, BELT_TOP + 40 + k * 40, 420, 'rgba(190,210,200,0.2)');
  } else if (w === 'embers') {
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 50; k++) {
      const x = ((hash(k) * W * 1.3 + Math.sin(t * 0.01 + k) * 40 - cam * 0.3) % W + W) % W, y = H - ((t * (0.7 + hash(k + 3)) * 1.6 + hash(k + 7) * H) % H);
      c.fillStyle = `rgba(255,${130 + (k * 7) % 100},40,${0.5 + 0.5 * hash(k + 1)})`; c.fillRect(x, y, 3, 3);
    }
  } else if (w === 'fireflies') {
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 26; k++) {
      const fx = ((hash(k) * W * 1.4 - cam * 0.5 + Math.sin(t * 0.01 + k) * 60) % W + W) % W, fy = 200 + hash(k + 2) * 420 + Math.sin(t * 0.03 + k) * 14;
      glow(c, fx, fy, 12, `rgba(200,255,120,${0.35 + 0.35 * Math.sin(t * 0.08 + k * 3)})`);
    }
  }
  c.restore();
}
