#!/usr/bin/env node
/* =========================================================
   MUSTAFA online server.
   - Serves the game's static files (so one deploy hosts everything).
   - WebSocket at /ws: channels (lobbies), presence, chat, friends,
     teams, match rooms (duel / free-for-all / team vs team) and
     a relay for the host-authoritative netcode.
   Run: npm install && npm start   (PORT env var, default 8137)
   ========================================================= */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8137;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CHANNELS = ['Global', 'Bangladesh', 'Asia', 'Europe', 'Americas'];
const MODES = { duel: { max: 2, label: 'Duel 1v1' }, ffa: { max: 4, label: 'Free-for-all' }, team: { max: 8, label: 'Team vs Team' } };
const HEROES = ['mustafa', 'rakib', 'nadia', 'bablu'];
const STAGE_COUNT = 6;

/* ---------- persistence (friends + teams survive restarts) ---------- */
let db = { users: {}, teams: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* first run */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch (e) { console.error('save failed', e.message); }
  }, 500);
}
const uid = (n = 8) => crypto.randomBytes(n).toString('hex');
const clean = (s, max = 20) => String(s || '').replace(/[^\p{L}\p{N} _.\-']/gu, '').trim().slice(0, max);

/* ---------- static file server ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || /[\\/](server|node_modules|\.git)[\\/]/.test(file.slice(ROOT.length))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': p.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache' });
    res.end(data);
  });
});

/* ---------- live state ---------- */
const clients = new Map();   // id -> client
const rooms = new Map();     // roomId -> room
const send = (c, msg) => { if (c && c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); };
const GRACE_MS = 20000;   // a dropped player keeps their place in a match this long
const online = id => clients.has(id);
const userName = id => (clients.get(id) || {}).name || (db.users[id] || {}).name || 'Player';
const status = c => (c.room ? (rooms.get(c.room) && rooms.get(c.room).status === 'playing' ? 'in match' : 'in room') : 'idle');

function channelInfo(name) {
  const players = [...clients.values()].filter(c => c.channel === name).map(c => ({ id: c.id, name: c.name, hero: c.hero, status: status(c), team: teamOf(c.id) ? db.teams[teamOf(c.id)].name : null }));
  const list = [...rooms.values()].filter(r => r.channel === name).map(roomSummary);
  return { t: 'channel', name, players, rooms: list, channels: CHANNELS.map(n => ({ name: n, count: [...clients.values()].filter(c => c.channel === n).length })) };
}
function broadcastChannel(name) { const info = channelInfo(name); for (const c of clients.values()) if (c.channel === name) send(c, info); }
function teamOf(id) { return (db.users[id] || {}).team || null; }
function socialInfo(id) {
  const u = db.users[id]; if (!u) return null;
  const team = u.team && db.teams[u.team];
  return {
    t: 'social',
    friends: (u.friends || []).map(f => ({ id: f, name: userName(f), online: online(f), status: online(f) ? status(clients.get(f)) : 'offline' })),
    requests: (u.requests || []).map(f => ({ id: f, name: userName(f) })),
    teamInvites: (u.teamInvites || []).filter(t => db.teams[t]).map(t => ({ id: t, name: db.teams[t].name })),
    team: team ? { id: u.team, name: team.name, owner: team.owner, members: team.members.map(m => ({ id: m, name: userName(m), online: online(m), status: online(m) ? status(clients.get(m)) : 'offline' })) } : null,
  };
}
function pushSocial(id) { const c = clients.get(id); if (c) send(c, socialInfo(id)); }
function pushSocialAround(id) {
  pushSocial(id);
  const u = db.users[id]; if (!u) return;
  for (const f of u.friends || []) pushSocial(f);
  const team = u.team && db.teams[u.team];
  if (team) for (const m of team.members) pushSocial(m);
}

/* ---------- rooms ---------- */
function roomSummary(r) { return { id: r.id, name: r.name, mode: r.mode, label: MODES[r.mode].label, count: r.players.length, max: MODES[r.mode].max, status: r.status, stage: r.stage, quick: !!r.quick,
  teamNames: r.teamNames || null, players: r.players.map(p => ({ id: p.id, name: userName(p.id), hero: p.hero, side: p.side })) }; }
function roomInfo(r) {
  return { t: 'room', room: { id: r.id, name: r.name, mode: r.mode, label: MODES[r.mode].label, stage: r.stage, host: r.host, status: r.status, max: MODES[r.mode].max, quick: !!r.quick, countdown: r.countdownAt ? Math.max(0, r.countdownAt - Date.now()) : 0,
    teamNames: r.teamNames || null, players: r.players.map(p => ({ id: p.id, name: userName(p.id), hero: p.hero, side: p.side, ready: p.ready })) } };
}
function pushRoom(r) { const info = roomInfo(r); for (const p of r.players) send(clients.get(p.id), info); broadcastChannel(r.channel); }
function createRoom(host, mode, name, stage, extra) {
  const r = { id: uid(4), channel: host.channel, mode, name: clean(name, 28) || `${host.name}'s ${MODES[mode].label}`, stage: stage | 0, host: host.id, status: 'open', players: [], ...extra };
  rooms.set(r.id, r);
  return r;
}
function pickSide(r, id) {
  if (r.mode !== 'team') return id;
  if (r.teamSides) { const t = teamOf(id); if (t && r.teamSides[t]) return r.teamSides[t]; }
  const a = r.players.filter(p => p.side === 'A').length, b = r.players.filter(p => p.side === 'B').length;
  return a <= b ? 'A' : 'B';
}
// quick rooms start by themselves: duels when full, bigger modes after a short countdown
function scheduleQuick(r) {
  if (!r.quick || r.status !== 'open') return;
  const full = r.players.length >= MODES[r.mode].max, enough = r.players.length >= 2 && (r.mode !== 'team' || new Set(r.players.map(p => p.side)).size === 2);
  clearTimeout(r.quickTimer); r.countdownAt = 0;
  if (!enough) { pushRoom(r); return; }
  const delay = full || r.mode === 'duel' ? 3500 : 12000;
  r.countdownAt = Date.now() + delay;
  r.quickTimer = setTimeout(() => { if (rooms.get(r.id) === r && r.status === 'open' && r.players.length >= 2) startRoom(r); }, delay);
  pushRoom(r);
}
function startRoom(r) {
  r.status = 'playing'; r.countdownAt = 0;
  r.startMsg = { t: 'start', roomId: r.id, mode: r.mode, stage: r.stage, host: r.host, seed: uid(4), teamNames: r.teamNames || null,
    players: r.players.map(p => ({ id: p.id, name: userName(p.id), hero: p.hero, side: p.side })) };
  for (const p of r.players) send(clients.get(p.id), r.startMsg);
  pushRoom(r); for (const p of r.players) pushSocialAround(p.id);
}
function joinRoom(c, r) {
  if (c.room === r.id) return pushRoom(r);
  if (r.status !== 'open') return send(c, { t: 'toast', text: 'That match has already started.' });
  if (r.players.length >= MODES[r.mode].max) return send(c, { t: 'toast', text: 'That room is full.' });
  leaveRoom(c);
  r.players.push({ id: c.id, hero: c.hero, side: pickSide(r, c.id), ready: false });
  c.room = r.id;
  pushRoom(r); pushSocialAround(c.id);
}
function leaveRoom(c) {
  const r = c.room && rooms.get(c.room);
  c.room = null;
  if (!r) return;
  r.players = r.players.filter(p => p.id !== c.id);
  if (r.status === 'playing') for (const p of r.players) send(clients.get(p.id), { t: 'left', id: c.id, host: r.host === c.id });
  if (!r.players.length) { rooms.delete(r.id); broadcastChannel(r.channel); }
  else {
    if (r.host === c.id) { r.host = r.players[0].id; if (r.status === 'playing') for (const p of r.players) send(clients.get(p.id), { t: 'host', id: r.host }); }
    if (r.status === 'playing' && r.players.length < 2) { r.status = 'open'; for (const p of r.players) p.ready = false; }
    pushRoom(r);
    scheduleQuick(r);
  }
  send(c, { t: 'room', room: null });
  pushSocialAround(c.id);
}

/* ---------- messages ---------- */
const handlers = {
  hello(c, m) {
    let id = String(m.id || ''), user = db.users[id];
    if (!user || user.token !== m.token) { id = uid(6); user = db.users[id] = { token: uid(12), name: '', friends: [], requests: [], team: null, teamInvites: [] }; }
    const prev = clients.get(id);
    if (prev && !prev.ws) {                       // came back within the grace period: resume
      clearTimeout(prev.graceTimer); prev.graceTimer = null; prev.ws = c.ws; c.resumed = prev;
      send(prev, { t: 'welcome', you: { id, token: user.token, name: prev.name, hero: prev.hero }, channels: CHANNELS, modes: MODES });
      const r = prev.room && rooms.get(prev.room);
      if (r) { send(prev, roomInfo(r)); if (r.status === 'playing' && r.startMsg) { send(prev, { ...r.startMsg, t: 'resume', host: r.host }); for (const p of r.players) if (p.id !== id) send(clients.get(p.id), { t: 'lag', id, on: false }); } }
      broadcastChannel(prev.channel); pushSocialAround(id);
      return;
    }
    if (prev) {                                   // already open in another tab: this tab plays as a separate player
      id = uid(6); user = db.users[id] = { token: uid(12), name: '', friends: [], requests: [], team: null, teamInvites: [] };
    }
    c.id = id; c.name = clean(m.name) || user.name || 'Hero' + id.slice(0, 4); c.hero = HEROES.includes(m.hero) ? m.hero : 'mustafa';
    user.name = c.name; save();
    clients.set(id, c);
    send(c, { t: 'welcome', you: { id, token: user.token, name: c.name, hero: c.hero }, channels: CHANNELS, modes: MODES });
    handlers.join(c, { channel: CHANNELS.includes(m.channel) ? m.channel : 'Global' });
    pushSocialAround(id);
  },
  profile(c, m) {
    if (m.name) { c.name = clean(m.name) || c.name; db.users[c.id].name = c.name; save(); }
    if (HEROES.includes(m.hero)) c.hero = m.hero;
    const r = c.room && rooms.get(c.room);
    if (r) { const p = r.players.find(p => p.id === c.id); if (p && r.status === 'open') p.hero = c.hero; pushRoom(r); }
    broadcastChannel(c.channel); pushSocialAround(c.id);
  },
  join(c, m) {
    const name = clean(m.channel, 24) || 'Global';
    const prev = c.channel; c.channel = name;
    if (prev && prev !== name) broadcastChannel(prev);
    broadcastChannel(name);
  },
  chat(c, m) {
    const text = String(m.text || '').slice(0, 200).trim(); if (!text) return;
    const msg = { t: 'chat', from: c.id, name: c.name, text, scope: m.scope === 'room' ? 'room' : m.scope === 'team' ? 'team' : 'channel' };
    if (msg.scope === 'room') { const r = rooms.get(c.room); if (r) for (const p of r.players) send(clients.get(p.id), msg); }
    else if (msg.scope === 'team') { const t = db.teams[teamOf(c.id)]; if (t) for (const id of t.members) send(clients.get(id), msg); }
    else for (const o of clients.values()) if (o.channel === c.channel) send(o, msg);
  },
  friendRequest(c, m) {
    const to = db.users[m.to]; if (!to || m.to === c.id) return;
    const me = db.users[c.id];
    if ((me.friends || []).includes(m.to)) return send(c, { t: 'toast', text: 'Already friends.' });
    if ((me.requests || []).includes(m.to)) return handlers.friendAccept(c, { from: m.to });
    to.requests = [...new Set([...(to.requests || []), c.id])]; save();
    send(c, { t: 'toast', text: `Friend request sent to ${userName(m.to)}.` });
    pushSocial(m.to); send(clients.get(m.to), { t: 'toast', text: `${c.name} sent you a friend request.` });
  },
  friendAccept(c, m) {
    const me = db.users[c.id], other = db.users[m.from];
    if (!other || !(me.requests || []).includes(m.from)) return;
    me.requests = me.requests.filter(x => x !== m.from);
    me.friends = [...new Set([...(me.friends || []), m.from])];
    other.friends = [...new Set([...(other.friends || []), c.id])];
    save(); pushSocialAround(c.id); pushSocial(m.from);
    send(clients.get(m.from), { t: 'toast', text: `${c.name} accepted your friend request.` });
  },
  friendDecline(c, m) { const me = db.users[c.id]; me.requests = (me.requests || []).filter(x => x !== m.from); save(); pushSocial(c.id); },
  friendRemove(c, m) {
    const me = db.users[c.id], other = db.users[m.id];
    me.friends = (me.friends || []).filter(x => x !== m.id);
    if (other) other.friends = (other.friends || []).filter(x => x !== c.id);
    save(); pushSocial(c.id); pushSocial(m.id);
  },
  teamCreate(c, m) {
    const name = clean(m.name, 24); if (!name) return send(c, { t: 'toast', text: 'Give your team a name.' });
    if (teamOf(c.id)) return send(c, { t: 'toast', text: 'Leave your current team first.' });
    if (Object.values(db.teams).some(t => t.name.toLowerCase() === name.toLowerCase())) return send(c, { t: 'toast', text: 'That team name is taken.' });
    const id = uid(4);
    db.teams[id] = { name, owner: c.id, members: [c.id] };
    db.users[c.id].team = id; save();
    pushSocialAround(c.id); broadcastChannel(c.channel);
  },
  teamInvite(c, m) {
    const tid = teamOf(c.id), t = db.teams[tid], to = db.users[m.to];
    if (!t || !to) return;
    if (t.members.length >= 8) return send(c, { t: 'toast', text: 'Teams can have up to 8 members.' });
    to.teamInvites = [...new Set([...(to.teamInvites || []), tid])]; save();
    pushSocial(m.to);
    send(clients.get(m.to), { t: 'invite', kind: 'team', teamId: tid, name: c.name, team: t.name });
    send(c, { t: 'toast', text: `Team invite sent to ${userName(m.to)}.` });
  },
  teamAccept(c, m) {
    const u = db.users[c.id], t = db.teams[m.teamId];
    u.teamInvites = (u.teamInvites || []).filter(x => x !== m.teamId);
    if (!t) { save(); return pushSocial(c.id); }
    if (u.team) handlers.teamLeave(c);
    t.members = [...new Set([...t.members, c.id])]; u.team = m.teamId; save();
    pushSocialAround(c.id); broadcastChannel(c.channel);
  },
  teamDecline(c, m) { const u = db.users[c.id]; u.teamInvites = (u.teamInvites || []).filter(x => x !== m.teamId); save(); pushSocial(c.id); },
  teamLeave(c) {
    const u = db.users[c.id], t = db.teams[u.team]; if (!t) return;
    const tid = u.team; u.team = null;
    t.members = t.members.filter(x => x !== c.id);
    if (!t.members.length) delete db.teams[tid];
    else { if (t.owner === c.id) t.owner = t.members[0]; for (const mm of t.members) pushSocial(mm); }
    save(); pushSocial(c.id); broadcastChannel(c.channel);
  },
  // 1v1 challenge to a specific player
  challenge(c, m) {
    const to = clients.get(m.to); if (!to || to.id === c.id) return send(c, { t: 'toast', text: 'That player is offline.' });
    if (to.room) return send(c, { t: 'toast', text: `${to.name} is busy right now.` });
    const r = createRoom(c, m.mode && MODES[m.mode] ? m.mode : 'duel', '', m.stage);
    joinRoom(c, r);
    send(to, { t: 'invite', kind: 'room', roomId: r.id, name: c.name, label: MODES[r.mode].label });
    send(c, { t: 'toast', text: `Challenge sent to ${to.name}.` });
  },
  // team captain (or any member) challenges another team: everyone online gets invited, sides fixed by team
  teamChallenge(c, m) {
    const mine = teamOf(c.id), theirs = m.teamId;
    if (!mine || !db.teams[theirs] || mine === theirs) return send(c, { t: 'toast', text: 'Pick another team to challenge.' });
    const r = createRoom(c, 'team', `${db.teams[mine].name} vs ${db.teams[theirs].name}`, m.stage, { teamSides: { [mine]: 'A', [theirs]: 'B' }, teamNames: { A: db.teams[mine].name, B: db.teams[theirs].name } });
    joinRoom(c, r);
    for (const id of [...db.teams[mine].members, ...db.teams[theirs].members]) {
      if (id === c.id) continue;
      const o = clients.get(id);
      if (o && !o.room) send(o, { t: 'invite', kind: 'room', roomId: r.id, name: c.name, label: r.name });
    }
  },
  teamChallengeByMember(c, m) { const t = teamOf(m.member); if (t) handlers.teamChallenge(c, { teamId: t, stage: m.stage }); },
  roomCreate(c, m) { const r = createRoom(c, MODES[m.mode] ? m.mode : 'duel', m.name, m.stage); joinRoom(c, r); },
  roomJoin(c, m) { const r = rooms.get(m.roomId); if (!r) return send(c, { t: 'toast', text: 'That room is gone.' }); joinRoom(c, r); },
  roomLeave(c) { leaveRoom(c); },
  roomUpdate(c, m) {
    const r = rooms.get(c.room); if (!r || r.status !== 'open') return;
    const p = r.players.find(p => p.id === c.id); if (!p) return;
    if (HEROES.includes(m.hero)) { p.hero = m.hero; c.hero = m.hero; }
    if (r.mode === 'team' && !r.teamSides && (m.side === 'A' || m.side === 'B')) p.side = m.side;
    if (typeof m.ready === 'boolean') p.ready = m.ready;
    if (r.host === c.id && m.stage !== undefined) r.stage = Math.max(0, Math.min(STAGE_COUNT - 1, m.stage | 0));
    pushRoom(r);
  },
  roomStart(c) {
    const r = rooms.get(c.room); if (!r || r.host !== c.id || r.status !== 'open') return;
    if (r.players.length < 2) return send(c, { t: 'toast', text: 'You need at least 2 players.' });
    if (r.mode === 'team' && new Set(r.players.map(p => p.side)).size < 2) return send(c, { t: 'toast', text: 'Both sides need at least one player.' });
    if (r.players.some(p => !p.ready && p.id !== r.host)) return send(c, { t: 'toast', text: 'Waiting for everyone to press Ready.' });
    startRoom(r);
  },
  // match traffic: each player owns their fighter and shares it with the room; the host referees items and the result
  relay(c, m) {
    const r = rooms.get(c.room); if (!r || r.status !== 'playing') return;
    const msg = JSON.stringify({ t: 'relay', from: c.id, d: m.d });
    for (const p of r.players) if (p.id !== c.id) { const o = clients.get(p.id); if (o && o.ws && o.ws.readyState === 1) o.ws.send(msg); }
  },
  toHost(c, m) { const r = rooms.get(c.room); if (r && r.status === 'playing') send(clients.get(r.host), { t: 'relay', from: c.id, d: m.d }); },
  // one-click matchmaking: join an open quick room of this mode in the channel, or open one and wait
  quick(c, m) {
    const mode = m.mode === 'ffa' ? 'ffa' : m.mode === 'team' ? 'team' : 'duel';
    let r = [...rooms.values()].find(x => x.quick && x.mode === mode && x.channel === c.channel && x.status === 'open' && x.players.length < MODES[mode].max && !x.players.some(p => p.id === c.id));
    if (!r) r = createRoom(c, mode, `Quick ${MODES[mode].label}`, Math.floor(Math.random() * STAGE_COUNT), { quick: true });
    joinRoom(c, r);
    scheduleQuick(r);
  },
  // host-authoritative netcode relay (legacy)
  input(c, m) { const r = rooms.get(c.room); if (r && r.status === 'playing') send(clients.get(r.host), { t: 'input', from: c.id, d: m.d }); },
  state(c, m) {
    const r = rooms.get(c.room); if (!r || r.host !== c.id || r.status !== 'playing') return;
    const msg = JSON.stringify({ t: 'state', d: m.d });
    for (const p of r.players) if (p.id !== c.id) { const o = clients.get(p.id); if (o && o.ws.readyState === 1) o.ws.send(msg); }
  },
  matchEnd(c, m) {
    const r = rooms.get(c.room); if (!r || r.host !== c.id) return;
    r.status = 'open'; r.startMsg = null; for (const p of r.players) p.ready = false;
    for (const p of r.players) send(clients.get(p.id), { t: 'matchEnd', result: m.result });
    pushRoom(r); for (const p of r.players) pushSocialAround(p.id);
  },
  ping(c, m) { send(c, { t: 'pong', at: m.at }); },
};

function cleanup(c) {
  if (!c.id || clients.get(c.id) !== c) return;
  leaveRoom(c);
  clients.delete(c.id);
  if (c.channel) broadcastChannel(c.channel);
  pushSocialAround(c.id);
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', ws => {
  const c = { ws, id: null, name: '', hero: 'mustafa', channel: null, room: null, alive: true };
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const h = handlers[m && m.t];
    if (!h || (!c.id && !c.resumed && m.t !== 'hello')) return;
    try { h(c.resumed || c, m); } catch (e) { console.error('handler', m.t, e); }
  });
  ws.on('close', () => {
    const owner = c.resumed || c;
    if (owner.ws !== ws) return;                  // an older socket of a resumed player
    const r = owner.room && rooms.get(owner.room);
    if (owner.id && r && r.status === 'playing') {
      owner.ws = null;
      for (const p of r.players) if (p.id !== owner.id) send(clients.get(p.id), { t: 'lag', id: owner.id, on: true });
      owner.graceTimer = setTimeout(() => { owner.graceTimer = null; cleanup(owner); }, GRACE_MS);
      return;
    }
    cleanup(owner);
  });
});
// drop dead connections
setInterval(() => {
  for (const ws of wss.clients) { if (ws._dead) { ws.terminate(); continue; } ws._dead = true; ws.ping(); }
}, 30000);
wss.on('connection', ws => ws.on('pong', () => { ws._dead = false; }));

server.listen(PORT, () => console.log(`MUSTAFA server on http://localhost:${PORT}  (WebSocket /ws)`));
