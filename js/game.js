'use strict';
/* =========================================================
   MUSTAFA — gameplay: fighters, combat, weapons, dinosaurs,
   AI, waves, the car stage, scenes and the main loop.
   ========================================================= */
let UID = 1;
const KB = 1.45;          // knockback multiplier for the bigger world
const G = {
  scene: 'title', t: 0, sceneT: 0, menu: 0, selIdx: 0, royal: !!Save.d.royal, startStage: 0, stageSel: 0,
  titleReady: false, overlay: null, paused: false, pauseSel: 0, goSel: 0,
  stageIdx: 0, players: [], enemies: [], items: [], props: [], projs: [], parts: [], texts: [],
  camX: 0, camLock: null, waveIdx: 0, queue: [], spawnT: 0, goT: 0,
  shake: 0, hitstop: 0, slowmo: 0, flash: 0, flashCol: '#ffffff',
  score: 0, lives: 3, combo: 0, comboT: 0, comboPop: 0, focus: null, focusT: 0, boss: null,
  stageTime: 0, banner: null, bonus: null, rects: null, titleFx: [], drive: null,
};

class Fighter {
  constructor(def, team, x, y, look) {
    this.id = UID++; this.def = def; this.team = team;
    this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vz = 0;
    this.facing = team === 'hero' ? 1 : -1;
    this.look = look || def.look || null;
    this.scale = ((this.look && this.look.scale) || def.scale || 1) * CS;
    this.hp = this.maxHp = this.lagHp = def.hp;
    this.state = 'idle'; this.t = 0; this.move = null; this.hitSet = new Set();
    this.inv = 0; this.flash = 0; this.cool = rand(40, 90); this.armorT = 0; this.poise = 0;
    this.weapon = def.weapon || null; this.weapon2 = def.weapon2 || null; this.ammo = 0; this.wdur = 0;
    this.walkPh = Math.random() * 6; this.side = Math.random() < 0.5 ? -1 : 1; this.slotY = rand(-40, 40);
    this.aggro = true; this.remove = false; this.buffer = false; this.docile = !!def.docile; this.flap = 0;
    this.tUp = -99; this.tDown = -99; this.trail = [];
  }
  setState(s) { this.state = s; this.t = 0; }
  get canBeHit() {
    return !this.remove && this.inv <= 0 && this.state !== 'down' && this.state !== 'dead' && this.state !== 'getup' && this.state !== 'drop';
  }
}

function makePlayer() {
  const h = HEROES[G.selIdx], look = { ...h.look };
  const royal = G.royal && Save.d.premium;
  if (royal) Object.assign(look, h.royal);
  const p = new Fighter(h, 'hero', 260, 590, look);
  p.royal = royal; p.lastTap = { d: 0, t: -99 }; p.running = false; p.weapon = null; p.boostT = 0; p.boostCool = 0;
  p.ctl = Input;   // who steers this fighter: the keyboard, or a RemoteCtl in online matches
  return p;
}
/* ---------- Difficulty (story mode only; online fights are player vs player) ---------- */
const DIFFS = [
  { name: 'NORMAL', aggro: 1, cool: 0.8,  spd: 1.05, dmg: 1.15, hp: 1,    poise: 6, dodge: 0.15, punish: 0.35 },
  { name: 'HARD',   aggro: 2, cool: 0.5,  spd: 1.18, dmg: 1.5,  hp: 1.2,  poise: 4, dodge: 0.35, punish: 0.7 },
  { name: 'LEGEND', aggro: 4, cool: 0.38, spd: 1.3,  dmg: 1.85, hp: 1.35, poise: 3, dodge: 0.5,  punish: 1 },
];
const DIF = () => DIFFS[Save.d.diff ?? 1] || DIFFS[1];
// the stage being played: a campaign mission, or an online arena
function stageDef() { return G.arena ? ARENAS[(G.arena.stage | 0) % ARENAS.length] : STAGES[G.stageIdx] || STAGES[0]; }
function makeEnemy(type, x, y) {
  const d = ENEMY_DEFS[type];
  const look = d.look ? { ...d.look } : null;
  if (type === 'razor') { look.bandana = pick(BANDANA); look.pants = pick(JEANS); }
  const e = new Fighter(d, 'enemy', x, y, look);
  e.type = type;
  const D = DIF();
  e.hp = e.maxHp = e.lagHp = Math.round(d.hp * D.hp); e.cool *= D.cool;
  if (d.flyer) e.z = 230;
  return e;
}
function makeProp(x, y, kind, item) {
  const o = OBJ_PROPS[kind];
  return { isProp: true, kind, x, y, z: 0, hp: o ? o.hp : kind === 'barrel' ? 2 : 1, item, flash: 0, remove: false, obj: !!o };
}
const isHuman = f => !f.def.dino;

/* ---------- effects ---------- */
function addPart(o) {
  const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, life: 30, size: 4, color: '#fff', type: 'dot', rot: 0, vr: 0 }, o);
  p.max = p.life; G.parts.push(p);
}
function sparks(x, y, z, big) {
  addPart({ type: 'flash', x, y, z, life: 8, size: big ? 90 : 56, color: '#fff6c8' });
  addPart({ type: 'ring', x, y, z, life: 14, size: big ? 100 : 58, color: '#ffd56b' });
  for (let i = 0; i < (big ? 14 : 8); i++) addPart({ type: 'spark', x, y, z, vx: rand(-11, 11), vz: rand(-8, 12), g: 0.5, life: rand(10, 20), size: rand(3, 5), color: pick(['#ffffff', '#ffe08a', '#ffb347']) });
}
function dust(x, y, n = 5) {
  for (let i = 0; i < n; i++) addPart({ type: 'dust', x: x + rand(-30, 30), y: y + rand(-4, 4), z: 2, vx: rand(-2, 2), vz: rand(0.4, 1.6), life: rand(20, 34), size: rand(12, 24), color: 'rgba(200,180,150,' });
}
function splash(x, y, n = 8) {
  for (let i = 0; i < n; i++) addPart({ type: 'spark', x: x + rand(-20, 20), y, z: 30, vx: rand(-4, 4), vz: rand(4, 10), g: 0.6, life: rand(16, 26), size: rand(3, 5), color: '#cfeee0' });
  addPart({ type: 'ring', x, y, z: 0, life: 20, size: 90, color: '#cfeee0', flat: true });
}
function debris(x, y, col) {
  for (let i = 0; i < 12; i++) addPart({ type: 'chip', x, y, z: rand(20, 90), vx: rand(-7, 7), vz: rand(4, 12), g: 0.6, life: rand(30, 50), size: rand(8, 16), color: col, vr: rand(-0.4, 0.4) });
}
function popText(x, y, z, text, color = '#fff', size = 34) { G.texts.push({ x, y, z, text, color, size, life: 50, max: 50 }); }
function addScore(n) { G.score += Math.round(n); }

function explode(x, y, z, owner, dmg, radius) {
  Sound.play('boom'); G.shake = Math.max(G.shake, 16); G.flash = Math.max(G.flash, 5); G.flashCol = '#ffd9a0';
  for (let i = 0; i < 12; i++) addPart({ type: 'fire', x: x + rand(-40, 40), y: y + rand(-6, 6), z: z + rand(0, 80), vx: rand(-3, 3), vz: rand(1, 4), life: rand(26, 44), size: rand(40, 80) });
  for (let i = 0; i < 8; i++) addPart({ type: 'smoke', x: x + rand(-50, 50), y, z: z + rand(30, 120), vx: rand(-1, 1), vz: rand(1, 2.5), life: rand(50, 80), size: rand(40, 70) });
  addPart({ type: 'ring', x, y, z: 2, life: 22, size: radius * 1.2, color: '#ffd9a0', flat: true });
  debris(x, y, '#3a3028');
  if (G.arena && owner.mine) arenaSend({ k: 'ex', x: Math.round(x), y: Math.round(y), z: Math.round(z), r: radius });
  const list = owner.team === 'hero' ? (G.arena ? arenaFoes(owner) : G.enemies) : G.players.concat(G.enemies.filter(e => e !== owner && e.def.dino));
  for (const t of list) {
    if (!t.canBeHit) continue;
    if (Math.hypot(t.x - x, (t.y - y) * 2) < radius + (t.def.radius || 0)) damage(t, owner, dmg, { down: true, kbx: 8, kbz: 12, dir: Math.sign(t.x - x) || 1, shake: 16 });
  }
  if (owner.team === 'hero') for (const pr of G.props) if (!pr.remove && Math.abs(pr.x - x) < radius && Math.abs(pr.y - y) < radius / 2) { hitProp(pr); hitProp(pr); }
}

/* ---------- combat ---------- */
function targetsOf(f) {
  if (f.team === 'hero') return G.arena ? arenaFoes(f) : G.enemies;
  return G.players;   // the gang's beasts and men fight on the same side
}
function hitBox(f, range, depth, dmg, m) {
  let hit = false;
  const reach = range * f.scale;
  for (const t of targetsOf(f)) {
    if (t === f || f.hitSet.has(t) || !t.canBeHit) continue;
    const dx = (t.x - f.x) * f.facing, dy = Math.abs(t.y - f.y);
    if (dx > -24 && dx < reach + (t.def.radius || 0) && dy < depth * (f.scale > 2.2 ? 1.4 : 1) && Math.abs(t.z - f.z) < 75 * Math.max(1, f.scale)) {
      f.hitSet.add(t); if (damage(t, f, dmg, m)) hit = true;
    }
  }
  if (f.team === 'hero') for (const pr of G.props) {
    if (pr.remove || f.hitSet.has(pr)) continue;
    const dx = (pr.x - f.x) * f.facing, dy = Math.abs(pr.y - f.y);
    if (dx > -10 && dx < reach + 40 && dy < depth + 10) { f.hitSet.add(pr); hitProp(pr); hit = true; }
  }
  return hit;
}
function hitArea(f, radius, depth, dmg, m) {
  let hit = false;
  const R = radius * f.scale;
  for (const t of targetsOf(f)) {
    if (t === f || f.hitSet.has(t) || !t.canBeHit) continue;
    if (Math.abs(t.x - f.x) < R + (t.def.radius || 0) && Math.abs(t.y - f.y) < depth && t.z < 220) { f.hitSet.add(t); if (damage(t, f, dmg, m)) hit = true; }
  }
  if (f.team === 'hero') for (const pr of G.props) {
    if (pr.remove || f.hitSet.has(pr)) continue;
    if (Math.abs(pr.x - f.x) < R + 30 && Math.abs(pr.y - f.y) < depth) { f.hitSet.add(pr); hitProp(pr); hit = true; }
  }
  return hit;
}

