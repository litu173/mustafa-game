'use strict';
/* =========================================================
   MUSTAFA — online arena (duel / free-for-all / team vs team).

   Netcode (built for players far from the server):
   - Every player simulates THEIR OWN fighter locally, so your
     moves react instantly — no waiting for a round trip.
   - Your fighter's state is shared with the room 30x a second.
     Other fighters are drawn ~100 ms in the past and smoothly
     interpolated between updates (with short extrapolation).
   - Hits are detected by the attacker against what they see and
     sent to the victim, whose game applies the damage.
   - The room host referees: item drops, the clock and the result.
   - A dropped connection keeps its seat for 20 s and resumes.
   ========================================================= */
const ARENA_W = 2560;
const INTERP_MS = 110;
const SIDE_COLORS = { A: '#ff5a46', B: '#4aa0ff' };
const FFA_COLORS = ['#ff5a46', '#4aa0ff', '#5ad46a', '#ffc83a', '#c46aff', '#ff8ad0', '#4ae0e0', '#f0f0f0'];

function colorFor(f) { return G.arena.mode === 'team' ? SIDE_COLORS[f.side] : FFA_COLORS[f.slot % FFA_COLORS.length]; }
const myFighter = () => G.arena && G.players.find(p => p.mine);
const fighterById = id => G.players.find(p => p.netId === id);
const arenaSend = d => { if (G.arena && !G.arena.offline) Net.send({ t: 'relay', d }); };   // bot matches stay on this device

/* ---------- start / resume / end ---------- */
function startArena(msg) {
  if (G.arena && G.arena.roomId === msg.roomId) { setArenaHost(msg.host); return; }   // resumed after a reconnect
  const me = msg.offline ? 'me' : Net.me.id;
  G.arena = {
    offline: !!msg.offline, mode: msg.mode, host: msg.host, isHost: msg.host === me, me, roomId: msg.roomId, teamNames: msg.teamNames,
    stage: msg.stage, time: 0, limit: 60 * 60 * 3, ended: false, endT: 0, result: null, sendT: 0,
    itemT: 300, itemSeq: 0, projSeq: 0, offlineSince: 0, startAt: G.t,
  };
  const stocks = msg.mode === 'team' ? 2 : 3;
  G.players = msg.players.map((pl, i) => {
    const hi = Math.max(0, HEROES.findIndex(h => h.id === pl.hero));
    const def = HEROES[hi], look = { ...def.look };
    const x = 400 + (i * (ARENA_W - 800)) / Math.max(1, msg.players.length - 1);
    const f = new Fighter(def, 'hero', x, BELT_TOP + 50 + (i % 3) * 70, look);
    f.netId = pl.id; f.name = pl.name; f.side = pl.side; f.slot = i; f.stock = stocks; f.kills = 0; f.deaths = 0;
    f.lastTap = { d: 0, t: -99 }; f.running = false; f.weapon = null; f.facing = x < ARENA_W / 2 ? 1 : -1;
    if (pl.id === me) { f.mine = true; f.ctl = Input; }
    else { f.remote = true; f.buf = []; }
    return f;
  });
  G.enemies = []; G.items = []; G.props = []; G.projs = []; G.parts = []; G.texts = [];
  setFloor(ARENAS[msg.stage % ARENAS.length].theme);
  for (const f of G.players) f.y = clamp(f.y, BELT_TOP + 10, BELT_BOT - 10);
  G.stageIdx = msg.stage; G.camX = clamp((myFighter() || G.players[0]).x - W / 2, 0, ARENA_W - W);
  G.camLock = null; G.waveIdx = 0; G.queue = []; G.boss = null; G.drive = null;
  G.combo = 0; G.comboT = 0; G.focus = null; G.banner = { title: 'FIGHT!', sub: modeLabel(), t: 0, dur: 110, big: true };
  G.hitstop = 0; G.slowmo = 0; G.flash = 0; G.shake = 0; G.paused = false;
  G.scene = 'play'; G.sceneT = 0; G.stageTime = 0;
  Music.play('boss', ARENAS[msg.stage % ARENAS.length].transpose || 0);
  Sound.play('confirm');
}
function setArenaHost(id) { if (G.arena) { G.arena.host = id; G.arena.isHost = id === G.arena.me; } }
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
  if (!G.arena.offline) Net.send({ t: 'roomLeave' });
  endArena();
}

