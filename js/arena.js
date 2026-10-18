'use strict';
/* =========================================================
   MUSTAFA — online arena (duel / free-for-all / team vs team).
   Netcode: the room host runs the real simulation. Other players
   send their key states; the host broadcasts snapshots at 20 Hz,
   which clients smooth between. Effects/sounds travel as events.
   ========================================================= */
const ARENA_W = 2560;
const SIDE_COLORS = { A: '#ff5a46', B: '#4aa0ff' };
const FFA_COLORS = ['#ff5a46', '#4aa0ff', '#5ad46a', '#ffc83a', '#c46aff', '#ff8ad0', '#4ae0e0', '#f0f0f0'];
const BITS = { left: 1, right: 2, up: 4, down: 8, atk: 16, jump: 32, spc: 64 };

// Network-fed controller with the same interface as Input
class RemoteCtl {
  constructor() { this.h = 0; this.p = 0; }
  held(a) { return !!(this.h & BITS[a]); }
  hit(a) { return !!(this.p & BITS[a]); }
  feed(d) { this.h = d.h | 0; this.p |= d.p | 0; }
  consume() { this.p = 0; }
}
function localBits() {
  let h = 0, p = 0;
  for (const a in BITS) { if (Input.held(a)) h |= BITS[a]; if (Input.hit(a)) p |= BITS[a]; }
  return { h, p };
}

function colorFor(f) { return G.arena.mode === 'team' ? SIDE_COLORS[f.side] : FFA_COLORS[f.slot % FFA_COLORS.length]; }

/* ---------- start / end ---------- */
function startArena(msg) {
  const me = Net.me.id;
  G.arena = {
    mode: msg.mode, host: msg.host, isHost: msg.host === me, me, roomId: msg.roomId, teamNames: msg.teamNames,
    stage: msg.stage, time: 0, limit: 60 * 60 * 3, ended: false, endT: 0, result: null, sendT: 0,
    lastSend: "", itemT: 240, events: [], ctls: new Map(), lastState: G.t,
  };
  const stocks = msg.mode === 'team' ? 2 : 3;
  G.players = msg.players.map((pl, i) => {
    const hi = Math.max(0, HEROES.findIndex(h => h.id === pl.hero));
    const def = HEROES[hi], look = { ...def.look };
    const f = new Fighter(def, 'hero', 400 + (i * (ARENA_W - 800)) / Math.max(1, msg.players.length - 1), BELT_TOP + 40 + (i % 3) * 70, look);
    f.netId = pl.id; f.name = pl.name; f.side = pl.side; f.slot = i; f.stock = stocks; f.kills = 0; f.deaths = 0;
    f.lastTap = { d: 0, t: -99 }; f.running = false; f.weapon = null; f.facing = f.x < ARENA_W / 2 ? 1 : -1;
    if (pl.id === me) f.ctl = Input;
    else { const ctl = new RemoteCtl(); G.arena.ctls.set(pl.id, ctl); f.ctl = ctl; }
    f.tx = f.x; f.ty = f.y; f.tz = 0;
    return f;
  });
  G.enemies = []; G.items = []; G.props = []; G.projs = []; G.parts = []; G.texts = [];
  G.stageIdx = msg.stage; G.camX = 0; G.camLock = null; G.waveIdx = 0; G.queue = []; G.boss = null; G.drive = null;
  G.combo = 0; G.comboT = 0; G.focus = null; G.banner = { title: 'FIGHT!', sub: modeLabel(), t: 0, dur: 110, big: true };
  G.hitstop = 0; G.slowmo = 0; G.flash = 0; G.shake = 0; G.paused = false;
  G.scene = 'play'; G.sceneT = 0; G.stageTime = 0;
  Music.play('boss', STAGES[msg.stage].transpose || 0);
  Sound.play('confirm');
}
function modeLabel() {
  const a = G.arena;
  if (a.mode === 'team' && a.teamNames) return `${a.teamNames.A}  vs  ${a.teamNames.B}`;
  return { duel: 'DUEL  1 vs 1', ffa: 'FREE-FOR-ALL', team: 'TEAM vs TEAM' }[a.mode];
}
function endArena() {
  G.arena = null;
  G.players = []; G.enemies = []; G.projs = []; G.items = [];
  G.scene = 'title'; G.sceneT = 0; G.titleReady = true;
  Music.play('title');
  Net.openHub();
}
function leaveArena() {
  if (!G.arena) return;
  Net.send({ t: 'roomLeave' });
  endArena();
}

