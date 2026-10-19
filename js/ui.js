'use strict';
/* =========================================================
   MUSTAFA — screens: cover/title, hero select, HUD, overlays,
   the gun-to-your-face continue screen and the ending.
   ========================================================= */
let LOGO = null, SHINE = null;
function buildLogo() {
  const cw = 1180, ch = 270, o = document.createElement('canvas');
  o.width = cw; o.height = ch;
  const c = o.getContext('2d'), s = 'MUSTAFA', x = cw / 2, y = ch / 2 + 10;
  // crossed rifles behind the title, like an old arcade marquee
  for (const [a, dx] of [[-0.32, -40], [0.32, 40]]) {
    c.save(); c.translate(x + dx, y + 6); c.rotate(a); c.scale(dx < 0 ? 6.4 : -6.4, 6.4);
    drawWeapon(c, 'rifle', -12, 0, 0, {});
    c.restore();
  }
  c.font = '900 150px "Cinzel Decorative", Cinzel, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 14; i > 0; i--) { c.fillStyle = i > 3 ? '#1c0402' : '#5a1a06'; c.fillText(s, x + i * 0.5, y + i); }
  c.lineJoin = 'round'; c.lineWidth = 16; c.strokeStyle = '#100200'; c.strokeText(s, x, y);
  c.lineWidth = 8; c.strokeStyle = goldGrad(c, y - 70, y + 70); c.strokeText(s, x, y);
  const red = c.createLinearGradient(0, y - 70, 0, y + 70);
  red.addColorStop(0, '#fff0e6'); red.addColorStop(0.3, '#ff6a4a'); red.addColorStop(0.52, '#a8100c'); red.addColorStop(0.56, '#ff3a2a'); red.addColorStop(1, '#5a0404');
  c.fillStyle = red; c.fillText(s, x, y);
  c.save(); c.globalCompositeOperation = 'source-atop';
  const hl = c.createLinearGradient(0, y - 74, 0, y); hl.addColorStop(0, 'rgba(255,255,255,0.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl; c.fillRect(0, y - 80, cw, 70);
  c.restore();
  LOGO = o;
  SHINE = document.createElement('canvas'); SHINE.width = cw; SHINE.height = ch;
}
function drawLogo(c, cx, cy, scale) {
  if (!LOGO) return;
  const sc = SHINE.getContext('2d');
  sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, SHINE.width, SHINE.height); sc.drawImage(LOGO, 0, 0);
  sc.globalCompositeOperation = 'source-atop';
  const px = ((G.t * 7) % 2600) - 400;
  const g = sc.createLinearGradient(px - 90, 0, px + 90, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,240,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  sc.save(); sc.transform(1, 0, -0.4, 1, 0, 0); sc.fillStyle = g; sc.fillRect(px - 90, 0, 180 + SHINE.height, SHINE.height); sc.restore();
  const w = LOGO.width * scale, h = LOGO.height * scale;
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, cx, cy, w * 0.42, 'rgba(255,120,60,0.22)'); c.restore();
  c.drawImage(SHINE, cx - w / 2, cy - h / 2, w, h);
}

function updateTitleFx() {
  if (G.titleFx.length < 70 && Math.random() < 0.6) G.titleFx.push({ x: rand(0, W), y: H + 10, vx: rand(-0.4, 0.4), vy: rand(-0.6, -1.8), life: rand(200, 420), size: rand(1.2, 3.2), hue: rand(25, 50) });
  for (const p of G.titleFx) { p.x += p.vx + Math.sin((G.t + p.life) * 0.02) * 0.3; p.y += p.vy; p.life--; }
  G.titleFx = G.titleFx.filter(p => p.life > 0 && p.y > -20);
}
function drawEmbers(c) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of G.titleFx) { c.fillStyle = `hsla(${p.hue},100%,65%,${Math.min(1, p.life / 120)})`; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); }
  c.restore();
}
function poseFor(id, state, t, extra) { return getPose(Object.assign({ id, state, t, walkPh: t * 0.2, weapon: null }, extra || {})); }
function heroLook(i) {
  const h = HEROES[i], look = { ...h.look };
  if (G.royal && Save.d.premium) Object.assign(look, h.royal);
  return look;
}