/* ---------- PvP rules used by the combat code ---------- */
function arenaFoes(f) { return G.players.filter(o => o !== f && o.side !== f.side && o.state !== 'out'); }
function arenaBound(p) { p.x = clamp(p.x, 40, ARENA_W - 40); p.y = clamp(p.y, BELT_TOP, BELT_BOT); }
// My attack connected with someone else's fighter: show it now, let their game apply it
function arenaHitRemote(t, a, dmg, m) {
  if (!t.canBeHit || (t.hitLockUntil || 0) > G.t) return false;
  dmg = Math.max(1, Math.round(dmg));
  const dir = m.dir || Math.sign(t.x - a.x) || a.facing || 1;
  arenaSend({ k: 'hit', to: t.netId, dmg, dir, m: { down: !!m.down, kbx: m.kbx, kbz: m.kbz, kb: m.kb, stun: m.stun, shake: m.shake } });
  hitFx(t, dir, dmg, !!m.down);
  t.flash = 8;
  if (m.down) t.hitLockUntil = G.t + 20;    // don't re-hit a falling target before its owner reports it
  G.hitstop = Math.max(G.hitstop, m.down ? 5 : 3);
  return true;
}
function hitFx(t, dir, dmg, down) {
  const hz = t.z + 110 * t.scale;
  sparks(t.x - dir * 14 * t.scale, t.y + 1, hz, down);
  Sound.play(down || dmg >= 14 ? 'heavy' : 'punch');
  popText(t.x, t.y, hz + 30, String(dmg), '#ffe9a8', 30 + Math.min(18, dmg));
  G.shake = Math.max(G.shake, down ? 7 : 3);
}
function arenaLost(p) {   // only ever called for my own fighter
  p.deaths++; p.stock--;
  arenaSend({ k: 'ko', by: p.lastHitBy || null });
  creditKO(p.lastHitBy, p);
  if (p.stock > 0) {
    p.hp = p.lagHp = p.maxHp; p.koed = false; p.move = null; p.inv = 180; p.weapon = null;
    p.x = clamp(G.camX + rand(200, W - 200), 200, ARENA_W - 200); p.y = rand(BELT_TOP + 20, BELT_BOT - 20); p.z = 700; p.vz = 0; p.setState('drop');
  } else { p.setState('out'); p.z = 0; G.arena.lastOut = p; }   // the finish (K.O. + fanfare) plays when the match ends
}
function creditKO(by, victim) {
  const killer = fighterById(by);
  if (killer && killer !== victim) { if (killer.mine || killer.bot) killer.kills++; popText(victim.x, victim.y, 360, 'K.O.!', '#ffd56b', 56); }
}

/* ---------- messages from other players ---------- */
function onArenaRelay(from, d) {
  const a = G.arena; if (!a) return;
  const f = fighterById(from), me = myFighter();
  switch (d.k) {
    case 'ps': if (f && f.remote) { f.buf.push({ at: performance.now(), s: d.s }); if (f.buf.length > 12) f.buf.shift(); f.lagging = false; } break;
    case 'hit':
      if (d.to === a.me && me && f) {
        me.lastHitBy = from;
        damage(me, f, d.dmg, { ...d.m, dir: d.dir });
      } else { const t = fighterById(d.to); if (t) hitFx(t, d.dir, d.dmg, d.m.down); }
      break;
    case 'ko': if (f) { a.lastOut = f; if (d.by === a.me && me) me.kills++; else popText(f.x, f.y, 360, 'K.O.!', '#ffd56b', 56); } break;
    case 'ex': explodeFx(d.x, d.y, d.z, d.r); Sound.play('boom'); break;
    case 'pj': G.projs.push({ ...d.p, remote: true, owner: f, team: 'hero' }); break;
    case 'pjx': G.projs = G.projs.filter(b => !(b.remote && b.id === d.id)); break;
    case 'it+': if (!G.items.some(i => i.id === d.id)) G.items.push({ id: d.id, kind: d.kind, x: d.x, y: d.y, z: 400, vz: 0, t: 0, life: 99999 }); break;
    case 'it-': {
      const it = G.items.find(i => i.id === d.id);
      G.items = G.items.filter(i => i.id !== d.id);
      if (d.by === a.me && it && me) grantItem(me, it);
      break;
    }
    case 'take': if (a.isHost) hostTake(from, d.id); break;
    case 'clk': if (!a.isHost) a.time = d.tm; break;
  }
}

