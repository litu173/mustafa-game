'use strict';
/* =========================================================
   MUSTAFA — painted sprite renderer.
   Atlases come from tools/slice.js (assets/sprites/*.png + atlas.js).
   Every frame faces right; (ax, ay) is the foot anchor inside the frame.
   The code-drawn art in art.js stays as a fallback while images load.
   ========================================================= */
const SPRITE_V = 'hd14';   // bump when the art is regenerated, so browsers fetch the new sheets
const SPR = { img: {}, flash: {}, tint: {}, head: {}, bg: {}, cover: null, loaded: 0, total: 0 };

// sheet names + on-screen height of the reference frame (ref: 0 = stance, 1 = walk)
// Heights in px at 164 px per metre: heroes ~1.8 m; raptor ~1.3 m; T-rex 600 px ≈ 3.7 m (a young adult —
// a full-grown 4.6 m rex would not fit the screen); triceratops 390 px ≈ 2.4 m; pteranodon ≈ 1.3 m tall.
const SPRITE_DEFS = {
  mustafa: { a: 'mustafa_a', b: 'mustafa_b', h: 300, ref: 0 },
  rakib:   { a: 'rakib_a', b: 'rakib_b', h: 302, ref: 0 },
  nadia:   { a: 'nadia_a', b: 'nadia_b', h: 292, ref: 0 },
  bablu:   { a: 'bablu_a', b: 'bablu_b', h: 330, ref: 0 },
  razor:   { a: 'razor', h: 300, ref: 1 },
  motka:   { a: 'motka', h: 318, ref: 1 },
  poacher: { a: 'poacher', h: 300, ref: 1 },
  biker:   { a: 'biker', h: 305, ref: 1 },
  lash:    { a: 'lash', h: 292, ref: 1 },
  butcher: { a: 'butcher', h: 372, ref: 1 },
  saju:    { a: 'saju', h: 300, ref: 1 },
  morgol:  { a: 'morgol', h: 362, ref: 1 },
  kaiser:  { a: 'kaiser', h: 332, ref: 1 },
  mutant:  { a: 'mutant', h: 410, ref: 1 },
  raptor:  { a: 'raptor', h: 215, ref: 1 },
  rex:     { a: 'rex', h: 600, ref: 1 },
  trike:   { a: 'trike', h: 390, ref: 1 },
  ptera:   { a: 'ptera', h: 215, ref: 1 },
  hog:     { a: 'hog', h: 290, ref: 0 },
};
// item atlas order (see the items prompt): food, treasure, guns, melee, props
const ITEM_IDX = { pizza: 0, hotdog: 1, meat: 2, apple: 3, gem: 4, gold: 5, pistol: 6, rifle: 7, uzi: 8, shotgun: 9, bazooka: 10, grenade: 11, knife: 12, machete: 13, pipe: 14, rock: 15, crate: 16, barrel: 17 };

