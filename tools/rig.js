#!/usr/bin/env node
/* Build cut-out puppet rigs for the heroes.
   Input (assets/raw/rig):  <id>_parts.png  — 9 painted body parts on magenta, laid out as
                              row 1: torso, upper arm, forearm, upper arm, forearm
                              row 2: thigh, shin+boot, thigh, shin+boot
                            head_<id>_cut.png — the hero's face cut from the cover painting
   Output (assets/sprites): rig_<id>.png / .webp — packed parts, and rig.js with each part's
                            rectangle plus its joint points, used by js/rig.js to animate. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { readPNG, writePNG, keyMagenta, components } = require('./slice.js');
const ROOT = path.resolve(__dirname, '..'), RAW = path.join(ROOT, 'assets/raw/rig'), OUT = path.join(ROOT, 'assets/sprites');

const crop = (img, x0, y0, x1, y1) => {
  const w = x1 - x0 + 1, h = y1 - y0 + 1, data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 4, ((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1 + 1) * 4);
  return { w, h, data };
};
// trim fully transparent borders
const trim = img => {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return crop(img, x0, y0, x1, y1);
};
// centre of the opaque pixels in a horizontal band (fractions of the height)
function bandCenter(img, f0, f1) {
  let sx = 0, n = 0;
  for (let y = Math.floor(img.h * f0); y < Math.ceil(img.h * f1); y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 128) { sx += x; n++; }
  return n ? sx / n : img.w / 2;
}

const rigs = {};
for (const file of fs.readdirSync(RAW).filter(f => f.endsWith('_parts.png'))) {
  const id = file.replace('_parts.png', '');
  const sheet = readPNG(path.join(RAW, file));
  keyMagenta(sheet);
  const { comps } = components(sheet);
  const big = comps.sort((a, b) => b.n - a.n).slice(0, 9);
  if (big.length < 9) { console.warn(id, 'found only', big.length, 'parts'); continue; }
  const midY = (Math.min(...big.map(c => c.y0)) + Math.max(...big.map(c => c.y1))) / 2;
  const row1 = big.filter(c => (c.y0 + c.y1) / 2 < midY).sort((a, b) => a.x0 - b.x0);
  const row2 = big.filter(c => (c.y0 + c.y1) / 2 >= midY).sort((a, b) => a.x0 - b.x0);
  if (row1.length !== 5 || row2.length !== 4) { console.warn(id, 'unexpected layout', row1.length, row2.length); continue; }
  const names = ['torso', 'upperF', 'foreF', 'upperB', 'foreB', 'thighF', 'shinF', 'thighB', 'shinB'];
  const parts = {};
  [...row1, ...row2].forEach((c, i) => { parts[names[i]] = trim(crop(sheet, c.x0, c.y0, c.x1, c.y1)); });
  const headFile = path.join(RAW, `head_${id}_cut.png`);
  if (fs.existsSync(headFile)) parts.head = trim(readPNG(headFile));

  // joints, in each part's own pixels
  const J = {};
  for (const [n, p] of Object.entries(parts)) {
    if (n === 'torso') J[n] = { hip: [bandCenter(p, 0.86, 0.92), p.h * 0.89], neck: [bandCenter(p, 0, 0.04), p.h * 0.02], shF: [p.w * 0.32, p.h * 0.2], shB: [p.w * 0.66, p.h * 0.16] };
    else if (n === 'head') J[n] = { neck: [bandCenter(p, 0.9, 0.97), p.h * 0.93] };
    else if (n.startsWith('upper')) J[n] = { top: [bandCenter(p, 0.06, 0.16), p.h * 0.14], end: [bandCenter(p, 0.84, 0.92), p.h * 0.88] };
    else if (n.startsWith('fore')) J[n] = { top: [bandCenter(p, 0.04, 0.12), p.h * 0.08], end: [bandCenter(p, 0.8, 0.9), p.h * 0.86] };
    else if (n.startsWith('thigh')) J[n] = { top: [bandCenter(p, 0.04, 0.12), p.h * 0.1], end: [bandCenter(p, 0.82, 0.9), p.h * 0.84] };   // joints sit inside the part so pieces overlap
    else if (n.startsWith('shin')) J[n] = { top: [bandCenter(p, 0.06, 0.14), p.h * 0.1], foot: [bandCenter(p, 0.97, 1), p.h] };
  }
  // pack into one image (single row)
  let x = 0; const H = Math.max(...Object.values(parts).map(p => p.h)), rects = {};
  for (const [n, p] of Object.entries(parts)) { rects[n] = { x, y: 0, w: p.w, h: p.h, j: J[n] }; x += p.w + 2; }
  const atlas = { w: x, h: H, data: Buffer.alloc(x * H * 4) };
  for (const [n, p] of Object.entries(parts)) for (let y = 0; y < p.h; y++) p.data.copy(atlas.data, (y * atlas.w + rects[n].x) * 4, y * p.w * 4, (y + 1) * p.w * 4);
  const png = path.join(OUT, `rig_${id}.png`);
  writePNG(png, atlas.w, atlas.h, atlas.data);
  try { execFileSync('cwebp', ['-quiet', '-q', '88', '-alpha_q', '95', png, '-o', png.replace('.png', '.webp')]); } catch (e) { console.warn('cwebp failed', e.message); }
  rigs[id] = rects;
  console.log(id, Object.keys(rects).join(' '), atlas.w + 'x' + atlas.h);
}
fs.writeFileSync(path.join(OUT, 'rig.js'), 'window.RIG = ' + JSON.stringify(rigs) + ';\n');