/* ---------- PvP rules used by combat code ---------- */
function arenaFoes(f) { return G.players.filter(o => o !== f && o.side !== f.side && o.state !== 'out'); }
function arenaBound(p) {
  p.x = clamp(p.x, 40, ARENA_W - 40);
  p.y = clamp(p.y, BELT_TOP, BELT_BOT);
}
function arenaLost(p) {
  const a = G.arena;
  p.deaths++; p.stock--;
  const killer = G.players.find(o => o.netId === p.lastHitBy);
  if (killer && killer !== p) { killer.kills++; netEvent({ f: 'tx', x: killer.x, y: killer.y, z: 330, s: 'K.O.!', c: '#ffd56b', z2: 56 }); }
  if (p.stock > 0) {
    p.hp = p.lagHp = p.maxHp; p.koed = false; p.move = null; p.inv = 180; p.weapon = null;
    p.x = clamp(G.camX + rand(200, W - 200), 200, ARENA_W - 200); p.y = rand(BELT_TOP + 20, BELT_BOT - 20); p.z = 700; p.vz = 0; p.setState('drop');
  } else { p.setState('out'); p.z = 0; Sound.play('ko'); }
}

/* ---------- effects & sounds travel as events from the host ---------- */
function netEvent(ev) { if (G.arena && G.arena.isHost) G.arena.events.push(ev); }
function replayEvent(ev) {
  if (ev.s) Sound.play(ev.s);
  switch (ev.f) {
    case 'sp': sparks(ev.x, ev.y, ev.z, !!ev.b); break;
    case 'ex': explodeFx(ev.x, ev.y, ev.z, ev.r); break;
    case 'tx': popText(ev.x, ev.y, ev.z, ev.s2 || ev.s, ev.c || '#fff', ev.z2 || 34); break;
    case 'du': dust(ev.x, ev.y, ev.n || 5); break;
  }
}
function explodeFx(x, y, z, radius) {
  G.shake = Math.max(G.shake, 16); G.flash = Math.max(G.flash, 5); G.flashCol = '#ffd9a0';
  for (let i = 0; i < 12; i++) addPart({ type: 'fire', x: x + rand(-40, 40), y: y + rand(-6, 6), z: z + rand(0, 80), vx: rand(-3, 3), vz: rand(1, 4), life: rand(26, 44), size: rand(40, 80) });
  for (let i = 0; i < 8; i++) addPart({ type: 'smoke', x: x + rand(-50, 50), y, z: z + rand(30, 120), vx: rand(-1, 1), vz: rand(1, 2.5), life: rand(50, 80), size: rand(40, 70) });
  addPart({ type: 'ring', x, y, z: 2, life: 22, size: radius * 1.2, color: '#ffd9a0', flat: true });
}