function damage(t, a, dmg, m = {}) {
  if (G.arena && t.remote) return arenaHitRemote(t, a, dmg, m);   // online: the victim's own game applies it
  if (G.arena && a && a.netId) t.lastHitBy = a.netId;              // bot matches: hits land locally
  if (!t.canBeHit) return false;
  dmg = Math.max(1, Math.round(dmg));
  const dir = m.dir || Math.sign(t.x - a.x) || a.facing || 1;
  const boss = !!t.def.boss;
  t.hp = Math.max(0, t.hp - dmg); t.flash = 8;
  const heroHit = a.team === 'hero';
  const hz = t.z + (t.def.dino ? 66 : 110) * t.scale * (t.def.flyer ? 0.1 : 1);
  sparks(t.x - dir * 14 * t.scale, t.y + 1, hz, !!m.down);
  G.hitstop = Math.max(G.hitstop, m.down ? 6 : 3);
  G.shake = Math.max(G.shake, m.shake || (m.down ? 7 : 3));
  Sound.play(m.down || dmg >= 14 ? 'heavy' : 'punch');
  if (heroHit) {
    G.combo++; G.comboT = 110; G.comboPop = 10;
    if (G.combo % 10 === 0) { Sound.play('combo'); popText(a.x, a.y, 330, G.combo + ' HIT COMBO!', '#ffd56b', 38); } G.focus = t; G.focusT = 200;
    addScore(dmg * 10);
    popText(t.x, t.y, hz + 30, String(dmg), '#ffe9a8', 30 + Math.min(18, dmg));
  }
  // An angry dinosaur wakes up
  if (t.docile) { t.docile = false; t.leaving = false; Sound.play('roar'); popText(t.x, t.y, hz + 80, 'ENRAGED!', '#ff7a5a', 40); }
  if (t.team === 'hero') {
    Sound.play('hurt');
    if (t.grabbed) releaseGrab(t);
    if (t.state === 'drive') { t.inv = 50; G.shake = Math.max(G.shake, 10); if (t.hp <= 0 && !t.koed) { t.koed = true; t.setState('dead'); } return true; }
  }
  // Dr. Kaiser mutates at half health
  if (t.def.final && !t.phase2 && t.hp > 0 && t.hp <= t.maxHp * 0.5) {
    t.phase2 = true; t.enraged = true; t.look = t.def.look2; t.scale = t.look.scale * CS;
    t.move = null; t.setState('taunt'); t.inv = 90;
    G.flash = 26; G.flashCol = '#b04cff'; G.shake = 16; Sound.play('roar');
    G.banner = { title: 'MUTATION!', sub: 'Dr. Kaiser injects the serum', t: 0, dur: 150, warn: true };
    return true;
  }
  const armor = t.team === 'enemy' && !m.down && t.hp > 0 && (t.armorT > 0 || (boss || t.def.heavy) && (t.state === 'attack' || t.state === 'charge' || t.state === 'enter'));
  if (t.state === 'grabbed' && a === t.grabber && t.hp > 0) {
    // stays held
  } else if (t.hp <= 0 || m.down || (t.z > 0 && !boss)) {
    if (t.state === 'grabbed' && t.grabber) { const g = t.grabber; g.grabbed = null; g.setState('idle'); t.grabber = null; }
    const heavy = boss ? 0.6 : 1;
    t.move = null; t.setState('fall');
    t.vz = (m.kbz || 7) * KB * heavy; t.vx = dir * (m.kbx || 4) * KB * heavy; t.z = Math.max(t.z, 1); t.bounce = true; t.facing = -dir;
    if (t.team === 'hero') dropWeapon(t);
    t.poise = 0;
  } else if (!armor) {
    t.move = null; t.setState('hurt');
    t.hurtDur = m.stun || (boss ? 10 : 17); t.vx = dir * (m.kb || 2) * KB; t.facing = -dir;
    if (boss && ++t.poise >= 4) { t.poise = 0; t.armorT = 100; }
    else if (t.team === 'enemy' && !boss && !t.def.flyer && !G.arena) {
      if (G.t - (t.lastHurt ?? -999) > 100) t.poise = 0;
      t.lastHurt = G.t;
      if (++t.poise >= DIF().poise) {   // shrugs off the combo and hits back
        t.poise = 0; t.armorT = 45; t.cool = 0; t.setState('idle'); t.vx = 0; t.facing = dir > 0 ? -1 : 1;
        popText(t.x, t.y, hz + 60, 'COUNTER!', '#ff7a5a', 30); Sound.play('counter');
      }
    }
  }
  if (t.hp <= 0 && !t.koed) { t.koed = true; onKO(t); }
  return true;
}

// Is this the very last enemy of the mission? (last wave, nothing queued, nothing else standing)
function isFinalKill(t) {
  if (G.arena || !G.mission) return false;
  const st = stageDef(); if (st.drive || G.waveIdx < st.waves.length - 1 || G.queue.length) return false;
  if (G.mission.surv && G.mission.surv.t > 0) return false;
  if (G.props.some(p => p.obj && !p.remove)) return false;
  return !G.enemies.some(e => e !== t && e.hp > 0 && !e.docile && !e.leaving);
}
// the big finish: slow motion, white flash, shockwave, fire burst and the "ta-da ta-da ta-da BOOM"
function bigKO(t, sub) {
  G.slowmo = 120; G.flash = 20; G.flashCol = '#ffffff'; G.shake = 22; G.hitstop = 10;
  Sound.play('ko'); Sound.play('boom');
  G.banner = { title: 'K.O.!', sub, t: 0, dur: 150, big: true };
  const z = 120 * (t.scale || 1);
  addPart({ type: 'ring', x: t.x, y: t.y, z: 2, life: 30, size: 420, color: '#ffe9a8', flat: true });
  addPart({ type: 'ring', x: t.x, y: t.y, z: 2, life: 22, size: 260, color: '#ff9a4a', flat: true });
  for (let i = 0; i < 16; i++) addPart({ type: 'fire', x: t.x + rand(-60, 60), y: t.y + rand(-8, 8), z: z + rand(-40, 60), vx: rand(-5, 5), vz: rand(2, 7), life: rand(30, 50), size: rand(50, 90) });
  for (let i = 0; i < 14; i++) addPart({ type: 'spark', x: t.x, y: t.y, z, vx: rand(-14, 14), vz: rand(4, 16), life: 40, size: 4, color: '#fff2b0' });
  for (const p of G.players) p.inv = Math.max(p.inv, 220);
}
function onKO(t) {
  if (t.team !== 'enemy') return;
  addScore(t.def.score || 100);
  if (!t.def.boss && isFinalKill(t)) { bigKO(t, 'MISSION ACCOMPLISHED'); return; }
  if (t.def.boss) {
    bigKO(t, t.def.name + ' DEFEATED');
    for (const p of G.players) p.inv = Math.max(p.inv, 220);
    for (const e of G.enemies) if (e !== t && e.hp > 0) {
      e.hp = 0; e.koed = true; e.move = null; e.setState('fall'); e.vz = 8; e.vx = (e.x < t.x ? -1 : 1) * 6; e.bounce = true; e.z = Math.max(1, e.z);
    }
    G.queue = [];
  }
}

function hitProp(pr) {
  pr.hp--; pr.flash = 8; Sound.play(pr.obj ? 'metal' : 'punch'); G.hitstop = Math.max(G.hitstop, 2);
  if (pr.hp <= 0) {
    pr.remove = true; Sound.play('break'); G.shake = Math.max(G.shake, 6);
    debris(pr.x, pr.y, pr.kind === 'barrel' ? '#3c6a8a' : '#b07a40');
    if (pr.item) spawnItem(pr.item, pr.x, pr.y);
    addScore(100);
    if (pr.obj) Mission.onTarget(pr);
  }
}

function spawnItem(kind, x, y, extra) {
  G.items.push(Object.assign({ kind, x, y: clamp(y, BELT_TOP, BELT_BOT), z: 40, vz: 6, t: 0, life: 900 }, extra || {}));
}
function weaponAmmo(kind) { return (GUNS[kind] || THROWN[kind] || {}).ammo || 0; }
function dropWeapon(p) {
  if (!p.weapon) return;
  if (G.arena) { p.weapon = null; return; }
  const k = p.weapon;
  if (MELEE_W[k] && p.wdur > 0) spawnItem(k, p.x, p.y, { wdur: p.wdur });
  else if ((GUNS[k] || THROWN[k]) && p.ammo > 0) spawnItem(k, p.x, p.y, { ammo: p.ammo });
  p.weapon = null;
}

function startMove(f, name) {
  f.move = MOVES[name]; f.moveName = name; f.setState('attack'); f.hitSet.clear(); f.buffer = false; f.wHit = false;
}
function weaponProj(f) { const w = f.weapon; return (GUNS[w] && GUNS[w].proj) || (THROWN[w] && THROWN[w].proj) || 'bullet'; }
function tickAttack(f) {
  const m = f.move; f.t++;
  if (m.lunge && f.t <= (m.a1 || m.dur)) f.x += f.facing * m.lunge * (f.scale / CS);
  if (m.rise) { f.z = m.rise * Math.sin(Math.PI * Math.min(1, f.t / m.dur)); if (f.team === 'hero' && f.t < m.a1) f.inv = Math.max(f.inv, 2); }
  if (m.sfx && f.t === Math.max(1, m.a0 || 1)) Sound.play(m.sfx);
  if (m.fire && f.t === m.fire) fire(f, m.proj || weaponProj(f));
  if (m.quake && f.t === m.a0) {
    G.shake = Math.max(G.shake, m.shake || 8);
    addPart({ type: 'ring', x: f.x + f.facing * 40, y: f.y, z: 2, life: 18, size: (m.radius || 110) * f.scale, color: '#ffd9a0', flat: true });
    dust(f.x + f.facing * 40, f.y, 12);
  }
  if (m.dmg && f.t >= m.a0 && f.t <= m.a1) {
    if (m.tick && (f.t - m.a0) % m.tick === 0) f.hitSet.clear();
    let dmg = m.dmg * (f.team === 'hero' ? f.def.power : DIF().dmg) * (f.enraged ? 1.25 : 1);
    if (f.moveName === 'wswing' && MELEE_W[f.weapon]) dmg = MELEE_W[f.weapon].dmg * f.def.power;
    const hit = m.radius ? hitArea(f, m.radius, m.depth, dmg, m) : hitBox(f, m.range, m.depth, dmg, m);
    if (hit && MELEE_W[f.weapon] && f.team === 'hero' && !f.wHit) {
      f.wHit = true;
      if (--f.wdur <= 0) { f.weapon = null; popText(f.x, f.y, 260, 'BROKEN!', '#ff9a7a'); debris(f.x + f.facing * 60, f.y, '#8a919c'); }
    }
  }
  if (f.t >= m.dur) {
    if (m.rise) f.z = 0;
    if (f.team === 'hero' && f.buffer && m.next) { startMove(f, m.next === 'fin' ? f.def.finisher : m.next); return; }
    if (f.team === 'hero' && m.auto && f.weapon === 'uzi' && f.ctl && f.ctl.held('atk')) { startMove(f, 'uzi'); return; }
    f.move = null; f.setState('idle');
    if (f.team === 'enemy') f.cool = rand(f.def.cool[0], f.def.cool[1]) * (f.enraged ? 0.6 : 1) * DIF().cool;
  }
}

function fire(f, kind) {
  const s = f.scale, dir = f.facing, x = f.x + dir * 70 * s, z = f.z + 124 * s;
  const hero = f.team === 'hero';
  const pw = hero ? f.def.power * (f.def.gunBonus || 1) : 1;
  const P = o => {
    const b = Object.assign({ x, y: f.y, z, team: f.team, owner: f, life: 90 }, o);
    if (!hero && b.dmg) b.dmg *= DIF().dmg;
    G.projs.push(b);
    if (G.arena && f.mine) { b.id = 'p' + (++G.arena.projSeq); arenaSend({ k: 'pj', p: { id: b.id, kind: b.kind, x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), vx: b.vx, vy: b.vy || 0, vz: b.vz || 0, g: b.g || 0, life: b.life } }); }
  };
  const muzzle = (sz = 40) => addPart({ type: 'flash', x: x + dir * 10, y: f.y, z, life: 5, size: sz, color: '#fff2b0' });
  const gun = GUNS[f.weapon], thr = THROWN[f.weapon];
  switch (kind) {
    case 'bullet': P({ kind: 'bullet', vx: dir * 28, dmg: (gun ? gun.dmg : 12) * pw }); muzzle(); Sound.play('gun'); G.shake = Math.max(G.shake, 2); break;
    case 'pellets':
      for (const oy of [-26, -12, 0, 12, 26]) P({ kind: 'pellet', y: f.y + oy, vx: dir * 24, dmg: gun.dmg * pw, life: 20, down: true });
      muzzle(70); Sound.play('shotgun'); G.shake = Math.max(G.shake, 6); f.x -= dir * 12;
      break;
    case 'rocket': P({ kind: 'rocket', vx: dir * 15, dmg: gun.dmg * pw, life: 80 }); muzzle(60); Sound.play('shotgun'); f.x -= dir * 18; break;
    case 'knife': P({ kind: 'knife', vx: dir * 20, dmg: thr.dmg * pw, down: true }); Sound.play('slash'); break;
    case 'rock': P({ kind: 'rock', vx: dir * 17, dmg: thr.dmg * pw, down: true }); Sound.play('whoosh'); break;
    case 'grenade': P({ kind: 'grenade', vx: dir * 10, vz: 11, g: 0.55, z: f.z + 140 * s, dmg: thr.dmg * pw, life: 200 }); Sound.play('whoosh'); break;
    case 'ebullet': P({ kind: 'bullet', vx: dir * 12, dmg: 8, life: 140 }); muzzle(); Sound.play('egun'); break;
    case 'epellets': for (const oy of [-24, 0, 24]) P({ kind: 'pellet', y: f.y + oy, vx: dir * 15, dmg: 9, life: 40, down: true }); muzzle(60); Sound.play('shotgun'); break;
    case 'erock': P({ kind: 'rock', vx: dir * 10 - (G.drive ? 0 : 0), dmg: 9, life: 120 }); Sound.play('whoosh'); break;
    case 'elaser': P({ kind: 'laser', vx: dir * 22, dmg: 11, life: 90 }); Sound.play('laser'); break;
    case 'orb': {
      const ys = f.enraged ? [-50, 0, 50] : [0];
      for (const oy of ys) P({ kind: 'orb', y: f.y + oy, vx: dir * 7, dmg: 12, life: 200, homing: true, down: true });
      Sound.play('special'); break;
    }
  }
  if (hero && (gun || thr)) {
    if (--f.ammo <= 0) { if (gun) popText(f.x, f.y, 300, 'EMPTY', '#ffb0a0'); f.weapon = null; }
  }
}

