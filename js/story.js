'use strict';
/* =========================================================
   MUSTAFA — the campaign: story cutscenes, mission briefings,
   objectives (destroy / rescue / survive / defend / timer),
   radio chatter, mission fail and the mission select.
   ========================================================= */

/* ---------- story text ---------- */
const STORY = {
  prologue: [
    { bg: 'sea', text: '2002. The Great Flood swallowed the old cities. And from the deep jungles, the dinosaurs came back.' },
    { bg: 'jungle', text: 'In the hidden Green Valley they nest in peace, guarded by the people of Shobuj Village and their elder, Dada Hakim.' },
    { bg: 'lab', who: 'kaiser', name: 'DR. KAISER', text: 'Dinosaur blood... brewed into the FANG SERUM. One drop turns a man into a monster. An army of monsters will make me a king.' },
    { bg: 'village', text: 'Last night the Black Fang gang burned Shobuj Village and kidnapped Dada Hakim. Only he knows the way into the Valley.' },
    { bg: 'garage', who: 'mustafa', name: 'MUSTAFA', text: 'They took the old man. Rakib, warm up the Cadillac. Nadia, Bablu... we ride at dawn.' },
    { bg: 'cover', title: 'OPERATION GREEN VALLEY', text: '12 missions. Rescue Dada Hakim. Destroy the serum. End the Black Fang forever.' },
  ],
  chapter1: [
    { bg: 'jungle', who: 'nadia', name: 'NADIA', text: 'Hog Bahadur talked before they dragged him off: the convoy was a decoy. The poachers are already in the Green Valley.' },
    { bg: 'jungle', who: 'bablu', name: 'BABLU', text: 'Then we go to the Valley. Anyone who touches those nests answers to my fists.' },
  ],
  chapter2: [
    { bg: 'garage', look: 'night', text: 'With Butcher Bhola gone, Kaiser loses his supply of blood. And Kaiser strikes back where it hurts.' },
    { bg: 'garage', who: 'rakib', name: 'RAKIB', text: 'Mustafa... the garage. They are at the garage!' },
  ],
  chapter3: [
    { bg: 'fortress', text: 'A captured biker gives up the secret: the Black Fang fortress sits on the old dam. Hakim, the caged dinosaurs and the serum factory are all inside.' },
    { bg: 'fortress', who: 'mustafa', name: 'MUSTAFA', text: 'No more running. We end this at the dam.' },
  ],
  epilogue: [
    { bg: 'lab', look: 'alarm', text: 'The serum factory burns. Dr. Kaiser’s monster army will never wake.' },
    { bg: 'jungle', who: 'nadia', name: 'DADA HAKIM', text: 'You saved more than an old man, my son. You saved the Valley. The dinosaurs will remember.' },
    { bg: 'cover', title: 'MISSION ACCOMPLISHED', text: 'But deep in the ruins, one vial of Fang Serum is missing... TO BE CONTINUED.' },
  ],
};
const CHAPTER_STORY = { 1: 'chapter1', 2: 'chapter2', 3: 'chapter3' };

/* ---------- objective targets ---------- */
const OBJ_PROPS = {
  jammer: { hp: 6, label: 'JAMMER', done: 'JAMMER DOWN!' },
  tank: { hp: 6, label: 'SERUM TANK', done: 'TANK DESTROYED!' },
  lock: { hp: 5, label: 'CAGE LOCK', done: 'DINOSAUR FREED!' },
  cage: { hp: 4, label: 'CAGE', done: 'BABY FREED!' },
  hut: { hp: 5, label: 'TRAPPED VILLAGERS', done: 'VILLAGERS SAVED!' },
};

