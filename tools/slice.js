#!/usr/bin/env node
/* Sprite slicer: node tools/slice.js
   Reads AI-generated sheets on a magenta (#FF00FF) background from assets/raw,
   keys out the background, splits each sheet into its poses, finds the foot anchor
   of every pose and writes a packed atlas per sheet plus assets/sprites/atlas.json.
   Zero dependencies: includes a tiny PNG decoder/encoder. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'assets/raw'), OUT = path.join(ROOT, 'assets/sprites');

// name -> number of poses in the sheet (row order, left to right)
const SHEETS = {
  mustafa_a: 8, mustafa_b: 8, rakib_a: 8, rakib_b: 8, nadia_a: 8, nadia_b: 8, bablu_a: 8, bablu_b: 8,
  razor: 8, motka: 8, poacher: 8, biker: 8, lash: 8, butcher: 8, saju: 8, morgol: 8, kaiser: 8, mutant: 8,
  raptor: 8, rex: 8, trike: 6, ptera: 6, car: 2, hog: 5, items: 18,
  // smooth-animation sheets (0 = detect the number of poses automatically)
  mustafa_c: 9, mustafa_d: 8, rakib_c: 0, rakib_d: 8, nadia_c: 0, nadia_d: 8, bablu_c: 9, bablu_d: 8,
  razor_w: 8, motka_w: 8, poacher_w: 8, biker_w: 8, lash_w: 8, raptor_r: 8,
  rex_w: 8, trike_w: 8, ptera_f: 8, car_park: 2,
};
/* Size normalisation: each sheet was painted separately, so the same character can come out
   a few percent bigger or smaller. [baseSheet, base frames, this sheet's frames] are standing
   poses whose median height is compared. */
const NORM = {
  mustafa_b: ['mustafa_a', [0, 1, 2], [6]], rakib_b: ['rakib_a', [0, 1, 2], [6]], nadia_b: ['nadia_a', [0, 1, 2], [6]], bablu_b: ['bablu_a', [0, 1, 2], [6]],
  mustafa_c: ['mustafa_a', [1, 2], 'all'], rakib_c: ['rakib_a', [1, 2], 'all'], nadia_c: ['nadia_a', [1, 2], 'all'], bablu_c: ['bablu_a', [1, 2], 'all'],
  mustafa_d: ['mustafa_a', [0], [0, 1, 2, 3, 4]], rakib_d: ['rakib_a', [0], [0, 1, 2, 3, 4]], nadia_d: ['nadia_a', [0], [0, 1, 2, 3, 4]], bablu_d: ['bablu_a', [0], [0, 1, 2, 3, 4]],
  razor_w: ['razor', [1, 2], [0, 1, 2, 3, 4, 5]], motka_w: ['motka', [1, 2], [0, 1, 2, 3, 4, 5]], poacher_w: ['poacher', [1, 2], [0, 1, 2, 3, 4, 5]],
  biker_w: ['biker', [1, 2], [0, 1, 2, 3, 4, 5]], lash_w: ['lash', [1, 2], [0, 1, 2, 3, 4, 5]], raptor_r: ['raptor', [1, 2], 'all'],
  rex_w: ['rex', [1, 2], 'all'], trike_w: ['trike', [1, 2], 'all'], ptera_f: ['ptera', [1], [2, 6]],
};

/* ---------- PNG I/O ---------- */
function crcTable() { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; }
const CRC = crcTable();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function readPNG(file) {
  const b = fs.readFileSync(file);
  let p = 8, w, h, depth, ctype, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || (ctype !== 2 && ctype !== 6)) throw new Error(`unsupported PNG ${file}: depth ${depth} type ${ctype}`);
  const bpp = ctype === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0, up = y ? px[dst - stride + x] : 0, ul = y && x >= bpp ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; }
      px[dst + x] = v & 255;
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += bpp) { rgba[i * 4] = px[j]; rgba[i * 4 + 1] = px[j + 1]; rgba[i * 4 + 2] = px[j + 2]; rgba[i * 4 + 3] = bpp === 4 ? px[j + 3] : 255; }
  return { w, h, data: rgba };
}
function writePNG(file, w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/* ---------- keying: magenta -> transparent, with edge un-mixing ---------- */
function keyMagenta(img) {
  const d = img.data, n = img.w * img.h;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const dist = Math.sqrt((255 - r) ** 2 + g * g + (255 - b) ** 2);
    let a = (dist - 60) / 55;
    if (a <= 0) { d[i * 4 + 3] = 0; continue; }
    if (a >= 1) continue;
    // remove the magenta that was mixed into this edge pixel
    const inv = 1 / a, k = 1 - a;
    d[i * 4] = Math.max(0, Math.min(255, (r - k * 255) * inv));
    d[i * 4 + 1] = Math.max(0, Math.min(255, g * inv));
    d[i * 4 + 2] = Math.max(0, Math.min(255, (b - k * 255) * inv));
    d[i * 4 + 3] = Math.round(a * 255);
  }
  despill(img);
}
// See-through parts (windshield glass, smoke) show the magenta backdrop through them: turn that into
// faint grey-blue glass / grey smoke with matching transparency.
function clearTint(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2], spill = Math.min(r, b) - g;
    if (spill < 25) continue;
    const k = Math.min(1, spill / 140), base = g + 20;
    d[i] = base * 0.92; d[i + 1] = base; d[i + 2] = Math.min(255, base * 1.12);
    d[i + 3] = Math.round(d[i + 3] * (1 - 0.75 * k));
  }
}
// Painted edges blend the dark outline with the magenta backdrop, leaving a purple rim. Within a few
// pixels of the transparent area, pull any magenta tint out of the colour and fade the worst rim pixels.
function despill(img) {
  const d = img.data, w = img.w, h = img.h, R = 3;
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 200) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) near[yy * w + xx] = Math.max(near[yy * w + xx], R + 1 - Math.max(Math.abs(dx), Math.abs(dy)));
    }
  }
  for (let i = 0; i < w * h; i++) {
    const p = i * 4; if (!near[i] || d[p + 3] === 0) continue;
    const r = d[p], g = d[p + 1], b = d[p + 2], spill = Math.min(r, b) - g;   // magenta = red and blue above green
    if (spill <= 6) continue;
    const k = near[i] / (R + 1);
    d[p] = Math.max(0, r - spill * (0.6 + 0.4 * k)); d[p + 2] = Math.max(0, b - spill * (0.6 + 0.4 * k));
    if (near[i] >= R && spill > 40) d[p + 3] = Math.round(d[p + 3] * (1 - Math.min(0.85, spill / 160)));   // outermost purple pixels fade away
  }
}

