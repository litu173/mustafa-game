'use strict';
/* =========================================================
   MUSTAFA — settings: volumes, touch-control size / opacity /
   left-handed layout, vibration, display. Opened from the title
   lobby and the pause menu; works with keys, mouse and touch.
   ========================================================= */
const SETTINGS = [
  { id: 'musVol', label: 'MUSIC VOLUME', type: 'slider', def: 1 },
  { id: 'sfxVol', label: 'EFFECTS VOLUME', type: 'slider', def: 1 },
  { id: 'padSize', label: 'BUTTON SIZE', type: 'slider', def: 0.5, touch: true },
  { id: 'padAlpha', label: 'BUTTON OPACITY', type: 'slider', def: 0.7, touch: true },
  { id: 'lefty', label: 'LEFT-HANDED LAYOUT', type: 'toggle', def: false, touch: true },
  { id: 'vibrate', label: 'VIBRATION', type: 'toggle', def: true, touch: true },
  { id: 'pixel', label: 'ARCADE PIXELS', type: 'toggle', def: false },
  { id: 'back', label: 'DONE', type: 'button' },
];
const setVal = it => Save.d[it.id] ?? it.def;
function settingsItems() { return SETTINGS.filter(s => !s.touch || TOUCH); }
function openSettings(from) { G.settings = { from, sel: 0, drag: -1 }; Sound.play('select'); }
function applySettings() {
  if (Sound.applyVol) Sound.applyVol();
  if (Touch.active) Touch.apply();
}
function updSettings() {
  const S = G.settings, items = settingsItems(), m = Input.mouse;
  if (Input.hit('back') || Input.hit('pause')) { closeSettings(); return; }
  if (Input.hit('up')) { S.sel = (S.sel + items.length - 1) % items.length; Sound.play('select'); }
  if (Input.hit('down')) { S.sel = (S.sel + 1) % items.length; Sound.play('select'); }
  const it = items[S.sel];
  const nudge = (Input.hit('right') ? 1 : 0) - (Input.hit('left') ? 1 : 0);
  if (nudge && it.type === 'slider') { Save.d[it.id] = clamp(Math.round((setVal(it) + nudge * 0.1) * 10) / 10, 0, 1); Save.write(); applySettings(); Sound.play('tick'); }
  if (nudge && it.type === 'toggle') { Save.d[it.id] = !setVal(it); Save.write(); applySettings(); Sound.play('select'); }
  if (Input.confirm()) activate(it);
  // pointer: tap rows, drag sliders
  if (G.rects) {
    if (!m.down) S.drag = -1;
    for (const R of G.rects) {
      const inside = m.x >= R.x && m.x <= R.x + R.w && m.y >= R.y && m.y <= R.y + R.h;
      if (m.click && inside) { S.sel = R.i; if (items[R.i].type === 'slider') S.drag = R.i; else activate(items[R.i]); }
    }
    if (S.drag >= 0 && m.down) {
      const R = G.rects[S.drag], it2 = items[S.drag];
      const v = clamp((m.x - R.sx) / R.sw, 0, 1);
      if (Math.abs(v - setVal(it2)) > 0.01) { Save.d[it2.id] = Math.round(v * 20) / 20; applySettings(); }
    } else if (S.drag === -1 && m.click === false && G.settings.dirty) { Save.write(); }
    if (S.drag >= 0) G.settings.dirty = true; else if (G.settings.dirty) { G.settings.dirty = false; Save.write(); }
  }
}
function activate(it) {
  if (it.type === 'button') return closeSettings();
  if (it.type === 'toggle') { Save.d[it.id] = !setVal(it); Save.write(); applySettings(); Sound.play('select'); if (it.id === 'vibrate' && Save.d.vibrate && navigator.vibrate) navigator.vibrate(30); }
}
function closeSettings() { Save.write(); G.settings = null; Sound.play('select'); }
function drawSettings(c) {
  const S = G.settings, items = settingsItems();
  c.fillStyle = 'rgba(4,3,6,0.88)'; c.fillRect(0, 0, W, H);
  const pw = 760, px = W / 2 - pw / 2, rowH = 64, top = H / 2 - (items.length * rowH) / 2 + 20;
  txt(c, 'SETTINGS', W / 2, top - 40, { font: '900 44px Cinzel, serif', align: 'center', fill: goldGrad(c, top - 76, top - 40), stroke: '#120800', sw: 6 });
  G.rects = [];
  items.forEach((it, i) => {
    const y = top + i * rowH, sel = S.sel === i;
    if (it.type === 'button') {
      bigButton(c, W / 2 - 150, y + 6, 300, 54, it.label, { size: 24, dim: !sel });
      G.rects.push({ x: W / 2 - 150, y: y + 6, w: 300, h: 54, i });
      return;
    }
    panel(c, px, y, pw, rowH - 10, sel ? { r: 12, top: 'rgba(60,36,12,0.95)', bot: 'rgba(24,14,6,0.95)' } : { r: 12, noInner: true, top: 'rgba(20,12,8,0.85)', bot: 'rgba(10,6,4,0.85)', border: 'rgba(212,175,55,0.35)' });
    txt(c, it.label, px + 26, y + 35, { font: '700 19px Cinzel, serif', fill: sel ? '#f3cf6a' : '#e8dcc0' });
    const R = { x: px, y, w: pw, h: rowH - 10, i };
    if (it.type === 'slider') {
      const sx = px + 380, sw = 300, v = setVal(it), cy = y + 27;
      R.sx = sx; R.sw = sw;
      c.fillStyle = 'rgba(255,255,255,0.12)'; rrect(c, sx, cy - 5, sw, 10, 5); c.fill();
      c.fillStyle = '#f5c518'; rrect(c, sx, cy - 5, sw * v, 10, 5); c.fill();
      c.fillStyle = '#fff4d6'; c.beginPath(); c.arc(sx + sw * v, cy, 13, 0, TAU); c.fill();
      c.strokeStyle = '#8a6514'; c.lineWidth = 3; c.stroke();
      txt(c, Math.round(v * 100) + '%', px + pw - 20, y + 35, { font: '600 24px Teko, sans-serif', align: 'right', fill: '#f3dc9a' });
    } else {
      const on = !!setVal(it), tx = px + pw - 110;
      c.fillStyle = on ? '#f5c518' : 'rgba(255,255,255,0.15)'; rrect(c, tx, y + 13, 84, 30, 15); c.fill();
      c.fillStyle = on ? '#1a1004' : '#bfae86'; c.beginPath(); c.arc(on ? tx + 69 : tx + 15, y + 28, 11, 0, TAU); c.fill();
      txt(c, on ? 'ON' : 'OFF', tx - 14, y + 36, { font: '700 16px Cinzel, serif', align: 'right', fill: on ? '#f3cf6a' : '#8a7a5c' });
    }
    G.rects.push(R);
  });
}
