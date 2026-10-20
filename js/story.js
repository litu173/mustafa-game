'use strict';
/* =========================================================
   MUSTAFA — the campaign: story cutscenes, mission briefings,
   objectives (destroy / rescue / survive / defend / timer),
   radio chatter, mission fail and the mission select.
   ========================================================= */

/* ---------- story text ({CAPTIVE}, {ALLY}, {HERO} are filled in for the hero you play) ---------- */
const STORY = {
  prologue: [
    { bg: 'sea', text: '2002. Sixty-five million years ago a meteor of living crystal fell on the Green Valley. Its heart, the CHRONO-FANG, still beats beneath the jungle.' },
    { bg: 'jungle', text: 'Its energy brought the dinosaurs back. In the hidden valley they nest in peace, guarded by the people of Shobuj Village and their elder, Dada Hakim.' },
    { bg: 'lab', who: 'kaiser', name: 'DR. KAISER', text: 'The Chrono-Fang can tear open time itself. Dinosaur blood, cyber-implants and that crystal... and I will rule every age that ever was.' },
    { bg: 'village', text: 'Last night the Black Fang burned Shobuj Village and kidnapped Dada Hakim. Only he knows the way to the crystal’s heart.' },
    { bg: 'garage', who: 'mustafa', name: 'MUSTAFA', text: 'They took the old man. Robin, fire up the Cadillac. Nova, Roy... we ride at dawn.' },
    { bg: 'cover', title: 'OPERATION REBORN', text: '14 missions in 5 chapters. Rescue Dada Hakim. Stop Dr. Kaiser before he breaks time itself.' },
  ],
  chapter1: [
    { bg: 'jungle', who: 'nadia', text: 'Hog Bahadur talked: the convoy was a decoy. Kaiser’s diggers are already in the Green Valley, hunting for the Chrono-Fang.' },
    { bg: 'jungle', who: 'bablu', text: 'Then we go to the Valley. Anyone who touches those nests answers to my fists.' },
  ],
  chapter2: [
    { bg: 'garage', look: 'night', text: 'With Butcher Bhola gone, Kaiser loses his blood supply. So he strikes where it hurts: our home.' },
    { bg: 'garage', who: 'rakib', text: 'Mustafa... the garage. They are at the garage!' },
  ],
  abduction: [
    { bg: 'garage', look: 'night', text: 'Saju falls in the storm... but it was only a distraction. When the lightning fades, {CAPTIVE} is gone.' },
    { bg: 'lab', look: 'alarm', who: 'kaiser', name: 'DR. KAISER', text: 'Your friend {CAPTIVE} will be the first of my cyborg soldiers, Mustafa. Come and watch, if you dare.' },
    { bg: 'garage', look: 'night', who: 'mustafa', name: 'MUSTAFA', text: 'Hold on, {CAPTIVE}. Nobody gets left behind. Nobody.' },
  ],
  chapter3: [
    { bg: 'fortress', text: 'A captured biker talks: {CAPTIVE} is held in Prison Block Nine, deep beneath the Black Fang dam fortress.' },
    { bg: 'fortress', who: '{ALLY}', text: 'Searchlights, cyber-raptors, a whole army. Sounds like a good night.' },
  ],
  chapter4: [
    { bg: 'lab', look: 'alarm', who: '{CAPTIVE}', text: 'Kaiser isn’t building an army, Mustafa... he’s bringing one. From sixty-five million years ago. His machine is almost ready.' },
    { bg: 'jungle', look: 'rift', text: 'Above the Green Valley, the sky begins to split.' },
  ],
  epilogue: [
    { bg: 'lab', look: 'rift', text: 'The rift collapses with a sound like thunder running backwards. Dr. Kaiser’s army of every age is gone.' },
    { bg: 'jungle', who: 'hakim', name: 'DADA HAKIM', text: 'You saved more than an old man, my son. You saved time itself. The valley will remember Team Reborn.' },
    { bg: 'cover', title: 'MISSION ACCOMPLISHED', text: 'But in the ashes of the lab, one shard of the Chrono-Fang is missing... TO BE CONTINUED.' },
  ],
};
const CHAPTER_STORY = { 1: 'chapter1', 2: 'chapter2', 3: 'chapter3', 4: 'chapter4' };