/* ---------- connected components on the alpha mask ---------- */
function components(img) {
  const { w, h, data } = img, lab = new Int32Array(w * h).fill(-1), comps = [], stack = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (lab[s] !== -1 || data[s * 4 + 3] < 100) continue;
    const id = comps.length, c = { id, x0: w, y0: h, x1: 0, y1: 0, n: 0 };
    let sp = 0; stack[sp++] = s; lab[s] = id;
    while (sp) {
      const q = stack[--sp], x = q % w, y = (q / w) | 0;
      c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nq = ny * w + nx;
        if (lab[nq] === -1 && data[nq * 4 + 3] >= 100) { lab[nq] = id; stack[sp++] = nq; }
      }
    }
    comps.push(c);
  }
  return { lab, comps };
}
const gap = (a, b) => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1)) + Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
function mergeInto(a, b) { a.x0 = Math.min(a.x0, b.x0); a.y0 = Math.min(a.y0, b.y0); a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1); a.n += b.n; a.ids = a.ids.concat(b.ids); }

// Painted HD sheets live in assets/raw/hd; big creatures come in two halves (name1 + name2) joined side by side.
function loadSheet(name) {
  const hd = path.join(RAW, 'hd');
  if (fs.existsSync(path.join(hd, name + '.png'))) return readPNG(path.join(hd, name + '.png'));
  if (fs.existsSync(path.join(hd, name + '1.png'))) {
    const a = readPNG(path.join(hd, name + '1.png')), b = readPNG(path.join(hd, name + '2.png'));
    const w = a.w + b.w, h = Math.max(a.h, b.h), data = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { data[i * 4] = 255; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255; }   // magenta fill
    for (const [img, ox] of [[a, 0], [b, a.w]]) for (let y = 0; y < img.h; y++) img.data.copy(data, (y * w + ox) * 4, y * img.w * 4, (y + 1) * img.w * 4);
    return { w, h, data };
  }
  return readPNG(path.join(RAW, name + '.png'));
}
const hasSheet = name => ['hd/' + name, 'hd/' + name + '1', name].some(n => fs.existsSync(path.join(RAW, n + '.png')));
function sliceSheet(name, count) {
  const img = loadSheet(name);
  keyMagenta(img);
  if (name === 'car_park') clearTint(img);
  const { lab, comps } = components(img);
  const big = Math.max(...comps.map(c => c.n));
  let groups = comps.filter(c => c.n > big * 0.04).map(c => ({ ...c, ids: [c.id] }));
  if (!count) count = groups.filter(g => g.n > big * 0.25).length;
  const small = comps.filter(c => c.n <= big * 0.04);
  // attach small bits (smoke puffs, sparks, a detached fist) to the nearest pose
  for (const s of small) {
    let best = null, bd = 1e9;
    for (const g of groups) { const d = gap(g, s); if (d < bd) { bd = d; best = g; } }
    if (best && bd < 60) mergeInto(best, { ...s, ids: [s.id] });
  }
  // too many pieces: merge the smallest into its nearest neighbour
  while (groups.length > count) {
    groups.sort((a, b) => a.n - b.n);
    const s = groups.shift();
    let best = null, bd = 1e9;
    for (const g of groups) { const d = gap(g, s); if (d < bd) { bd = d; best = g; } }
    mergeInto(best, s);
  }
  // too few: split the widest piece at its thinnest column
  while (groups.length < count) {
    groups.sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0));
    const g = groups.shift();
    const ids = new Set(g.ids);
    let bestX = -1, bestC = 1e9;
    for (let x = g.x0 + Math.floor((g.x1 - g.x0) * 0.25); x <= g.x0 + Math.floor((g.x1 - g.x0) * 0.75); x++) {
      let cnt = 0; for (let y = g.y0; y <= g.y1; y++) if (ids.has(lab[y * img.w + x])) cnt++;
      if (cnt < bestC) { bestC = cnt; bestX = x; }
    }
    groups.push({ ...g, x1: bestX, ids: g.ids, splitMax: bestX }, { ...g, x0: bestX + 1, ids: g.ids, splitMin: bestX + 1 });
    console.warn(`  ${name}: split a merged pose at x=${bestX}`);
  }
  // order: rows (for the item grid) then left to right
  if (name === 'items') {
    groups.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const rows = []; for (let i = 0; i < groups.length; i += 6) rows.push(groups.slice(i, i + 6).sort((a, b) => a.x0 - b.x0));
    groups = rows.flat();
  } else groups.sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));

  // crop every pose (only its own pixels), compute its foot anchor, pack into an atlas row
  const pad = 2, frames = [];
  let atlasW = 0, atlasH = 0;
  for (const g of groups) {
    const ids = new Set(g.ids), w = g.x1 - g.x0 + 1 + pad * 2, h = g.y1 - g.y0 + 1 + pad * 2;
    const buf = Buffer.alloc(w * h * 4);
    const colCount = new Int32Array(w);
    const bandTop = g.y0 + Math.floor((g.y1 - g.y0) * 0.2), bandBot = g.y0 + Math.floor((g.y1 - g.y0) * 0.62);
    for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
      if (g.splitMax !== undefined && x > g.splitMax) continue;
      if (g.splitMin !== undefined && x < g.splitMin) continue;
      const si = y * img.w + x;
      const own = ids.has(lab[si]) || (img.data[si * 4 + 3] > 0 && img.data[si * 4 + 3] < 100 && nearOwn(lab, ids, img.w, img.h, x, y));
      if (!own) continue;
      const di = ((y - g.y0 + pad) * w + (x - g.x0 + pad)) * 4;
      img.data.copy(buf, di, si * 4, si * 4 + 4);
      if (y >= bandTop && y <= bandBot && img.data[si * 4 + 3] > 100) colCount[x - g.x0 + pad]++;
    }
    // the torso is the densest vertical mass; extended arms/legs are thin and barely count
    let mx = 0; for (let i = 0; i < w; i++) mx = Math.max(mx, colCount[i]);
    let sx = 0, sn = 0; for (let i = 0; i < w; i++) if (colCount[i] >= mx * 0.6) { sx += i * colCount[i]; sn += colCount[i]; }
    const ax = w > h * 1.6 || !sn ? w / 2 : sx / sn;
    frames.push({ buf, w, h, ax: Math.round(ax), ay: h - pad });
    atlasW += w + 2; atlasH = Math.max(atlasH, h);
  }
  const atlas = Buffer.alloc(atlasW * atlasH * 4);
  let ox = 0;
  const meta = [];
  for (const f of frames) {
    for (let y = 0; y < f.h; y++) f.buf.copy(atlas, (y * atlasW + ox) * 4, y * f.w * 4, (y + 1) * f.w * 4);
    meta.push({ x: ox, y: 0, w: f.w, h: f.h, ax: f.ax, ay: f.ay });
    ox += f.w + 2;
  }
  writePNG(path.join(OUT, name + '.png'), atlasW, atlasH, atlas);
  return meta;
}
function nearOwn(lab, ids, w, h, x, y) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && ids.has(lab[ny * w + nx])) return true;
  }
  return false;
}