/* ---------- items: the host decides who got there first ---------- */
function arenaTake(it, who) {
  if ((it.pending || 0) > G.t) return;
  it.pending = G.t + 30;
  if (who && who.bot) return hostTake(who.netId, it.id);
  if (G.arena.isHost) hostTake(G.arena.me, it.id); else Net.send({ t: 'toHost', d: { k: 'take', id: it.id } });
}
function hostTake(by, id) {
  const it = G.items.find(i => i.id === id); if (!it) return;
  G.items = G.items.filter(i => i.id !== id);
  arenaSend({ k: 'it-', id, by });
  const who = fighterById(by);
  if (who && (who.mine || who.bot)) grantItem(who, it);
}
function grantItem(p, it) {
  if (FOOD[it.kind]) { p.hp = Math.min(p.maxHp, p.hp + FOOD[it.kind]); popText(p.x, p.y, 300, '+' + FOOD[it.kind] + ' HP', '#8dffb0', 40); Sound.play('eat'); }
  else if (WEAPONS.includes(it.kind)) pickWeapon(p, { ...it, granted: true });
}
function arenaItems() {
  const me = myFighter();
  for (const it of G.items) {
    it.t++;
    if (it.z > 0) { it.vz -= 0.55; it.z = Math.max(0, it.z + it.vz); if (it.z === 0) it.vz = 0; }
    if (!me || me.state === 'out' || me.state === 'drop' || WEAPONS.includes(it.kind)) continue;
    if (Math.abs(me.x - it.x) < 60 && Math.abs(me.y - it.y) < 34 && me.z < 30 && it.z < 10) arenaTake(it);
  }
}

/* ---------- per-frame update ---------- */
function arenaUpdate() {
  const a = G.arena;
  if (Input.hit('pause')) { if (window.confirm('Leave this match?')) leaveArena(); return; }
  if (G.shake > 0) { G.shake *= 0.86; if (G.shake < 0.3) G.shake = 0; }
  if (G.flash > 0) G.flash--;
  if (G.banner && ++G.banner.t > G.banner.dur) G.banner = null;
  updateRemotes();
  if (a.ended) { a.endT++; updateParticles(); updateArenaCamera(); if (a.endT > 60 * 7 + (a.koDelay || 0)) endArena(); return; }
  a.time++; G.stageTime++;
  pulseDanger(myFighter && myFighter());
  const me = myFighter();
  if (G.hitstop > 0) G.hitstop--;
  else {
    if (me && me.state !== 'out') updatePlayer(me);
    if (a.offline) updateBots();
    updateProjectiles();
    G.projs = G.projs.filter(b => !b.remove);
    arenaItems();
  }
  updateParticles();
  // share my fighter 30x a second
  if (me && ++a.sendT >= 2) { a.sendT = 0; arenaSend({ k: 'ps', s: packFighter(me) }); }
  if (a.isHost) hostDuties();
  updateArenaCamera();
  // connection trouble: keep playing locally, give up after the server's grace period
  if (a.offline) a.offlineSince = 0;
  else if (Net.status !== 'online') { a.offlineSince = a.offlineSince || G.t; if (G.t - a.offlineSince > 60 * 22) { Net.toast('Connection lost.'); endArena(); } }
  else a.offlineSince = 0;
}
function hostDuties() {
  const a = G.arena;
  if (a.time % 30 === 0) arenaSend({ k: 'clk', tm: a.time });
  if (--a.itemT <= 0) {
    a.itemT = Math.round(60 * rand(7, 11));
    const it = { id: 'i' + (++a.itemSeq), kind: pick(['pizza', 'hotdog', 'meat', 'apple', 'pistol', 'rifle', 'uzi', 'shotgun', 'bazooka', 'grenade', 'knife', 'pipe', 'machete']),
      x: Math.round(rand(200, ARENA_W - 200)), y: Math.round(rand(BELT_TOP + 20, BELT_BOT - 20)) };
    G.items.push({ ...it, z: 400, vz: 0, t: 0, life: 99999 });
    arenaSend({ k: 'it+', ...it });
  }
  checkArenaWin();
}
function checkArenaWin() {
  const a = G.arena;
  if (a.time < 120) return;                              // everyone's first update has had time to arrive
  const alive = G.players.filter(p => p.state !== 'out' && p.stock > 0);
  const sides = new Set(alive.map(p => p.side));
  const timeUp = a.time >= a.limit;
  if (sides.size > 1 && !timeUp) return;
  let winner = alive.length ? alive[0].side : null;
  if (timeUp && sides.size > 1) {
    const score = {}; for (const p of alive) score[p.side] = (score[p.side] || 0) + p.stock * 1000 + p.hp;
    winner = Object.entries(score).sort((x, y) => y[1] - x[1])[0][0];
  }
  const result = {
    winnerSide: winner, mode: a.mode, teamNames: a.teamNames, ko: !(timeUp && sides.size > 1) && alive.length > 0,
    winners: G.players.filter(p => p.side === winner).map(p => p.name),
    stats: G.players.map(p => ({ id: p.netId, name: p.name, side: p.side, kills: p.kills, deaths: p.deaths, hero: p.def.id })),
  };
  if (!a.offline) Net.send({ t: 'matchEnd', result });
  showArenaResult(result);
}
function showArenaResult(result) {
  const a = G.arena; if (!a || a.ended) return;
  a.ended = true; a.endT = 0; a.result = result; a.koDelay = 0;
  const iWon = G.players.some(p => p.netId === a.me && p.side === result.winnerSide);
  // won by knockout: the same big finish as the story missions, then the result panel
  const loser = result.ko && ((a.lastOut && a.lastOut.side !== result.winnerSide && a.lastOut) || G.players.find(p => p.side !== result.winnerSide && p.state === 'out'));
  Music.play('victory');
  if (loser) {
    const who = result.mode === 'team' ? ((result.teamNames && result.teamNames[result.winnerSide]) || 'TEAM ' + result.winnerSide) : result.winners.join(' & ');
    bigKO(loser, (who + ' WINS').toUpperCase()); a.koDelay = 150;
  } else Sound.play(iWon ? 'fanfare' : 'over');
  const me = myFighter();
  if (me && me.side === result.winnerSide && me.state !== 'out') { me.move = null; me.z = 0; me.setState('win'); }
}