const Mission = {
  init(st) {
    G.mission = {
      st, done: 0, total: st.props.filter(p => OBJ_PROPS[p[2]]).length,
      timer: st.timer ? st.timer * 60 : 0, surv: null, car: null, failed: false, radio: null, freed: [],
    };
  },
  get m() { return G.mission; },
  targetsLeftIn(at) {
    return G.props.some(p => p.obj && !p.remove && p.x >= at - 20 && p.x <= at + W + 20);
  },
  onWaveLock(st, idx, w) {
    const m = G.mission; if (!m) return;
    const b = st.bark && st.bark[idx];
    if (b) this.say(b[0], b[1]);
    if (w.survive) {
      m.surv = { t: w.survive * 60, max: w.survive * 60, pool: w.pool || ['razor'] };
      G.banner = { title: 'HOLD THE LINE', sub: w.defend ? 'Protect the Cadillac!' : 'Survive ' + w.survive + ' seconds', t: 0, dur: 150, warn: true };
      Music.setIntensity(3);
    }
    if (w.defend) {
      m.car = { x: w.at + W / 2 - 60, y: 600, hp: w.defend, max: w.defend, flash: 0 };
      G.props.forEach(p => { if (Math.abs(p.x - m.car.x) < 240) p.x = m.car.x - 420; });
    }
  },
  // runs every frame while playing a campaign mission
  update() {
    const m = G.mission; if (!m || m.failed) return;
    if (m.radio) { m.radio.t++; if (m.radio.t > m.radio.dur) m.radio = null; }
    if (m.timer > 0) {
      m.timer--;
      if (m.timer % 60 === 0 && m.timer <= 600) Sound.play('tick');
      if (m.timer === 0) return this.fail('The serum shipment got away.');
    }
    const s = m.surv;
    if (s && s.t > 0) {
      s.t--;
      if (s.t % 60 === 0 && s.t <= 300 && s.t > 0) Sound.play('tick');
      if (s.t === 0) {
        G.queue = [];
        for (const e of G.enemies) if (!e.def.boss && e.hp > 0) { e.leaving = true; e.move = null; if (e.state === 'attack') e.setState('idle'); }
        G.banner = { title: 'WELL DONE', sub: m.car ? 'The Cadillac is safe' : 'They are retreating!', t: 0, dur: 150 };
        Sound.play('fanfare'); Music.setIntensity(1);
        if (m.car) m.car.safe = true;
      }
    }
    const car = m.car;
    if (car && !car.safe) {
      if (car.flash > 0) car.flash--;
      for (const e of G.enemies) {
        if (e.vsCar && e.state === 'attack' && e.move && e.t === (e.move.a0 || 10) && Math.abs(e.x - car.x) < 260 && Math.abs(e.y - car.y) < 90) {
          car.hp -= Math.round((e.move.dmg || 8) * DIF().dmg); car.flash = 8;
          sparks(car.x + rand(-120, 120), car.y, 90, true); Sound.play('crash');
          if (car.hp <= 0) return this.fail('They wrecked the Cadillac.');
        }
      }
    }
    for (const f of m.freed) { f.t++; f.x += f.vx; if (f.kind === 'hut') f.y += Math.sin(f.t * 0.3) * 0.4; }
    m.freed = m.freed.filter(f => f.t < 260);
  },
  // survival waves keep feeding enemies until the clock runs out
  feed(st) {
    const s = G.mission && G.mission.surv;
    if (!s || s.t <= 0) return false;
    if (G.spawnT <= 0 && G.enemies.length < (st.maxOn || 4) + (DIF().aggro > 2 ? 1 : 0)) {
      spawnEnemy(pick(s.pool));
      const e = G.enemies[G.enemies.length - 1];
      if (G.mission.car && e && !e.def.dino && Math.random() < 0.35) e.vsCar = true;
      G.spawnT = Math.max(28, 70 - (s.max - s.t) / 60);
    }
    return true;
  },
  onTarget(pr) {
    const m = G.mission; if (!m) return;
    const info = OBJ_PROPS[pr.kind];
    m.done++;
    popText(pr.x, pr.y, 260, info.done, '#7dff9a', 34);
    addScore(1500);
    G.shake = Math.max(G.shake, 10);
    if (pr.kind === 'tank') { explodeFx(pr.x, pr.y, 80, 160); Sound.play('boom'); for (let i = 0; i < 18; i++) addPart({ type: 'spark', x: pr.x + rand(-40, 40), y: pr.y, z: rand(40, 200), vx: rand(-8, 8), vz: rand(2, 12), life: 40, color: '#7dff6a' }); }
    else if (pr.kind === 'jammer') { Sound.play('break'); Sound.play('static'); for (let i = 0; i < 14; i++) addPart({ type: 'spark', x: pr.x, y: pr.y, z: 150, vx: rand(-9, 9), vz: rand(3, 13), life: 30, color: '#9fd8ff' }); }
    else Sound.play('break');
    if (pr.kind === 'cage') m.freed.push({ kind: 'cage', x: pr.x, y: pr.y, vx: 7, t: 0 });
    if (pr.kind === 'lock') { m.freed.push({ kind: 'lock', x: pr.x, y: pr.y + 10, vx: 6, t: 0 }); Sound.play('roar'); }
    if (pr.kind === 'hut') for (let i = 0; i < 3; i++) m.freed.push({ kind: 'hut', x: pr.x + i * 40, y: pr.y + 20 + i * 18, vx: -4.5 - i * 0.6, t: -i * 12, who: i });
    Sound.play('objective');
    const left = m.total - m.done;
    if (left > 0) this.say(pick(['nadia', 'rakib', 'bablu']), left === 1 ? 'One more to go!' : left + ' more to go. Keep moving!');
    else this.say('nadia', 'That is all of them! Great work!');
  },
  say(who, text) {
    const m = G.mission; if (!m) return;
    m.radio = { who, text, t: 0, dur: Math.max(170, text.length * 4 + 80) };
    Sound.play('radio');
  },
  fail(reason) {
    const m = G.mission; m.failed = true; m.reason = reason;
    G.scene = 'failed'; G.sceneT = 0; G.goSel = 0; Music.play('defeat'); Sound.play('over');
  },
};