/* ---------- Cover / title ---------- */
function drawTitle(c) {
  if (SPR.cover) return drawTitleCover(c);
  const t = G.t;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1040'); g.addColorStop(0.32, '#5a2a6a'); g.addColorStop(0.55, '#d0604a'); g.addColorStop(0.72, '#ffb060'); g.addColorStop(1, '#3a1a10');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sx = 700, sy = 470;
  c.save(); c.globalCompositeOperation = 'lighter'; c.translate(sx, sy); c.rotate(t * 0.0015);
  for (let i = 0; i < 24; i++) { c.rotate(TAU / 24); c.fillStyle = 'rgba(255,200,120,0.045)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(1100, -50); c.lineTo(1100, 50); c.closePath(); c.fill(); }
  c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sx, sy, 380, 'rgba(255,170,80,0.55)'); c.restore();
  const sg = c.createLinearGradient(0, sy - 120, 0, sy + 120); sg.addColorStop(0, '#fff8e0'); sg.addColorStop(0.6, '#ffc861'); sg.addColorStop(1, '#ff7a2a');
  c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 120, 0, TAU); c.fill();
  tiles(t * 0.2, 1, 420, (x, i, r) => cloud(c, x, 300 + r * 60, 300, 'rgba(110,40,80,0.45)', 'rgba(255,170,130,0.3)'));
  for (let k = 0; k < 4; k++) {
    const px = ((t * (0.7 + k * 0.25) + k * 380) % (W + 400)) - 200;
    pterosaur(c, px, 230 + k * 40 + Math.sin(t * 0.02 + k) * 18, 0.9 - k * 0.14, t + k * 17, '#2a0c24');
  }
  ridge(c, t * 0.3, 1, 545, 170, 0.004, 4, '#3a1230');
  ridge(c, t * 0.6, 1, 600, 120, 0.006, 5, '#1e0818');
  tiles(t * 0.4, 1, 260, (x, i, r) => { if (r < 0.5) palm(c, x, 640, 180 + r * 80, '#120610', r, t); });
  // the T-rex, roaring
  const roar = Math.max(0, Math.sin(t * 0.018));
  const rexP = { ph: 0, jaw: 0.18 + roar * 0.6, lean: -0.1 * roar, rot: 0, lift: 0, head: -0.2 * roar };
  drawTheropod(c, 1080, 760, -1, 3.1, rexP, { kind: 'rex', col: '#e0892e', stripe: '#8a4210', crest: true });
  c.fillStyle = '#1a0a0c'; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) c.lineTo(x, 668 - Math.abs(Math.sin(x * 0.013) * 14));
  c.lineTo(W, H); c.closePath(); c.fill();
  // the car and the four heroes (the cover art)
  drawCar(c, 470, 690, 1.65, { col: Save.d.premium && G.royal ? '#151515' : '#c0262e', t: 0 });
  const line4 = [[1, 150, 712, 1.62, 1], [2, 300, 714, 1.62, 1], [3, 700, 716, 1.66, -1]];
  for (const [i, x, y, s, f] of line4) drawFigure(c, heroLook(i), poseFor(i, 'idle', t), x, y, f, s, { t });
  drawFigure(c, heroLook(0), poseFor(0, 'idle', t, { weapon: 'rifle' }), 470, 718, 1, 1.85, { t, weapon: 'rifle', aura: Save.d.premium && G.royal ? '#d4af37' : null });
  const bob = Math.sin(t * 0.03) * 3;
  drawLogo(c, W / 2, 118 + bob, 0.86);
  txt(c, '—  THE DINOSAUR WARS  —', W / 2, 234 + bob, { font: '700 24px Cinzel, serif', align: 'center', fill: goldGrad(c, 214, 238), stroke: '#1a0a02', sw: 5 });
  const rib = Save.d.premium ? '♛  ROYAL MEMBER  ♛' : 'ARCADE LEGEND · ROYAL EDITION';
  c.save(); c.translate(W / 2, 270 + bob);
  c.fillStyle = 'rgba(0,0,0,0.5)'; rrect(c, -170, -16, 340, 30, 15); c.fill();
  c.strokeStyle = 'rgba(212,175,55,0.7)'; c.lineWidth = 1.5; c.stroke();
  txt(c, rib, 0, 6, { font: '700 15px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
  c.restore();
  const mx = 880, my = 330, mw = 360;
  if (!G.titleReady) {
    const a = 0.55 + 0.45 * Math.sin(t * 0.08);
    panel(c, mx, 470, mw, 110, { r: 16, top: 'rgba(20,10,8,0.82)', bot: 'rgba(8,4,4,0.9)' });
    c.save(); c.globalAlpha = a;
    txt(c, TOUCH ? 'TAP TO START' : 'PRESS ANY KEY', mx + mw / 2, 528, { font: '900 32px Cinzel, serif', align: 'center', fill: goldGrad(c, 500, 532), stroke: '#120800', sw: 6 });
    c.restore();
    txt(c, 'Keyboard · best with sound on', mx + mw / 2, 560, { font: '600 14px Cinzel, serif', align: 'center', fill: '#d9c9a3' });
  } else {
    const items = titleItems(); G.rects = [];
    panel(c, mx, my, mw, items.length * 52 + 26, { r: 16, top: 'rgba(20,10,8,0.84)', bot: 'rgba(8,4,4,0.92)' });
    items.forEach((it, i) => {
      const y = my + 40 + i * 52, sel = G.menu === i, w = mw - 30, x = mx + 15;
      G.rects.push({ x, y: y - 22, w, h: 44, i });
      if (sel) {
        panel(c, x, y - 22, w, 44, { r: 22, lw: 2, top: 'rgba(80,40,14,0.95)', bot: 'rgba(30,14,6,0.95)' });
        const pulse = Math.sin(t * 0.15) * 3;
        txt(c, '◆', x + 20 - pulse, y + 7, { font: '700 15px Cinzel', align: 'center', fill: '#f3cf6a' });
        txt(c, '◆', x + w - 20 + pulse, y + 7, { font: '700 15px Cinzel', align: 'center', fill: '#f3cf6a' });
      }
      txt(c, it.label, mx + mw / 2, y + 8, { font: `900 ${sel ? 23 : 20}px Cinzel, serif`, align: 'center', fill: sel ? goldGrad(c, y - 14, y + 12) : (it.lock ? '#8a7a5c' : '#e8dcc0'), stroke: sel ? '#120800' : null, sw: 5 });
      if (it.lock) txt(c, '♛', x + w - 40, y + 7, { font: '700 17px serif', align: 'center', fill: '#d4af37' });
    });
  }
  txt(c, 'HI-SCORE ' + String(Save.d.best).padStart(7, '0'), W - 28, 40, { font: '600 26px Teko, sans-serif', align: 'right', fill: '#f3dc9a' });
  txt(c, 'Fan-made tribute to the 2002 arcade craze · original art · not affiliated with Capcom', W / 2, H - 12, { font: '600 12px Cinzel, serif', align: 'center', fill: 'rgba(240,220,180,0.6)' });
  drawEmbers(c);
  c.drawImage(getVignette(), 0, 0);
  c.strokeStyle = 'rgba(212,175,55,0.55)'; c.lineWidth = 2; c.strokeRect(10, 10, W - 20, H - 20);
  c.strokeStyle = 'rgba(212,175,55,0.2)'; c.lineWidth = 1; c.strokeRect(16, 16, W - 32, H - 32);
  if (G.overlay === 'help') drawHelp(c);
  if (G.overlay === 'stages') drawMissionSelect(c);
}

function drawHelp(c) {
  c.fillStyle = 'rgba(5,3,6,0.8)'; c.fillRect(0, 0, W, H);
  c.save(); c.translate((W - BASE_W) / 2, 0); const W0 = W; W = BASE_W;
  panel(c, 230, 60, 820, 600, { r: 18 });
  txt(c, 'HOW TO PLAY', W / 2, 118, { font: '900 40px Cinzel, serif', align: 'center', fill: goldGrad(c, 86, 120), stroke: '#120800', sw: 6 });
  const rows = TOUCH ? [
    ['MOVE', 'Left thumb-stick  —  touch anywhere on the left side'],
    ['RUN', 'Push the stick all the way  —  ATTACK while running to dash'],
    ['ATTACK', 'Tap ATTACK for a 3-hit combo'],
    ['JUMP', 'JUMP  —  tap ATTACK in the air to jump-kick'],
    ['RISING ATTACK', 'Stick down, then up, then ATTACK'],
    ['SPECIAL', 'SPECIAL hits all around, costs a little health'],
    ['GRAB / THROW', 'Walk into an enemy · ATTACK to knee · JUMP to throw'],
    ['WEAPONS', 'Pistol, rifle, uzi (hold ATTACK), shotgun, bazooka'],
    ['DINOSAURS', 'Calm dinosaurs only fight back if you hit them'],
    ['THE CAR', 'Hell Road: steer with the stick, ATTACK to boost'],
    ['PAUSE', '❚❚ button at the top  ·  ⛶ for full screen'],
  ] : [
    ['MOVE', 'Arrow keys  or  W A S D'],
    ['RUN', 'Double-tap left / right  —  Attack while running to dash'],
    ['ATTACK', 'J  or  Z   —  tap for a 3-hit combo'],
    ['JUMP', 'K,  X  or  Space   —  attack in the air to jump-kick'],
    ['RISING ATTACK', 'Down, Up, Attack  —  powerful, no health cost'],
    ['SPECIAL', 'L  or  C   —  hits all around, costs a little health'],
    ['GRAB / THROW', 'Walk into an enemy · Attack to knee · Jump to throw'],
    ['WEAPONS', 'Pistol, rifle, uzi (hold), shotgun, bazooka, grenades'],
    ['DINOSAURS', 'Calm dinosaurs only fight back if you hit them'],
    ['THE CAR', 'Hell Road: steer, Attack to boost, ram the biker boss'],
    ['PAUSE / MUTE', 'P or Esc   ·   M'],
  ];
  rows.forEach(([k, v], i) => {
    const y = 168 + i * 40;
    txt(c, k, 280, y, { font: '700 17px Cinzel, serif', fill: '#f3cf6a' });
    txt(c, v, 500, y, { font: '600 17px Cinzel, serif', fill: '#efe3c8' });
  });
  txt(c, 'Free players get 3 lives  ·  Royal Pass: 5 lives + unlimited continues', W / 2, 632, { font: '600 15px Cinzel, serif', align: 'center', fill: '#bfae86' });
  W = W0; c.restore();
}
function drawStageSelect(c) {
  c.fillStyle = 'rgba(5,3,6,0.82)'; c.fillRect(0, 0, W, H);
  txt(c, 'STAGE SELECT', W / 2, 140, { font: '900 42px Cinzel, serif', align: 'center', fill: goldGrad(c, 108, 142), stroke: '#120800', sw: 6 });
  G.rects = [];
  STAGES.forEach((s, i) => {
    const w = 186, x = 52 + i * 200, y = 210, sel = G.stageSel === i;
    G.rects.push({ x, y, w, h: 260, i });
    c.save(); rrect(c, x, y, w, 260, 14); c.clip();
    c.translate(x, y); c.scale(w / W * 2.2, 260 / H);
    drawBackground(c, s.theme, 1400 + i * 300, G.t);
    c.restore();
    c.fillStyle = sel ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.55)'; rrect(c, x, y, w, 260, 14); c.fill();
    c.lineWidth = sel ? 3 : 1.5; c.strokeStyle = sel ? goldGrad(c, y, y + 260) : 'rgba(212,175,55,0.4)'; c.stroke();
    txt(c, 'STAGE ' + (i + 1), x + w / 2, y + 290, { font: '700 15px Cinzel, serif', align: 'center', fill: '#bfae86' });
    txt(c, s.name, x + w / 2, y + 314, { font: `900 ${s.name.length > 13 ? 13 : 16}px Cinzel, serif`, align: 'center', fill: sel ? '#f3cf6a' : '#e8dcc0' });
  });
  txt(c, TOUCH ? 'Tap a stage to start' : '← → choose  ·  Enter start  ·  Esc back', W / 2, 620, { font: '600 17px Cinzel, serif', align: 'center', fill: '#d9c9a3' });
}