/* ---------- per-frame update ---------- */
function arenaUpdate() {
  const a = G.arena;
  if (Input.hit('pause')) { if (window.confirm('Leave this match?')) leaveArena(); return; }
  if (G.shake > 0) { G.shake *= 0.86; if (G.shake < 0.3) G.shake = 0; }
  if (G.flash > 0) G.flash--;
  if (G.banner && ++G.banner.t > G.banner.dur) G.banner = null;
  if (a.ended) { a.endT++; updateParticles(); if (a.endT > 60 * 7) endArena(); return; }
  if (a.isHost) arenaHostTick(); else arenaClientTick();
  updateArenaCamera();
}
function arenaHostTick() {
  const a = G.arena;
  if (G.hitstop > 0) { G.hitstop--; } else {
    a.time++; G.stageTime++;
    for (const p of G.players) { if (p.state === 'out') continue; updatePlayer(p); }
    updateProjectiles(); updateItems(); updateParticles();
    G.items = G.items.filter(i => !i.remove); G.projs = G.projs.filter(b => !b.remove);
    if (--a.itemT <= 0) {
      a.itemT = 60 * rand(7, 11);
      const kind = pick(['pizza', 'hotdog', 'meat', 'apple', 'pistol', 'rifle', 'uzi', 'shotgun', 'bazooka', 'grenade', 'knife', 'pipe', 'machete']);
      spawnItem(kind, rand(200, ARENA_W - 200), rand(BELT_TOP + 20, BELT_BOT - 20));
      G.items[G.items.length - 1].z = 500;
    }
    for (const ctl of a.ctls.values()) ctl.consume();
    checkArenaWin();
  }
  // broadcast a snapshot every 3 frames (20 Hz)
  if (++a.sendT >= 3) { a.sendT = 0; Net.send({ t: 'state', d: snapshot() }); a.events = []; }
}
function checkArenaWin() {
  const a = G.arena;
  const alive = G.players.filter(p => p.state !== 'out' && p.stock > 0);
  const sides = new Set(alive.map(p => p.side));
  const timeUp = a.time >= a.limit;
  if (sides.size > 1 && !timeUp) return;
  let winner = alive.length ? alive[0].side : null;
  if (timeUp && sides.size > 1) {   // most stocks, then most health
    const score = {}; for (const p of alive) score[p.side] = (score[p.side] || 0) + p.stock * 1000 + p.hp;
    winner = Object.entries(score).sort((x, y) => y[1] - x[1])[0][0];
  }
  const result = {
    winnerSide: winner, mode: a.mode, teamNames: a.teamNames,
    winners: G.players.filter(p => p.side === winner).map(p => p.name),
    stats: G.players.map(p => ({ id: p.netId, name: p.name, side: p.side, kills: p.kills, deaths: p.deaths, hero: p.def.id })),
  };
  Net.send({ t: 'state', d: snapshot() });
  Net.send({ t: 'matchEnd', result });
  showArenaResult(result);
}
function showArenaResult(result) {
  const a = G.arena; if (!a || a.ended) return;
  a.ended = true; a.endT = 0; a.result = result;
  const iWon = G.players.some(p => p.netId === a.me && p.side === result.winnerSide);
  Music.play('victory'); Sound.play(iWon ? 'fanfare' : 'over');
  for (const p of G.players) if (p.side === result.winnerSide && p.state !== 'out') { p.move = null; p.z = 0; p.setState('win'); }
}

