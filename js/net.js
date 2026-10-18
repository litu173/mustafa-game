'use strict';
/* =========================================================
   MUSTAFA — online client: connection, Online Hub UI
   (profile, channels, players online, friends, teams, rooms,
   chat, invites) and the hand-off into arena matches.
   ========================================================= */
const HERO_NAMES = { mustafa: 'Mustafa', rakib: 'Rakib', nadia: 'Nadia', bablu: 'Bablu' };
const MODE_INFO = { duel: 'Duel 1v1', ffa: 'Free-for-all (up to 4)', team: 'Team vs Team (up to 4v4)' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function serverURL() {
  const cfg = (window.MUSTAFA_SERVER || '').trim();
  if (cfg) return cfg.replace(/^http/, 'ws').replace(/\/+$/, '') + '/ws';
  if (location.protocol === 'file:') return 'ws://localhost:8137/ws';
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
}

const Net = {
  ws: null, status: 'offline', me: { id: null, name: '', hero: 'mustafa' }, channel: null, channels: [], players: [], rooms: [],
  social: { friends: [], requests: [], team: null, teamInvites: [] }, room: null, chat: [], chatScope: 'channel', invites: [],
  retry: 0, el: null, open: false,

  ident() { try { return JSON.parse(localStorage.getItem('mustafa.net') || '{}'); } catch (e) { return {}; } },
  saveIdent(o) { try { localStorage.setItem('mustafa.net', JSON.stringify({ ...this.ident(), ...o })); } catch (e) { /* storage blocked */ } },

  connect() {
    if (this.ws && this.ws.readyState <= 1) return;
    this.status = 'connecting'; this.render();
    let ws;
    try { ws = new WebSocket(serverURL()); } catch (e) { this.status = 'offline'; this.render(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0; this.status = 'online';
      const id = this.ident();
      this.send({ t: 'hello', id: id.id, token: id.token, name: id.name || '', hero: id.hero || HEROES[G.selIdx].id });
    };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMessage(m); };
    ws.onclose = () => {
      this.ws = null; this.status = 'offline'; this.room = null;
      if (G.arena) { this.toast('Connection lost.'); endArena(); }
      this.render();
      if (this.open) setTimeout(() => this.open && this.connect(), Math.min(10000, 1000 * 2 ** this.retry++));
    };
  },
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },

  onMessage(m) {
    switch (m.t) {
      case 'welcome': this.me = m.you; this.saveIdent({ id: m.you.id, token: m.you.token, name: m.you.name, hero: m.you.hero }); break;
      case 'channel': this.channel = m.name; this.players = m.players; this.rooms = m.rooms; this.channels = m.channels; break;
      case 'social': this.social = m; break;
      case 'room': this.room = m.room; break;
      case 'chat': this.chat.push(m); if (this.chat.length > 120) this.chat.shift(); break;
      case 'toast': this.toast(m.text); break;
      case 'invite': this.invites.push(m); Sound.play('select'); break;
      case 'start': this.hideHub(); startArena(m); return;
      case 'input': if (G.arena && G.arena.isHost) { const ctl = G.arena.ctls.get(m.from); if (ctl) ctl.feed(m.d); } return;
      case 'state': if (G.arena && !G.arena.isHost) applySnapshot(m.d); return;
      case 'matchEnd': if (G.arena && !G.arena.isHost) showArenaResult(m.result); break;
      case 'left': if (G.arena) { const f = G.players.find(p => p.netId === m.id); if (f) { f.setState('out'); this.toast(`${f.name} left the match.`); } } break;
      case 'aborted': if (G.arena) { this.toast(m.text); endArena(); } break;
    }
    this.render();
  },

  /* ---------- hub visibility ---------- */
  openHub() {
    this.open = true; this.el.classList.remove('hidden');
    Input.locked = true; Input.clear();
    this.connect(); this.render();
  },
  hideHub() { this.open = false; this.el.classList.add('hidden'); Input.locked = false; Input.clear(); },
  closeHub() { if (this.room) this.send({ t: 'roomLeave' }); this.hideHub(); },
  toast(text) {
    const box = document.getElementById('toasts'); if (!box) return;
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = text; box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3800);
  },

  /* ---------- UI rendering ---------- */
  init() {
    this.el = document.getElementById('online');
    this.el.addEventListener('click', e => this.onClick(e));
    this.el.addEventListener('change', e => this.onChange(e));
    this.el.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.closeHub(); }
      if (e.key === 'Enter' && e.target.id === 'chatInput') { e.preventDefault(); this.sendChat(); }
      if (e.key === 'Enter' && e.target.id === 'nameInput') { e.preventDefault(); e.target.blur(); }
      if (e.key === 'Enter' && e.target.id === 'teamName') { e.preventDefault(); this.act('teamCreate'); }
      if (e.key === 'Enter' && e.target.id === 'chanInput') { e.preventDefault(); this.act('joinCustom'); }
    });
    this.render();
  },
  render() {
    if (!this.el || !this.open) return;
    const s = this.social, me = this.me;
    const dot = st => `<i class="dot ${st === 'offline' ? 'off' : st === 'idle' ? 'on' : 'busy'}"></i>`;
    const heroBtns = cur => Object.keys(HERO_NAMES).map(h => `<button class="chip ${cur === h ? 'sel' : ''}" data-act="hero" data-hero="${h}">${HERO_NAMES[h]}</button>`).join('');
    const stageOpts = sel => STAGES.map((st, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(st.name)}</option>`).join('');
    const statusTxt = { online: 'Online', connecting: 'Connecting…', offline: 'Offline — server unreachable' }[this.status];

    // left column: profile, channels, friends, team
    const friends = s.friends.map(f => `<li>${dot(f.status)}<span class="nm">${esc(f.name)}</span><small>${esc(f.status)}</small>
      ${f.online && f.status === 'idle' ? `<button class="mini" data-act="challenge" data-id="${f.id}">Duel</button>` : ''}
      ${s.team && s.team.owner === me.id && !s.team.members.some(m => m.id === f.id) ? `<button class="mini ghost" data-act="teamInvite" data-id="${f.id}">+Team</button>` : ''}
      <button class="mini ghost" data-act="unfriend" data-id="${f.id}" title="Remove friend">&times;</button></li>`).join('') || '<li class="empty">No friends yet. Add players from the list.</li>';
    const requests = s.requests.map(r => `<li><span class="nm">${esc(r.name)}</span> wants to be friends
      <button class="mini" data-act="accept" data-id="${r.id}">Accept</button><button class="mini ghost" data-act="decline" data-id="${r.id}">No</button></li>`).join('');
    const teamInv = s.teamInvites.map(t => `<li>Join team <b>${esc(t.name)}</b>? <button class="mini" data-act="teamAccept" data-id="${t.id}">Join</button><button class="mini ghost" data-act="teamDecline" data-id="${t.id}">No</button></li>`).join('');
    const team = s.team ? `<div class="teamhead"><b>${esc(s.team.name)}</b><small>${s.team.members.length}/8</small></div>
      <ul class="list">${s.team.members.map(m => `<li>${dot(m.status)}<span class="nm">${esc(m.name)}${m.id === s.team.owner ? ' ♛' : ''}</span><small>${esc(m.status)}</small></li>`).join('')}</ul>
      <button class="mini ghost" data-act="teamLeave">Leave team</button>`
      : `<div class="row"><input id="teamName" maxlength="24" placeholder="Team name"><button class="mini" data-act="teamCreate">Create</button></div>`;
    const left = `
      <section><h4>Profile</h4>
        <div class="row"><input id="nameInput" maxlength="20" value="${esc(me.name)}" placeholder="Your name"></div>
        <div class="chips">${heroBtns(me.hero)}</div></section>
      <section><h4>Channels</h4>
        <ul class="list chans">${(this.channels.length ? this.channels : [{ name: 'Global', count: 0 }]).map(ch => `<li class="${ch.name === this.channel ? 'cur' : ''}" data-act="join" data-ch="${esc(ch.name)}"># ${esc(ch.name)}<small>${ch.count}</small></li>`).join('')}</ul>
        <div class="row"><input id="chanInput" maxlength="24" placeholder="Custom channel"><button class="mini" data-act="joinCustom">Join</button></div></section>
      <section><h4>Friends</h4>${requests ? `<ul class="list req">${requests}</ul>` : ''}<ul class="list">${friends}</ul></section>
      <section><h4>Team</h4>${teamInv ? `<ul class="list req">${teamInv}</ul>` : ''}${team}</section>`;

    // center: room view or channel view
    let center;
    const r = this.room;
    if (r) {
      const isHost = r.host === me.id, mine = r.players.find(p => p.id === me.id) || {};
      const slot = p => `<li class="slot ${p.side === 'A' ? 'sa' : p.side === 'B' ? 'sb' : ''}"><span class="nm">${esc(p.name)}${p.id === r.host ? ' <small>host</small>' : ''}</span>
        <span>${HERO_NAMES[p.hero] || p.hero}</span><span class="${p.ready || p.id === r.host ? 'ok' : 'wait'}">${p.id === r.host ? 'HOST' : p.ready ? 'READY' : 'not ready'}</span></li>`;
      const sides = r.mode === 'team'
        ? ['A', 'B'].map(sd => `<div class="side s${sd}"><h5>${esc((r.teamNames && r.teamNames[sd]) || 'Team ' + sd)}</h5><ul class="list">${r.players.filter(p => p.side === sd).map(slot).join('') || '<li class="empty">empty</li>'}</ul>
          ${!r.teamNames && mine.side !== sd ? `<button class="mini ghost" data-act="side" data-side="${sd}">Switch here</button>` : ''}</div>`).join('')
        : `<ul class="list">${r.players.map(slot).join('')}</ul>`;
      center = `<section class="room"><h3>${esc(r.name)}</h3><p class="sub">${esc(r.label)} · ${r.players.length}/${r.max} players</p>
        <div class="row"><label>Stage</label><select id="roomStage" ${isHost ? '' : 'disabled'}>${stageOpts(r.stage)}</select></div>
        <div class="row"><label>Fighter</label><div class="chips">${heroBtns(mine.hero)}</div></div>
        <div class="sides ${r.mode === 'team' ? 'two' : ''}">${sides}</div>
        <div class="actions">
          ${isHost ? `<button class="cta" data-act="start">Start match</button>` : `<button class="cta ${mine.ready ? 'ghost' : ''}" data-act="ready">${mine.ready ? 'Not ready' : 'Ready'}</button>`}
          <button class="cta ghost" data-act="leaveRoom">Leave room</button></div>
        <p class="hint">Invite friends with <b>Duel</b> in your friends list, or share this room's name in chat.</p></section>`;
    } else {
      const others = this.players.filter(p => p.id !== me.id);
      const fr = new Set(s.friends.map(f => f.id));
      const myTeam = s.team;
      const plist = others.map(p => `<li>${dot(p.status)}<span class="nm">${esc(p.name)}</span><small>${HERO_NAMES[p.hero] || ''}${p.team ? ' · ' + esc(p.team) : ''}</small>
        ${p.status === 'idle' ? `<button class="mini" data-act="challenge" data-id="${p.id}">Duel</button>` : `<small class="busy">${esc(p.status)}</small>`}
        ${fr.has(p.id) ? '' : `<button class="mini ghost" data-act="friend" data-id="${p.id}">+Friend</button>`}
        ${myTeam && myTeam.owner === me.id && !p.team ? `<button class="mini ghost" data-act="teamInvite" data-id="${p.id}">+Team</button>` : ''}
        ${myTeam && p.team && p.team !== myTeam.name ? `<button class="mini ghost" data-act="teamChallenge" data-team="${esc(p.team)}">Team war</button>` : ''}</li>`).join('')
        || '<li class="empty">Nobody else here yet. Share the game link with friends!</li>';
      const rlist = this.rooms.map(rm => `<li><span class="nm">${esc(rm.name)}</span><small>${esc(rm.label)} · ${rm.count}/${rm.max} · ${rm.status === 'playing' ? 'in match' : 'open'}</small>
        ${rm.status === 'open' && rm.count < rm.max ? `<button class="mini" data-act="joinRoom" data-id="${rm.id}">Join</button>` : ''}</li>`).join('') || '<li class="empty">No rooms yet. Create one!</li>';
      center = `<section><h4>Players in #${esc(this.channel || '')}</h4><ul class="list players">${plist}</ul></section>
        <section><h4>Rooms</h4><ul class="list">${rlist}</ul>
          <div class="create"><select id="newMode">${Object.entries(MODE_INFO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          <select id="newStage">${stageOpts(0)}</select>
          <button class="cta" data-act="createRoom">Create room</button></div></section>`;
    }

    // right: chat
    const scopes = ['channel', ...(r ? ['room'] : []), ...(s.team ? ['team'] : [])];
    if (!scopes.includes(this.chatScope)) this.chatScope = 'channel';
    const chat = this.chat.filter(c => c.scope === this.chatScope).slice(-60)
      .map(c => `<div class="msg"><b class="${c.from === me.id ? 'me' : ''}">${esc(c.name)}</b> ${esc(c.text)}</div>`).join('') || '<div class="empty">Say hello!</div>';
    const right = `<section class="chat"><div class="tabs">${scopes.map(sc => `<button class="tab ${sc === this.chatScope ? 'sel' : ''}" data-act="scope" data-scope="${sc}">${sc === 'channel' ? '#' + esc(this.channel || '') : sc}</button>`).join('')}</div>
      <div class="msgs" id="msgs">${chat}</div><div class="row"><input id="chatInput" maxlength="200" placeholder="Message…"><button class="mini" data-act="chat">Send</button></div></section>`;

    const invites = this.invites.map((iv, i) => `<div class="invite"><b>${esc(iv.name)}</b> ${iv.kind === 'team' ? `invites you to team <b>${esc(iv.team)}</b>` : `challenges you: <b>${esc(iv.label)}</b>`}
      <button class="mini" data-act="inviteYes" data-i="${i}">Accept</button><button class="mini ghost" data-act="inviteNo" data-i="${i}">Decline</button></div>`).join('');

    const keepChat = document.getElementById('chatInput'), draft = keepChat ? keepChat.value : '', focused = document.activeElement && document.activeElement.id;
    this.el.querySelector('.hub').innerHTML = `
      <header><h2>ONLINE ARENA</h2><span class="status ${this.status}">${statusTxt}</span>${this.status === 'offline' ? '<button class="mini" data-act="reconnect">Retry</button>' : ''}<button class="close" data-act="close" aria-label="Close">&times;</button></header>
      ${invites ? `<div class="invites">${invites}</div>` : ''}
      <div class="cols"><div class="col left">${left}</div><div class="col mid">${center}</div><div class="col right">${right}</div></div>`;
    const ci = document.getElementById('chatInput'); if (ci) { ci.value = draft; if (focused === 'chatInput') ci.focus(); }
    const msgs = document.getElementById('msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  },
  sendChat() {
    const i = document.getElementById('chatInput'); if (!i || !i.value.trim()) return;
    this.send({ t: 'chat', text: i.value, scope: this.chatScope }); i.value = '';
  },
  onChange(e) {
    if (e.target.id === 'nameInput') { const name = e.target.value.trim(); if (name) { this.send({ t: 'profile', name }); this.saveIdent({ name }); } }
    if (e.target.id === 'roomStage') this.send({ t: 'roomUpdate', stage: +e.target.value });
  },
  onClick(e) {
    if (e.target === this.el) return this.closeHub();
    const b = e.target.closest('[data-act]'); if (!b) return;
    this.act(b.dataset.act, b.dataset);
  },
  act(a, d = {}) {
    const val = id => (document.getElementById(id) || {}).value;
    Sound.play('select');
    switch (a) {
      case 'close': this.closeHub(); break;
      case 'reconnect': this.retry = 0; this.connect(); break;
      case 'hero': this.me.hero = d.hero; this.saveIdent({ hero: d.hero }); G.selIdx = Math.max(0, HEROES.findIndex(h => h.id === d.hero));
        this.send({ t: 'profile', hero: d.hero }); if (this.room) this.send({ t: 'roomUpdate', hero: d.hero }); this.render(); break;
      case 'join': this.send({ t: 'join', channel: d.ch }); break;
      case 'joinCustom': { const ch = (val('chanInput') || '').trim(); if (ch) this.send({ t: 'join', channel: ch }); break; }
      case 'challenge': this.send({ t: 'challenge', to: d.id, mode: 'duel', stage: Math.floor(Math.random() * STAGES.length) }); break;
      case 'friend': this.send({ t: 'friendRequest', to: d.id }); break;
      case 'unfriend': this.send({ t: 'friendRemove', id: d.id }); break;
      case 'accept': this.send({ t: 'friendAccept', from: d.id }); break;
      case 'decline': this.send({ t: 'friendDecline', from: d.id }); break;
      case 'teamCreate': this.send({ t: 'teamCreate', name: val('teamName') }); break;
      case 'teamInvite': this.send({ t: 'teamInvite', to: d.id }); break;
      case 'teamAccept': this.send({ t: 'teamAccept', teamId: d.id }); break;
      case 'teamDecline': this.send({ t: 'teamDecline', teamId: d.id }); break;
      case 'teamLeave': this.send({ t: 'teamLeave' }); break;
      case 'teamChallenge': {
        const p = this.players.find(x => x.team === d.team);
        // the server resolves the team id from any member; ask via a member's id
        if (p) this.send({ t: 'teamChallengeByMember', member: p.id });
        break;
      }
      case 'createRoom': this.send({ t: 'roomCreate', mode: val('newMode'), stage: +val('newStage') }); break;
      case 'joinRoom': this.send({ t: 'roomJoin', roomId: d.id }); break;
      case 'leaveRoom': this.send({ t: 'roomLeave' }); break;
      case 'ready': { const mine = this.room.players.find(p => p.id === this.me.id); this.send({ t: 'roomUpdate', ready: !(mine && mine.ready) }); break; }
      case 'side': this.send({ t: 'roomUpdate', side: d.side }); break;
      case 'start': this.send({ t: 'roomStart' }); break;
      case 'scope': this.chatScope = d.scope; this.render(); break;
      case 'chat': this.sendChat(); break;
      case 'inviteYes': case 'inviteNo': {
        const iv = this.invites.splice(+d.i, 1)[0];
        if (iv && a === 'inviteYes') {
          if (iv.kind === 'team') this.send({ t: 'teamAccept', teamId: iv.teamId });
          else this.send({ t: 'roomJoin', roomId: iv.roomId });
        } else if (iv && iv.kind === 'team') this.send({ t: 'teamDecline', teamId: iv.teamId });
        this.render(); break;
      }
    }
  },
};