function loadSprites() {
  { const im = new Image(); SPR.total++; im.onload = () => { SPR.port = im; SPR.loaded++; }; im.onerror = () => { SPR.total--; }; im.src = 'assets/portraits.jpg?v=2'; }
  // logo: small WebP first (the loading screen shows it), then the full-size one for big screens
  { const im = new Image(); SPR.total++; im.onload = () => { SPR.logoSm = im; SPR.loaded++; }; im.onerror = () => { SPR.total--; }; im.src = 'assets/logo-sm.webp?v=3'; }
  { const im = new Image(); SPR.total++; im.onload = () => { SPR.logo = im; SPR.loaded++; };
    im.onerror = () => { im.onerror = () => { SPR.total--; }; im.src = 'assets/logo.png?v=2'; }; im.src = 'assets/logo.webp?v=3'; }
  const atlas = window.ATLAS || {};
  for (const name of Object.keys(atlas)) {
    const im = new Image(); SPR.total++;
    im.onload = () => { SPR.img[name] = im; SPR.flash[name] = tinted(im, '#fff6e0', 1); findHead(name, im); if (name === 'ptera_f') alignByCrest(name, im); SPR.loaded++; };
    im.onerror = () => { if (im.src.includes('.webp')) { im.src = 'assets/sprites/' + name + '.png?v=' + SPRITE_V; return; } SPR.total--; };
    // WebP is ~7x lighter than PNG; fall back to PNG on the rare browser that cannot decode it
    im.src = 'assets/sprites/' + name + '.webp?v=' + SPRITE_V;
  }
  for (const t of ['sea', 'swamp', 'road', 'garage', 'village', 'lab', 'jungle', 'fortress', 'cover']) {
    const im = new Image(); SPR.total++;
    im.onload = () => { if (t === 'cover') SPR.cover = im; else SPR.bg[t] = im; SPR.loaded++; };
    im.onerror = () => { SPR.total--; };
    im.src = 'assets/bg/' + t + '.jpg';
  }
}
function tinted(im, col, amount) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = amount; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function tintSheet(name, col) {
  const key = name + col;
  if (!SPR.tint[key] && SPR.img[name]) SPR.tint[key] = tinted(SPR.img[name], col, 0.75);
  return SPR.tint[key];
}
// Locate the head in the stance frame for HUD portraits
function findHead(name, im) {
  const fr = (window.ATLAS[name] || [])[0];
  if (!fr) return;
  try {
    const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h;
    const x = c.getContext('2d'); x.drawImage(im, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    const d = x.getImageData(0, 0, fr.w, fr.h).data;
    let top = -1;
    for (let y = 0; y < fr.h && top < 0; y++) for (let i = 0; i < fr.w; i++) if (d[(y * fr.w + i) * 4 + 3] > 120) { top = y; break; }
    const band = Math.round(fr.h * 0.13);
    let sx = 0, n = 0;
    for (let y = top; y < Math.min(fr.h, top + band); y++) for (let i = 0; i < fr.w; i++) if (d[(y * fr.w + i) * 4 + 3] > 120) { sx += i; n++; }
    SPR.head[name] = { cx: n ? sx / n : fr.w / 2, top: Math.max(0, top), size: fr.h * 0.24 };
  } catch (e) { /* canvas tainted (file://) — fall back to drawn heads */ }
}
// Flying frames change outline with every wingbeat, so anchor them on the red head crest instead of the feet
function alignByCrest(name, im) {
  try {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data;
    const ref = window.ATLAS.ptera[1];
    for (const fr of window.ATLAS[name]) {
      let sx = 0, sy = 0, n = 0;
      for (let y = fr.y; y < fr.y + fr.h; y++) for (let i = fr.x; i < fr.x + fr.w; i++) {
        const p = (y * im.width + i) * 4;
        if (d[p + 3] > 200 && d[p] > 150 && d[p + 1] < 90 && d[p + 2] < 80) { sx += i; sy += y; n++; }
      }
      if (n < 20) continue;
      fr.ax = sx / n - fr.x - 40; fr.ay = sy / n - fr.y + 70;   // body sits just below and behind the crest
    }
    void ref;
  } catch (e) { /* tainted canvas: keep foot anchors */ }
}
const spritesReady = name => !!SPR.img[name];

function spriteScale(key) {
  const d = SPRITE_DEFS[key], meta = window.ATLAS && window.ATLAS[d.a];
  if (!meta) return 1;
  if (d.k === undefined) d.k = d.h / meta[d.ref].h;
  return d.k;
}
// Draw one frame. facing: 1 right / -1 left. o: { flash, tint, alpha, rot, sx, sy }
function drawSprite(c, sheet, idx, x, y, facing, k, o = {}) {
  const meta = window.ATLAS && window.ATLAS[sheet];
  const im = o.flash ? SPR.flash[sheet] : o.tint ? tintSheet(sheet, o.tint) : SPR.img[sheet];
  if (!meta || !im) return false;
  const fr = meta[clamp(idx, 0, meta.length - 1)];
  c.save(); c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.scale(facing * k * (o.sx || 1), k * (o.sy || 1));
  c.drawImage(im, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.ay, fr.w, fr.h);
  c.restore();
  return true;
}

// Draw an in-between of two frames of the same sheet: a true cross-fade (premultiplied lerp), so moving
// limbs flow from one painted pose into the next instead of popping.
const BLEND = document.createElement('canvas'), blendCtx = BLEND.getContext('2d');
function drawSpriteBlend(c, sheet, i0, i1, a, x, y, facing, k, o = {}) {
  const meta = window.ATLAS && window.ATLAS[sheet], im = SPR.img[sheet];
  if (!meta || !im || o.flash || o.tint || a <= 0.02) return drawSprite(c, sheet, i0, x, y, facing, k, o);
  if (a >= 0.98) return drawSprite(c, sheet, i1, x, y, facing, k, o);
  const A = meta[i0], B = meta[i1];
  const ox = Math.max(A.ax, B.ax), oy = Math.max(A.ay, B.ay);
  const w = Math.ceil(ox + Math.max(A.w - A.ax, B.w - B.ax)), h = Math.ceil(oy + Math.max(A.h - A.ay, B.h - B.ay));
  if (BLEND.width < w || BLEND.height < h) { BLEND.width = Math.max(BLEND.width, w); BLEND.height = Math.max(BLEND.height, h); }
  const b = blendCtx;
  b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, w + 2, h + 2);
  b.globalAlpha = 1 - a; b.drawImage(im, A.x, A.y, A.w, A.h, ox - A.ax, oy - A.ay, A.w, A.h);
  b.globalCompositeOperation = 'lighter'; b.globalAlpha = a; b.drawImage(im, B.x, B.y, B.w, B.h, ox - B.ax, oy - B.ay, B.w, B.h);
  b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
  c.save(); c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.scale(facing * k * (o.sx || 1), k * (o.sy || 1));
  c.drawImage(BLEND, 0, 0, w, h, -ox, -oy, w, h);
  c.restore();
  return true;
}