// who gets kidnapped, and who is on the radio, depends on the hero you play
function playerHeroId() { return (HEROES[G.selIdx] || HEROES[0]).id; }
function captiveId() { return playerHeroId() === 'nadia' ? 'rakib' : 'nadia'; }
function allyId() { return ['bablu', 'rakib', 'nadia', 'mustafa'].find(id => id !== playerHeroId() && id !== captiveId()); }
function heroName(id) { const h = HEROES.find(x => x.id === id); return h ? h.name : String(id).toUpperCase(); }
function fmt(s) { return String(s || '').replace(/\{CAPTIVE\}/g, heroName(captiveId())).replace(/\{ALLY\}/g, heroName(allyId())).replace(/\{HERO\}/g, heroName(playerHeroId())); }
// resolve a speaker: placeholders, never yourself, never the kidnapped friend while they are gone
function resolveWho(who) {
  if (who === '{ALLY}') return allyId();
  if (who === '{CAPTIVE}') return captiveId();
  const missing = G.stageIdx >= 8 && G.stageIdx <= 10 && !G.story;   // between the kidnapping and the rescue
  if (who === playerHeroId() || (missing && who === captiveId())) return allyId();
  return who;
}
const SPEAKER = { captain: 'FANG CAPTAIN', butcher: 'BUTCHER BHOLA', saju: 'SHADOW SAJU', morgol: 'MORGOL', kaiser: 'DR. KAISER', hakim: 'DADA HAKIM' };
function speakerName(id) { return SPEAKER[id] || heroName(id); }