/* ---------- campaign flow ---------- */
function campaignNew() {
  G.campaign = true;
  if (!Save.d.seenPrologue) { playStory('prologue', () => { Save.d.seenPrologue = true; Save.write(); G.startStage = 0; goSelect(); }); return; }
  G.startStage = Math.min(Save.d.mission || 0, STAGES.length - 1);
  goSelect();
}
function openBrief(i) {
  G.briefIdx = i; G.scene = 'brief'; G.sceneT = 0; G.menu = 0;
  Music.play('brief');
}
function afterClear() {
  const i = G.stageIdx;
  Save.d.mission = Math.max(Save.d.mission || 0, Math.min(i + 1, STAGES.length - 1));
  if (i >= STAGES.length - 1) Save.d.finished = true;
  Save.write();
  if (i >= STAGES.length - 1) { playStory('epilogue', () => { G.scene = 'ending'; G.sceneT = 0; Music.play('victory'); saveBest(); }); return; }
  const next = i + 1, ch = STAGES[next].chapter;
  if (ch !== STAGES[i].chapter && CHAPTER_STORY[ch]) playStory(CHAPTER_STORY[ch], () => openBrief(next));
  else openBrief(next);
}

/* ---------- cutscenes ---------- */
function playStory(id, done) {
  G.story = { panels: STORY[id], i: 0, t: 0, chars: 0, done };
  G.scene = 'story'; G.sceneT = 0;
  Music.play('story');
}
function updStory() {
  const s = G.story, p = s.panels[s.i];
  s.t++; s.chars = Math.min(p.text.length, s.chars + 1.4);
  const tap = Input.confirm() || Input.mouse.click;
  if (G.rects && Input.mouse.click) for (const R of G.rects) {
    const m = Input.mouse;
    if (R.i === 'skip' && m.x >= R.x && m.x <= R.x + R.w && m.y >= R.y && m.y <= R.y + R.h) { Sound.play('select'); return endStory(); }
  }
  if (Input.hit('back')) return endStory();
  if (tap && s.t > 10) {
    if (s.chars < p.text.length) s.chars = p.text.length;
    else { Sound.play('page'); s.i++; s.t = 0; s.chars = 0; if (s.i >= s.panels.length) endStory(); }
  }
}
function endStory() { const d = G.story.done; G.story = null; d && d(); }
function bgImage(theme) { return theme === 'cover' ? SPR.cover : SPR.bg[theme]; }
function drawKenBurns(c, theme, k, seed, look) {
  const im = bgImage(theme);
  c.fillStyle = '#050304'; c.fillRect(0, 0, W, H);
  if (!im) return;
  const z = 1.08 + k * 0.08, s = Math.max(W / im.width, H / im.height) * z;
  const w = im.width * s, h = im.height * s, dir = seed % 2 ? 1 : -1;
  const x = (W - w) / 2 + dir * (k - 0.5) * (w - W) * 0.8, y = (H - h) / 2 - (k - 0.5) * 20;
  c.drawImage(im, x, y, w, h);
  if (look) gradeLook(c, look, G.t);
}
function drawStory(c) {
  const s = G.story; if (!s) return;
  const p = s.panels[s.i], k = Math.min(1, s.t / 600);
  drawKenBurns(c, p.bg, k, s.i, p.look);
  const fade = Math.min(1, s.t / 25);
  c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H);
  // cinematic bars and a dark band for the text
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 64); c.fillRect(0, H - 64, W, 64);
  const g = c.createLinearGradient(0, H - 300, 0, H - 64); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)');
  c.fillStyle = g; c.fillRect(0, H - 300, W, 236);
  if (p.title) {
    c.save(); c.globalAlpha = fade;
    txt(c, p.title, W / 2, 300, { font: '900 64px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: goldGrad(c, 250, 300), stroke: '#120800', sw: 8 });
    c.restore();
  }
  let tx = 120;
  if (p.who) {
    c.save(); c.beginPath(); c.arc(170, H - 170, 70, 0, TAU); c.fillStyle = '#140c08'; c.fill(); c.clip();
    if (!drawPortraitSpr(c, p.who, 170, H - 170, 70)) { c.fillStyle = '#3a2614'; c.fillRect(100, H - 240, 140, 140); }
    c.restore();
    c.lineWidth = 3; c.strokeStyle = goldGrad(c, H - 240, H - 100); c.beginPath(); c.arc(170, H - 170, 70, 0, TAU); c.stroke();
    txt(c, p.name || p.who.toUpperCase(), 270, H - 214, { font: '900 22px Cinzel, serif', fill: '#f3cf6a', stroke: '#120800', sw: 4 });
    tx = 270;
  }
  wrapText(c, p.text.slice(0, Math.floor(s.chars)), tx, p.who ? H - 176 : H - 196, W - tx - 110, 34, { font: '600 24px Cinzel, serif', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.85)', sw: 4 });
  // progress dots + controls
  s.panels.forEach((_, i) => { c.fillStyle = i === s.i ? '#f3cf6a' : 'rgba(243,207,106,0.3)'; c.beginPath(); c.arc(W / 2 - (s.panels.length - 1) * 11 + i * 22, H - 32, 5, 0, TAU); c.fill(); });
  G.rects = [{ x: W - 170, y: 14, w: 150, h: 40, i: 'skip' }];
  panel(c, W - 170, 14, 150, 40, { r: 20, noInner: true, top: 'rgba(20,12,6,0.8)', bot: 'rgba(10,6,4,0.8)', border: 'rgba(212,175,55,0.6)' });
  txt(c, 'SKIP  »', W - 95, 41, { font: '700 17px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
  if (s.chars >= p.text.length && (G.t >> 4) % 2) txt(c, (TOUCH ? 'TAP' : 'ENTER') + '  ▸', W - 120, H - 96, { font: '700 18px Cinzel, serif', align: 'right', fill: '#f3dc9a' });
}
function wrapText(c, s, x, y, maxW, lh, o) {
  c.font = o.font;
  const words = s.split(' '); let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { txt(c, line, x, yy, o); line = w; yy += lh; }
    else line = t;
  }
  if (line) txt(c, line, x, yy, o);
  return yy;
}

/* ---------- mission briefing ---------- */
const OBJ_ICON = { clear: '⚔', destroy: '✸', rescue: '❤', survive: '⏱', defend: '⛨', boss: '☠', drive: '➤' };
function updBrief() {
  const i = G.briefIdx;
  if (Input.hit('back')) { Sound.play('select'); goSelect(); return; }
  let go = Input.confirm() && G.sceneT > 20;
  if (Input.mouse.click && G.rects) for (const R of G.rects) {
    const m = Input.mouse;
    if (m.x >= R.x && m.x <= R.x + R.w && m.y >= R.y && m.y <= R.y + R.h) {
      if (R.i === 'go') go = true;
      if (R.i === 'back') { Sound.play('select'); goSelect(); return; }
    }
  }
  if (go) { Sound.play('deploy'); if (G.freshRun) { G.freshRun = false; startGame(i); } else loadStage(i); }
}
function drawBrief(c) {
  const i = G.briefIdx, st = STAGES[i], k = Math.min(1, G.sceneT / 30);
  drawKenBurns(c, st.theme, (G.sceneT % 1200) / 1200, i, st.look);
  c.fillStyle = 'rgba(6,4,3,0.62)'; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, W * 0.7, 0); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = k; c.translate((1 - k) * -40, 0);
  txt(c, 'CHAPTER ' + (st.chapter + 1) + '  ·  ' + CHAPTERS[st.chapter], 70, 120, { font: '700 20px Cinzel, serif', fill: '#bfae86' });
  txt(c, 'MISSION ' + (i + 1), 70, 168, { font: '700 30px Teko, sans-serif', fill: '#f3cf6a' });
  txt(c, st.name, 70, 230, { font: '900 64px Cinzel, serif', fill: goldGrad(c, 180, 230), stroke: '#120800', sw: 7 });
  txt(c, st.sub, 72, 268, { font: '600 20px Cinzel, serif', fill: '#efe3c8' });
  wrapText(c, st.brief || '', 72, 330, 640, 32, { font: '600 21px Cinzel, serif', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.6)', sw: 3 });
  // objectives card
  panel(c, 70, 470, 660, st.timer ? 150 : 118, { r: 14 });
  txt(c, 'OBJECTIVE', 98, 506, { font: '900 16px Cinzel, serif', fill: '#bfae86' });
  txt(c, (OBJ_ICON[st.obj.type] || '◆') + '  ' + st.obj.text, 98, 548, { font: '700 23px Cinzel, serif', fill: '#f3dc9a' });
  txt(c, 'Difficulty: ' + DIF().name + '   ·   Lives: ' + (Save.d.premium ? 5 : 3), 98, 576, { font: '600 16px Cinzel, serif', fill: '#bfae86' });
  if (st.timer) txt(c, '⏱  Time limit ' + Math.floor(st.timer / 60) + ':' + String(st.timer % 60).padStart(2, '0'), 98, 604, { font: '700 18px Cinzel, serif', fill: '#ff9a7a' });
  c.restore();
  // hero + buttons
  const h = HEROES[G.selIdx];
  if (spritesReady(h.id + '_a')) drawSprite(c, h.id + '_a', 0, W - 300, 610, -1, spriteScale(h.id) * 1.25);
  G.rects = [{ x: W - 400, y: H - 132, w: 340, h: 82, i: 'go' }, { x: 30, y: 22, w: 140, h: 44, i: 'back' }];
  const pulse = 1 + Math.sin(G.t * 0.12) * 0.02;
  c.save(); c.translate(W - 230, H - 91); c.scale(pulse, pulse);
  bigButton(c, -170, -41, 340, 82, 'DEPLOY  ▶');
  c.restore();
  panel(c, 30, 22, 140, 44, { r: 22, noInner: true, top: 'rgba(20,12,6,0.85)', bot: 'rgba(10,6,4,0.85)', border: 'rgba(212,175,55,0.6)' });
  txt(c, '◀  BACK', 100, 51, { font: '700 17px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
}
// PUBG-style primary button: bright yellow, dark bold text
function bigButton(c, x, y, w, h, label, o = {}) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.dim ? '#7a6a3a' : '#ffe680'); g.addColorStop(0.5, o.dim ? '#5a4a2a' : '#f5c518'); g.addColorStop(1, o.dim ? '#3a2e1a' : '#d79a00');
  c.save();
  c.shadowColor = 'rgba(245,197,24,0.45)'; c.shadowBlur = o.dim ? 0 : 24;
  c.fillStyle = g; c.beginPath(); c.moveTo(x + 16, y); c.lineTo(x + w, y); c.lineTo(x + w - 16, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.stroke();
  txt(c, label, x + w / 2, y + h / 2 + (o.size || 30) * 0.36, { font: `900 ${o.size || 30}px Cinzel, serif`, align: 'center', fill: '#1a1004' });
}

/* ---------- mission failed ---------- */
function updFailed() {
  updateParticles();
  const ch = menuInput(2, 'goSel');
  if (ch === 0) { G.score = 0; G.lives = Save.d.premium ? 5 : 3; loadStage(G.stageIdx); }
  else if (ch === 1) toTitle();
}
function drawFailed(c) {
  const k = G.sceneT;
  c.fillStyle = `rgba(20,0,0,${Math.min(0.8, k / 30)})`; c.fillRect(0, 0, W, H);
  txt(c, 'MISSION FAILED', W / 2, 250, { font: '900 78px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: '#d8321f', stroke: '#120000', sw: 9 });
  txt(c, (G.mission && G.mission.reason) || '', W / 2, 302, { font: '700 24px Cinzel, serif', align: 'center', fill: '#efe3c8' });
  G.rects = [];
  ['RETRY MISSION', 'QUIT TO TITLE'].forEach((l, i) => {
    const y = 400 + i * 70, w = 380, x = W / 2 - w / 2, sel = G.goSel === i;
    G.rects.push({ x, y, w, h: 56, i });
    if (i === 0) bigButton(c, x, y, w, 56, l, { size: 24, dim: !sel });
    else { if (sel) panel(c, x, y, w, 56, { r: 28 }); txt(c, l, W / 2, y + 37, { font: '900 22px Cinzel, serif', align: 'center', fill: sel ? '#f3cf6a' : '#d9c9a3' }); }
  });
}

/* ---------- mission select (title menu) ---------- */
function drawMissionSelect(c) {
  c.fillStyle = 'rgba(5,3,6,0.9)'; c.fillRect(0, 0, W, H);
  txt(c, 'MISSIONS', W / 2, 92, { font: '900 44px Cinzel, serif', align: 'center', fill: goldGrad(c, 60, 94), stroke: '#120800', sw: 6 });
  G.rects = [];
  const unlocked = Save.d.premium ? STAGES.length - 1 : (Save.d.mission || 0);
  const cols = 4, cw = (W - 120 - (cols - 1) * 16) / cols, chh = 150;
  STAGES.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols), x = 60 + col * (cw + 16), y = 130 + row * (chh + 26), sel = G.stageSel === i, lock = i > unlocked;
    G.rects.push({ x, y, w: cw, h: chh, i });
    c.save(); rrect(c, x, y, cw, chh, 12); c.clip();
    const im = bgImage(s.theme);
    if (im) { const sc = chh / im.height * 1.1; c.drawImage(im, (i * 137) % Math.max(1, im.width - cw / sc), 0, cw / sc, chh / sc, x, y, cw, chh); }
    if (s.look) { c.translate(x, y); c.scale(cw / W, chh / H); gradeLook(c, s.look, G.t); }
    c.restore();
    c.fillStyle = lock ? 'rgba(0,0,0,0.75)' : sel ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.45)'; rrect(c, x, y, cw, chh, 12); c.fill();
    c.lineWidth = sel ? 3 : 1.4; c.strokeStyle = sel ? goldGrad(c, y, y + chh) : 'rgba(212,175,55,0.4)'; c.stroke();
    txt(c, (i + 1) + '', x + 14, y + 34, { font: '700 30px Teko, sans-serif', fill: '#f3cf6a', stroke: '#120800', sw: 4 });
    txt(c, OBJ_ICON[s.obj.type] || '', x + cw - 16, y + 32, { font: '700 22px serif', align: 'right', fill: '#f3dc9a' });
    txt(c, lock ? '🔒  LOCKED' : s.name, x + cw / 2, y + chh - 18, { font: `900 ${s.name.length > 16 ? 14 : 16}px Cinzel, serif`, align: 'center', fill: lock ? '#8a7a5c' : sel ? '#f3cf6a' : '#e8dcc0', stroke: '#120800', sw: 4 });
  });
  txt(c, Save.d.premium ? 'Royal Pass: every mission unlocked' : 'Finish a mission to unlock the next  ·  Royal Pass unlocks all', W / 2, H - 40, { font: '600 16px Cinzel, serif', align: 'center', fill: '#bfae86' });
}

/* ---------- in-mission HUD: objective tracker, timers, radio ---------- */
function drawMissionHUD(c) {
  const m = G.mission; if (!m || G.arena) return;
  const st = m.st, cx = W / 2;
  let label = st.obj.text;
  if (m.total) label += `   ${m.done}/${m.total}`;
  c.font = '700 17px Cinzel, serif';
  const w = Math.min(W - 760, c.measureText(label).width + 70);
  panel(c, cx - w / 2, 46, w, 38, { r: 19, noInner: true, top: 'rgba(16,10,6,0.82)', bot: 'rgba(8,5,3,0.82)', border: 'rgba(212,175,55,0.55)' });
  txt(c, (OBJ_ICON[st.obj.type] || '◆') + '  ' + label, cx, 71, { font: '700 17px Cinzel, serif', align: 'center', fill: m.total && m.done >= m.total ? '#7dff9a' : '#f3dc9a' });
  let y = 96;
  const clock = (f, col, title) => {
    const s = Math.ceil(f / 60), str = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const urgent = s <= 10 && (G.t >> 3) % 2;
    txt(c, title + '  ' + str, cx, y + 26, { font: '600 34px Teko, sans-serif', align: 'center', fill: urgent ? '#ff5a3a' : col, stroke: '#120800', sw: 5 });
    y += 38;
  };
  if (m.timer > 0) clock(m.timer, '#ffb38a', '⏱');
  if (m.surv && m.surv.t > 0) clock(m.surv.t, '#f3dc9a', 'HOLD');
  if (m.car && !m.car.safe) {
    txt(c, 'CADILLAC', cx - 170, y + 22, { font: '700 15px Cinzel, serif', align: 'right', fill: '#f3dc9a' });
    bar(c, cx - 160, y + 8, 320, 16, Math.max(0, m.car.hp / m.car.max), Math.max(0, m.car.hp / m.car.max), ['#ffd0c0', '#e8402a', '#8a1000']);
  }
  // marker for an objective ahead, off-screen to the right
  const next = G.props.find(p => p.obj && !p.remove && p.x > G.camX + W - 40);
  if (next && G.camLock === null) {
    const d = Math.round((next.x - G.camX - W) / 10);
    const bx = W - 70 + Math.sin(G.t * 0.15) * 6;
    txt(c, '➤', bx, 420, { font: '900 44px serif', align: 'center', fill: '#7dff9a', stroke: '#0a2a10', sw: 5 });
    txt(c, OBJ_PROPS[next.kind].label + '  ' + d + 'm', bx - 30, 460, { font: '700 15px Cinzel, serif', align: 'right', fill: '#7dff9a', stroke: '#000', sw: 4 });
  }
  drawRadio(c);
}
function drawRadio(c) {
  const m = G.mission, r = m && m.radio; if (!r) return;
  const a = Math.min(1, r.t / 10, (r.dur - r.t) / 15);
  c.save(); c.globalAlpha = Math.max(0, a);
  const x = W / 2 - 330, y = 150 + (1 - Math.min(1, r.t / 10)) * -20, w = 660, h = 84;
  panel(c, x, y, w, h, { r: 14, top: 'rgba(14,20,14,0.9)', bot: 'rgba(6,10,6,0.9)', border: 'rgba(125,255,154,0.55)' });
  c.save(); c.beginPath(); c.arc(x + 46, y + h / 2, 32, 0, TAU); c.fillStyle = '#0a140a'; c.fill(); c.clip();
  drawPortraitSpr(c, r.who === 'captain' ? 'razor' : r.who, x + 46, y + h / 2, 32);
  c.restore();
  c.strokeStyle = '#7dff9a'; c.lineWidth = 2; c.beginPath(); c.arc(x + 46, y + h / 2, 32, 0, TAU); c.stroke();
  const names = { captain: 'FANG CAPTAIN', butcher: 'BUTCHER BHOLA', saju: 'SHADOW SAJU', morgol: 'MORGOL', kaiser: 'DR. KAISER' };
  const enemy = !!names[r.who];
  txt(c, (names[r.who] || r.who.toUpperCase()) + (enemy ? '' : '  ·  RADIO'), x + 92, y + 30, { font: '900 15px Cinzel, serif', fill: enemy ? '#ff7a5a' : '#7dff9a' });
  const shown = r.text.slice(0, Math.floor(r.t * 1.6));
  wrapText(c, shown, x + 92, y + 58, w - 110, 22, { font: '600 17px Cinzel, serif', fill: '#efe3c8' });
  // radio waveform
  c.strokeStyle = 'rgba(125,255,154,0.6)'; c.lineWidth = 1.5; c.beginPath();
  for (let i = 0; i < 40; i++) { const yy = y + 18 + Math.sin(G.t * 0.6 + i) * (shown.length < r.text.length ? 5 : 1); i ? c.lineTo(x + w - 120 + i * 2.6, yy) : c.moveTo(x + w - 120, yy); }
  c.stroke();
  c.restore();
}

/* ---------- drawing objective targets, freed creatures and the car ---------- */
function drawObjProp(c, pr, x, y) {
  const fl = pr.flash > 0, info = OBJ_PROPS[pr.kind], dmg = 1 - pr.hp / info.hp, t = G.t;
  const sh = fl ? rand(-3, 3) : 0;
  c.save(); c.translate(x + sh, y); c.scale(1.3, 1.3);
  switch (pr.kind) {
    case 'jammer': {
      c.strokeStyle = '#2a2a30'; c.lineWidth = 6;
      line(c, -40, 0, -10, -90); line(c, 40, 0, 10, -90); line(c, 0, 0, 0, -90);
      c.fillStyle = fl ? '#fff' : '#3a4048'; c.fillRect(-46, -170, 92, 84);
      c.fillStyle = '#1a1e24'; c.fillRect(-38, -160, 76, 40);
      for (let i = 0; i < 6; i++) { c.fillStyle = (t >> 2) % 6 === i ? '#7dff9a' : '#2a4a30'; c.fillRect(-32 + i * 11, -112, 8, 14); }
      c.strokeStyle = '#8a929c'; c.lineWidth = 3; line(c, 0, -170, 0, -260);
      c.fillStyle = (t >> 4) % 2 ? '#ff2a1a' : '#5a0a06'; c.beginPath(); c.arc(0, -264, 7, 0, TAU); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter'; if ((t >> 4) % 2) glow(c, 0, -264, 40, 'rgba(255,60,30,0.6)');
      const r = (t * 3) % 120; c.strokeStyle = `rgba(160,220,255,${0.5 - r / 240})`; c.lineWidth = 2; c.beginPath(); c.arc(0, -264, r, -2.4, -0.7); c.stroke(); c.restore();
      break;
    }
    case 'tank': {
      c.fillStyle = '#2a3038'; c.fillRect(-52, -30, 104, 30); c.fillRect(-52, -260, 104, 26);
      const g = c.createLinearGradient(-46, 0, 46, 0); g.addColorStop(0, 'rgba(40,255,120,0.35)'); g.addColorStop(0.5, 'rgba(140,255,170,0.75)'); g.addColorStop(1, 'rgba(30,200,90,0.35)');
      c.fillStyle = fl ? '#fff' : g; c.fillRect(-46, -234, 92, 204);
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -130, 120, 'rgba(60,255,120,0.25)');
      for (let i = 0; i < 7; i++) { const by = -40 - ((t * (1 + i * 0.3) + i * 40) % 190); c.fillStyle = 'rgba(220,255,230,0.7)'; c.beginPath(); c.arc(-30 + i * 10, by, 3 + (i % 3), 0, TAU); c.fill(); }
      c.restore();
      if (dmg > 0) { c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; for (let i = 0; i < dmg * 8; i++) { const a = i * 1.7; line(c, -10 + Math.cos(a) * 8, -140 + Math.sin(a) * 30, -10 + Math.cos(a) * 46, -140 + Math.sin(a) * 90); } }
      c.strokeStyle = '#8a929c'; c.lineWidth = 3; c.strokeRect(-46, -234, 92, 204);
      txt(c, '☣', 0, -120, { font: '700 40px serif', align: 'center', fill: 'rgba(10,40,20,0.75)' });
      break;
    }
    case 'lock': case 'cage': {
      const big = pr.kind === 'lock', w = big ? 230 : 130, h = big ? 230 : 120;
      if (big && spritesReady('trike')) { c.save(); c.globalAlpha = 0.95; drawSprite(c, 'trike', 4, 10, -6, -1, 0.75); c.restore(); }
      if (!big && spritesReady('raptor')) drawSprite(c, 'raptor', 0, 0, -8, -1, 0.42);
      c.strokeStyle = fl ? '#fff' : big ? '#4a4e56' : '#8a6a3a'; c.lineWidth = big ? 7 : 6;
      for (let i = 0; i <= (big ? 9 : 6); i++) { const bx = -w / 2 + i * w / (big ? 9 : 6); line(c, bx, 0, bx, -h); }
      c.lineWidth = big ? 10 : 8; line(c, -w / 2 - 4, -h, w / 2 + 4, -h); line(c, -w / 2 - 4, 0, w / 2 + 4, 0);
      if (!big) { c.strokeStyle = '#5a4020'; c.lineWidth = 4; line(c, -w / 2, -h, w / 2, -h - 18); }
      const ly = -h * 0.5;
      c.fillStyle = fl ? '#fff' : '#d4a017'; rrect(c, w / 2 - 34, ly - 6, 40, 40, 6); c.fill();
      c.strokeStyle = '#6a4a06'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2 - 14, ly - 6, 12, Math.PI, 0); c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, w / 2 - 14, ly + 12, 44, `rgba(255,210,80,${0.3 + 0.2 * Math.sin(t * 0.2)})`); c.restore();
      break;
    }
    case 'hut': {
      c.fillStyle = fl ? '#fff' : '#5a3a1e'; c.fillRect(-60, -170, 120, 170);
      c.fillStyle = '#3a2410'; for (let i = 0; i < 6; i++) c.fillRect(-60 + i * 21, -170, 3, 170);
      c.strokeStyle = '#2a1a0a'; c.lineWidth = 8; line(c, -60, -120, 60, -40); line(c, -60, -40, 60, -120);
      if ((t >> 5) % 2 === 0) {
        panel(c, 34, -250, 110, 46, { r: 14, noInner: true, top: 'rgba(255,250,235,0.95)', bot: 'rgba(240,230,210,0.95)', border: '#2a1a0a' });
        txt(c, 'HELP!', 89, -219, { font: '900 22px Cinzel, serif', align: 'center', fill: '#a8100c' });
      }
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) glow(c, -50 + i * 34 + Math.sin(t * 0.3 + i) * 6, -186 - Math.abs(Math.sin(t * 0.2 + i)) * 30, 34, 'rgba(255,140,40,0.55)');
      c.restore();
      break;
    }
  }
  // health pips + a bouncing marker so targets are obvious
  if (!pr.remove) {
    const top = { jammer: -300, tank: -290, lock: -270, cage: -170, hut: -280 }[pr.kind], by = top + Math.sin(t * 0.12) * 6;
    txt(c, '▼', 0, by, { font: '900 30px serif', align: 'center', fill: '#7dff9a', stroke: '#0a2a10', sw: 4 });
    for (let i = 0; i < info.hp; i++) { c.fillStyle = i < pr.hp ? '#7dff9a' : 'rgba(125,255,154,0.2)'; c.fillRect(-info.hp * 7 + i * 14, by + 10, 10, 6); }
  }
  c.restore();
}
function drawMissionWorld(c) {
  const m = G.mission; if (!m) return;
  if (m.car) {
    const x = m.car.x - G.camX;
    if (!drawCarSpr(c, x, m.car.y, m.car.hp < m.car.max * 0.4, m.car.flash > 0 && m.car.flash % 2)) drawCar(c, x, m.car.y, 1.55, { t: 0, col: '#c0262e' });
  }
  for (const f of m.freed) {
    if (f.t < 0) continue;
    const x = f.x - G.camX, a = Math.min(1, (260 - f.t) / 40);
    c.save(); c.globalAlpha = a;
    if (f.kind === 'cage' && has('raptor_r')) { const p = f.t * 0.45, i = Math.floor(p) % 8; drawSprite(c, 'raptor_r', i, x, f.y, 1, 0.42); }
    else if (f.kind === 'lock' && has('trike_w')) { const i = Math.floor(f.t * 0.3) % 8; drawSprite(c, 'trike_w', i, x, f.y, 1, 0.75 * ((window.ATLAS_NORM || {}).trike_w || 1)); }
    else if (f.kind === 'hut') {
      const key = ['nadia_c', 'rakib_c', 'bablu_c'][f.who % 3];
      if (has(key)) {
        c.filter = 'sepia(0.7) saturate(0.6) brightness(0.85)';
        const n = window.ATLAS[key].length, i = Math.floor(f.t * 0.35) % n;
        drawSprite(c, key, i, x, f.y, -1, spriteScale(key.replace('_c', '')) * 0.78 * ((window.ATLAS_NORM || {})[key] || 1));
        c.filter = 'none';
      }
      if (f.t < 60) txt(c, 'THANK YOU!', x, f.y - 250, { font: '900 18px Cinzel, serif', align: 'center', fill: '#fff4d6', stroke: '#120800', sw: 4 });
    }
    c.restore();
  }
}