/* ---------- which frame to show for a fighter ----------
   Heroes: a = poses, b = specials, c = 8-9 frame walk cycle, d = jab/cross/kick transitions.
   Gang:   base sheet + _w (6-frame walk, wind-up, recovery). Raptor: _r run cycle. */
const has = s => !!(window.ATLAS && window.ATLAS[s] && SPR.img[s]);
const cyc = (sheet, ph, rate) => [sheet, Math.floor(ph / rate) % window.ATLAS[sheet].length];
// Walk/run cycles advance with the distance actually travelled, so feet never skate and the
// cadence matches the speed. Returns [sheet, frame, nextFrame, blend].
function stride(sheet, f, len) {
  const n = window.ATLAS[sheet].length, p = (f.dist || 0) / len * n, i = Math.floor(p), fr = p - i;
  return [sheet, i % n, (i + 1) % n, fr];
}
// one full walk cycle (two steps) ≈ 1.5 m for a 1.8 m adult ≈ 250 px, so the feet do not slide
const STRIDE = { hero: 260, run: 300, gang: 240, raptor: 250, rex: 450, trike: 335 };   // grows with the bigger dinosaurs so feet do not slide
// pick a frame from a timeline [[untilFrame, sheet, idx], ...]
function seq(t, list) { for (const s of list) if (t < s[0]) return [s[1], s[2]]; const l = list[list.length - 1]; return [l[1], l[2]]; }
function heroFrame(f, A, B, C, D) {
  const t = f.t, m = f.move, id = f.def.id, hasC = has(C), hasD = has(D);
  switch (f.state) {
    case 'idle': return hasD ? [D, 0] : [A, 0];
    case 'walk': return hasC ? stride(C, f, f.running ? STRIDE.run : STRIDE.hero) : [A, [1, 0, 2, 0][Math.floor(f.walkPh / 1.3) % 4]];
    case 'jump': case 'drop': return f.jatk ? [B, 1] : [A, 7];
    case 'hurt': case 'grabbed': return [A, 5];
    case 'fall': return t < 5 ? [A, 5] : [A, 6];
    case 'down': case 'dead': return [A, 6];
    case 'getup': return t < 10 ? [B, 2] : hasD ? [D, 0] : [A, 0];
    case 'grab': return f.sub > 0 && f.subKind === 'knee' ? (hasD ? [D, f.sub > 9 ? 5 : 6] : [A, 4]) : [B, 4];
    case 'win': return [B, 7];
    case 'attack': {
      const a0 = m.a0 || m.fire || 1, a1 = m.a1 || a0 + 3, pre = t < a0;
      if (hasD) switch (m.pose) {
        case 'jab': case 'swing': case 'whip': return seq(t, [[a0, D, 1], [a1 + 2, D, 2], [99, D, 1]]);
        case 'cross': case 'dash': return seq(t, [[a0, D, 3], [a1 + 2, D, 4], [99, D, 3]]);
        case 'kick': return seq(t, [[a0, D, 5], [a1 + 3, D, 6], [99, D, 7]]);
        case 'uppercut': case 'rising': return seq(t, [[a0, D, 3], [m.dur - 4, B, 0], [99, D, 0]]);
        case 'toss': return pre ? [B, 5] : [D, 4];
      }
      switch (m.pose) {
        case 'jab': case 'cross': case 'swing': case 'dash': case 'whip': return pre ? [A, 0] : [A, 3];
        case 'uppercut': case 'rising': return pre ? [B, 2] : [B, 0];
        case 'kick': return pre ? [A, 0] : [A, 4];
        case 'spinkick': return id === 'nadia' ? [B, 3] : hasD ? seq(t, [[a0, D, 5], [a1 + 2, D, 6], [99, D, 7]]) : [A, 4];
        case 'slam': return pre ? [B, 5] : [B, 3];
        case 'shoot': case 'bazooka': return [B, 6];
        case 'toss': return pre ? [B, 5] : [A, 3];
        case 'throw': return [B, 5];
        case 'special': return id === 'bablu' ? (t < 10 ? [B, 5] : [B, 3]) : [B, 3];
      }
    }
  }
  return hasD ? [D, 0] : [A, 0];
}
// frame 7 of each enemy sheet is its signature move
const SIGNATURE = { razor: 'taunt', motka: 'ebelly', poacher: 'epunch', lash: 'ekick', butcher: 'ecross', saju: 'edash', morgol: 'eshotgun', kaiser: 'eorb', mutant: 'eorb' };
function enemyFrame(f, S, key) {
  const t = f.t, m = f.move, Wk = S + '_w', hasW = has(Wk);
  const walk = ph => {
    if (!hasW) return [S, [1, 0, 2, 0][Math.floor(ph / 1.3) % 4]];
    const p = (f.dist || 0) / STRIDE.gang * 6, i = Math.floor(p);
    return [Wk, i % 6, (i + 1) % 6, p - i];
  };
  switch (f.state) {
    case 'idle': return [S, 0];
    case 'walk': case 'enter': return walk(f.walkPh);
    case 'charge': return t < 26 ? [S, 3] : walk(t * 0.6);
    case 'taunt': return [S, key === 'razor' || key === 'mutant' || key === 'kaiser' ? 7 : 3];
    case 'hurt': case 'grabbed': return [S, 5];
    case 'fall': return [S, t < 5 ? 5 : 6];
    case 'down': case 'dead': return [S, 6];
    case 'getup': return [S, 0];
    case 'attack': {
      const a0 = m.a0 || m.fire || 1, pre = t < a0;
      if (SIGNATURE[key] && SIGNATURE[key] === f.moveName) return [S, pre && m.fire ? 0 : 7];
      if (hasW) return seq(t, [[a0 * 0.5, Wk, 6], [a0, S, 3], [(m.a1 || a0 + 3) + 6, S, 4], [99, Wk, 7]]);
      return [S, pre ? 3 : 4];
    }
  }
  return [S, 0];
}
function dinoFrame(f, S, key) {
  const t = f.t, m = f.move, st = f.state;
  if (key === 'ptera') {
    if (st === 'swoop') return [S, 3];
    if (st === 'hurt' || st === 'fall') return [S, 4];
    if (st === 'down' || st === 'dead' || st === 'getup') return [S, 5];
    if (has('ptera_f')) { const p = f.flap / 0.6, i = Math.floor(p); return ['ptera_f', i % 8, (i + 1) % 8, p - i]; }
    return [S, [0, 1, 2, 1][Math.floor(f.flap / 1.2) % 4]];
  }
  if (key === 'trike') {
    if (st === 'attack' || (st === 'charge' && t >= 26)) return [S, 3];
    if (st === 'charge' || st === 'taunt' || st === 'hurt') return [S, 4];
    if (st === 'fall' || st === 'down' || st === 'dead') return [S, 5];
    if (st === 'walk') return has('trike_w') ? stride('trike_w', f, STRIDE.trike) : [S, [1, 2][Math.floor(f.walkPh / 1.2) % 2]];
    return [S, 0];
  }
  const rex = key === 'rex', run = !rex && has('raptor_r');
  switch (st) {
    case 'walk': case 'enter': return run ? stride('raptor_r', f, STRIDE.raptor) : rex && has('rex_w') ? stride('rex_w', f, STRIDE.rex) : [S, [1, 2][Math.floor(f.walkPh / 1.1) % 2]];
    case 'charge': return t < 26 ? [S, 3] : run ? stride('raptor_r', f, STRIDE.raptor) : rex && has('rex_w') ? stride('rex_w', f, STRIDE.rex) : [S, [1, 2][Math.floor(t / 4) % 2]];
    case 'taunt': return [S, 3];
    case 'hurt': return [S, rex ? 6 : 5];
    case 'fall': return [S, t < 5 ? (rex ? 6 : 5) : (rex ? 7 : 6)];
    case 'down': case 'dead': return [S, rex ? 7 : 6];
    case 'attack':
      if (m.pose === 'stomp') return [S, 5];
      return [S, t < m.a0 ? (rex ? 3 : 7) : 4];
  }
  return [S, 0];
}
function spriteKeyFor(f) {
  if (f.team === 'hero' || f.hero) return f.def.id;
  if (f.type === 'kaiser' && f.phase2) return 'mutant';
  if (f.type === 'tusker') return 'rex';
  return f.def.spr || f.type;
}
// Returns { sheet, idx, k } or null when no sprite is available yet
function trackMotion(f) {
  if (f._mt === G.t) return;
  const dx = f._lx === undefined ? 0 : f.x - f._lx, dy = f._ly === undefined ? 0 : f.y - f._ly;
  f._lx = f.x; f._ly = f.y; f._mt = G.t;
  const m = Math.hypot(dx, dy * 1.25);
  if (m < 40) f.dist = (f.dist || 0) + m;            // ignore teleports / respawns
  f.mspd = (f.mspd || 0) * 0.78 + Math.min(m, 20) * 0.22;
  // what the body looks like it is doing: hysteresis stops idle/walk flicker at the end of a step
  if (f.state === 'idle' || f.state === 'walk') {
    if (f.mspd > 0.7) f.visState = 'walk'; else if (f.mspd < 0.25) f.visState = 'idle';
    else if (!f.visState) f.visState = f.state;
  } else f.visState = null;
}
function spriteFor(f) {
  const key = spriteKeyFor(f), d = SPRITE_DEFS[key];
  if (!d || !spritesReady(d.a) || (d.b && !spritesReady(d.b))) return null;
  trackMotion(f);
  if ((f.team === 'hero' || f.hero) && typeof hasRig === 'function' && hasRig(key) && f.state !== 'drive') return { rig: true, k: 1 };
  const realState = f.state;
  if (f.visState && !f.def.flyer && key !== 'hog') f.state = f.visState;
  let r;
  if (d.b) r = heroFrame(f, d.a, d.b, key + '_c', key + '_d');
  else if (key === 'hog') r = f.state === 'ride' ? [d.a, f.throwT > 0 ? 1 : f.inv > 0 ? 2 : 0] : [d.a, f.state === 'fall' && f.z > 20 ? 3 : 4];
  else if (f.def.dino) r = dinoFrame(f, d.a, key);
  else r = enemyFrame(f, d.a, key);
  f.state = realState;
  // every sheet is scaled to match its character's base sheet
  const k = spriteScale(key) * ((window.ATLAS_NORM && window.ATLAS_NORM[r[0]]) || 1) * (f.def.sprScale || 1);
  return { sheet: r[0], idx: r[1], next: r[2], blend: r[3] === undefined ? 0 : r[3], k };
}