module.exports = { readPNG, writePNG, keyMagenta, components };
if (require.main === module) {
fs.mkdirSync(OUT, { recursive: true });
const atlas = {};
for (const [name, count] of Object.entries(SHEETS)) {
  if (!hasSheet(name)) { console.warn('missing', name); continue; }
  atlas[name] = sliceSheet(name, count);
  console.log(name.padEnd(10), atlas[name].map(f => `${f.w}x${f.h}`).join(' '));
}
const median = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const norm = {};
for (const [name, [base, bf, sf]] of Object.entries(NORM)) {
  if (!atlas[name] || !atlas[base]) continue;
  const hb = median(bf.map(i => atlas[base][i].h)), hs = median((sf === 'all' ? atlas[name].map((_, i) => i) : sf).map(i => atlas[name][i].h));
  norm[name] = +(hb / hs).toFixed(4);
}
console.log('size normalisation', norm);
fs.writeFileSync(path.join(OUT, 'atlas.json'), JSON.stringify({ atlas, norm }));
fs.writeFileSync(path.join(OUT, 'atlas.js'), 'window.ATLAS = ' + JSON.stringify(atlas) + ';\nwindow.ATLAS_NORM = ' + JSON.stringify(norm) + ';\n');
console.log('wrote', Object.keys(atlas).length, 'atlases');
}