/* ---------- shared reaction states ---------- */
// Anyone left above the ground outside a jump or fall drops back down
function settle(f) {
  if (f.z <= 0 || f.def.flyer || ['fall', 'jump', 'drop', 'swoop'].includes(f.state) || (f.move && f.move.rise)) return;
  f.vz = Math.min(f.vz, 0) - 0.75; f.z = Math.max(0, f.z + f.vz);
  if (f.z === 0) f.vz = 0;
}
function updateCommon(f) {
  switch (f.state) {
    case 'hurt':
      f.t++; f.x += f.vx; f.vx *= 0.82;
      if (f.t >= f.hurtDur) f.setState('idle');
      return true;
    case 'fall':
      f.t++; f.x += f.vx; f.z += f.vz; f.vz -= 0.75;
      if (f.thrown) thrownSweep(f);
      if (f.z <= 0 && f.t > 2) {
        f.z = 0;
        const wet = stageDef().water;
        if (f.bounce) {
          f.bounce = false; f.vz = 4.5; f.vx *= 0.45;
          if (wet) { splash(f.x, f.y, 10); Sound.play('splash'); } else dust(f.x, f.y, 8);
          Sound.play('bodyfall'); G.shake = Math.max(G.shake, f.def.boss ? 10 : 5);
        } else { f.vz = 0; f.vx = 0; f.thrown = false; f.setState('down'); }
      }
      return true;
    case 'down':
      f.t++;
      if (f.t >= (f.hp <= 0 ? 24 : 38)) f.setState(f.hp <= 0 ? 'dead' : 'getup');
      return true;
    case 'getup':
      f.t++;
      if (f.t >= 18) { f.setState('idle'); f.inv = f.team === 'hero' ? 50 : 16; if (f.team === 'enemy') f.cool = Math.min(f.cool, 30 * DIF().cool); }
      return true;
    case 'dead':
      f.t++;
      if (f.t >= 50 && f.team === 'enemy') { f.remove = true; enemyGone(f); }
      return true;
    case 'grabbed':
      f.t++;
      if (!f.grabber || f.grabber.state !== 'grab') { f.grabber = null; f.setState('idle'); }
      return true;
  }
  return false;
}
function thrownSweep(f) {
  for (const o of G.enemies) {
    if (o === f || f.hitSet.has(o) || !o.canBeHit) continue;
    if (Math.abs(o.x - f.x) < 70 && Math.abs(o.y - f.y) < 28) {
      f.hitSet.add(o);
      damage(o, f.thrower || f, 14, { down: true, kbx: 6, kbz: 7, dir: Math.sign(f.vx) || 1 });
    }
  }
}
function enemyGone(e) {
  const d = e.def;
  if (d.boss) { spawnItem('gem', e.x, e.y); spawnItem('meat', e.x + 80, e.y); return; }
  for (const [k, ch] of Object.entries(d.drop || {})) {
    if (Math.random() < ch) { spawnItem(k, e.x, e.y, WEAPONS.includes(k) ? { ammo: Math.ceil(weaponAmmo(k) * 0.75) } : null); break; }
  }
}

/* ---------- player ---------- */
function bound(p) {
  if (G.arena) return arenaBound(p);
  p.x = clamp(p.x, G.camX + 40, G.camX + W - 40);
  p.y = clamp(p.y, BELT_TOP, BELT_BOT);
}
function updatePlayer(p) {
  if (p.inv > 0) p.inv--;
  if (p.flash > 0) p.flash--;
  p.lagHp = p.lagHp > p.hp ? Math.max(p.hp, p.lagHp - 0.5) : p.hp;
  if (p.state === 'dead') { p.t++; if (p.t === 70) playerLost(p); return; }
  if (p.state === 'drop') {
    p.t++; p.z += p.vz; p.vz -= 0.7;
    if (p.z <= 0) {
      p.z = 0; p.setState('idle'); G.shake = 12; Sound.play('heavy');
      addPart({ type: 'ring', x: p.x, y: p.y, z: 2, life: 22, size: 380, color: '#ffe39a', flat: true }); dust(p.x, p.y, 16);
      for (const e of G.enemies) if (e.hp > 0 && e.canBeHit && Math.abs(e.x - p.x) < 380 && !e.def.boss && !e.def.flyer) {
        e.move = null; e.setState('fall'); e.vz = 8; e.vx = Math.sign(e.x - p.x || 1) * 8; e.bounce = true; e.z = 1;
      }
    }
    return;
  }
  if (p.ctl.hit('down')) p.tDown = G.t;
  if (p.ctl.hit('up')) p.tUp = G.t;
  if (p.state === 'hurt' && p.ctl.hit('spc')) { startSpecial(p); return; }
  settle(p);
  if (updateCommon(p)) { bound(p); return; }
  const ix = (p.ctl.held('right') ? 1 : 0) - (p.ctl.held('left') ? 1 : 0);
  const iy = (p.ctl.held('down') ? 1 : 0) - (p.ctl.held('up') ? 1 : 0);
  for (const d of [-1, 1]) {
    if (p.ctl.hit(d < 0 ? 'left' : 'right')) {
      if (p.lastTap.d === d && G.t - p.lastTap.t < 16) { p.running = true; p.runDir = d; }
      p.lastTap = { d, t: G.t };
    }
  }
  if (ix === 0 || ix !== p.runDir) p.running = false;
  switch (p.state) {
    case 'idle': case 'walk': playerFree(p, ix, iy); break;
    case 'attack': if (p.ctl.hit('atk')) p.buffer = true; tickAttack(p); break;
    case 'jump': playerJump(p); break;
    case 'grab': playerGrab(p, ix); break;
    case 'win': p.t++; break;
  }
  bound(p);
}
function playerFree(p, ix, iy) {
  const d = p.def;
  if (p.ctl.hit('spc')) { startSpecial(p); return; }
  if (p.ctl.hit('jump')) {
    const sp = d.speed * (p.running ? 1.7 : 1);
    p.setState('jump'); p.vz = 16; p.jvx = ix * sp; p.jvy = iy * sp * 0.45; p.jatk = false; p.jt = 0;
    if (ix) p.facing = ix;
    Sound.play('jump'); return;
  }
  if (p.ctl.hit('atk')) {
    const w = p.weapon;
    if (!w) { const it = nearWeapon(p); if (it) { pickWeapon(p, it); return; } }
    if (G.t - p.tUp < 14 && p.tUp > p.tDown && p.tUp - p.tDown < 18) { startMove(p, 'rising'); return; }
    if (GUNS[w]) { startMove(p, GUNS[w].move); return; }
    if (THROWN[w]) { startMove(p, 'toss'); return; }
    if (MELEE_W[w]) { startMove(p, 'wswing'); return; }
    if (p.running) { p.running = false; startMove(p, 'dash'); return; }
    startMove(p, 'jab'); return;
  }
  const sp = d.speed * (p.running ? 1.75 : 1);
  if (ix || iy) {
    p.x += ix * sp; p.y += iy * sp * 0.6;
    if (ix) p.facing = ix;
    p.state = 'walk'; p.walkPh += (p.running ? 0.3 : 0.19) * (d.speed / 4.7);
    if (G.t % 9 === 0 && stageDef().water) addPart({ type: 'ring', x: p.x, y: p.y, z: 0, life: 18, size: 70, color: '#cfeee0', flat: true });
    else if (p.running && G.t % 6 === 0) dust(p.x - p.facing * 20, p.y, 1);
    if (ix && !p.weapon && !p.running) { const e = findGrab(p); if (e) startGrab(p, e); }
  } else p.state = 'idle';
}
function playerJump(p) {
  p.t++; p.x += p.jvx; p.y += p.jvy; p.z += p.vz; p.vz -= 0.75;
  if (p.ctl.hit('atk') && !p.jatk) { p.jatk = true; p.jt = 0; p.hitSet.clear(); Sound.play('whoosh'); }
  if (p.jatk && ++p.jt < 22) hitBox(p, 92, 30, 13 * p.def.power, { down: true, kbx: 5, kbz: 6 });
  if (p.z <= 0) {
    p.z = 0; p.vz = 0; p.jatk = false; p.setState('idle'); Sound.play('land');
    if (stageDef().water) splash(p.x, p.y, 6); else dust(p.x, p.y, 3);
  }
}
function startSpecial(p) {
  if (p.hp > 12) p.hp -= 5;
  startMove(p, 'special'); p.inv = Math.max(p.inv, 40);
  G.flash = 6; G.flashCol = '#ffe9a8';
  addPart({ type: 'ring', x: p.x, y: p.y, z: 100, life: 20, size: 230, color: '#ffe9a8' });
}
function findGrab(p) {
  for (const e of G.enemies) {
    if (e.def.boss || e.def.dino || e.leaving || e.z > 0 || !e.canBeHit) continue;
    if (!['idle', 'walk', 'hurt'].includes(e.state)) continue;
    const dx = (e.x - p.x) * p.facing;
    if (dx > 0 && dx < 64 * Math.max(1, e.scale / CS) && Math.abs(e.y - p.y) < 16) return e;
  }
  return null;
}
function startGrab(p, e) {
  p.setState('grab'); p.grabbed = e; p.knees = 0; p.sub = 0;
  e.move = null; e.setState('grabbed'); e.grabber = p; e.facing = -p.facing;
}
function releaseGrab(p) {
  const e = p.grabbed;
  if (e) { e.grabber = null; if (e.state === 'grabbed') e.setState('idle'); }
  p.grabbed = null;
}
function playerGrab(p, ix) {
  p.t++;
  const e = p.grabbed;
  if (!e || e.state !== 'grabbed' || e.remove) { p.grabbed = null; p.setState('idle'); return; }
  e.x = p.x + p.facing * 54 * (p.scale / CS); e.y = p.y + 0.5; e.z = 0;
  if (p.sub > 0) { p.sub--; if (p.sub === 7) damage(e, p, 7 * p.def.power, { kb: 0 }); return; }
  if (p.ctl.hit('atk')) {
    if (ix === -p.facing || p.knees >= 2) doThrow(p, e, ix === -p.facing ? -p.facing : p.facing);
    else { p.subKind = 'knee'; p.sub = 14; p.knees++; Sound.play('whoosh'); }
    return;
  }
  if (p.ctl.hit('jump')) { doThrow(p, e, -p.facing); return; }
  if (p.t > 110) { releaseGrab(p); p.setState('idle'); }
}
function doThrow(p, e, dir) {
  p.grabbed = null; e.grabber = null; p.facing = dir;
  e.hp = Math.max(0, e.hp - Math.round(14 * p.def.power));
  e.move = null; e.setState('fall'); e.vz = 12; e.vx = dir * 11; e.z = 14; e.bounce = true;
  e.thrown = true; e.thrower = p; e.facing = -dir; e.x = p.x + dir * 10; e.hitSet.clear();
  G.combo++; G.comboT = 110; G.comboPop = 10; G.focus = e; G.focusT = 200;
  if (e.hp <= 0 && !e.koed) { e.koed = true; onKO(e); }
  startMove(p, 'throwA'); Sound.play('heavy'); G.shake = Math.max(G.shake, 6);
}
function nearWeapon(p) {
  for (const it of G.items) if (WEAPONS.includes(it.kind) && !it.remove && Math.abs(it.x - p.x) < 70 && Math.abs(it.y - p.y) < 28) return it;
  return null;
}
function pickWeapon(p, it) {
  if (G.arena && !it.granted) { arenaTake(it, p); return; }   // online: the host confirms who got it
  it.remove = true; p.weapon = it.kind;
  p.ammo = it.ammo || weaponAmmo(it.kind);
  if (MELEE_W[it.kind]) p.wdur = it.wdur || MELEE_W[it.kind].dur;
  Sound.play('pickup');
  popText(p.x, p.y, 300, ((GUNS[it.kind] || THROWN[it.kind] || MELEE_W[it.kind]).label) + '!', '#ffe08a', 40);
}
function respawn(p) {
  p.hp = p.lagHp = p.maxHp; p.koed = false; p.move = null; p.inv = 160; p.facing = 1;
  if (stageDef().drive) { p.setState('drive'); p.z = 0; return; }
  p.weapon = 'bazooka'; p.ammo = GUNS.bazooka.ammo;     // like the arcade: a continue hands you a bazooka
  p.x = clamp(p.x, G.camX + 200, G.camX + W - 200); p.z = 700; p.vz = 0; p.setState('drop');
}
function playerLost(p) {
  if (G.arena) return arenaLost(p);
  G.lives--;
  if (G.lives > 0) respawn(p); else gameOver();
}