/* ---------- Hero select ---------- */
function drawSelect(c) {
  const t = G.t;
  const g = c.createRadialGradient(W / 2, 260, 40, W / 2, 360, 820); g.addColorStop(0, '#3d1712'); g.addColorStop(0.6, '#150808'); g.addColorStop(1, '#050304');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(212,175,55,0.05)'; c.lineWidth = 1;
  for (let x = -H; x < W; x += 28) line(c, x + (t * 0.3) % 28, 0, x + H + (t * 0.3) % 28, H);
  drawEmbers(c); updateTitleFx();
  txt(c, 'CHOOSE YOUR FIGHTER', W / 2, 70, { font: '900 44px Cinzel, serif', align: 'center', fill: goldGrad(c, 36, 72), stroke: '#120800', sw: 7 });
  c.strokeStyle = 'rgba(212,175,55,0.6)'; c.lineWidth = 1.5; line(c, W / 2 - 330, 88, W / 2 - 40, 88); line(c, W / 2 + 40, 88, W / 2 + 330, 88);
  txt(c, '◆', W / 2, 94, { font: '700 14px serif', align: 'center', fill: '#d4af37' });
  G.rects = [];
  HEROES.forEach((h, i) => {
    const sel = G.selIdx === i, w = 262, hgt = 470, x = (W - BASE_W) / 2 + 70 + i * 292, y = 108 - (sel ? 10 : 0);
    G.rects.push({ x, y, w, h: hgt, i });
    c.save();
    if (sel) { c.shadowColor = 'rgba(255,190,80,0.55)'; c.shadowBlur = 36; }
    rrect(c, x, y, w, hgt, 16);
    const cg = c.createLinearGradient(0, y, 0, y + hgt); cg.addColorStop(0, sel ? '#3a2212' : '#1d1214'); cg.addColorStop(1, '#0a0707');
    c.fillStyle = cg; c.fill();
    c.restore();
    c.save(); rrect(c, x, y, w, hgt, 16); c.clip();
    c.globalCompositeOperation = 'lighter';
    const sp = c.createLinearGradient(0, y, 0, y + 350); sp.addColorStop(0, sel ? 'rgba(255,210,140,0.32)' : 'rgba(255,210,140,0.08)'); sp.addColorStop(1, 'rgba(255,210,140,0)');
    c.fillStyle = sp; c.beginPath(); c.moveTo(x + w / 2 - 30, y); c.lineTo(x + w / 2 + 30, y); c.lineTo(x + w - 10, y + 350); c.lineTo(x + 10, y + 350); c.closePath(); c.fill();
    c.restore();
    const fy = y + hgt - 118;
    c.fillStyle = sel ? 'rgba(212,175,55,0.45)' : 'rgba(212,175,55,0.15)'; c.beginPath(); c.ellipse(x + w / 2, fy, 90, 15, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(212,175,55,0.6)'; c.lineWidth = 1.5; c.stroke();
    const look = heroLook(i), state = sel ? (G.sceneT % 240 < 40 ? 'win' : 'idle') : 'idle';
    c.save(); rrect(c, x, y, w, hgt, 16); c.clip();
    const sd = SPRITE_DEFS[h.id];
    if (G.royal && Save.d.premium) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x + w / 2, fy - 160, 170, 'rgba(212,175,55,0.35)'); c.restore(); }
    if (!(spritesReady(sd.a) && spritesReady(sd.b) && drawSprite(c, state === 'win' ? sd.b : sd.a, state === 'win' ? 7 : 0, x + w / 2, fy, 1, spriteScale(h.id) * 1.05, { sy: 1 + Math.sin(t * 0.08 + i) * 0.01 })))
      drawFigure(c, look, poseFor(i, state, t, i === 0 ? { weapon: 'rifle' } : null), x + w / 2 - 6, fy, 1, 1.72 * (h.look.scale || 1), { t, weapon: i === 0 ? 'rifle' : null });
    c.restore();
    if (!sel) { c.fillStyle = 'rgba(5,3,4,0.45)'; rrect(c, x, y, w, hgt, 16); c.fill(); }
    c.lineWidth = sel ? 3 : 1.5; c.strokeStyle = sel ? goldGrad(c, y, y + hgt) : 'rgba(212,175,55,0.35)'; rrect(c, x, y, w, hgt, 16); c.stroke();
    txt(c, h.name, x + w / 2, y + hgt - 78, { font: '900 30px Cinzel, serif', align: 'center', fill: sel ? goldGrad(c, y + hgt - 102, y + hgt - 76) : '#e8dcc0', stroke: '#120800', sw: 5 });
    txt(c, h.title.toUpperCase(), x + w / 2, y + hgt - 57, { font: '700 13px Cinzel, serif', align: 'center', fill: '#bfae86' });
    ['POWER', 'SPEED', 'SKILL'].forEach((lab, k) => {
      const ry = y + hgt - 36 + k * 12;
      txt(c, lab, x + 34, ry + 4, { font: '600 11px Cinzel, serif', fill: '#a8997a' });
      for (let d = 0; d < 5; d++) {
        c.fillStyle = d < h.stats[k] ? '#e8bf4f' : 'rgba(212,175,55,0.18)';
        c.save(); c.translate(x + 120 + d * 22, ry); c.rotate(Math.PI / 4); c.fillRect(-4, -4, 8, 8); c.restore();
      }
    });
  });
  const h = HEROES[G.selIdx];
  txt(c, h.desc, W / 2, 624, { font: '600 20px Cinzel, serif', align: 'center', fill: '#efe3c8' });
  const royalHint = Save.d.premium ? (G.royal ? 'R  Royal costume: ON' : 'R  Royal costume: OFF') : 'R  Royal costume ♛';
  txt(c, TOUCH ? 'Tap a hero to fight  ·  ♛ ROYAL for the royal costume' : '← → choose   ·   ENTER / J  fight   ·   ' + royalHint + '   ·   ESC back', W / 2, 668, { font: '600 15px Cinzel, serif', align: 'center', fill: '#bfae86' });
  if (G.startStage > 0) txt(c, 'Starting at stage ' + (G.startStage + 1), W / 2, 698, { font: '600 14px Cinzel, serif', align: 'center', fill: '#f3cf6a' });
}