/* ---------- fighter replication ---------- */
const r1 = v => Math.round(v);
function packFighter(p) {
  return [r1(p.x), r1(p.y), r1(p.z), p.facing, p.state, p.t, p.moveName || '', r1(p.hp), p.inv > 0 ? 1 : 0, p.flash, p.weapon || '', p.ammo | 0,
    r1(p.walkPh * 100), p.running ? 1 : 0, p.jatk ? 1 : 0, p.sub | 0, p.stock, p.kills, p.deaths, r1(p.lagHp), p.subKind || ''];
}
// Draw remote fighters slightly in the past, blending between the two updates around that moment
function updateRemotes() {
  const now = performance.now(), rt = now - INTERP_MS;
  for (const f of G.players) {
    if (!f.remote || !f.buf.length) continue;
    const buf = f.buf;
    let i = buf.length - 1;
    while (i > 0 && buf[i].at > rt) i--;
    const b0 = buf[i], b1 = buf[i + 1];
    let x, y, z, src = b0;
    if (b1) {
      const k = clamp((rt - b0.at) / Math.max(1, b1.at - b0.at), 0, 1);
      x = lerp(b0.s[0], b1.s[0], k); y = lerp(b0.s[1], b1.s[1], k); z = lerp(b0.s[2], b1.s[2], k);
      if (k > 0.5) src = b1;
    } else {
      // no newer update yet: extrapolate briefly from the last two
      const prev = buf[i - 1], dt = Math.min(150, rt - b0.at);
      const vx = prev ? (b0.s[0] - prev.s[0]) / Math.max(1, b0.at - prev.at) : 0, vy = prev ? (b0.s[1] - prev.s[1]) / Math.max(1, b0.at - prev.at) : 0;
      x = b0.s[0] + vx * Math.max(0, dt); y = b0.s[1] + vy * Math.max(0, dt); z = b0.s[2];
      if (now - b0.at > 1500) f.lagging = true;
    }
    const s = src.s, frames = Math.max(0, (rt - src.at) / 16.67);
    if (f.state !== s[4] || f.moveName !== (s[6] || null)) {          // play the other player's move sounds
      if (s[4] === 'jump') Sound.play('jump');
      else if (s[4] === 'attack' && s[6] && MOVES[s[6]] && MOVES[s[6]].sfx) Sound.play(MOVES[s[6]].sfx);
    }
    f.x = x; f.y = y; f.z = z; f.facing = s[3]; f.state = s[4]; f.t = Math.round(s[5] + frames);
    f.moveName = s[6] || null; f.move = s[6] ? MOVES[s[6]] : null;
    f.hp = s[7]; f.inv = s[8] ? 2 : 0; if ((f.flash || 0) < s[9]) f.flash = s[9]; else if (f.flash > 0) f.flash--;
    f.weapon = s[10] || null; f.ammo = s[11]; f.walkPh = s[12] / 100 + (f.state === 'walk' ? frames * 0.19 : 0);
    f.running = !!s[13]; f.jatk = !!s[14]; f.sub = s[15]; f.stock = s[16]; f.kills = s[17]; f.deaths = s[18]; f.lagHp = s[19]; f.subKind = s[20] || 'knee';
  }
}
function updateArenaCamera() {
  const me = myFighter();
  const target = me ? me.x - W * 0.5 : G.camX;
  G.camX = clamp(G.camX + (target - G.camX) * 0.15, 0, ARENA_W - W);
}
function explodeFx(x, y, z, radius) {
  G.shake = Math.max(G.shake, 16); G.flash = Math.max(G.flash, 5); G.flashCol = '#ffd9a0';
  for (let i = 0; i < 12; i++) addPart({ type: 'fire', x: x + rand(-40, 40), y: y + rand(-6, 6), z: z + rand(0, 80), vx: rand(-3, 3), vz: rand(1, 4), life: rand(26, 44), size: rand(40, 80) });
  for (let i = 0; i < 8; i++) addPart({ type: 'smoke', x: x + rand(-50, 50), y, z: z + rand(30, 120), vx: rand(-1, 1), vz: rand(1, 2.5), life: rand(50, 80), size: rand(40, 70) });
  addPart({ type: 'ring', x, y, z: 2, life: 22, size: radius * 1.2, color: '#ffd9a0', flat: true });
}