/* ---------- enemies ---------- */
function targetFor(e) {
  const p = G.players[0];
  const okP = p && p.state !== 'dead' && p.state !== 'drop' ? p : null;
  return okP;
}
function onScreen(e) { return e.x > G.camX + 40 && e.x < G.camX + W - 40; }
function updateEnemy(e) {
  if (e.inv > 0) e.inv--;
  if (e.flash > 0) e.flash--;
  if (e.armorT > 0) e.armorT--;
  e.lagHp = e.lagHp > e.hp ? Math.max(e.hp, e.lagHp - 1) : e.hp;
  if (e.def.shadow) { if (G.t % 3 === 0) { e.trail.unshift({ x: e.x, y: e.y, z: e.z, f: e.facing, P: getPose(e), s: spriteFor(e) }); e.trail.length = Math.min(e.trail.length, 4); } }
  if (e.def.rider) { updateHog(e); return; }
  settle(e);
  if (updateCommon(e)) {
    if (e.def.flyer && e.state === 'idle') e.z = 1;
    boundE(e); return;
  }
  const p = targetFor(e);
  if (e.def.flyer) { updateFlyer(e, p); return; }
  switch (e.state) {
    case 'enter':
      e.t++; e.facing = -1; e.walkPh += 0.15; e.x -= e.def.speed * 0.9;
      if (e.x <= G.camX + W - 330) { e.setState('taunt'); Sound.play('roar'); G.shake = Math.max(G.shake, 10); }
      return;
    case 'taunt':
      e.t++; if (e.t > 70) { e.setState('idle'); e.cool = 25; }
      break;
    case 'idle': case 'walk':
      if (e.docile || e.leaving) dinoWander(e); else enemyThink(e, p);
      break;
    case 'attack': tickAttack(e); break;
    case 'charge': enemyCharge(e); break;
  }
  boundE(e);
}
function boundE(e) {
  e.y = clamp(e.y, BELT_TOP, BELT_BOT);
  if (e.state !== 'enter' && !e.leaving) e.x = clamp(e.x, G.camX - 200, G.camX + W + 200);
}
function dinoWander(e) {
  if (e.leaving) {
    e.facing = 1; e.x += e.def.speed; e.walkPh += 0.12; e.state = 'walk';
    if (e.x > G.camX + W + 220) e.remove = true;
    return;
  }
  if (!e.wx || Math.abs(e.wx - e.x) < 10 || G.t % 240 === e.id % 240) { e.wx = G.camX + rand(200, W - 200); e.wy = rand(BELT_TOP, BELT_BOT); }
  if ((G.t + e.id * 31) % 300 < 120) { e.state = 'idle'; return; }
  const sp = e.def.speed * 0.4;
  e.facing = Math.sign(e.wx - e.x) || 1;
  e.x += clamp(e.wx - e.x, -sp, sp); e.y += clamp(e.wy - e.y, -sp * 0.5, sp * 0.5);
  e.state = 'walk'; e.walkPh += 0.08;
}
function enemyThink(e, p) {
  const d = e.def;
  const D = DIF();
  if (e.cool > 0) e.cool--;
  if (!p) { e.state = 'idle'; return; }
  const car = G.mission && G.mission.car;
  if (e.vsCar && car && !car.safe && !e.leaving && Math.abs(p.x - e.x) > 110) {   // raiders go for the Cadillac
    const cdx = car.x - e.x, cdy = car.y - e.y;
    if (Math.abs(cdx) > 14) e.facing = cdx > 0 ? 1 : -1;
    if (Math.abs(cdx) < 190 && Math.abs(cdy) < 34 && e.cool <= 0) { startMove(e, pick(d.melee)); return; }
    const tx = car.x + (e.x < car.x ? -150 : 150), sp = d.speed * DIF().spd;
    e.x += clamp(tx - e.x, -sp, sp); e.y += clamp(car.y + e.slotY * 0.5 - e.y, -sp * 0.6, sp * 0.6); e.state = Math.abs(tx - e.x) > 4 ? 'walk' : 'idle';
    return;
  }
  const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
  if (Math.abs(dx) > 14 || e.state !== 'walk' && e.state !== 'idle') e.facing = dx >= 0 ? 1 : -1;
  if (e.dodgeT > 0) {   // hop back out of a punch, then come straight back in
    e.dodgeT--; e.x += e.dodgeDir * d.speed * 2.6; e.state = 'walk'; e.walkPh += 0.3;
    if (e.dodgeT % 4 === 0) dust(e.x, e.y, 1);
    if (e.dodgeT === 0) e.cool = Math.min(e.cool, 6);
    return;
  }
  if (!e.aggro && (G.t + e.id * 7) % 90 === 0) e.side = e.x < p.x ? -1 : 1;
  if (e.meleeReach === undefined) e.meleeReach = Math.min(...d.melee.map(n => MOVES[n].range || MOVES[n].radius || 80));
  const reach = e.meleeReach * e.scale * 0.9 + (p.def.radius || 0);
  const pDown = ['down', 'getup', 'fall', 'dead'].includes(p.state);
  const pm = p.state === 'attack' ? p.move : null;
  // read the player: sidestep the start of a punch...
  if (pm && p.t === 2 && !d.dino && e.state !== 'attack' && adx < reach + 70 && ady < 34 && Math.sign(p.facing) === -Math.sign(dx || 1) && Math.random() < D.dodge * (d.boss ? 0.5 : 1)) {
    e.dodgeT = 12; e.dodgeDir = dx > 0 ? -1 : 1; Sound.play('whoosh'); return;
  }
  // ...and punish the recovery after a whiffed or finished combo
  const pOpen = pm && p.t > (pm.a1 || 0) && !p.buffer;
  if (!pDown && pOpen && adx < reach + 24 && ady < 24 && e.cool < 50 && (e.aggro || d.boss) && Math.random() < D.punish * 0.25) { startMove(e, pick(d.melee)); return; }
  if (d.ranged && e.cool <= 0 && ady < 18 && adx > 220 && adx < 900 && onScreen(e) && !pDown) { startMove(e, d.ranged); return; }
  if (d.charge && e.cool <= 0 && ady < 28 && adx > 300 && adx < 900 && onScreen(e) && Math.random() < 0.04) {
    e.setState('charge'); e.chargeDir = Math.sign(dx) || 1; return;
  }
  if (!d.dino && !d.boss && e.cool > 40 && adx > 220 && adx < 520 && Math.random() < 0.004) { e.setState('taunt'); e.t = 30; Sound.play('laugh'); return; }
  if (!pDown && adx < reach && ady < 22 && e.cool <= 0 && (e.aggro || d.boss)) { startMove(e, pick(d.melee)); return; }
  let tx, ty;
  if (d.keepAway) {
    tx = p.x + e.side * 460; ty = e.cool < 30 ? p.y : p.y + e.slotY;
    if (adx < 150 && ady < 16 && e.cool <= 0) { startMove(e, pick(d.melee)); return; }
  } else if (!e.aggro) { tx = p.x + e.side * 290; ty = p.y + e.slotY * 2; }
  else { tx = p.x + e.side * reach * 0.8; ty = p.y; }
  if (pDown && !d.boss) tx = p.x + e.side * (D.aggro >= 2 ? reach + 50 : 240);   // hard: crowd the player while they get up
  tx = clamp(tx, G.camX + 60, G.camX + W - 60); ty = clamp(ty, BELT_TOP, BELT_BOT);
  const mx = tx - e.x, my = ty - e.y, sp = d.speed * D.spd * (e.enraged ? 1.3 : 1) * (e.aggro ? 1 : 0.8);
  if (Math.abs(mx) > 6 || Math.abs(my) > 4) {
    e.x += clamp(mx, -sp, sp); e.y += clamp(my, -sp * 0.6, sp * 0.6); e.state = 'walk'; e.walkPh += 0.05 * sp + 0.06;
  } else e.state = 'idle';
}
function enemyCharge(e) {
  e.t++;
  if (e.t < 26) {
    e.facing = e.chargeDir;
    if (e.t === 1) Sound.play('roar');
    if (e.t % 5 === 0) dust(e.x - e.facing * 30, e.y, 2);
    return;
  }
  if (e.t === 26) e.hitSet.clear();
  e.x += e.chargeDir * 14; e.walkPh += 0.5;
  if (e.t % 3 === 0) dust(e.x - e.facing * 40, e.y, 1);
  hitBox(e, 70, 30, 15 * DIF().dmg * (e.enraged ? 1.25 : 1), { down: true, kbx: 8, kbz: 8 });
  if (e.t > 80 || (e.chargeDir > 0 && e.x > G.camX + W - 90) || (e.chargeDir < 0 && e.x < G.camX + 90)) { e.setState('idle'); e.cool = rand(50, 90); }
}
function updateFlyer(e, p) {
  e.flap += e.state === 'swoop' ? 0.35 : 0.22;
  if (e.state === 'swoop') {
    e.t++;
    const k = e.t / 54;
    e.x += e.swDir * 9; if (p) e.y += clamp(p.y - e.y, -3, 3);
    e.z = 240 - 190 * Math.sin(k * Math.PI);
    if (k > 0.3 && k < 0.7) hitBox(e, 60, 34, 9, { down: true, kbx: 5, kbz: 6 });
    if (e.t >= 54) { e.setState('idle'); e.cool = rand(70, 120); }
    boundE(e); return;
  }
  e.z += (240 - e.z) * 0.05;
  if (e.cool > 0) e.cool--;
  if (!p) return;
  e.facing = Math.sign(p.x - e.x) || 1;
  const tx = clamp(p.x + e.side * 380, G.camX + 80, G.camX + W - 80);
  e.x += clamp(tx - e.x, -e.def.speed, e.def.speed); e.y += clamp(p.y - e.y, -2, 2);
  e.state = 'walk';
  if (e.cool <= 0 && e.z > 180 && Math.abs(p.y - e.y) < 30) { e.setState('swoop'); e.swDir = Math.sign(p.x - e.x) || 1; e.facing = e.swDir; e.hitSet.clear(); Sound.play('whoosh'); }
  boundE(e);
}
function assignAggro() {
  const p = G.players[0];
  if (!p) return;
  const allow = 2 + Math.floor(G.stageIdx / 2) + DIF().aggro;
  const list = G.enemies.filter(e => e.hp > 0 && !e.def.dino).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
  list.forEach((e, i) => {
    e.aggro = i < allow || !!e.def.boss;
    // attackers take turns on each side so the player gets surrounded
    if (e.aggro && G.t % 120 === 0) { const nat = Math.sign(e.x - p.x) || 1; e.side = i % 2 ? -nat : nat; }
  });
}