/* ---------- HUD ---------- */
function bar(c, x, y, w, h, k, lag, cols) {
  c.fillStyle = 'rgba(0,0,0,0.65)'; rrect(c, x, y, w, h, 3); c.fill();
  if (lag > k) { c.fillStyle = '#fff2d6'; c.fillRect(x + 2, y + 2, (w - 4) * Math.min(1, lag), h - 4); }
  const g = c.createLinearGradient(0, y, 0, y + h); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = g; c.fillRect(x + 2, y + 2, (w - 4) * Math.max(0, k), h - 4);
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 2, y + 2, (w - 4) * Math.max(0, k), (h - 4) * 0.35);
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;
  for (let i = 1; i < 10; i++) line(c, x + w * i / 10, y + 2, x + w * i / 10, y + h - 2);
  c.lineWidth = 1.5; c.strokeStyle = goldGrad(c, y, y + h); rrect(c, x, y, w, h, 3); c.stroke();
}
function drawPortrait(c, look, x, y, r, key) {
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU);
  const g = c.createRadialGradient(x, y - 10, 4, x, y, r); g.addColorStop(0, '#5a3a1a'); g.addColorStop(1, '#1a0f08');
  c.fillStyle = g; c.fill(); c.clip();
  if (!drawPortraitSpr(c, key, x, y, r)) { c.translate(x - 4, y + 8); c.scale(2.4, 2.4); drawHead(c, look, { t: G.t }); }
  c.restore();
  c.lineWidth = 3; c.strokeStyle = goldGrad(c, y - r, y + r); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
}
function weaponLabel(p) {
  const w = p.weapon; if (!w) return '';
  if (GUNS[w]) return GUNS[w].label + ' ×' + p.ammo;
  if (THROWN[w]) return THROWN[w].label + (p.ammo > 1 ? ' ×' + p.ammo : '');
  if (MELEE_W[w]) return MELEE_W[w].label;
  return '';
}
function drawHUD(c) {
  const p = G.players[0];
  if (!p) return;
  panel(c, 14, 12, 450, 100, { r: 14 });
  drawPortrait(c, p.look, 62, 62, 38, p.def.id);
  txt(c, p.def.name, 112, 44, { font: '900 22px Cinzel, serif', fill: goldGrad(c, 26, 46), stroke: '#120800', sw: 4 });
  if (p.royal) txt(c, '♛', 112 + c.measureText(p.def.name).width + 14, 44, { font: '700 20px serif', fill: '#f3cf6a' });
  const k = p.hp / p.maxHp;
  bar(c, 112, 54, 330, 20, k, p.lagHp / p.maxHp, k > 0.3 ? ['#fff3a0', '#f5c518', '#c98a00'] : ['#ffb3a0', '#f04a2a', '#a01800']);
  for (let i = 0; i < Math.min(G.lives, 6); i++) {
    c.save(); c.translate(122 + i * 26, 94); c.rotate(Math.PI / 4);
    c.fillStyle = '#e8bf4f'; c.fillRect(-6, -6, 12, 12); c.strokeStyle = '#4a2a06'; c.lineWidth = 1.5; c.strokeRect(-6, -6, 12, 12);
    c.restore();
  }
  txt(c, 'LIVES', 122 + Math.min(G.lives, 6) * 26 + 4, 101, { font: '600 18px Teko, sans-serif', fill: '#bfae86' });
  const wl = p.state === 'drive' ? 'J BOOST' : weaponLabel(p);
  if (wl) txt(c, wl, 442, 101, { font: '600 21px Teko, sans-serif', align: 'right', fill: '#ffe08a' });
  txt(c, String(G.score).padStart(8, '0'), W - 26, 52, { font: '600 44px Teko, sans-serif', align: 'right', fill: goldGrad(c, 18, 52), stroke: '#120800', sw: 5 });
  txt(c, 'HI ' + String(Math.max(Save.d.best, G.score)).padStart(8, '0'), W - 28, 76, { font: '500 20px Teko, sans-serif', align: 'right', fill: '#bfae86' });
  const st = stageDef();
  txt(c, (G.arena ? '' : 'MISSION ' + (G.stageIdx + 1) + '  ·  ') + st.name, W / 2, 32, { font: '700 16px Cinzel, serif', align: 'center', fill: 'rgba(243,220,154,0.95)', stroke: 'rgba(0,0,0,0.7)', sw: 4 });
  const e = G.focus;
  if (e && G.focusT > 0 && !e.def.boss) {
    c.save(); c.globalAlpha = Math.min(1, G.focusT / 20);
    panel(c, 14, 118, 300, 46, { r: 10, noInner: true });
    txt(c, e.def.name, 28, 138, { font: '700 15px Cinzel, serif', fill: '#efe3c8' });
    bar(c, 28, 144, 272, 12, e.hp / e.maxHp, (e.lagHp || e.hp) / e.maxHp, ['#ff9a7a', '#d23a1a', '#7a1000']);
    c.restore();
  }
  const b = G.boss;
  if (b && !b.remove) {
    const bx = 240, by = 670, bw = 800;
    txt(c, b.def.name, bx, by - 8, { font: '900 20px Cinzel, serif', fill: goldGrad(c, by - 26, by - 6), stroke: '#120800', sw: 4 });
    txt(c, 'BOSS', bx + bw, by - 8, { font: '700 16px Cinzel, serif', align: 'right', fill: '#ff7a5a', stroke: '#120800', sw: 3 });
    bar(c, bx, by, bw, 22, b.hp / b.maxHp, (b.lagHp || b.hp) / b.maxHp, b.phase2 ? ['#e0b0ff', '#9b3cff', '#4a0a8a'] : ['#ffb08a', '#e0301a', '#7a0a00']);
  }
  if (G.combo >= 2) {
    const pop = 1 + G.comboPop * 0.04;
    c.save(); c.translate(W - 120, 165); c.scale(pop, pop);
    txt(c, String(G.combo), 0, 0, { font: '700 64px Teko, sans-serif', align: 'center', fill: goldGrad(c, -50, 0), stroke: '#120800', sw: 6 });
    txt(c, 'HITS', 0, 24, { font: '900 18px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 4 });
    c.restore();
  }
  if (G.goT > 0 && G.camLock === null && G.scene === 'play' && !G.drive && (G.goT >> 4) % 2 === 0) {
    const x = W - 150 + Math.sin(G.t * 0.25) * 8;
    txt(c, 'GO', x, 380, { font: '900 52px Cinzel, serif', align: 'center', fill: goldGrad(c, 340, 382), stroke: '#120800', sw: 7 });
    c.fillStyle = '#f3cf6a'; c.strokeStyle = '#120800'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x + 50, 345); c.lineTo(x + 90, 365); c.lineTo(x + 50, 385); c.closePath(); c.stroke(); c.fill();
  }
  if (G.scene === 'play' && G.stageTime < 600 && !G.boss && (G.stageIdx === 0 || G.drive)) {
    c.save(); c.globalAlpha = Math.min(1, (600 - G.stageTime) / 60);
    const hint = TOUCH ? (G.drive ? 'Stick steers  ·  ATTACK boosts  ·  ram the biker!' : 'Stick moves (push fully to run)  ·  ATTACK  ·  JUMP  ·  SPECIAL') : G.drive ? 'Arrows steer  ·  J boost  ·  run them down and ram the biker!'
      : 'J attack  ·  K jump  ·  L special  ·  ↓↑+J rising attack  ·  double-tap to run';
    txt(c, hint, W / 2, 706, { font: '700 18px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 5 });
    c.restore();
  }
}

/* ---------- Overlays ---------- */
function drawBanner(c) {
  const b = G.banner;
  if (!b) return;
  const k = b.t / b.dur, a = Math.min(1, b.t / 12, (b.dur - b.t) / 20);
  c.save(); c.globalAlpha = Math.max(0, a);
  if (b.warn) {
    c.fillStyle = 'rgba(120,0,0,0.35)'; c.fillRect(0, 250, W, 140);
    c.fillStyle = '#ff3b2b';
    for (let x = -60 + (G.t * 4) % 60; x < W; x += 60) {
      c.beginPath(); c.moveTo(x, 250); c.lineTo(x + 30, 250); c.lineTo(x + 18, 262); c.lineTo(x - 12, 262); c.fill();
      c.beginPath(); c.moveTo(x, 390); c.lineTo(x + 30, 390); c.lineTo(x + 18, 378); c.lineTo(x - 12, 378); c.fill();
    }
    if ((G.t >> 3) % 2 || b.title !== 'WARNING') txt(c, b.title, W / 2, 330, { font: '900 64px Cinzel, serif', align: 'center', fill: '#ff5a3a', stroke: '#1a0000', sw: 8 });
    txt(c, b.sub, W / 2, 368, { font: '900 26px Cinzel, serif', align: 'center', fill: goldGrad(c, 346, 370), stroke: '#120800', sw: 5 });
  } else {
    const s = b.big ? 1 + Math.max(0, 0.6 - k * 4) : 1;
    c.translate(W / 2, 320); c.scale(s, s);
    txt(c, b.title, 0, 0, { font: '900 110px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: goldGrad(c, -90, 0), stroke: '#120800', sw: 10 });
    if (b.sub) txt(c, b.sub, 0, 50, { font: '900 24px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 5 });
  }
  c.restore();
}
function drawIntro(c) {
  const k = G.sceneT, st = stageDef();
  const open = Math.min(1, k / 18), close = Math.max(0, (k - 130) / 30);
  const bandH = 190 * open * (1 - close);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(6,3,4,0.92)'; c.fillRect(0, H / 2 - bandH / 2, W, bandH);
  c.fillStyle = goldGrad(c, 0, 4); c.fillRect(0, H / 2 - bandH / 2, W, 2); c.fillRect(0, H / 2 + bandH / 2 - 2, W, 2);
  if (bandH < 120) return;
  const slide = Math.max(0, 1 - (k - 10) / 25) * 200;
  txt(c, 'MISSION ' + (G.stageIdx + 1) + '  ·  ' + CHAPTERS[st.chapter || 0], W / 2 - slide, H / 2 - 40, { font: '700 22px Cinzel, serif', align: 'center', fill: '#bfae86' });
  txt(c, st.name, W / 2 + slide, H / 2 + 18, { font: '900 58px Cinzel, serif', align: 'center', fill: goldGrad(c, H / 2 - 30, H / 2 + 20), stroke: '#120800', sw: 7 });
  txt(c, st.sub, W / 2, H / 2 + 58, { font: '600 18px Cinzel, serif', align: 'center', fill: '#efe3c8' });
}
function drawClear(c) {
  const b = G.bonus, k = G.sceneT;
  c.fillStyle = `rgba(0,0,0,${Math.min(0.55, k / 60)})`; c.fillRect(0, 0, W, H);
  const s = 1 + Math.max(0, 0.5 - k / 30);
  c.save(); c.translate(W / 2, 250); c.scale(s, s);
  txt(c, 'MISSION COMPLETE', 0, 0, { font: '900 72px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: goldGrad(c, -70, 0), stroke: '#120800', sw: 9 });
  c.restore();
  if (k > 50) {
    panel(c, W / 2 - 260, 300, 520, 180, { r: 14 });
    [['VITALITY BONUS', b.hp], ['TIME BONUS', b.time], ['TOTAL', b.total]].forEach(([l, v], i) => {
      const y = 348 + i * 44;
      txt(c, l, W / 2 - 220, y, { font: `${i === 2 ? 900 : 700} 20px Cinzel, serif`, fill: i === 2 ? '#f3cf6a' : '#efe3c8' });
      const shown = i === 2 ? b.shown : Math.min(v, Math.round(b.shown * v / Math.max(1, b.total)));
      txt(c, String(shown), W / 2 + 220, y + 2, { font: '600 34px Teko, sans-serif', align: 'right', fill: goldGrad(c, y - 26, y) });
    });
  }
  if (k > 120 && (k >> 4) % 2) txt(c, TOUCH ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 540, { font: '700 20px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
}
// Continue screen: the gang boss leans in with a revolver, like the arcade original
function drawGameOver(c) {
  const k = G.sceneT;
  c.fillStyle = `rgba(10,0,0,${Math.min(0.82, k / 40)})`; c.fillRect(0, 0, W, H);
  const boss = { skin: '#c48a5e', hair: '#141010', hairStyle: 'slick', shirt: '#f2efe6', top: 'dress', sleeves: 'long', pants: '#1a1a1e', boots: '#111111', belt: '#111111', extra: ['shades', 'scar'] };
  const P = Object.assign(basePose(), { af: [1.62, 1.56], ab: [0.4, 2.3], lean: 0.18 + Math.sin(k * 0.05) * 0.02, head: -0.05 });
  c.save(); c.globalAlpha = Math.min(1, k / 30);
  if (!(spritesReady('morgol') && drawSprite(c, 'morgol', 7, 1130, 900, -1, 2.3)))
    drawFigure(c, boss, P, 1010, 1060, -1, 4.2, { weapon: 'pistol', t: G.t });
  c.restore();
  txt(c, 'GAME OVER', 380, 170, { font: '900 86px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: '#c8261a', stroke: '#120000', sw: 10 });
  txt(c, '"Any last words, hero?"', 380, 222, { font: '700 22px Cinzel, serif', align: 'center', fill: '#efe3c8' });
  txt(c, 'SCORE ' + String(G.score).padStart(8, '0'), 380, 266, { font: '600 34px Teko, sans-serif', align: 'center', fill: '#f3dc9a' });
  if (Save.d.premium) {
    const cd = Math.max(0, 10 - Math.floor(k / 60));
    txt(c, String(cd), 380, 380, { font: '700 110px Teko, sans-serif', align: 'center', fill: goldGrad(c, 300, 380), stroke: '#120800', sw: 7 });
  } else txt(c, 'Your 3 free lives are spent. Royal members continue right here.', 380, 320, { font: '600 16px Cinzel, serif', align: 'center', fill: '#efe3c8' });
  const opts = goOptions(); G.rects = [];
  opts.forEach((o, i) => {
    const y = 440 + i * 56, sel = G.goSel === i, w = 420, x = 380 - w / 2;
    G.rects.push({ x, y: y - 24, w, h: 48, i });
    if (sel) panel(c, x, y - 24, w, 48, { r: 24, top: 'rgba(60,36,12,0.95)', bot: 'rgba(24,14,6,0.95)' });
    txt(c, o.label, 380, y + 9, { font: `900 ${sel ? 24 : 21}px Cinzel, serif`, align: 'center', fill: sel ? goldGrad(c, y - 14, y + 12) : '#d9c9a3', stroke: sel ? '#120800' : null, sw: 5 });
  });
}
function drawPause(c) {
  c.fillStyle = 'rgba(5,3,6,0.7)'; c.fillRect(0, 0, W, H);
  panel(c, W / 2 - 220, 180, 440, 380, { r: 18 });
  txt(c, 'PAUSED', W / 2, 270, { font: '900 52px Cinzel, serif', align: 'center', fill: goldGrad(c, 230, 272), stroke: '#120800', sw: 7 });
  G.rects = [];
  ['RESUME', 'SETTINGS', 'RESTART MISSION', 'QUIT TO TITLE'].forEach((l, i) => {
    const y = 340 + i * 54, sel = G.pauseSel === i;
    G.rects.push({ x: W / 2 - 180, y: y - 24, w: 360, h: 48, i });
    if (sel) panel(c, W / 2 - 180, y - 24, 360, 48, { r: 24, top: 'rgba(60,36,12,0.95)', bot: 'rgba(24,14,6,0.95)' });
    txt(c, l, W / 2, y + 9, { font: `900 ${sel ? 24 : 21}px Cinzel, serif`, align: 'center', fill: sel ? goldGrad(c, y - 14, y + 12) : '#d9c9a3' });
  });
}
function drawEnding(c) {
  const t = G.t, k = G.sceneT;
  if (SPR.cover) {
    coverImage(c, t);
    const shade = c.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, 'rgba(0,0,0,0.65)'); shade.addColorStop(0.45, 'rgba(0,0,0,0.1)'); shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = shade; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = Math.min(1, k / 60);
    drawLogo(c, W / 2, 80, 0.55);
    txt(c, 'THE LEGEND RETURNS', W / 2, 170, { font: '900 40px Cinzel, serif', align: 'center', fill: goldGrad(c, 138, 174), stroke: '#120800', sw: 6 });
    txt(c, 'Dr. Kaiser is defeated. The dinosaurs roam free once more.', W / 2, 206, { font: '600 20px Cinzel, serif', align: 'center', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.7)', sw: 4 });
    txt(c, 'FINAL SCORE  ' + String(G.score).padStart(8, '0'), W / 2, 248, { font: '600 40px Teko, sans-serif', align: 'center', fill: '#fff4d6', stroke: '#120800', sw: 5 });
    c.restore();
    if (k > 200 && (k >> 4) % 2) txt(c, TOUCH ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 700, { font: '700 20px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 4 });
    drawEmbers(c);
    return;
  }
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b2a5a'); g.addColorStop(0.45, '#d9708a'); g.addColorStop(0.7, '#ffcf7a'); g.addColorStop(1, '#3a1a10');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, W / 2, 470, 380, 'rgba(255,220,140,0.6)'); c.restore();
  c.fillStyle = '#fff4d6'; c.beginPath(); c.arc(W / 2, 470, 110, 0, TAU); c.fill();
  ridge(c, 0, 1, 540, 150, 0.004, 9, '#3a1630');
  ridge(c, 0, 1, 600, 90, 0.007, 10, '#1d0a18');
  for (let k2 = 0; k2 < 5; k2++) pterosaur(c, ((t * 0.6 + k2 * 300) % (W + 300)) - 150, 140 + k2 * 30, 0.6, t + k2 * 9, '#2a1030');
  c.fillStyle = '#0d0508'; c.fillRect(0, 670, W, 50);
  drawCar(c, W / 2, 690, 1.4, { col: '#c0262e', t: 0 });
  HEROES.forEach((h, i) => {
    const x = 230 + i * 270 + (i > 1 ? 30 : 0), st = (k + i * 20) % 180 < 60 ? 'win' : 'idle';
    drawFigure(c, heroLook(i), poseFor(i, st, t), x, 712, i < 2 ? 1 : -1, 1.5, { t });
  });
  const a = Math.min(1, k / 60);
  c.save(); c.globalAlpha = a;
  drawLogo(c, W / 2, 110, 0.62);
  txt(c, 'THE LEGEND RETURNS', W / 2, 212, { font: '900 40px Cinzel, serif', align: 'center', fill: goldGrad(c, 180, 216), stroke: '#120800', sw: 6 });
  txt(c, 'Dr. Kaiser is defeated. The dinosaurs roam free once more.', W / 2, 252, { font: '600 20px Cinzel, serif', align: 'center', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.5)', sw: 4 });
  txt(c, 'FINAL SCORE  ' + String(G.score).padStart(8, '0'), W / 2, 298, { font: '600 40px Teko, sans-serif', align: 'center', fill: '#fff4d6', stroke: '#120800', sw: 5 });
  c.restore();
  if (k > 200 && (k >> 4) % 2) txt(c, TOUCH ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 340, { font: '700 18px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 4 });
  drawEmbers(c);
}

/* ---------- Cover title (painted poster) ---------- */
function coverImage(c, t) {
  const im = SPR.cover, z = (1.04 + Math.sin(t * 0.004) * 0.02) * Math.max(W / im.width, H / im.height);
  const w = im.width * z, h = im.height * z;
  c.drawImage(im, (W - w) / 2, (H - h) / 2 - 6, w, h);
}
function drawTitleCover(c) {
  const t = G.t;
  coverImage(c, t);
  const top = c.createLinearGradient(0, 0, 0, 260); top.addColorStop(0, 'rgba(10,4,12,0.75)'); top.addColorStop(1, 'rgba(10,4,12,0)');
  c.fillStyle = top; c.fillRect(0, 0, W, 260);
  const bot = c.createLinearGradient(0, 560, 0, H); bot.addColorStop(0, 'rgba(8,4,6,0)'); bot.addColorStop(0.55, 'rgba(8,4,6,0.8)'); bot.addColorStop(1, 'rgba(8,4,6,0.95)');
  c.fillStyle = bot; c.fillRect(0, 560, W, H - 560);
  const bob = Math.sin(t * 0.03) * 3;
  drawLogo(c, W / 2, 92 + bob, 0.74);
  txt(c, '\u2014  THE DINOSAUR WARS  \u2014', W / 2, 190 + bob, { font: '700 24px Cinzel, serif', align: 'center', fill: goldGrad(c, 170, 194), stroke: '#1a0a02', sw: 5 });
  if (!G.titleReady) {
    const a = 0.55 + 0.45 * Math.sin(t * 0.08);
    c.save(); c.globalAlpha = a;
    const msg = SPR.loaded < SPR.total ? 'LOADING  ' + Math.round(SPR.loaded / Math.max(1, SPR.total) * 100) + '%' : TOUCH ? 'TAP TO START' : 'PRESS ANY KEY';
    txt(c, msg, W / 2, 670, { font: '900 36px Cinzel, serif', align: 'center', fill: goldGrad(c, 638, 674), stroke: '#120800', sw: 6 });
    c.restore();
  } else {
    // PUBG-style lobby: menu down the left, a big START button bottom-right
    const items = titleItems(); G.rects = [];
    const lx = 34 + SAFE.l, lw = 290, ly = 236, rowH = 56;
    items.forEach((it, i) => {
      if (it.id === 'start') return;
      const y = ly + (i - 1) * rowH, sel = G.menu === i;
      G.rects.push({ x: lx, y, w: lw, h: 46, i });
      c.save();
      c.fillStyle = sel ? 'rgba(245,197,24,0.95)' : 'rgba(10,6,4,0.72)';
      c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + lw, y); c.lineTo(lx + lw - 14, y + 46); c.lineTo(lx, y + 46); c.closePath(); c.fill();
      c.strokeStyle = sel ? '#fff1b0' : 'rgba(212,175,55,0.45)'; c.lineWidth = sel ? 2 : 1; c.stroke();
      c.fillStyle = sel ? '#1a1004' : '#d4af37'; c.fillRect(lx, y, 5, 46);
      c.restore();
      txt(c, it.label, lx + 22, y + 30, { font: '900 18px Cinzel, serif', fill: sel ? '#1a1004' : it.lock ? '#8a7a5c' : '#f4ead2' });
    });
    const st = items[0], bw = 400, bh = 104, bx = W - bw - 40 - SAFE.r, by = H - bh - 46, sel0 = G.menu === 0;
    G.rects.push({ x: bx, y: by, w: bw, h: bh, i: 0 });
    c.save(); const pulse = 1 + (sel0 ? Math.sin(t * 0.12) * 0.025 : 0); c.translate(bx + bw / 2, by + bh / 2); c.scale(pulse, pulse);
    bigButton(c, -bw / 2, -bh / 2, bw, bh, '', { dim: false });
    txt(c, 'START', 0, 6, { font: '900 46px Cinzel, serif', align: 'center', fill: '#1a1004' });
    txt(c, st.sub, 0, 36, { font: '800 16px Cinzel, serif', align: 'center', fill: 'rgba(26,16,4,0.85)' });
    if (sel0) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-bw / 2 + 16, -bh / 2); c.lineTo(bw / 2, -bh / 2); c.lineTo(bw / 2 - 16, bh / 2); c.lineTo(-bw / 2, bh / 2); c.closePath(); c.stroke(); }
    c.restore();
    txt(c, 'LEVEL · ' + DIF().name + '   ·   ' + (Save.d.premium ? '♛ ROYAL' : '3 FREE LIVES'), bx + bw / 2, by - 14, { font: '700 15px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 4 });
  }
  txt(c, 'HI-SCORE ' + String(Save.d.best).padStart(7, '0'), W - 28, 40, { font: '600 26px Teko, sans-serif', align: 'right', fill: '#f3dc9a', stroke: '#120800', sw: 4 });
  txt(c, 'Fan-made tribute \u00B7 not affiliated with Capcom', 28, 36, { font: '600 12px Cinzel, serif', fill: 'rgba(240,220,180,0.7)' });
  drawEmbers(c);
  c.strokeStyle = 'rgba(212,175,55,0.55)'; c.lineWidth = 2; c.strokeRect(10, 10, W - 20, H - 20);
  if (G.overlay === 'help') drawHelp(c);
  if (G.overlay === 'stages') drawMissionSelect(c);
}