/* ---------- snapshots ---------- */
const r1 = v => Math.round(v);
function snapshot() {
  const a = G.arena;
  return {
    tm: a.time,
    p: G.players.map(p => [p.netId, r1(p.x), r1(p.y), r1(p.z), p.facing, p.state, p.t, p.moveName || '', r1(p.hp), p.inv > 0 ? 1 : 0, p.flash, p.weapon || '', p.ammo | 0,
      r1(p.walkPh * 100), p.running ? 1 : 0, p.jatk ? 1 : 0, p.sub | 0, p.stock, p.kills, p.deaths, r1(p.lagHp)]),
    b: G.projs.map(b => [b.kind, r1(b.x), r1(b.y), r1(b.z), r1(b.vx)]),
    i: G.items.map(it => [it.kind, r1(it.x), r1(it.y), r1(it.z), it.t, it.life]),
    e: a.events,
  };
}
function applySnapshot(d) {
  const a = G.arena; if (!a) return;
  a.time = d.tm; a.lastState = G.t;
  for (const s of d.p) {
    const f = G.players.find(p => p.netId === s[0]); if (!f) continue;
    f.tx = s[1]; f.ty = s[2]; f.tz = s[3]; f.facing = s[4];
    if (f.state !== s[5] || Math.abs(f.t - s[6]) > 3) { f.state = s[5]; f.t = s[6]; }
    f.moveName = s[7] || null; f.move = s[7] ? MOVES[s[7]] : null;
    f.hp = s[8]; f.inv = s[9] ? 2 : 0; f.flash = s[10]; f.weapon = s[11] || null; f.ammo = s[12];
    f.walkPh = s[13] / 100; f.running = !!s[14]; f.jatk = !!s[15]; f.sub = s[16]; f.subKind = 'knee';
    f.stock = s[17]; f.kills = s[18]; f.deaths = s[19]; f.lagHp = s[20];
  }
  G.projs = d.b.map(([kind, x, y, z, vx]) => ({ kind, x, y, z, vx }));
  G.items = d.i.map(([kind, x, y, z, t, life]) => ({ kind, x, y, z, t, life }));
  for (const ev of d.e || []) replayEvent(ev);
}
function arenaClientTick() {
  const a = G.arena;
  // send my keys whenever they change, plus a heartbeat
  const bits = localBits(), key = bits.h + ':' + bits.p;
  if (bits.p || key !== a.lastSend || G.t % 10 === 0) { Net.send({ t: 'input', d: bits }); a.lastSend = key; }
  // smooth everyone toward the latest host positions
  for (const f of G.players) {
    if (f.tx === undefined) continue;
    const jump = Math.abs(f.tx - f.x) > 300;
    f.x = jump ? f.tx : f.x + (f.tx - f.x) * 0.45;
    f.y += (f.ty - f.y) * 0.45; f.z += (f.tz - f.z) * 0.5;
    f.t++; if (f.flash > 0) f.flash--;
  }
  for (const b of G.projs) b.x += b.vx;
  for (const it of G.items) it.t++;
  updateParticles();
  if (G.t - a.lastState > 60 * 8) { Net.toast('Lost contact with the host.'); leaveArena(); }
}
function updateArenaCamera() {
  const me = G.players.find(p => p.netId === G.arena.me);
  const target = me ? me.x - W * 0.5 : G.camX;
  G.camX = clamp(G.camX + (target - G.camX) * 0.15, 0, ARENA_W - W);
}