/* ---------- objective targets ---------- */
const OBJ_PROPS = {
  jammer: { hp: 6, label: 'JAMMER', done: 'JAMMER DOWN!' },
  tank: { hp: 6, label: 'SERUM TANK', done: 'TANK DESTROYED!' },
  lock: { hp: 5, label: 'CAGE LOCK', done: 'DINOSAUR FREED!' },
  cage: { hp: 4, label: 'CAGE', done: 'BABY FREED!' },
  hut: { hp: 5, label: 'TRAPPED VILLAGERS', done: 'VILLAGERS SAVED!' },
  core: { hp: 6, label: 'POWER CORE', done: 'CORE OFFLINE!' },
  capsule: { hp: 8, label: '{CAPTIVE}’S CAPSULE', done: '{CAPTIVE} IS FREE!' },
  pylon: { hp: 7, label: 'RIFT PYLON', done: 'PYLON DOWN!' },
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
      G.props.forEach(p => { if (Math.abs(p.x - m.car.x) < 330) p.x = m.car.x - 520; });
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
        const left = G.enemies.filter(e => e.hp > 0 && !e.docile).length;
        G.banner = left ? { title: 'FINISH THEM!', sub: m.car ? 'Help is here. Take the rest down!' : 'No more are coming. Take them down!', t: 0, dur: 150, warn: true }
                        : { title: 'WELL DONE', sub: m.car ? 'The Cadillac is safe' : 'You held the line!', t: 0, dur: 150 };
        Sound.play(left ? 'alarm' : 'fanfare'); Music.setIntensity(left ? 3 : 1);
        for (const e of G.enemies) e.vsCar = false;
        if (m.car) m.car.safe = true;
      }
    }
    const car = m.car;
    if (car && !car.safe) {
      if (car.flash > 0) car.flash--;
      for (const e of G.enemies) {
        if (e.vsCar && e.state === 'attack' && e.move && e.t === (e.move.a0 || 10) && Math.abs(e.x - car.x) < 360 && Math.abs(e.y - car.y) < 90) {
          car.hp -= Math.round((e.move.dmg || 8) * DIF().dmg); car.flash = 8;
          sparks(car.x + rand(-200, 200), car.y, 90, true); Sound.play('crash');
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
    popText(pr.x, pr.y, 260, fmt(info.done), '#7dff9a', 34);
    addScore(1500);
    G.shake = Math.max(G.shake, 10);
    if (pr.kind === 'tank') { explodeFx(pr.x, pr.y, 80, 160); Sound.play('boom'); for (let i = 0; i < 18; i++) addPart({ type: 'spark', x: pr.x + rand(-40, 40), y: pr.y, z: rand(40, 200), vx: rand(-8, 8), vz: rand(2, 12), life: 40, size: 4, color: '#7dff6a' }); }
    else if (pr.kind === 'jammer') { Sound.play('break'); Sound.play('static'); for (let i = 0; i < 14; i++) addPart({ type: 'spark', x: pr.x, y: pr.y, z: 150, vx: rand(-9, 9), vz: rand(3, 13), life: 30, size: 3, color: '#9fd8ff' }); }
    else Sound.play('break');
    if (pr.kind === 'cage') m.freed.push({ kind: 'cage', x: pr.x, y: pr.y, vx: 7, t: 0 });
    if (pr.kind === 'lock') { m.freed.push({ kind: 'lock', x: pr.x, y: pr.y + 10, vx: 6, t: 0 }); Sound.play('roar'); }
    if (pr.kind === 'capsule') { m.freed.push({ kind: 'captive', id: captiveId(), x: pr.x, y: pr.y + 10, vx: -3, t: 0 }); Sound.play('fanfare'); this.say(captiveId(), 'Took you long enough! Now let me at them!'); return; }
    if (pr.kind === 'pylon') { explodeFx(pr.x, pr.y, 120, 180); Sound.play('boom'); G.flash = 10; G.flashCol = '#c86aff'; }
    if (pr.kind === 'core') { explodeFx(pr.x, pr.y, 100, 140); Sound.play('boom'); }
    if (pr.kind === 'hut') for (let i = 0; i < 3; i++) m.freed.push({ kind: 'hut', x: pr.x + i * 40, y: pr.y + 20 + i * 18, vx: -4.5 - i * 0.6, t: -i * 12, who: i });
    Sound.play('objective');
    const left = m.total - m.done;
    if (left > 0) this.say(pick(['nadia', 'rakib', 'bablu']), left === 1 ? 'One more to go!' : left + ' more to go. Keep moving!');
    else this.say('nadia', 'That is all of them! Great work!');
  },
  say(who, text) {
    const m = G.mission; if (!m) return;
    who = resolveWho(who); text = fmt(text);
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
  const go = () => { if (ch !== STAGES[i].chapter && CHAPTER_STORY[ch]) playStory(CHAPTER_STORY[ch], () => openBrief(next)); else openBrief(next); };
  if (STAGES[i].after) playStory(STAGES[i].after, go); else go();
}

/* ---------- cutscenes ---------- */
// Every story beat has its own painted scene (assets/story/<story>_<n>.webp). They load on
// demand, so they never slow the first load; until one arrives the mission backdrop shows.
const STORY_ART = {};
function loadStoryArt(id) {
  (STORY[id] || []).forEach((p, i) => {
    if (p.bg === 'cover') return;
    const key = id + '_' + (i + 1);
    if (STORY_ART[key]) return;
    const im = new Image(); STORY_ART[key] = im;
    im.onload = () => { im.ready = true; };
    im.src = 'assets/story/' + key + '.webp?v=1';
  });
}
function playStory(id, done) {
  loadStoryArt(id);
  G.story = { id, panels: STORY[id], i: 0, t: 0, chars: 0, done };
  G.scene = 'story'; G.sceneT = 0;
  Music.play('story');
}
function updStory() {
  const s = G.story, p = s.panels[s.i];
  s.t++; s.chars = Math.min(fmt(p.text).length, s.chars + 1.4);
  const tap = Input.confirm() || Input.mouse.click;
  if (G.rects && Input.mouse.click) for (const R of G.rects) {
    const m = Input.mouse;
    if (R.i === 'skip' && m.x >= R.x && m.x <= R.x + R.w && m.y >= R.y && m.y <= R.y + R.h) { Sound.play('select'); return endStory(); }
  }
  if (Input.hit('back')) return endStory();
  if (tap && s.t > 10) {
    if (s.chars < fmt(p.text).length) s.chars = fmt(p.text).length;
    else { Sound.play('page'); s.i++; s.t = 0; s.chars = 0; if (s.i >= s.panels.length) endStory(); }
  }
}
function endStory() { const d = G.story.done; G.story = null; d && d(); }
function bgImage(theme) { return theme === 'cover' ? SPR.cover : SPR.bg[theme]; }
function drawKenBurns(c, theme, k, seed, look, art) {
  const im = (art && art.ready) ? art : bgImage(theme);
  if (im === art) look = null;   // the paintings are already lit for their moment
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
  drawKenBurns(c, p.bg, k, s.i, p.look, STORY_ART[s.id + '_' + (s.i + 1)]);
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
  const who = p.who && resolveWho(p.who);
  if (who) {
    c.save(); c.beginPath(); c.arc(170, H - 170, 70, 0, TAU); c.fillStyle = '#140c08'; c.fill(); c.clip();
    if (!drawPortraitSpr(c, who, 170, H - 170, 70)) { c.fillStyle = '#3a2614'; c.fillRect(100, H - 240, 140, 140); }
    c.restore();
    c.lineWidth = 3; c.strokeStyle = goldGrad(c, H - 240, H - 100); c.beginPath(); c.arc(170, H - 170, 70, 0, TAU); c.stroke();
    txt(c, p.name || speakerName(who), 270, H - 214, { font: '900 22px Cinzel, serif', fill: '#f3cf6a', stroke: '#120800', sw: 4 });
    tx = 270;
  }
  wrapText(c, fmt(p.text).slice(0, Math.floor(s.chars)), tx, who ? H - 176 : H - 196, W - tx - 110, 34, { font: '600 24px Cinzel, serif', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.85)', sw: 4 });
  // progress dots + controls
  s.panels.forEach((_, i) => { c.fillStyle = i === s.i ? '#f3cf6a' : 'rgba(243,207,106,0.3)'; c.beginPath(); c.arc(W / 2 - (s.panels.length - 1) * 11 + i * 22, H - 32, 5, 0, TAU); c.fill(); });
  G.rects = [{ x: W - 170, y: 14, w: 150, h: 40, i: 'skip' }];
  panel(c, W - 170, 14, 150, 40, { r: 20, noInner: true, top: 'rgba(20,12,6,0.8)', bot: 'rgba(10,6,4,0.8)', border: 'rgba(212,175,55,0.6)' });
  txt(c, 'SKIP  »', W - 95, 41, { font: '700 17px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
  if (s.chars >= fmt(p.text).length && (G.t >> 4) % 2) txt(c, (TOUCH ? 'TAP' : 'ENTER') + '  ▸', W - 120, H - 96, { font: '700 18px Cinzel, serif', align: 'right', fill: '#f3dc9a' });
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
  txt(c, fmt(st.sub), 72, 268, { font: '600 20px Cinzel, serif', fill: '#efe3c8' });
  wrapText(c, fmt(st.brief), 72, 330, 640, 32, { font: '600 21px Cinzel, serif', fill: '#fff4d6', stroke: 'rgba(0,0,0,0.6)', sw: 3 });
  // objectives card
  panel(c, 70, 470, 660, st.timer ? 150 : 118, { r: 14 });
  txt(c, 'OBJECTIVE', 98, 506, { font: '900 16px Cinzel, serif', fill: '#bfae86' });
  txt(c, (OBJ_ICON[st.obj.type] || '◆') + '  ' + fmt(st.obj.text), 98, 548, { font: '700 23px Cinzel, serif', fill: '#f3dc9a' });
  txt(c, 'Difficulty: ' + DIF().name + '   ·   Lives: ' + (Save.d.premium ? 5 : 3), 98, 576, { font: '600 16px Cinzel, serif', fill: '#bfae86' });
  if (st.timer) txt(c, '⏱  Time limit ' + Math.floor(st.timer / 60) + ':' + String(st.timer % 60).padStart(2, '0'), 98, 604, { font: '700 18px Cinzel, serif', fill: '#ff9a7a' });
  c.restore();
  // hero + buttons
  const h = HEROES[G.selIdx];
  drawHeroFigure(c, h, W - 300, 610, -1, 1.25, 'idle');
  G.rects = [{ x: W - 400, y: H - 132, w: 340, h: 82, i: 'go', big: true }, { x: 30, y: 22, w: 140, h: 44, i: 'back' }];
  const m = Input.mouse, over = !TOUCH && m.x >= W - 400 && m.x <= W - 60 && m.y >= H - 132 && m.y <= H - 50;
  G.goHover = (G.goHover || 0) + ((over ? 1 : 0) - (G.goHover || 0)) * 0.25;
  const pulse = 1 + Math.sin(G.t * 0.12) * 0.02 + G.goHover * 0.05;
  c.save(); c.translate(W - 230, H - 91 - G.goHover * 3); c.scale(pulse, pulse);
  if (G.goHover > 0.02) c.filter = `brightness(${1 + G.goHover * 0.18})`;
  bigButton(c, -170, -41, 340, 82, 'DEPLOY  ▶');
  c.restore();
  panel(c, 30, 22, 140, 44, { r: 22, noInner: true, top: 'rgba(20,12,6,0.85)', bot: 'rgba(10,6,4,0.85)', border: 'rgba(212,175,55,0.6)' });
  txt(c, '◀  BACK', 100, 51, { font: '700 17px Cinzel, serif', align: 'center', fill: '#f3dc9a' });
}
// PUBG-style primary button: bright yellow, dark bold text
// A hero drawn the same way as in the fight (the cover-faced puppet), falling back to the old sheet
function drawHeroFigure(c, h, x, y, face, scale, state) {
  if (typeof hasRig === 'function' && hasRig(h.id)) {
    const f = drawHeroFigure.cache[h.id] || (drawHeroFigure.cache[h.id] = { def: h, id: HEROES.indexOf(h), t: 0, vx: 0, z: 0 });
    if (f.state !== state) { f.state = state; f.t = 0; } f.t++;
    c.save(); c.translate(x, y); c.scale(scale, scale); drawRig(c, f, 0, 0, face, {}); c.restore();
    return true;
  }
  if (!spritesReady(h.id + '_a')) return false;
  drawSprite(c, h.id + '_a', 0, x, y, face, spriteScale(h.id) * scale);
  return true;
}
drawHeroFigure.cache = {};
// Gold action button. It is always fully lit (a dull button reads as "disabled");
// the keyboard/controller focus shows as a pulsing glow and a bright outline instead.
function bigButton(c, x, y, w, h, label, o = {}) {
  const focus = !o.dim, g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ffe680'); g.addColorStop(0.5, '#f5c518'); g.addColorStop(1, '#d79a00');
  const path = () => { c.beginPath(); c.moveTo(x + 16, y); c.lineTo(x + w, y); c.lineTo(x + w - 16, y + h); c.lineTo(x, y + h); c.closePath(); };
  c.save();
  c.shadowColor = 'rgba(245,197,24,0.55)'; c.shadowBlur = focus ? 22 + Math.sin(G.t * 0.12) * 8 : 10; c.shadowOffsetY = focus ? 0 : 3;
  c.fillStyle = g; path(); c.fill();
  c.restore();
  path(); c.strokeStyle = focus ? '#fff6d0' : 'rgba(255,255,255,0.55)'; c.lineWidth = focus ? 3 : 2; c.stroke();
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
// The grid scrolls between the title and the footer when it is taller than the screen.
function stageLayout() {
  const cols = 4, gap = 16, cw = (W - 120 - (cols - 1) * gap) / cols, chh = 150, rowH = chh + 26;
  const top = 122, bottom = H - 72, rows = Math.ceil(STAGES.length / cols);
  return { cols, gap, cw, chh, rowH, top, bottom, max: Math.max(0, rows * rowH - 26 - (bottom - top - 8)) };
}
function drawMissionSelect(c) {
  c.fillStyle = 'rgba(5,3,6,0.9)'; c.fillRect(0, 0, W, H);
  txt(c, 'MISSIONS', W / 2, 92, { font: '900 44px Cinzel, serif', align: 'center', fill: goldGrad(c, 60, 94), stroke: '#120800', sw: 6 });
  G.rects = [];
  const unlocked = Save.d.premium ? STAGES.length - 1 : (Save.d.mission || 0);
  const L = stageLayout(), { cols, cw, chh } = L, scroll = G.stageScroll || 0;
  c.save(); c.beginPath(); c.rect(0, L.top, W, L.bottom - L.top); c.clip();
  STAGES.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols), x = 60 + col * (cw + L.gap), y = L.top + 8 + row * L.rowH - scroll, sel = G.stageSel === i, lock = i > unlocked;
    if (y > L.bottom || y + chh < L.top) return;
    // only the visible part of a card is clickable
    const vy = Math.max(y, L.top), vh = Math.min(y + chh, L.bottom) - vy;
    if (vh > 20) G.rects.push({ x, y: vy, w: cw, h: vh, i });
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
  c.restore();
  // soft edges + a scroll bar so it is obvious there is more below / above
  if (L.max > 0) {
    if (scroll > 4) { const g = c.createLinearGradient(0, L.top, 0, L.top + 36); g.addColorStop(0, 'rgba(5,3,6,0.95)'); g.addColorStop(1, 'rgba(5,3,6,0)'); c.fillStyle = g; c.fillRect(0, L.top, W, 36); }
    if (scroll < L.max - 4) {
      const g = c.createLinearGradient(0, L.bottom - 44, 0, L.bottom); g.addColorStop(0, 'rgba(5,3,6,0)'); g.addColorStop(1, 'rgba(5,3,6,0.95)'); c.fillStyle = g; c.fillRect(0, L.bottom - 44, W, 44);
      txt(c, '▼', W / 2, L.bottom - 6 + Math.sin(G.t * 0.12) * 3, { font: '700 20px serif', align: 'center', fill: '#f3cf6a' });
    }
    const trackH = L.bottom - L.top - 16, viewH = L.bottom - L.top, thumbH = Math.max(40, trackH * viewH / (viewH + L.max)), ty = L.top + 8 + (trackH - thumbH) * (scroll / L.max);
    c.fillStyle = 'rgba(212,175,55,0.18)'; rrect(c, W - 30, L.top + 8, 6, trackH, 3); c.fill();
    c.fillStyle = '#d4af37'; rrect(c, W - 30, ty, 6, thumbH, 3); c.fill();
  }
  G.rects.push({ x: W - 96 - SAFE.r, y: 18, w: 70, h: 70, i: 'close' }); closeX(c, W - 61 - SAFE.r, 53);
  txt(c, Save.d.premium ? 'Royal Pass: every mission unlocked' : 'Finish a mission to unlock the next  ·  Royal Pass unlocks all', W / 2, H - 40, { font: '600 16px Cinzel, serif', align: 'center', fill: '#bfae86' });
}

/* ---------- in-mission HUD: objective tracker, timers, radio ---------- */
function drawMissionHUD(c) {
  const m = G.mission; if (!m || G.arena) return;
  const st = m.st, cx = W / 2;
  let label = fmt(st.obj.text);
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
    txt(c, fmt(OBJ_PROPS[next.kind].label) + '  ' + d + 'm', bx - 30, 460, { font: '700 15px Cinzel, serif', align: 'right', fill: '#7dff9a', stroke: '#000', sw: 4 });
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
  drawPortraitSpr(c, r.who, x + 46, y + h / 2, 32);
  c.restore();
  c.strokeStyle = '#7dff9a'; c.lineWidth = 2; c.beginPath(); c.arc(x + 46, y + h / 2, 32, 0, TAU); c.stroke();
  const enemy = !!SPEAKER[r.who] && r.who !== 'hakim';
  txt(c, speakerName(r.who) + (enemy ? '' : '  ·  RADIO'), x + 92, y + 30, { font: '900 15px Cinzel, serif', fill: enemy ? '#ff7a5a' : '#7dff9a' });
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
    case 'core': {
      c.fillStyle = '#20262e'; c.fillRect(-56, -40, 112, 40); c.fillRect(-46, -230, 92, 22);
      c.strokeStyle = '#8a929c'; c.lineWidth = 6; line(c, -40, -40, -40, -210); line(c, 40, -40, 40, -210);
      c.save(); c.globalCompositeOperation = 'lighter';
      const pr2 = 40 + Math.sin(t * 0.2) * 5 - dmg * 12;
      const og = c.createRadialGradient(0, -125, 4, 0, -125, pr2); og.addColorStop(0, fl ? '#fff' : 'rgba(220,255,255,1)'); og.addColorStop(0.4, 'rgba(60,220,255,0.9)'); og.addColorStop(1, 'rgba(20,120,255,0)');
      c.fillStyle = og; c.beginPath(); c.arc(0, -125, pr2, 0, TAU); c.fill();
      for (let i = 0; i < 3; i++) { const a2 = t * 0.08 + i * 2.1; c.strokeStyle = 'rgba(120,230,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -125, 58, 18, a2, 0, TAU); c.stroke(); }
      c.restore();
      break;
    }
    case 'capsule': {
      const key = captiveId() + '_a';
      c.fillStyle = '#1a2028'; c.fillRect(-70, -30, 140, 30); c.fillRect(-70, -320, 140, 26);
      if (spritesReady(key)) { c.save(); c.globalAlpha = 0.9; c.filter = 'saturate(0.4) brightness(1.1) hue-rotate(150deg)'; drawSprite(c, key, 0, 0, -36, -1, spriteScale(captiveId()) * 0.85); c.filter = 'none'; c.restore(); }
      const gg = c.createLinearGradient(-60, 0, 60, 0); gg.addColorStop(0, 'rgba(80,220,255,0.18)'); gg.addColorStop(0.5, 'rgba(180,250,255,0.42)'); gg.addColorStop(1, 'rgba(80,220,255,0.18)');
      c.fillStyle = fl ? 'rgba(255,255,255,0.8)' : gg; c.fillRect(-60, -294, 120, 264);
      c.strokeStyle = '#9fe8ff'; c.lineWidth = 3; c.strokeRect(-60, -294, 120, 264);
      if (dmg > 0) { c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; for (let i = 0; i < dmg * 10; i++) { const a2 = i * 1.3; line(c, Math.cos(a2) * 6, -170 + Math.sin(a2) * 20, Math.cos(a2) * 58, -170 + Math.sin(a2) * 120); } }
      for (let i = 0; i < 6; i++) { const by = -40 - ((t * 1.4 + i * 44) % 250); c.fillStyle = 'rgba(220,255,255,0.6)'; c.beginPath(); c.arc(-40 + i * 16, by, 3, 0, TAU); c.fill(); }
      break;
    }
    case 'pylon': {
      c.fillStyle = fl ? '#fff' : '#2a2238'; c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(14, -270); c.lineTo(-14, -270); c.closePath(); c.fill();
      c.strokeStyle = '#c86aff'; c.lineWidth = 2; c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, 0, -280, 60 + Math.sin(t * 0.3) * 10, 'rgba(200,100,255,0.8)');
      c.strokeStyle = 'rgba(220,160,255,0.85)'; c.lineWidth = 2.5; c.beginPath();
      let ax = 0, ay = -280; c.moveTo(ax, ay);
      for (let i = 0; i < 7; i++) { ax += rand(-26, 26); ay -= 40; c.lineTo(ax, ay); }
      c.stroke();
      for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(200,120,255,0.7)'; c.fillRect(-4, -40 - i * 50 - ((t * 2) % 50), 8, 14); }
      c.restore();
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
    const top = { jammer: -300, tank: -290, lock: -270, cage: -170, hut: -280, core: -250, capsule: -340, pylon: -330 }[pr.kind], by = top + Math.sin(t * 0.12) * 6;
    txt(c, '▼', 0, by, { font: '900 30px serif', align: 'center', fill: '#7dff9a', stroke: '#0a2a10', sw: 4 });
    for (let i = 0; i < info.hp; i++) { c.fillStyle = i < pr.hp ? '#7dff9a' : 'rgba(125,255,154,0.2)'; c.fillRect(-info.hp * 7 + i * 14, by + 10, 10, 6); }
  }
  c.restore();
}
function drawParkedCar(c, car) {
  const x = car.x - G.camX, fl = car.flash > 0 && car.flash % 2, dmgd = car.hp < car.max * 0.4;
  if (has('car_park')) { const fr = window.ATLAS.car_park[dmgd ? 1 : 0]; drawSprite(c, 'car_park', dmgd ? 1 : 0, x, car.y, 1, CAR_LEN / fr.w, { flash: fl }); }   // same real-world size as the driven car
  else drawCar(c, x, car.y, 1.55, { t: 0, col: '#c0262e' });
}
function drawMissionWorld(c) {
  const m = G.mission; if (!m) return;
  for (const f of m.freed) {
    if (f.t < 0) continue;
    const x = f.x - G.camX, a = Math.min(1, (260 - f.t) / 40);
    c.save(); c.globalAlpha = a;
    if (f.kind === 'cage' && has('raptor_r')) { const p = f.t * 0.45, i = Math.floor(p) % 8; drawSprite(c, 'raptor_r', i, x, f.y, 1, 0.42); }
    else if (f.kind === 'lock' && has('trike_w')) { const i = Math.floor(f.t * 0.3) % 8; drawSprite(c, 'trike_w', i, x, f.y, 1, 0.75 * ((window.ATLAS_NORM || {}).trike_w || 1)); }
    else if (f.kind === 'captive') {
      const key = f.id + '_c';
      if (has(key)) { const n = window.ATLAS[key].length, i = Math.floor(f.t * 0.3) % n; drawSprite(c, key, i, x, f.y, -1, spriteScale(f.id) * ((window.ATLAS_NORM || {})[key] || 1)); }
      if (f.t < 90) txt(c, heroName(f.id) + ' IS FREE!', x, f.y - 330, { font: '900 22px Cinzel, serif', align: 'center', fill: '#9fe8ff', stroke: '#001018', sw: 5 });
    }
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