/* ---------- Hell Road: the car stage ---------- */
function updateDrive() {
  const st = stageDef(), d = G.drive, p = G.players[0];
  G.camX += d.speed;
  if (p.inv > 0) p.inv--;
  if (p.flash > 0) p.flash--;
  p.lagHp = p.lagHp > p.hp ? Math.max(p.hp, p.lagHp - 0.5) : p.hp;
  if (p.state === 'dead') {
    p.t++; p.x += d.speed * 0.6;
    if (p.t % 6 === 0) addPart({ type: 'smoke', x: p.x, y: p.y, z: 120, vx: -2, vz: 2, life: 50, size: 50 });
    if (p.t === 80) playerLost(p);
    return;
  }
  if (p.state === 'drive') {
    const ix = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    const iy = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    if (p.boostCool > 0) p.boostCool--;
    if (p.boostT > 0) p.boostT--;
    if (Input.hit('atk') && p.boostCool <= 0) { p.boostT = 20; p.boostCool = 55; Sound.play('whoosh'); }
    p.x += d.speed + ix * 7 + (p.boostT > 0 ? 9 : 0); p.y += iy * 5;
    p.x = clamp(p.x, G.camX + 470, G.camX + W - 500);   // the 910 px Cadillac stays on screen p.y = clamp(p.y, 520, 690);
    p.walkPh += 0.5;
    if (G.t % 3 === 0) addPart({ type: 'dust', x: p.x - 430, y: p.y, z: 8, vx: -3, vz: 0.6, life: 26, size: 20, color: 'rgba(220,190,150,' });
    // run over anything in front of the bumper
    for (const e of G.enemies) {
      if (e.def.rider || !e.canBeHit) continue;
      const rel = e.x - p.x;
      if (rel > -455 && rel < 475 && Math.abs(e.y - p.y) < 44 && e.z < 60) {
        damage(e, p, 34, { down: true, kbx: 13, kbz: 13, dir: 1, shake: 10 });
        Sound.play('crash'); addScore(300);
      }
    }
    for (const pr of G.props) {
      if (!pr.remove && pr.x - p.x > -455 && pr.x - p.x < 475 && Math.abs(pr.y - p.y) < 44) { hitProp(pr); hitProp(pr); Sound.play('crash'); }
    }
  }
  // traffic: gang runners, rock throwers, barrels and food on the road
  if (!d.bossOn) {
    if (--d.spawnT <= 0) {
      d.spawnT = rand(26, 56);
      const r = Math.random(), y = rand(520, 690), x = G.camX + W + 120;
      if (r < 0.6) {
        const e = makeEnemy(Math.random() < 0.5 ? 'razor' : 'biker', x, y);
        e.runner = true; e.thrower = Math.random() < 0.35; e.cool = rand(10, 60); G.enemies.push(e);
      } else if (r < 0.85) G.props.push(makeProp(x, y, Math.random() < 0.5 ? 'barrel' : 'crate', Math.random() < 0.25 ? pick(['pizza', 'hotdog', 'meat']) : null));
      else spawnItem(pick(['pizza', 'hotdog', 'apple', 'gem']), x, y);
    }
    if (G.camX >= st.len) {
      d.bossOn = true;
      const hog = makeEnemy('hog', G.camX + W + 250, 600);
      hog.state = 'ride'; hog.cool = 90; G.enemies.push(hog); G.boss = hog;
      G.banner = { title: 'WARNING', sub: ENEMY_DEFS.hog.name, t: 0, dur: 170, warn: true };
      Music.play('boss', st.transpose || 0); Sound.play('roar');
    }
  }
  for (const pr of G.props) if (pr.x < G.camX - 250) pr.remove = true;
  for (const it of G.items) if (it.x < G.camX - 250) it.remove = true;
  if (d.clearT > 0 && --d.clearT === 0) stageClear();
}
function updateRunner(e) {
  const p = G.players[0];
  e.x -= 2.6; e.walkPh += 0.25; e.state = 'walk'; e.facing = -1;
  if (p) e.y += clamp(p.y - e.y, -1.2, 1.2);
  if (e.thrower && p && e.cool-- <= 0 && e.x - p.x > 300 && e.x - p.x < 900) { startMove(e, 'eshoot'); e.move = { dur: 34, fire: 16, pose: 'toss', proj: 'erock' }; }
  if (e.x < G.camX - 250) e.remove = true;
}
function updateHog(e) {
  const p = G.players[0], d = G.drive;
  e.walkPh += 0.6;
  if (e.state === 'fall' || e.state === 'down' || e.state === 'dead') {
    // thrown off the bike
    if (updateCommon(e) && e.state === 'dead' && e.t > 40) e.remove = true;
    return;
  }
  e.t++;
  if (e.inv > 0) e.inv--;
  if (e.throwT > 0) e.throwT--;
  const tx = G.camX + 1010 + Math.sin(e.t * 0.012) * 110, ty = 600 + Math.sin(e.t * 0.021) * 80;
  e.x += d.speed + clamp(tx - e.x, -6, 6) * 0.5; e.y += clamp(ty - e.y, -2.4, 2.4);
  e.facing = -1;
  if (--e.cool <= 0 && p && p.state === 'drive') {
    e.cool = rand(70, 115) * (e.hp < e.maxHp * 0.5 ? 0.7 : 1);
    const T = 2 * 10 / 0.5;
    e.throwT = 24;
    G.projs.push({ kind: 'grenade', x: e.x - 40, y: e.y, z: 230, vz: 10, g: 0.5, vx: (p.x - (e.x - 40)) / T + d.speed, team: 'enemy', owner: e, dmg: 12, life: 200, ty: p.y, vy: (p.y - e.y) / T });
    Sound.play('whoosh');
  }
  if (p && p.state === 'drive' && e.inv <= 0) {
    const rel = e.x - p.x;
    if (rel > 200 && rel < 600 && Math.abs(e.y - p.y) < 50) {
      e.hp = Math.max(0, e.hp - 40); e.inv = 45; e.flash = 10; e.x += 200;
      G.combo++; G.comboT = 110; G.comboPop = 10; G.focus = e; G.focusT = 200; addScore(400);
      sparks(e.x - 180, e.y, 90, true); Sound.play('crash'); G.shake = 14; G.hitstop = 6;
      popText(e.x - 180, e.y, 200, 'RAM!', '#ffd56b', 52);
      if (e.hp <= 0 && !e.koed) {
        e.koed = true; onKO(e); e.def = { ...e.def, rider: false };
        e.setState('fall'); e.vz = 16; e.vx = 9; e.z = 60; e.bounce = true;
        d.clearT = 210;
      }
    }
  }
}

/* ---------- projectiles, items, particles ---------- */
function bodyHit(t, b) {
  const mid = t.def.flyer ? 0 : (t.def.dino ? 60 : 85) * t.scale, half = t.def.flyer ? 50 : (t.def.dino ? 70 : 95) * t.scale;
  return Math.abs(b.z - (t.z + mid)) < half;
}
function updateProjectiles() {
  for (const b of G.projs) {
    if (b.remote) {   // another player's shot: drawn here, its hits are decided on their side
      b.x += b.vx; if (b.vy) b.y += b.vy;
      if (b.g) { b.z += b.vz; b.vz -= b.g; if (b.z <= 0) b.remove = true; }
      if (--b.life <= 0) b.remove = true;
      continue;
    }
    b.x += b.vx; b.life--;
    if (b.vy) b.y += b.vy;
    if (b.g) {
      b.z += b.vz; b.vz -= b.g;
      if (b.z <= 0) {
        if (b.kind === 'grenade') { explode(b.x, b.y, 0, b.owner, b.dmg, 170); b.remove = true; continue; }
        b.remove = true; continue;
      }
    }
    if (b.homing) { const p = G.players[0]; if (p) b.y += clamp(p.y - b.y, -1.4, 1.4); }
    if (b.life <= 0 || b.x < G.camX - 160 || b.x > G.camX + W + 160) {
      if (b.kind === 'rocket') explode(b.x, b.y, b.z * 0.5, b.owner, b.dmg, 190);
      b.remove = true; continue;
    }
    if (b.kind === 'grenade') continue;
    const list = b.team === 'hero' ? (G.arena ? arenaFoes(b.owner) : G.enemies) : G.players;
    for (const t of list) {
      if (!t.canBeHit) continue;
      const wx = t.state === 'drive' ? 360 : 30 * t.scale / CS + Math.abs(b.vx) * 0.6 + (t.def.radius || 0);
      if (Math.abs(t.x - b.x) < wx && Math.abs(t.y - b.y) < (t.state === 'drive' ? 50 : 30) && bodyHit(t, b)) {
        if (b.kind === 'rocket') explode(b.x, b.y, b.z * 0.5, b.owner, b.dmg, 190);
        else damage(t, b.owner, b.dmg, { kb: 3, dir: Math.sign(b.vx), down: !!b.down, kbx: 4, kbz: 6 });
        b.remove = true; if (G.arena && b.id) arenaSend({ k: 'pjx', id: b.id }); break;
      }
    }
    if (b.team === 'hero' && !b.remove) for (const pr of G.props) {
      if (!pr.remove && Math.abs(pr.x - b.x) < 50 && Math.abs(pr.y - b.y) < 28) {
        if (b.kind === 'rocket') explode(b.x, b.y, 40, b.owner, b.dmg, 190); else hitProp(pr);
        b.remove = true; break;
      }
    }
  }
}
function updateItems() {
  for (const it of G.items) {
    it.t++;
    if (it.z > 0 || it.vz) {
      it.z += it.vz; it.vz -= 0.55;
      if (it.z <= 0) { it.z = 0; it.vz = it.vz < -2 ? -it.vz * 0.4 : 0; }
    }
    if (--it.life <= 0) it.remove = true;
    if (WEAPONS.includes(it.kind)) continue;
    for (const p of G.players) {
      if (p.state === 'dead' || p.state === 'drop' || it.remove) continue;
      const reach = p.state === 'drive' ? 200 : 60;
      if (Math.abs(p.x - it.x) < reach && Math.abs(p.y - it.y) < 34 && p.z < 30 && it.z < 10) {
        it.remove = true;
        if (FOOD[it.kind]) { p.hp = Math.min(p.maxHp, p.hp + FOOD[it.kind]); popText(p.x, p.y, 300, '+' + FOOD[it.kind] + ' HP', '#8dffb0', 40); Sound.play('eat'); }
        else if (TREASURE[it.kind]) { addScore(TREASURE[it.kind]); popText(p.x, p.y, 300, '+' + TREASURE[it.kind], '#8fe9ff', 40); Sound.play('gem'); }
      }
    }
  }
}
function updateParticles() {
  for (const p of G.parts) {
    p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vz -= p.g; p.rot += p.vr; p.life--;
    if (p.type === 'chip' && p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.6; }
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.z += 1.6; t.life--; }
  G.texts = G.texts.filter(t => t.life > 0);
}

/* ---------- waves & camera ---------- */
function spawnEnemy(type) {
  const d = ENEMY_DEFS[type];
  const side = d.boss ? 1 : (Math.random() < 0.5 ? -1 : 1);
  const x = side < 0 ? G.camX - 140 : G.camX + W + 140;
  const e = makeEnemy(type, x, rand(BELT_TOP + 10, BELT_BOT - 10));
  e.facing = -side;
  if (d.docile) { e.x = G.camX + rand(300, W - 300); e.state = 'walk'; }
  if (d.boss || d.mini) {
    e.y = (BELT_TOP + BELT_BOT) / 2; e.setState('enter'); G.boss = e;
    G.banner = { title: d.mini ? 'ELITE' : 'WARNING', sub: d.name, t: 0, dur: 170, warn: true };
    Music.play(stageDef().music === 'final' ? 'final' : 'boss', stageDef().transpose || 0);
    Sound.play('alarm'); Music.stinger('boss');
  }
  G.enemies.push(e);
}
function updateWaves() {
  const st = stageDef();
  if (G.camLock === null) {
    const w = st.waves[G.waveIdx];
    if (w && G.camX >= w.at - 1) { G.camLock = w.at; G.camX = w.at; G.queue = w.list.slice(); G.spawnT = 20; G.goT = 0; Mission.onWaveLock(st, G.waveIdx, w); }
    return;
  }
  if (G.spawnT > 0) G.spawnT--;
  const active = G.enemies.filter(e => !e.docile && !e.leaving);
  const feeding = Mission.feed(st);
  if (G.queue.length && G.spawnT <= 0 && G.enemies.length < (st.maxOn || 4)) { spawnEnemy(G.queue.shift()); G.spawnT = 50; }
  // calm dinosaurs wander off once the fight is over
  if (!G.queue.length && active.length === 0) for (const e of G.enemies) if (e.docile) e.leaving = true;
  if (!G.queue.length && G.enemies.length === 0 && !feeding) {
    if (Mission.targetsLeftIn(G.camLock)) { if (G.t % 240 === 0) popText(G.camX + W / 2, 600, 300, fmt(OBJ_PROPS[G.props.find(p => p.obj && !p.remove).kind].label) + ' LEFT!', '#7dff9a', 30); return; }
    if (G.mission) { G.mission.surv = null; if (G.mission.car) G.mission.car.safe = true; }
    G.camLock = null; G.waveIdx++;
    if (G.waveIdx >= st.waves.length) stageClear();
    else { G.goT = 220; Sound.play('go'); }
  }
}
function updateCamera() {
  const st = stageDef(), p = G.players[0];
  if (!p) return;
  // the camera must always be able to reach the next fight zone, even on wide (phone) screens
  const lastAt = st.waves.length ? st.waves[st.waves.length - 1].at : 0;
  let maxX = Math.max(st.len - W, lastAt);
  if (G.camLock !== null) maxX = G.camLock;
  else { const w = st.waves[G.waveIdx]; if (w) maxX = Math.min(maxX, w.at); }
  const target = p.x - W * 0.42;
  if (target > G.camX) G.camX = Math.min(maxX, G.camX + Math.min(12, (target - G.camX) * 0.12 + 0.5));
}