/* ---------- drawing: name tags + arena HUD ---------- */
function drawArenaTags(c) {
  for (const f of G.players) {
    if (f.state === 'out') continue;
    const x = f.x - G.camX, y = f.y - f.z - 330, col = colorFor(f);
    c.save();
    c.font = '700 20px Teko, sans-serif'; c.textAlign = 'center';
    const label = f.mine ? 'YOU' : (f.bot ? '\u2699 ' : '') + f.name + (f.lagging ? '  ⧖' : ''), w = c.measureText(label).width + 18;
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
    txt(c, (f.mine ? '▶ ' : '') + f.name, x + 66, y + 26, { font: '700 17px Cinzel, serif', fill: '#f3dc9a' });
    const k = Math.max(0, f.hp / f.maxHp);
    bar(c, x + 66, y + 34, pw - 78, 13, k, (f.lagHp || f.hp) / f.maxHp, k > 0.3 ? ['#fff3a0', '#f5c518', '#c98a00'] : ['#ffb3a0', '#f04a2a', '#a01800']);
    for (let s = 0; s < f.stock; s++) { c.save(); c.translate(x + 74 + s * 18, y + 58); c.rotate(Math.PI / 4); c.fillStyle = col; c.fillRect(-5, -5, 10, 10); c.restore(); }
    txt(c, `KO ${f.kills}`, x + pw - 10, y + 63, { font: '600 17px Teko, sans-serif', align: 'right', fill: '#efe3c8' });
    c.restore();
  });
  const left = Math.max(0, Math.ceil((a.limit - a.time) / 60));
  txt(c, `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, W / 2, 118, { font: '700 40px Teko, sans-serif', align: 'center', fill: left < 20 ? '#ff7a5a' : '#f3dc9a', stroke: '#120800', sw: 5 });
  if (!a.offline && Net.status !== 'online') txt(c, 'Reconnecting…', W / 2, 160, { font: '700 22px Cinzel, serif', align: 'center', fill: '#ffb0a0', stroke: '#120800', sw: 4 });
  if (a.ended && a.result) drawArenaResult(c, a.result);
  else txt(c, 'Esc: leave match', W - 20, H - 14, { font: '600 13px Cinzel, serif', align: 'right', fill: 'rgba(240,220,180,0.6)' });
}
function drawArenaResult(c, r) {
  const k = G.arena.endT - (G.arena.koDelay || 0); if (k < 0) return;   // let the K.O. finish play first
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