/* ---------- items, props, projectiles, vehicles ---------- */
// Real-world length (longest side, metres) of every pickup. Heroes are ~1.83 m = 300 px, so
// 1 m ≈ 164 px. Tiny things keep a minimum on-screen size so they can still be spotted.
const PX_PER_M = 164;
const ITEM_M = { pizza: 0.4, hotdog: 0.24, meat: 0.32, apple: 0.1, gem: 0.15, gold: 0.22, pistol: 0.22, rifle: 1.1, uzi: 0.47,
  shotgun: 1.0, bazooka: 1.35, grenade: 0.12, knife: 0.3, machete: 0.6, pipe: 0.85, rock: 0.25 };
function itemScale(kind, minPx = 42) {
  const fr = window.ATLAS && window.ATLAS.items && window.ATLAS.items[ITEM_IDX[kind]];
  if (!fr || !ITEM_M[kind]) return 0.42;
  return Math.max(minPx, ITEM_M[kind] * PX_PER_M) / Math.max(fr.w, fr.h);
}
function drawItemSpr(c, kind, x, y, k = itemScale(kind)) {
  if (!spritesReady('items') || ITEM_IDX[kind] === undefined) return false;
  return drawSprite(c, 'items', ITEM_IDX[kind], x, y, 1, k);
}
// The '59 Eldorado is 5.7 m long and the heroes about 1.8 m tall, so the car is drawn about three
// heroes long (CAR_LEN). Seated in an open car you only see head, neck and shoulders above the
// door: hips sit roughly 0.45 m below the beltline, and the car body hides everything below.
const CAR_LEN = 910;
const CAR_SEATS = { driver: { fx: 0.53, fy: 0.5 }, passenger: { fx: 0.37, fy: 0.5 } };
const CAR_CREW = {};
const SEAT_H = 0.8, SEAT_HIP = [0.3, 0.56];   // seated-figure height vs standing; hip point in the seated painting
function drawCarSpr(c, x, y, damaged, flash, driver, passenger, o = {}) {
  if (has('car_park')) {
    const fr = window.ATLAS.car_park[damaged ? 1 : 0], k = CAR_LEN / fr.w, left = x - fr.ax * k, top = y - fr.ay * k;
    // body pitch (nose up under power, down under braking) pivots on the rear wheel
    c.save();
    if (o.pitch) { const px = left + fr.w * k * CAR_WHEELS[0].fx, py = top + fr.h * k * CAR_WHEELS[0].fy; c.translate(px, py); c.rotate(o.pitch); c.translate(-px, -py); }
    for (const [id, seat] of [[passenger, 'passenger'], [driver, 'driver']]) {
      if (!id) continue;
      // seats are placed on the undamaged car's shape (the wrecked painting is taller: it has smoke on top)
      const f0 = window.ATLAS.car_park[0], top0 = y - f0.ay * k, sx = x - f0.ax * k + f0.w * k * CAR_SEATS[seat].fx, sy = top0 + f0.h * k * CAR_SEATS[seat].fy;
      if (typeof hasRig === 'function' && hasRig(id)) {
        const f = CAR_CREW[seat + id] || (CAR_CREW[seat + id] = { def: HEROES.find(h => h.id === id) || { id }, id: seat === 'driver' ? 1 : 2, state: 'sit', seat, t: 0 });
        f.t++;
        // keep legs hidden even where the painted door is low: only draw above the car floor
        c.save(); c.beginPath(); c.rect(sx - 200, top0 - 400, 400, f0.h * k * 0.74 + 400); c.clip();
        drawRig(c, f, sx, sy, 1, { flash, seat: true });
        c.restore();
      } else if (has(id + '_s')) {
        // painted seated pose: 0 = driving (hands on the wheel), 1 = riding (elbow on the door).
        // A seated adult is ~72% of standing height; hips sit ~55% down the figure, a third in from its back.
        const sh = id + '_s', idx = seat === 'driver' ? 0 : 1, sf = window.ATLAS[sh][idx], d = SPRITE_DEFS[id];
        const kk = (d.h * SEAT_H) / sf.h, sway = Math.sin(G.t * 0.09 + (seat === 'driver' ? 0 : 1.7)) * 1.2;
        const hipX = sf.w * SEAT_HIP[0], hipY = sf.h * SEAT_HIP[1];
        c.save(); c.beginPath(); c.rect(sx - 300, top0 - 400, 600, f0.h * k * 0.74 + 400); c.clip();
        drawSprite(c, sh, idx, sx + (sf.ax - hipX) * kk, sy + (sf.ay - hipY) * kk + sway, 1, kk, { flash });
        c.restore();
      } else {
        // whole-body painting at its normal in-game size, lowered until the hips (about half the
        // figure's height above the boots) rest on the seat; the car body hides everything below
        const sh = id + '_a', d = SPRITE_DEFS[id]; if (!spritesReady(sh) || !d) continue;
        const sway = Math.sin(G.t * 0.09 + (seat === 'driver' ? 0 : 1.7)) * 1.2;
        c.save(); c.beginPath(); c.rect(sx - 200, top0 - 400, 400, f0.h * k * 0.74 + 400); c.clip();
        drawSprite(c, sh, 0, sx, sy + d.h * 0.5 + sway, 1, spriteScale(id), { flash });
        c.restore();
      }
    }
    drawSprite(c, 'car_park', damaged ? 1 : 0, x, y, 1, k, { flash });
    // wheels that turn: each tire is re-drawn from the painting, rotated about its hub
    if (o.spin !== undefined && !damaged) {
      const im = flash ? SPR.flash.car_park : SPR.img.car_park;
      if (im) for (const w of CAR_WHEELS) {
        // both hubs are copied from the front wheel, which is fully visible (the rear one hides under a skirt)
        const F = CAR_WHEELS[1], cx = left + fr.w * k * w.fx, cy = top + fr.h * k * w.fy, r = CAR_LEN * w.r, sx = fr.x + fr.w * F.fx, sy = fr.y + fr.h * F.fy, sr = fr.w * F.r;
        // only the hubcap and spokes turn (the round whitewall looks the same at any angle, and the
        // top of the tire sits under the wheel arch); a little motion blur at speed
        const hr = r * 0.62;
        c.save(); c.beginPath(); c.arc(cx, cy, hr, 0, TAU); c.clip();
        if (w.skirt) { const sy2 = top + fr.h * k * w.skirt; c.beginPath(); c.rect(cx - hr, sy2, hr * 2, hr * 2); c.clip(); }
        c.translate(cx, cy);
        for (const [da, al] of [[0, 1], [-0.12, 0.35], [-0.24, 0.18]]) {
          c.save(); c.globalAlpha *= al; c.rotate(o.spin + da);
          c.drawImage(im, sx - sr * 0.62, sy - sr * 0.62, sr * 1.24, sr * 1.24, -hr, -hr, hr * 2, hr * 2);
          c.restore();
        }
        c.restore();
      }
    }
    c.restore();
    return true;
  }
  if (!spritesReady('car')) return false;
  const fr = window.ATLAS.car[0];
  return drawSprite(c, 'car', damaged ? 1 : 0, x, y, 1, CAR_LEN / fr.w, { flash });
}
// painted HD portraits (assets/portraits.jpg, 320px cells), used everywhere a face is shown
const PORT_IDX = { mustafa: 0, rakib: 1, nadia: 2, bablu: 3, kaiser: 4, mutant: 4, butcher: 5, saju: 6, morgol: 7, captain: 8, razor: 8, hakim: 9 };
function drawPortraitSpr(c, key, x, y, r) {
  if (SPR.port && PORT_IDX[key] !== undefined) { c.drawImage(SPR.port, PORT_IDX[key] * 320, 0, 320, 320, x - r, y - r, r * 2, r * 2); return true; }
  const d = SPRITE_DEFS[key]; if (!d) return false;
  const hd = SPR.head[d.a], im = SPR.img[d.a]; if (!hd || !im) return false;
  const fr = window.ATLAS[d.a][0], s = hd.size;
  c.drawImage(im, fr.x + hd.cx - s / 2, fr.y + hd.top - s * 0.08, s, s, x - r, y - r, r * 2, r * 2);
  return true;
}

// Painted stage panorama, mirrored on alternate tiles so it scrolls forever without seams
function drawPanorama(c, img, cam) {
  const s = H / img.height, w = img.width * s;
  const i0 = Math.floor(cam / w), i1 = Math.floor((cam + W) / w);
  for (let i = i0; i <= i1; i++) {
    const x = i * w - cam;
    if (((i % 2) + 2) % 2) { c.save(); c.translate(x + w, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, w, H); c.restore(); }
    else c.drawImage(img, x, 0, w, H);
  }
}