/* ---------- scenes ---------- */
function startGame(stage) {
  G.score = 0; G.lives = Save.d.premium ? 5 : 3; G.players = [];
  loadStage(stage || 0);
}
function loadStage(i) {
  const st = STAGES[i];
  G.stageIdx = i;
  G.enemies = []; G.items = []; G.projs = []; G.parts = []; G.texts = [];
  G.props = st.props.map(a => makeProp(a[0], a[1], a[2], a[3]));
  setFloor(st.theme);
  G.camX = 0; G.camLock = null; G.waveIdx = 0; G.queue = []; G.goT = 0; G.boss = null;
  G.combo = 0; G.comboT = 0; G.focus = null; G.stageTime = 0; G.banner = null; G.paused = false;
  G.hitstop = 0; G.slowmo = 0; G.flash = 0; G.shake = 0;
  const p = makePlayer();
  G.players = [p];
  G.drive = null;
  if (st.drive) {
    G.drive = { speed: 11, spawnT: 60, bossOn: false, clearT: 0 };
    p.setState('drive'); p.x = 420; p.y = 610;
  }
  Mission.init(st);
  G.scene = 'intro'; G.sceneT = 0;
  Music.play(st.music || 'stage', st.transpose || 0);
}
function stageClear() {
  const p = G.players[0];
  G.scene = 'clear'; G.sceneT = 0; Music.play('victory'); Sound.play('fanfare');
  const secs = Math.floor(G.stageTime / 60);
  G.bonus = { hp: Math.round(p.hp) * 30, time: Math.max(0, 200 - secs) * 40, shown: 0 };
  G.bonus.total = G.bonus.hp + G.bonus.time;
  if (p.state !== 'dead' && p.state !== 'drive') { p.move = null; p.z = 0; p.setState('win'); }
}
function gameOver() { G.scene = 'gameover'; G.sceneT = 0; G.goSel = 0; Music.stop(); Sound.play('over'); saveBest(); }
function saveBest() { if (G.score > Save.d.best) { Save.d.best = G.score; Save.write(); } }
function goOptions() {
  return Save.d.premium
    ? [{ id: 'cont', label: 'CONTINUE' }, { id: 'title', label: 'QUIT TO TITLE' }]
    : [{ id: 'restart', label: 'RETRY MISSION' }, { id: 'cont', label: 'CONTINUE HERE  ♛ ROYAL' }, { id: 'title', label: 'QUIT TO TITLE' }];
}
function doContinue() {
  G.lives = Save.d.premium ? 5 : 3; G.score = 0;
  respawn(G.players[0]);
  G.scene = 'play';
  Music.play(G.boss && G.boss.hp > 0 ? 'boss' : 'stage', stageDef().transpose || 0);
}
function toTitle() {
  saveBest();
  G.scene = 'title'; G.sceneT = 0; G.menu = 0; G.paused = false; G.overlay = null;
  Music.play('title');
}
function goSelect() { G.scene = 'select'; G.sceneT = 0; }
function openRoyal(after) { Royal.open(after); }

function menuInput(n, key, horizontal) {
  let chosen = -1;
  const prev = horizontal ? 'left' : 'up', next = horizontal ? 'right' : 'down';
  if (Input.hit(prev)) { G[key] = (G[key] + n - 1) % n; Sound.play('select'); }
  if (Input.hit(next)) { G[key] = (G[key] + 1) % n; Sound.play('select'); }
  if (G.rects) for (const R of G.rects) {
    const m = Input.mouse;
    if (typeof R.i !== 'number') continue;   // close / back buttons are handled by their screens
    if (m.x >= R.x && m.x <= R.x + R.w && m.y >= R.y && m.y <= R.y + R.h) {
      if (m.moved && G[key] !== R.i) { G[key] = R.i; Sound.play('select'); }
      if (m.click) { G[key] = R.i; chosen = R.i; }
    }
  }
  if (Input.confirm()) chosen = G[key];
  if (chosen >= 0) Sound.play('confirm');
  return chosen;
}

function titleItems() {
  const m = Save.d.mission || 0;
  return [
    { id: 'start', label: 'START', sub: m > 0 ? 'CONTINUE · MISSION ' + (m + 1) + ': ' + STAGES[m].name : 'NEW CAMPAIGN · ' + STAGES.length + ' MISSIONS' },
    { id: 'stages', label: '▦  MISSIONS' },
    { id: 'online', label: '⚔  ONLINE BATTLE' },
    { id: 'royal', label: Save.d.premium ? '♛  ROYAL PASS ✓' : '♛  ROYAL PASS' },
    { id: 'diff', label: '☠  LEVEL: ' + DIF().name },
    { id: 'help', label: '?  HOW TO PLAY' },
    { id: 'settings', label: '⚙  SETTINGS' },
  ];
}
function updTitle() {
  updateTitleFx();
  if (G.overlay === 'help') {
    if (tapped('close')) { G.overlay = null; Sound.play('select'); return; }
    if (Input.confirm() || Input.hit('back') || Input.mouse.click) { G.overlay = null; Sound.play('select'); }
    return;
  }
  if (G.overlay === 'stages') {
    if (Input.hit('back') || tapped('close')) { G.overlay = null; Sound.play('select'); return; }
    // the list scrolls: wheel, drag (touch or mouse), and keyboard focus keeps the pick in view
    const L = stageLayout(), m = Input.mouse, inList = m.y > L.top && m.y < L.bottom;
    let tap = false;
    if (m.click && inList) G.stageDrag = { y: m.y, s: G.stageScrollT, moved: false };
    if (G.stageDrag) {
      if (m.down) { const dy = m.y - G.stageDrag.y; if (Math.abs(dy) > 10) G.stageDrag.moved = true; if (G.stageDrag.moved) G.stageScrollT = G.stageDrag.s - dy; }
      else { tap = !G.stageDrag.moved; G.stageDrag = null; }
    }
    if (Input.wheel) { G.stageScrollT += Input.wheel; Input.wheel = 0; }
    const before = G.stageSel, click = m.click; m.click = false;          // a press only picks a mission once it is released without dragging
    if (tap) m.click = true;
    const ch = menuInput(STAGES.length, 'stageSel', true);
    m.click = click && !inList;
    if (Input.hit('up')) G.stageSel = (G.stageSel + STAGES.length - L.cols) % STAGES.length;
    if (Input.hit('down')) G.stageSel = (G.stageSel + L.cols) % STAGES.length;
    if (G.stageSel !== before && !G.stageDrag && !m.moved) {
      const y = Math.floor(G.stageSel / L.cols) * L.rowH;
      if (y < G.stageScrollT) G.stageScrollT = y;
      if (y + L.chh > G.stageScrollT + L.bottom - L.top) G.stageScrollT = y + L.chh - (L.bottom - L.top);
    }
    G.stageScrollT = clamp(G.stageScrollT, 0, L.max);
    G.stageScroll += (G.stageScrollT - G.stageScroll) * (G.stageDrag ? 1 : 0.25);
    if (ch >= 0) {
      if (ch > (Save.d.premium ? 99 : Save.d.mission || 0)) { Sound.play('denied'); openRoyal(); return; }
      G.startStage = ch; G.overlay = null; G.campaign = true; goSelect();
    }
    return;
  }
  if (!G.titleReady) {
    if (G.loadT === undefined || G.t - G.loadT < 18) return;   // still on the loading screen
    if (!G.titleMusic) { G.titleMusic = true; Music.play('title'); }   // music starts once loading hits 100%
    if (Input.anyKey() || Input.mouse.click) { G.titleReady = true; Music.play('title'); Sound.play('confirm'); }
    return;
  }
  const items = titleItems();
  const ch = menuInput(items.length, 'menu', false);
  if (ch < 0) return;
  switch (items[ch].id) {
    case 'start': campaignNew(); break;
    case 'diff': Save.d.diff = ((Save.d.diff ?? 1) + 1) % DIFFS.length; Save.write(); break;
    case 'online': Net.openHub(); break;
    case 'stages': {
      G.overlay = 'stages'; G.stageSel = Math.min(Save.d.mission || 0, STAGES.length - 1); G.stageDrag = null; Input.wheel = 0;
      const L = stageLayout(); G.stageScroll = G.stageScrollT = clamp(Math.floor(G.stageSel / L.cols) * L.rowH - L.rowH, 0, L.max);
      break;
    }
    case 'royal': openRoyal(); break;
    case 'help': G.overlay = 'help'; break;
    case 'settings': openSettings('title'); break;
  }
}
function updSelect() {
  const prevSel = G.selIdx;
  const ch = menuInput(HEROES.length, 'selIdx', true);
  if (G.selIdx !== prevSel) G.sceneT = 30;
  if (Input.hit('royal')) {
    if (Save.d.premium) { G.royal = !G.royal; Save.d.royal = G.royal; Save.write(); Sound.play('royal'); }
    else openRoyal();
    return;
  }
  if (Input.hit('back') || tapped('back')) { G.scene = 'title'; G.sceneT = 0; Sound.play('select'); return; }
  if (tapped('royalBtn')) Input.pressed.KeyR = true;
  if (ch >= 0) { G.freshRun = true; openBrief(G.startStage); }
}
function updIntro() {
  updateParticles();
  if (G.sceneT > 160 || (G.sceneT > 30 && (Input.confirm() || Input.mouse.click))) { G.scene = 'play'; G.sceneT = 0; G.goT = 160; }
}
function updPlay() {
  if (G.arena) { arenaUpdate(); return false; }
  if (G.paused) { updPause(); return false; }
  if (Input.hit('pause')) { G.paused = true; G.pauseSel = 0; Sound.play('select'); return false; }
  if (G.shake > 0) { G.shake *= 0.86; if (G.shake < 0.3) G.shake = 0; }
  if (G.flash > 0) G.flash--;
  if (G.banner && ++G.banner.t > G.banner.dur) G.banner = null;
  if (G.hitstop > 0) { G.hitstop--; return true; }
  if (G.slowmo > 0) { G.slowmo--; if (G.slowmo % 3) return true; }
  G.stageTime++;
  const st = stageDef();
  if (st.drive) updateDrive(); else for (const p of G.players) updatePlayer(p);
  if (G.scene !== 'play') return false;
  if (G.t % 20 === 0) assignAggro();
  for (const e of G.enemies) {
    if (e.runner && (e.state === 'idle' || e.state === 'walk')) { if (e.inv > 0) e.inv--; if (e.flash > 0) e.flash--; updateRunner(e); }
    else updateEnemy(e);
  }
  updateProjectiles(); updateItems(); updateParticles();
  for (const pr of G.props) if (pr.flash > 0) pr.flash--;
  G.enemies = G.enemies.filter(e => !e.remove);
  G.items = G.items.filter(i => !i.remove);
  G.props = G.props.filter(p => !p.remove);
  G.projs = G.projs.filter(b => !b.remove);
  if (G.focus && G.focus.remove) G.focusT = Math.min(G.focusT, 40);
  if (G.focusT > 0) G.focusT--;
  if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;
  if (G.comboPop > 0) G.comboPop--;
  if (G.goT > 0) G.goT--;
  if (!st.drive) { updateCamera(); updateWaves(); }
  Mission.update();
  if (G.t % 30 === 0) {
    const act = G.enemies.filter(e => e.hp > 0 && !e.docile && !e.leaving).length;
    Music.setIntensity(G.camLock === null ? (act ? 2 : 1) : act >= 4 || (G.mission && G.mission.surv && G.mission.surv.t > 0) ? 3 : 2);
  }
  pulseDanger(G.players[0]);
  return false;
}
// low health: the music muffles and a heartbeat starts
function pulseDanger(p) {
  const low = !!p && p.hp > 0 && p.hp < p.maxHp * 0.3 && p.state !== 'drive';
  Music.danger(low);
  if (low && G.t % 48 === 0) Sound.play('heartbeat');
}
function updPause() {
  if (Input.hit('pause')) { G.paused = false; return; }
  const ch = menuInput(4, 'pauseSel');
  if (ch === 0) G.paused = false;
  else if (ch === 1) openSettings('pause');
  else if (ch === 2) loadStage(G.stageIdx);
  else if (ch === 3) toTitle();
}
function updClear() {
  updateParticles();
  if (G.drive) G.camX += G.drive.speed * 0.5;
  const b = G.bonus;
  if (G.sceneT > 80 && b.shown < b.total) {
    const add = Math.min(b.total - b.shown, Math.ceil(b.total / 90));
    b.shown += add; G.score += add;
    if (G.sceneT % 3 === 0) Sound.play('tick');
  }
  if (G.sceneT > 280 || (G.sceneT > 60 && (Input.confirm() || Input.mouse.click))) {
    if (b.shown < b.total) { G.score += b.total - b.shown; b.shown = b.total; }
    afterClear();
  }
}
function updGameOver() {
  updateParticles();
  const opts = goOptions();
  if (G.goSel >= opts.length) G.goSel = 0;
  const ch = menuInput(opts.length, 'goSel');
  if (Save.d.premium && G.sceneT > 60 * 11) { toTitle(); return; }
  if (ch < 0) return;
  switch (opts[ch].id) {
    case 'cont':
      if (Save.d.premium) doContinue();
      else openRoyal(() => { if (Save.d.premium) { G.goSel = 0; G.sceneT = 0; } });
      break;
    case 'restart': G.score = 0; G.lives = Save.d.premium ? 5 : 3; loadStage(G.stageIdx); break;
    case 'title': toTitle(); break;
  }
}
function updEnding() {
  updateTitleFx();
  if (G.sceneT > 200 && (Input.confirm() || Input.mouse.click)) toTitle();
}