/* ---------- drawing: name tags + arena HUD ---------- */
function drawArenaTags(c) {
  for (const f of G.players) {
    if (f.state === 'out') continue;
    const x = f.x - G.camX, y = f.y - f.z - 330, col = colorFor(f), mine = f.netId === G.arena.me;
    c.save();
    c.font = '700 20px Teko, sans-serif'; c.textAlign = 'center';
    const label = mine ? 'YOU' : f.name, w = c.measureText(label).width + 18;
    c.fillStyle = 'rgba(0,0,0,0.6)'; rrect(c, x - w / 2, y - 22, w, 26, 8); c.fill();
    c.strokeStyle = col; c.lineWidth = 2; c.stroke();
    c.fillStyle = col; c.fillText(label, x, y - 2);
    c.beginPath(); c.moveTo(x - 7, y + 4); c.lineTo(x + 7, y + 4); c.lineTo(x, y + 12); c.closePath(); c.fill();
    c.restore();
  }
}
function drawArenaHUD(c) {
  const a = G.arena, n = G.players.length, pw = Math.min(300, (W - 40) / n - 10);
  G.players.forEach((f, i) => {
    const x = 20 + i * (pw + 10), y = 12, col = colorFor(f), out = f.state === 'out';
    c.save(); if (out) c.globalAlpha = 0.45;
    panel(c, x, y, pw, 70, { r: 10, border: col, noInner: true });
    c.save(); c.beginPath(); c.arc(x + 34, y + 35, 25, 0, TAU); c.clip();
    c.fillStyle = '#1a0f08'; c.fill();
    if (!drawPortraitSpr(c, f.def.id, x + 34, y + 35, 25)) { c.translate(x + 30, y + 40); c.scale(1.6, 1.6); drawHead(c, f.look, { t: G.t }); }
    c.restore();
    c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 34, y + 35, 25, 0, TAU); c.stroke();
    txt(c, (f.netId === a.me ? '▶ ' : '') + f.name, x + 66, y + 26, { font: '700 17px Cinzel, serif', fill: '#f3dc9a' });
    const k = Math.max(0, f.hp / f.maxHp);
    bar(c, x + 66, y + 34, pw - 78, 13, k, (f.lagHp || f.hp) / f.maxHp, k > 0.3 ? ['#fff3a0', '#f5c518', '#c98a00'] : ['#ffb3a0', '#f04a2a', '#a01800']);
    for (let s = 0; s < f.stock; s++) { c.save(); c.translate(x + 74 + s * 18, y + 58); c.rotate(Math.PI / 4); c.fillStyle = col; c.fillRect(-5, -5, 10, 10); c.restore(); }
    txt(c, `KO ${f.kills}`, x + pw - 10, y + 63, { font: '600 17px Teko, sans-serif', align: 'right', fill: '#efe3c8' });
    c.restore();
  });
  const left = Math.max(0, Math.ceil((a.limit - a.time) / 60));
  txt(c, `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, W / 2, 118, { font: '700 40px Teko, sans-serif', align: 'center', fill: left < 20 ? '#ff7a5a' : '#f3dc9a', stroke: '#120800', sw: 5 });
  if (!a.isHost && G.t - a.lastState > 90) txt(c, 'Waiting for host…', W / 2, 160, { font: '700 20px Cinzel, serif', align: 'center', fill: '#ffb0a0', stroke: '#120800', sw: 4 });
  if (a.ended && a.result) drawArenaResult(c, a.result);
  else txt(c, 'Esc: leave match', W - 20, H - 14, { font: '600 13px Cinzel, serif', align: 'right', fill: 'rgba(240,220,180,0.6)' });
}
function drawArenaResult(c, r) {
  const k = G.arena.endT;
  c.fillStyle = `rgba(0,0,0,${Math.min(0.6, k / 40)})`; c.fillRect(0, 0, W, H);
  const iWon = G.players.some(p => p.netId === G.arena.me && p.side === r.winnerSide);
  const s = 1 + Math.max(0, 0.5 - k / 30);
  c.save(); c.translate(W / 2, 230); c.scale(s, s);
  txt(c, iWon ? 'VICTORY' : 'DEFEAT', 0, 0, { font: '900 96px "Cinzel Decorative", Cinzel, serif', align: 'center', fill: iWon ? goldGrad(c, -80, 0) : '#c8261a', stroke: '#120800', sw: 10 });
  c.restore();
  const head = r.mode === 'team' ? `${(r.teamNames && r.teamNames[r.winnerSide]) || 'Team ' + r.winnerSide} wins` : `${r.winners.join(', ')} wins`;
  txt(c, head, W / 2, 285, { font: '900 26px Cinzel, serif', align: 'center', fill: '#f3dc9a', stroke: '#120800', sw: 5 });
  panel(c, W / 2 - 300, 310, 600, 40 + r.stats.length * 34, { r: 14 });
  txt(c, 'PLAYER', W / 2 - 270, 340, { font: '700 15px Cinzel, serif', fill: '#bfae86' });
  txt(c, 'K.O.', W / 2 + 150, 340, { font: '700 15px Cinzel, serif', align: 'center', fill: '#bfae86' });
  txt(c, 'DOWNS', W / 2 + 240, 340, { font: '700 15px Cinzel, serif', align: 'center', fill: '#bfae86' });
  r.stats.slice().sort((x, y) => y.kills - x.kills).forEach((st, i) => {
    const y = 372 + i * 34;
    txt(c, st.name + (st.side === r.winnerSide ? '  ♛' : ''), W / 2 - 270, y, { font: '700 19px Cinzel, serif', fill: st.side === r.winnerSide ? '#f3cf6a' : '#efe3c8' });
    txt(c, String(st.kills), W / 2 + 150, y, { font: '600 26px Teko, sans-serif', align: 'center', fill: '#fff' });
    txt(c, String(st.deaths), W / 2 + 240, y, { font: '600 26px Teko, sans-serif', align: 'center', fill: '#fff' });
  });
  txt(c, 'Returning to the lobby…', W / 2, H - 40, { font: '600 16px Cinzel, serif', align: 'center', fill: '#d9c9a3' });
}