function update() {
  G.t++; G.sceneT++;
  Music.update();
  if (Input.hit('mute')) Sound.toggleMute();
  let frozen = false;
  if (G.settings) { updSettings(); Input.endFrame(); return; }
  switch (G.scene) {
    case 'title': updTitle(); break;
    case 'select': updSelect(); break;
    case 'intro': updIntro(); break;
    case 'play': frozen = updPlay(); break;
    case 'clear': updClear(); break;
    case 'gameover': updGameOver(); break;
    case 'ending': updEnding(); break;
    case 'story': updStory(); break;
    case 'brief': updBrief(); break;
    case 'failed': updFailed(); break;
  }
  if (!frozen) Input.endFrame();
}

/* ---------- world rendering ---------- */
function shadow(x, y, z, s) {
  const k = 1 - Math.min(z / 400, 0.7);
  ctx.fillStyle = `rgba(0,0,0,${0.38 * k})`;
  ctx.beginPath(); ctx.ellipse(x, y, 30 * s * k, 8 * s * k, 0, 0, TAU); ctx.fill();
}
// Wading through water: just ripples around the legs, spreading out while the character moves
function waterCut(x, y, w, o) {
  const moving = o && (o.mspd || 0) > 0.6, t = G.t + ((o && o.id) || 0) * 13;
  ctx.save(); ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(220,255,235,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y, w * 0.75, 6, 0, 0, TAU); ctx.stroke();
  if (moving) for (let i = 0; i < 2; i++) {
    const k = ((t * 0.035) + i * 0.5) % 1;
    ctx.strokeStyle = `rgba(220,255,235,${0.45 * (1 - k)})`;
    ctx.beginPath(); ctx.ellipse(x, y, w * (0.8 + k * 1.3), 6 + k * 9, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
const RIDE_POSE = Object.assign(basePose(), { lf: [1.35, 0.25], lb: [1.2, 0.15], af: [1.35, 1.7], ab: [1.25, 1.65], lean: 0.12, by: 4 });
function drawFighter(f) {
  const sx = f.x - G.camX, sy = f.y - f.z;
  if (sx < -500 || sx > W + 500) return;
  if (f.state === 'dead' && f.team === 'enemy' && (f.t >> 2) % 2 === 0) return;
  ctx.save();
  if (f.team === 'hero' && f.inv > 0 && f.state !== 'attack' && (G.t >> 2) % 2) ctx.globalAlpha = 0.55;
  const flash = f.flash > 0 && f.flash % 2 === 1;
  if (f.state === 'drive' || (f.team === 'hero' && G.drive && f.state === 'dead')) {
    const bounce = Math.sin(G.t * 0.6) * 1.5 + (f.state === 'dead' ? 6 : 0);
    const pas = HEROES[(G.selIdx + 1) % HEROES.length];
    if (!drawCarSpr(ctx, sx, f.y + bounce, f.state === 'dead' || f.hp < f.maxHp * 0.35, flash, f.def.id, typeof allyId === 'function' ? allyId() : null)) drawCar(ctx, sx, f.y, 1.55, { t: G.t, bounce, driver: flash ? whiteLook(f.look) : f.look, passenger: pas.look, driverPose: RIDE_POSE, col: f.royal ? '#151515' : '#c0262e' });
    if (f.boostT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx - 455, f.y - 60, 90, 'rgba(255,160,60,0.7)'); ctx.restore(); }
    ctx.restore(); return;
  }
  const spr = spriteFor(f);
  if (spr) { drawFighterSprite(f, spr, sx, sy, flash); ctx.restore(); return; }
  if (f.def.rider && f.state === 'ride') {
    drawBike(ctx, sx, f.y, 1.75, { t: G.t, rider: flash ? whiteLook(f.look) : f.look, riderPose: RIDE_POSE });
    ctx.restore(); return;
  }
  let face = f.facing;
  const m = f.state === 'attack' ? f.move : null;
  if (m && m.pose === 'special') {
    face = ((f.t >> 2) & 1) ? -face : face;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,140,${0.6 * (1 - f.t / m.dur)})`; ctx.lineWidth = 8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(sx, sy - 90 * f.scale, (100 + k * 18) * f.scale, 28 * f.scale, 0, f.t * 0.5 + k * 2, f.t * 0.5 + k * 2 + 2.4); ctx.stroke(); }
    ctx.restore();
  }
  const d = f.def;
  if (d.dino === 'raptor' || d.dino === 'rex') drawTheropod(ctx, sx, sy, face, f.scale, dinoPose(f), { kind: d.dino, col: d.col, stripe: d.stripe, flash, crest: d.dino === 'rex' });
  else if (d.dino === 'trike') drawTrike(ctx, sx, sy, face, f.scale, dinoPose(f), { col: d.col, flash, docile: f.docile });
  else if (d.dino === 'ptera') {
    if (f.state === 'fall' || f.state === 'down' || f.state === 'dead' || f.state === 'getup') { ctx.translate(sx, sy); ctx.rotate(0.6); drawPtera(ctx, 0, 0, face, f.scale, 0, { col: d.col, flash }); }
    else drawPtera(ctx, sx, sy - 40, face, f.scale, f.flap, { col: d.col, flash });
  } else {
    if (d.shadow && f.trail.length && (f.state === 'attack' || f.state === 'walk')) {
      f.trail.forEach((g, i) => {
        ctx.save(); ctx.globalAlpha = 0.28 - i * 0.06;
        drawFigure(ctx, tintLook(f.look, '#7a3ad0'), g.P, g.x - G.camX, g.y - g.z, g.f, f.scale, { t: G.t });
        ctx.restore();
      });
    }
    let ext = 0;
    if (m && m.pose === 'whip' && f.t >= m.a0 && f.t <= m.a1 + 4) ext = m.range * 0.85;
    drawFigure(ctx, flash ? whiteLook(f.look) : f.look, getPose(f), sx, sy, face, f.scale, {
      weapon: f.weapon, weapon2: f.weapon2, t: G.t, ext, glowEyes: !!f.phase2,
      aura: f.royal ? '#d4af37' : f.phase2 ? '#b04cff' : (f.team === 'enemy' && f.armorT > 0 ? '#ff6a3a' : null),
    });
  }
  if (f.state === 'charge' && f.t < 26) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sx, sy - 90 * f.scale / CS, 140, `rgba(255,80,40,${0.3 + 0.2 * Math.sin(f.t)})`);
    ctx.restore();
  }
  ctx.restore();
}
// colour grading for characters per stage / time of day, so painted fighters match the painted world
const AMBIENT = { sea: 'sepia(0.12) saturate(1.05)', village: 'sepia(0.22) saturate(1.08) brightness(0.97)', swamp: 'saturate(0.82) brightness(0.93) hue-rotate(-6deg)',
  garage: 'sepia(0.1) brightness(0.98)', lab: 'saturate(0.85) brightness(0.95) hue-rotate(-8deg)', fortress: 'saturate(0.82) brightness(0.92)', jungle: 'saturate(0.95) brightness(0.98)',
  road: 'sepia(0.08)', night: 'saturate(0.8) brightness(0.9) hue-rotate(6deg)', dusk: 'sepia(0.18) saturate(0.95)', alarm: 'saturate(0.85)', rift: 'saturate(0.85) hue-rotate(8deg)' };
function drawFighterSprite(f, spr, sx, sy, flash) {
  const d = f.def, m = f.state === 'attack' ? f.move : null;
  let face = f.facing;
  if (m && m.pose === 'special') {
    face = ((f.t >> 2) & 1) ? -face : face;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,140,${0.6 * (1 - f.t / m.dur)})`; ctx.lineWidth = 8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(sx, sy - 150, 190 + k * 30, 50, 0, f.t * 0.5 + k * 2, f.t * 0.5 + k * 2 + 2.4); ctx.stroke(); }
    ctx.restore();
  }
  const aura = f.royal ? '#d4af37' : f.phase2 ? '#b04cff' : (f.team === 'enemy' && f.armorT > 0 ? '#ff6a3a' : null);
  if (aura) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sx, sy - 150, 190, rgba(aura, 0.28 + 0.1 * Math.sin(G.t * 0.1)));
    ctx.restore();
  }
  if (d.shadow && f.trail.length && (f.state === 'attack' || f.state === 'walk')) {
    f.trail.forEach((g, i) => {
      if (!g.s) return;
      ctx.save(); ctx.globalAlpha = 0.32 - i * 0.07;
      drawSprite(ctx, g.s.sheet, g.s.idx, g.x - G.camX, g.y - g.z, g.f, g.s.k, { tint: '#7a3ad0' });
      ctx.restore();
    });
  }
  // body language: breathing, step bob, lean into the walk, wind-up and lunge, recoil when hit
  const vis = f.visState || f.state, ph = (G.t + f.id * 17);
  let breathe = 1, bob = f.state === 'ride' ? Math.sin(G.t * 0.7) * 2 : 0, rot = 0, push = 0, sxk = 1;
  if (vis === 'idle') { breathe = 1 + Math.sin(ph * 0.08) * (f.team === 'enemy' ? 0.016 : 0.01); rot = Math.sin(ph * 0.045) * 0.012; }
  else if (vis === 'walk' && !d.flyer) {
    const sp = Math.min(1, (f.mspd || 0) / 6);
    bob = -Math.abs(Math.sin((f.dist || 0) / 75 * Math.PI)) * (2 + 3 * sp);
    rot = face * (0.025 + 0.03 * sp) * (d.dino ? 0.5 : 1);
  } else if (m && f.team === 'enemy') {
    const a0 = m.a0 || m.fire || 1, a1 = m.a1 || a0 + 3;
    if (f.t < a0) { const k = f.t / a0; push = -face * 10 * Math.sin(k * Math.PI * 0.5); rot = -face * 0.05 * k; breathe = 1 + 0.03 * k; }
    else if (f.t <= a1 + 4) { push = face * 12; rot = face * 0.06; sxk = 1.04; }
  } else if (f.state === 'hurt') { const k = Math.max(0, 1 - f.t / 12); rot = -face * 0.09 * k; sxk = 1 - 0.05 * k; breathe = 1 + 0.04 * k; }
  else if (f.state === 'taunt') { breathe = 1 + 0.03 * Math.abs(Math.sin(f.t * 0.2)); rot = Math.sin(f.t * 0.3) * 0.03; }
  const bx = sx + push;
  // cross-fade: the previous pose lingers faintly for a few frames so pose changes never pop
  if (spr.rig) {   // heroes: cut-out puppet with the cover face
    const amb = AMBIENT[stageDef().look || stageDef().theme] || '';
    if (amb) ctx.filter = amb;
    drawRig(ctx, f, bx, sy + bob * 0.3, face, { flash });
    if (amb) ctx.filter = 'none';
    return;
  }
  const key = spr.sheet + ':' + spr.idx;
  if (f.sprKey !== key) { f.sprPrev = f.sprCur; f.sprCur = spr; f.sprKey = key; f.sprT = 0; }
  f.sprT = (f.sprT || 0) + 1;
  const cycling = spr.next !== undefined && spr.blend > 0;
  if (f.sprPrev && f.sprT <= 3 && !flash && !(cycling && f.sprPrev.sheet === spr.sheet)) {
    ctx.save(); ctx.globalAlpha *= 0.45 * (1 - f.sprT / 4);
    drawSprite(ctx, f.sprPrev.sheet, f.sprPrev.idx, bx, sy + bob, face, f.sprPrev.k, { sy: breathe, rot, sx: sxk });
    ctx.restore();
  }
  const amb = AMBIENT[stageDef().look || stageDef().theme] || '';
  if (d.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, bx, sy - 140 * (spr.k / (spr.k || 1)), 170, rgba(d.glow, 0.22 + 0.08 * Math.sin(G.t * 0.12 + f.id))); ctx.restore(); }
  if (amb) ctx.filter = amb;
  if (cycling) {
    // hold each painted frame, then flow into the next one over the second half of its slot
    const a = clamp((spr.blend - 0.4) / 0.6, 0, 1), e = a * a * (3 - 2 * a);
    drawSpriteBlend(ctx, spr.sheet, spr.idx, spr.next, e, bx, sy + bob, face, spr.k, { flash, sy: breathe, rot, sx: sxk });
  } else drawSprite(ctx, spr.sheet, spr.idx, bx, sy + bob, face, spr.k, { flash, sy: breathe, rot, sx: sxk });
  if (amb) ctx.filter = 'none';
  if (d.glow && !flash) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.18 + 0.06 * Math.sin(G.t * 0.15); drawSprite(ctx, spr.sheet, spr.idx, bx, sy + bob, face, spr.k, { tint: d.glow, sy: breathe, rot, sx: sxk }); ctx.restore(); }
  if (f.state === 'charge' && f.t < 26) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sx, sy - 120, 160, `rgba(255,80,40,${0.3 + 0.2 * Math.sin(f.t)})`);
    ctx.restore();
  }
}
function drawParticles() {
  for (const p of G.parts) {
    const x = p.x - G.camX, y = p.y - p.z, k = p.life / p.max;
    switch (p.type) {
      case 'flash': ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, p.size * (1.2 - k * 0.4), `rgba(255,245,200,${k})`); ctx.restore(); break;
      case 'fire': {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const r = p.size * (1.4 - k * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,250,210,${k})`); g.addColorStop(0.35, `rgba(255,170,50,${k * 0.9})`); g.addColorStop(1, 'rgba(200,40,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
        break;
      }
      case 'smoke': ctx.fillStyle = `rgba(40,34,30,${0.45 * k})`; ctx.beginPath(); ctx.arc(x, y, p.size * (1.6 - k * 0.6), 0, TAU); ctx.fill(); break;
      case 'ring':
        ctx.save(); ctx.strokeStyle = rgba(p.color, k); ctx.lineWidth = 5 * k + 1.5; ctx.beginPath();
        if (p.flat) ctx.ellipse(x, y, p.size * (1 - k * 0.8), p.size * 0.26 * (1 - k * 0.8), 0, 0, TAU); else ctx.arc(x, y, p.size * (1 - k * 0.7), 0, TAU);
        ctx.stroke(); ctx.restore();
        break;
      case 'spark': ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round'; line(ctx, x, y, x - p.vx * 2, y + p.vz * 2); break;
      case 'dust': ctx.fillStyle = p.color + (0.35 * k) + ')'; ctx.beginPath(); ctx.arc(x, y, p.size * (1.6 - k), 0, TAU); ctx.fill(); break;
      case 'chip':
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.globalAlpha = Math.min(1, k * 2); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.strokeRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        break;
    }
  }
  for (const t of G.texts) {
    const k = t.life / t.max;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 2.5);
    txt(ctx, t.text, t.x - G.camX, t.y - t.z, { font: `700 ${t.size}px Teko, sans-serif`, align: 'center', fill: t.color, stroke: '#1a0d02', sw: 7 });
    ctx.restore();
  }
}
function drawWorld() {
  const st = stageDef();
  const sh = G.shake, ox = sh ? rand(-sh, sh) : 0, oy = sh ? rand(-sh, sh) * 0.6 : 0;
  ctx.save(); ctx.translate(ox, oy);
  drawBackground(ctx, st.theme, G.camX, G.t, st);
  for (const pr of G.props) shadow(pr.x - G.camX, pr.y, 0, CS * 0.9);
  for (const it of G.items) shadow(it.x - G.camX, it.y, it.z, CS * 0.5);
  if (!st.water) for (const f of G.enemies) if (!(f.state === 'dead' && (f.t >> 2) % 2 === 0)) shadow(f.x - G.camX, f.y, f.z, f.scale * (f.def.dino ? 1.7 : 1) * (f.def.rider ? 2.5 : 1));
  if (!st.water) for (const f of G.players) if (f.state !== 'out') shadow(f.x - G.camX, f.y, f.z, f.state === 'drive' ? 12 : f.scale);
  if (!G.arena) drawMissionWorld(ctx);
  const list = [];
  for (const o of G.props) list.push([o.y, 0, o]);
  for (const o of G.items) list.push([o.y - 1, 1, o]);
  for (const o of G.enemies) list.push([o.y, 2, o]);
  for (const o of G.players) if (o.state !== 'out') list.push([o.y + 0.5, 2, o]);
  for (const o of G.projs) list.push([o.y + 2, 3, o]);
  if (!G.arena && G.mission && G.mission.car) list.push([G.mission.car.y, 4, G.mission.car]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) {
    if (k === 0) drawPropSprite(ctx, o, o.x - G.camX, o.y);
    else if (k === 1) { if (o.life > 120 || (o.life >> 3) % 2) drawItemSprite(ctx, o.kind, o.x - G.camX, o.y - o.z - Math.sin(o.t * 0.08) * 4, o.t); }
    else if (k === 2) drawFighter(o);
    else if (k === 4) drawParkedCar(ctx, o);
    else drawProjectile(ctx, o, o.x - G.camX, o.y - o.z);
    if (st.water && k !== 3 && k !== 4) {
      const w = k === 2 ? (o.def.dino ? 46 : 34) * o.scale : 50;
      if (!(k === 2 && o.def.flyer && o.z > 40)) waterCut(o.x - G.camX, o.y, w, k === 2 ? o : null);
    }
  }
  drawParticles();
  if (G.arena) drawArenaTags(ctx);
  drawForeground(ctx, st.theme, G.camX, G.t);
  drawWeather(ctx, st, G.camX, G.t);
  ctx.restore();
  drawGrade(ctx, st.theme, G.t, st);
  if (G.flash > 0) { ctx.fillStyle = rgba(G.flashCol, Math.min(0.7, G.flash / 24)); ctx.fillRect(0, 0, W, H); }
}

function render() {
  mainCtx.setTransform(VIEW.k, 0, 0, VIEW.k, 0, 0);
  mainCtx.globalAlpha = 1; mainCtx.globalCompositeOperation = 'source-over';
  ctx = mainCtx;
  G.rects = null;
  switch (G.scene) {
    case 'title': drawTitle(ctx); break;
    case 'select': drawSelect(ctx); break;
    case 'ending': drawEnding(ctx); break;
    case 'story': drawStory(ctx); break;
    case 'brief': drawBrief(ctx); break;
    default:
      if (Save.d.pixel) {
        // 16-bit arcade look: render the world small, then scale up with hard pixels
        ctx = lowCtx; lowCtx.setTransform(LOW_W / W, 0, 0, LOW_H / H, 0, 0);
        drawWorld();
        ctx = mainCtx; mainCtx.imageSmoothingEnabled = false;
        mainCtx.drawImage(LOW, 0, 0, W, H); mainCtx.imageSmoothingEnabled = true;
      } else drawWorld();
      { // HUD stays clear of notches and rounded corners
        const W0 = W; ctx.save(); ctx.translate(SAFE.l, 0); W = W0 - SAFE.l - SAFE.r;
        if (G.arena) drawArenaHUD(ctx); else { drawHUD(ctx); drawMissionHUD(ctx); }
        W = W0; ctx.restore();
      }
      drawBanner(ctx);
      if (G.scene === 'intro') drawIntro(ctx);
      if (G.scene === 'clear') drawClear(ctx);
      if (G.scene === 'gameover') drawGameOver(ctx);
      if (G.scene === 'failed') drawFailed(ctx);
      if (G.paused) drawPause(ctx);
  }
  if (G.settings) drawSettings(ctx);
  drawHover(ctx);
}
// Mouse feedback for every on-screen button: hand cursor, and a soft gold glow on
// buttons that have no hover state of their own (✕, BACK, SKIP, GO...).
let lastCursor = '';
function drawHover(c) {
  const m = Input.mouse, R = !TOUCH && m.x >= 0 && !Input.locked ? uiHit(m.x, m.y) : null;
  const cur = R ? 'pointer' : 'default';
  if (cur !== lastCursor) { cvs.style.cursor = cur; lastCursor = cur; }
  if (!R || typeof R.i === 'number' || R.big) return;   // list items and gold buttons light up on their own
  c.save();
  if (Math.abs(R.w - R.h) < 4) {   // round ✕ buttons: a glowing ring
    c.shadowColor = 'rgba(255,214,90,0.9)'; c.shadowBlur = 18 + Math.sin(G.t * 0.15) * 6;
    c.strokeStyle = 'rgba(255,230,150,0.85)'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(R.x + R.w / 2, R.y + R.h / 2, R.w / 2 - 4, 0, TAU); c.stroke();
  } else {                          // pill buttons: brighten inside their own shape, no extra outline
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,214,120,0.16)';
    rrect(c, R.x, R.y, R.w, R.h, Math.min(28, R.h / 2)); c.fill();
  }
  c.restore();
}

/* ---------- main loop (fixed 60 Hz simulation) ---------- */
let lastTime = performance.now(), acc = 0;
let lastRaf = 0;
function frame(now) {
  lastRaf = performance.now();
  acc += Math.min(100, now - lastTime); lastTime = now;
  const step = 1000 / 60;
  while (acc >= step) { update(); acc -= step; }
  render();
  requestAnimationFrame(frame);
}
// Browsers pause requestAnimationFrame in hidden tabs. During online matches a worker keeps
// the simulation ticking so the host never freezes the match for everyone else.
(function backgroundTicker() {
  try {
    const src = 'setInterval(() => postMessage(0), 16);';
    const wk = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    wk.onmessage = () => {
      if (!G.arena || performance.now() - lastRaf < 120) return;   // the normal loop is running
      const now = performance.now();
      acc += Math.min(100, now - lastTime); lastTime = now;
      while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
    };
  } catch (e) { /* workers unavailable: matches pause while hidden */ }
})();
Royal.init();
Net.init();
loadSprites(); loadRigs();
setTimeout(() => loadStoryArt('prologue'), 4000);   // fetch the opening story art quietly after the loader
requestAnimationFrame(frame);
