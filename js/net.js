'use strict';
/* =========================================================
   MUSTAFA — online client: connection + the Online Hub
   (quick play, live fight cards, VS room, friends, teams, chat).
   ========================================================= */
// identifies a lobby button across redraws (same action, same target)
const btnKey = b => ['act', 'mode', 'tab', 'i', 'id', 'hero', 'room'].map(k => b.dataset[k] || '').join('|') + '|' + b.className;
const HERO_NAMES = { mustafa: 'Mustafa', rakib: 'Robin', nadia: 'Nova', bablu: 'Roy' };
const HERO_ROLE = { mustafa: 'The Hunter', rakib: 'The Mechanic', nadia: 'The Storm', bablu: 'The Bulldozer' };
const MODE_INFO = {
  duel: { title: 'Quick Duel', short: 'DUEL', sub: '1 vs 1 · starts as soon as an opponent joins', icon: '⚔' },
  ffa: { title: 'Free-for-all', short: 'FREE-FOR-ALL', sub: 'Up to 4 fighters · last one standing', icon: '☠' },
  team: { title: 'Team Battle', short: 'TEAM BATTLE', sub: 'Up to 4 vs 4 · red team vs blue team', icon: '⚑' },
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const stageImg = i => `assets/bg/${(ARENAS[i] || ARENAS[0]).theme}.jpg?v=3`;

function serverURL() {
  const cfg = (window.MUSTAFA_SERVER || '').trim();
  if (cfg) return cfg.replace(/^http/, 'ws').replace(/\/+$/, '') + '/ws';
  if (location.protocol === 'file:') return 'ws://localhost:8137/ws';
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
}
// ?lag=150 simulates a slow connection (ms each way) for testing the netcode
const SIM_LAG = Math.max(0, +(new URLSearchParams(location.search).get('lag')) || 0);

const Net = {
  ws: null, status: 'offline', me: { id: null, name: '', hero: 'mustafa' }, channel: null, channels: [], players: [], rooms: [],
  social: { friends: [], requests: [], team: null, teamInvites: [] }, room: null, chat: [], chatScope: 'channel', invites: [],
  retry: 0, el: null, open: false, tab: 'play', creating: false, newMode: 'duel', newStage: 0,

  /* identity: each browser tab is its own player; the name/fighter preference is shared */
  ident() {
    try {
      const tab = JSON.parse(sessionStorage.getItem('mustafa.tab') || 'null');
      const saved = JSON.parse(localStorage.getItem('mustafa.net') || '{}');
      return { ...saved, ...(tab || {}) };
    } catch (e) { return {}; }
  },
  saveIdent(o) {
    try {
      const saved = JSON.parse(localStorage.getItem('mustafa.net') || '{}');
      if (o.name || o.hero) localStorage.setItem('mustafa.net', JSON.stringify({ ...saved, ...(o.name ? { name: o.name } : {}), ...(o.hero ? { hero: o.hero } : {}) }));
      if (o.id) {
        sessionStorage.setItem('mustafa.tab', JSON.stringify({ id: o.id, token: o.token }));
        if (!saved.id || saved.id === o.id) localStorage.setItem('mustafa.net', JSON.stringify({ ...JSON.parse(localStorage.getItem('mustafa.net') || '{}'), id: o.id, token: o.token }));
      }
    } catch (e) { /* storage blocked */ }
  },

  connect() {
    if (this.ws && this.ws.readyState <= 1) return;
    this.status = 'connecting'; this.render();
    let ws;
    try { ws = new WebSocket(serverURL()); } catch (e) { this.status = 'offline'; this.render(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0; this.status = 'online';
      const id = this.ident();
      this.rawSend({ t: 'hello', id: id.id, token: id.token, name: id.name || '', hero: id.hero || HEROES[G.selIdx].id });
    };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (SIM_LAG) setTimeout(() => this.onMessage(m), SIM_LAG); else this.onMessage(m);
    };
    ws.onclose = () => {
      this.ws = null; this.status = 'offline';
      if (!G.arena) this.room = null;
      this.render();
      // keep trying while the lobby is open or a match is running (the server holds our seat for 20 s)
      if (this.open || G.arena) setTimeout(() => (this.open || G.arena) && this.connect(), Math.min(G.arena ? 1500 : 10000, 800 * 2 ** this.retry++));
    };
  },
  rawSend(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },
  send(m) { if (SIM_LAG) setTimeout(() => this.rawSend(m), SIM_LAG); else this.rawSend(m); },

  onMessage(m) {
    switch (m.t) {
      case 'welcome': this.me = m.you; this.saveIdent({ id: m.you.id, token: m.you.token, name: m.you.name, hero: m.you.hero }); break;
      case 'channel': this.channel = m.name; this.players = m.players; this.rooms = m.rooms; this.channels = m.channels; break;
      case 'social': this.social = m; break;
      case 'room': this.room = m.room; if (m.room) this.tab = 'play'; break;
      case 'chat': this.chat.push(m); if (this.chat.length > 120) this.chat.shift(); if (!this.chatOpen && m.from !== this.me.id) this.unread = (this.unread || 0) + 1; break;
      case 'toast': this.toast(m.text); break;
      case 'invite': this.invites.push(m); Sound.play('select'); break;
      case 'start': case 'resume': this.hideHub(); startArena(m); return;
      case 'relay': if (G.arena) onArenaRelay(m.from, m.d); return;
      case 'host': setArenaHost(m.id); return;
      case 'lag': if (G.arena) { const f = fighterById(m.id); if (f) f.lagging = m.on; } return;
      case 'matchEnd': if (G.arena) showArenaResult(m.result); break;
      case 'left': if (G.arena) { const f = fighterById(m.id); if (f) { f.state = 'out'; f.stock = 0; this.toast(`${f.name} left the match.`); } } break;
      case 'aborted': if (G.arena) { this.toast(m.text); endArena(); } break;
    }
    this.render();
  },

  /* ---------- hub visibility ---------- */
  openHub() {
    this.open = true; this.el.classList.remove('hidden');
    Input.locked = true; Input.clear();
    this.connect(); this.render();
    setTimeout(() => { if (this.open) this.focusFirst(); }, 60);
  },
  hideHub() {
    this.open = false; this.el.classList.add('hidden'); Input.locked = false; Input.clear();
    // hand the keyboard back to the game: a focused lobby button would otherwise swallow every key
    if (document.activeElement && this.el.contains(document.activeElement)) document.activeElement.blur();
    const cv = document.getElementById('game'); if (cv) cv.focus({ preventScroll: true });
  },
  // keyboard: arrows jump to the nearest button in that direction
  moveFocus(key) {
    const all = [...this.el.querySelectorAll('button, input, select, [tabindex="0"]')].filter(b => !b.disabled && b.offsetParent);
    if (!all.length) return;
    const cur = document.activeElement;
    if (!all.includes(cur)) return all[0].focus();
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
    let best = null, bestD = 1e9;
    for (const b of all) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      if (along <= 4) continue;
      const d = along + across * 2.5;
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) { best.focus(); Sound.play('select'); }
  },
  focusFirst() {
    const b = ['.findbtn', 'button.btn', 'button'].map(q => [...this.el.querySelectorAll(q)].find(x => !x.disabled && x.offsetParent)).find(Boolean);
    if (b) b.focus({ preventScroll: true });
  },
  closeHub() { if (this.room) this.send({ t: 'roomLeave' }); this.hideHub(); },
  toast(text) {
    const box = document.getElementById('toasts'); if (!box) return;
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = text; box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3800);
  },

  init() {
    this.el = document.getElementById('online');
    this.el.addEventListener('click', e => this.onClick(e));
    this.el.addEventListener('change', e => this.onChange(e));
    this.el.addEventListener('keydown', e => {
      if (!this.open) return;            // hub hidden: keys belong to the game
      e.stopPropagation();
      const id = e.target.id;
      if (e.key === 'Escape') { e.preventDefault(); this.closeHub(); }
      if (e.key.startsWith('Arrow') && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); this.moveFocus(e.key); return; }
      if (e.key !== 'Enter') return;
      if (id === 'chatInput') { e.preventDefault(); this.sendChat(); }
      if (id === 'nameInput') { e.preventDefault(); e.target.blur(); }
      if (id === 'teamName') { e.preventDefault(); this.act('teamCreate'); }
      if (id === 'chanInput') { e.preventDefault(); this.act('joinCustom'); }
    });
    setInterval(() => {
      const r = this.room, alone = this.open && r && r.quick && r.status !== 'playing' && r.players.length <= 1;
      if (!alone) this.waitSince = 0;
      else if (!this.waitSince) this.waitSince = Date.now();
      else if (Date.now() - this.waitSince > 12000) { this.toast('Nobody online right now — ROBOPLAY joins the fight!'); this.act('robo', { mode: r.mode }); return; }
      if (this.open && r && (r.countdown || alone)) this.render();
    }, 500);
    this.render();
  },

  /* ---------- rendering helpers ---------- */
  avatar(hero, size = 40, cls = '') { return `<canvas class="av ${cls}" data-hero="${esc(hero)}" data-kind="head" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px"></canvas>`; },
  body(hero, w, h, flip) { return `<canvas class="bodycv" data-hero="${esc(hero)}" data-kind="body" ${flip ? 'data-flip="1"' : ''} width="${w * 2}" height="${h * 2}" style="width:${w}px;height:${h}px"></canvas>`; },
  paint() {
    for (const cv of this.el.querySelectorAll('canvas[data-hero]')) {
      const c = cv.getContext('2d'), w = cv.width, h = cv.height, key = cv.dataset.hero, d = SPRITE_DEFS[key];
      c.clearRect(0, 0, w, h);
      if (!d || !window.ATLAS || !window.ATLAS[d.a] || !SPR.img[d.a]) continue;
      if (cv.dataset.kind === 'body') {
        const sheet = SPR.img[key + '_d'] ? key + '_d' : d.a, fr = window.ATLAS[sheet][0];
        drawSprite(c, sheet, 0, w / 2, h - 6, cv.dataset.flip ? -1 : 1, Math.min((h * 0.94) / fr.h, (w * 0.95) / fr.w));
      } else {
        c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); c.clip();
        const g = c.createRadialGradient(w / 2, h / 3, 2, w / 2, h / 2, w / 2); g.addColorStop(0, '#6a4420'); g.addColorStop(1, '#1a0f08');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        drawPortraitSpr(c, key, w / 2, h / 2 + w * 0.04, w / 2);
        c.restore();
      }
    }
  },
  render() {
    if (!this.el || !this.open) return;
    const keep = {};
    for (const inp of this.el.querySelectorAll('input')) keep[inp.id] = inp.value;
    const focused = document.activeElement && document.activeElement.id;
    const ae = document.activeElement, focusKey = ae && ae.tagName === 'BUTTON' && this.el.contains(ae) ? btnKey(ae) : null;
    const statusTxt = { online: 'ONLINE', connecting: 'CONNECTING…', offline: 'OFFLINE' }[this.status];
    const s = this.social, reqCount = s.requests.length + s.teamInvites.length;
    const head = `<header>
        <button class="back" data-act="back" aria-label="Back">◀</button>
        <div class="brand"><img src="assets/logo-sm.webp?v=3" alt="Mustafa Reborn"><span class="sub">ONLINE ARENA</span></div>
        <span class="status ${this.status}"><i></i>${statusTxt}</span>
        ${this.status === 'offline' ? '<button class="btn sm" data-act="reconnect">Retry</button>' : ''}
        <label class="chan"># <select id="chanSelect">${(this.channels.length ? this.channels : [{ name: this.channel || 'Global', count: 0 }]).map(c => `<option value="${esc(c.name)}" ${c.name === this.channel ? 'selected' : ''}>${esc(c.name)} (${c.count})</option>`).join('')}${this.channel && !this.channels.some(c => c.name === this.channel) ? `<option selected>${esc(this.channel)}</option>` : ''}</select></label>
        <div class="mechip">${this.avatar(this.me.hero, 34)}<input id="nameInput" maxlength="20" value="${esc(this.me.name)}" placeholder="Your name" title="Click to rename"></div>
      </header>
      <nav class="tabs">
        ${[['play', this.room ? '⚔ YOUR MATCH' : '⚔ PLAY'], ['friends', '♥ FRIENDS'], ['team', '⚑ TEAM']].map(([k, l]) => `<button class="tab ${this.tab === k ? 'sel' : ''}" data-act="tab" data-tab="${k}">${l}${k === 'friends' && reqCount ? `<b class="badge">${reqCount}</b>` : ''}</button>`).join('')}
      </nav>`;
    const invites = this.invites.map((iv, i) => `<div class="invite">${this.avatar('mustafa', 28)}<span><b>${esc(iv.name)}</b> ${iv.kind === 'team' ? `invites you to team <b>${esc(iv.team)}</b>` : `challenges you to <b>${esc(iv.label)}</b>!`}</span>
      <button class="btn sm gold" data-act="inviteYes" data-i="${i}">Accept</button><button class="btn sm" data-act="inviteNo" data-i="${i}">Decline</button></div>`).join('');
    let main = '';
    if (this.tab === 'play') main = this.room ? this.roomView() : this.lobbyView();
    else if (this.tab === 'friends') main = this.friendsView();
    else main = this.teamView();
    if (this.chatOpen === undefined) this.chatOpen = false;
    this.el.querySelector('.hub').innerHTML = `${head}${invites ? `<div class="invites">${invites}</div>` : ''}
      <div class="body nochat"><div class="main">${main}</div></div>
      ${this.chatOpen ? this.chatView() : `<button class="chatfab" data-act="chatToggle"><span>💬</span> CHAT${this.unread ? `<b>${this.unread}</b>` : ''}</button>`}`;
    if (this.chatOpen) this.unread = 0;
    for (const [id, v] of Object.entries(keep)) { const inp = document.getElementById(id); if (inp && id !== 'nameInput') inp.value = v; }
    if (focused) { const f = document.getElementById(focused); if (f) f.focus(); }
    else if (focusKey) {   // the lobby redraws itself often: keep keyboard focus on the same button
      const f = [...this.el.querySelectorAll('button')].find(b => btnKey(b) === focusKey);
      if (f) f.focus({ preventScroll: true });
    }
    const msgs = document.getElementById('msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
    this.paint();
  },
  heroPicker(cur) {
    return `<div class="heroes">${Object.keys(HERO_NAMES).map(h => `<button class="hero ${cur === h ? 'sel' : ''}" data-act="hero" data-hero="${h}">
      ${this.body(h, 92, 120)}<b>${HERO_NAMES[h]}</b><small>${HERO_ROLE[h]}</small></button>`).join('')}</div>`;
  },
  // PUBG-style lobby: your fighter centre stage, pick a mode, one big button
  heroCarousel(cur) {
    const keys = Object.keys(HERO_NAMES), i = Math.max(0, keys.indexOf(cur));
    return `<div class="showcase">
      <button class="arrow" data-act="heroStep" data-d="-1" aria-label="Previous fighter">◀</button>
      <div class="stagehero">${this.body(cur, 230, 290)}<div class="plinth"></div><b>${HERO_NAMES[cur]}</b><small>${HERO_ROLE[cur]}</small>
        <div class="dots">${keys.map((k, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div></div>
      <button class="arrow" data-act="heroStep" data-d="1" aria-label="Next fighter">▶</button></div>`;
  },
  lobbyView() {
    const waiting = mode => this.rooms.filter(r => r.quick && r.mode === mode && r.status === 'open').reduce((n, r) => n + r.count, 0);
    const qm = this.qmode || 'duel';
    const modes = Object.entries(MODE_INFO).map(([k, v], i) => `<button class="mode-card ${qm === k ? 'sel' : ''}" data-act="qmode" data-mode="${k}" style="background-image:linear-gradient(90deg,rgba(10,5,4,.92),rgba(10,5,4,.35)),url(${stageImg([0, 4, 5][i])})">
        <span class="qicon">${v.icon}</span><span><b>${v.title.toUpperCase()}</b><small>${v.sub}</small></span>
        ${waiting(k) ? `<em>${waiting(k)} waiting</em>` : ''}</button>`).join('');
    const live = this.rooms.map(r => {
      const playing = r.status === 'playing', full = r.count >= r.max;
      const faces = r.players.map(p => this.avatar(p.hero, 26)).join('<span class="vs">VS</span>') + (r.count < r.max ? '<i class="emptyface">?</i>' : '');
      return `<div class="card match ${playing ? 'live' : ''}" style="background-image:linear-gradient(180deg,rgba(8,4,4,.2) 0%,rgba(8,4,4,.95) 75%),url(${stageImg(r.stage)})">
        <div class="mtop"><span class="mode m-${r.mode}">${MODE_INFO[r.mode].short}</span><span class="st ${playing ? 'fight' : 'open'}">${playing ? '● LIVE' : `${r.count}/${r.max}`}</span></div>
        <div class="mname">${esc(r.name)}</div><div class="mfaces">${faces}</div>
        ${playing ? '<button class="btn wide" disabled>Fighting…</button>' : full ? '<button class="btn wide" disabled>Full</button>' : `<button class="btn gold wide" data-act="joinRoom" data-id="${r.id}">JOIN</button>`}
      </div>`;
    }).join('');
    const others = this.players.filter(p => p.id !== this.me.id);
    const friends = new Set(this.social.friends.map(f => f.id));
    const online = others.map(p => `<div class="pchip">${this.avatar(p.hero, 34)}<div class="pinfo"><b>${esc(p.name)}</b><small><i class="dot ${p.status === 'idle' ? 'on' : 'busy'}"></i>${p.status === 'idle' ? 'Ready' : esc(p.status)}</small></div>
        ${p.status === 'idle' ? `<button class="btn sm gold" data-act="challenge" data-id="${p.id}">⚔ Duel</button>` : ''}
        ${friends.has(p.id) ? '<span class="tagf">♥</span>' : `<button class="btn sm" data-act="friend" data-id="${p.id}" title="Add friend">+♥</button>`}</div>`).join('');
    const create = this.creating ? `<div class="create">
        <div class="row">${Object.entries(MODE_INFO).map(([k, v]) => `<button class="chip ${this.newMode === k ? 'sel' : ''}" data-act="newMode" data-mode="${k}">${v.icon} ${v.title}</button>`).join('')}</div>
        <div class="stages">${ARENAS.map((st, i) => `<button class="stage ${this.newStage === i ? 'sel' : ''}" data-act="newStage" data-i="${i}" style="background-image:url(${stageImg(i)})"><span>${esc(st.name)}</span></button>`).join('')}</div>
        <div class="row"><button class="btn gold" data-act="createRoom">Create private match</button><button class="btn" data-act="toggleCreate">Cancel</button></div></div>` : '';
    return `<div class="lobby">
        ${this.heroCarousel(this.me.hero)}
        <div class="playcol"><div class="modes">${modes}</div>
          <button class="findbtn" data-act="quick" data-mode="${qm}">⚔ FIND MATCH<small>${MODE_INFO[qm].title} · starts automatically</small></button>
          <button class="robobtn" data-act="robo" data-mode="${qm}">⚙ PLAY VS ROBOPLAY<small>robot players · works offline</small></button>
          <button class="linkbtn" data-act="toggleCreate">${this.creating ? 'Close' : 'Play with friends: create a private match'}</button></div>
      </div>
      ${create}
      <section><h3>LIVE FIGHTS <small>#${esc(this.channel || '')} · tap JOIN to jump in</small></h3><div class="strip">${live || '<div class="empty">No fights yet. Press <b>FIND MATCH</b> and others will join you.</div>'}</div></section>
      <section><h3>ONLINE NOW <small>${others.length}</small></h3><div class="pchips">${online || '<div class="empty">Nobody else is here yet. Share the game link with friends!</div>'}</div></section>`;
  },
  roomView() {
    const r = this.room, me = this.me, isHost = r.host === me.id, mine = r.players.find(p => p.id === me.id) || {};
    const card = (p, flip) => p ? `<div class="fcard ${p.side === 'A' ? 'sa' : p.side === 'B' ? 'sb' : ''} ${p.id === me.id ? 'mine' : ''}">
        ${this.body(p.hero, 150, 190, flip)}<b>${esc(p.name)}${p.id === me.id ? ' (you)' : ''}</b><small>${HERO_NAMES[p.hero] || ''}</small>
        <span class="rd ${p.ready || r.quick || p.id === r.host ? 'ok' : ''}">${p.id === r.host ? 'HOST' : (p.ready || r.quick) ? '✓ READY' : 'not ready'}</span></div>`
      : `<div class="fcard empty"><div class="spin"></div><b>Waiting…</b><small>for a challenger</small></div>`;
    let arena;
    if (r.mode === 'team') {
      arena = ['A', 'B'].map(sd => {
        const list = r.players.filter(p => p.side === sd);
        return `<div class="side s${sd}"><h4>${esc((r.teamNames && r.teamNames[sd]) || (sd === 'A' ? 'RED TEAM' : 'BLUE TEAM'))}</h4><div class="fcards">${list.map(p => card(p, sd === 'B')).join('') || card(null)}</div>
          ${!r.teamNames && mine.side !== sd && !r.quick ? `<button class="btn sm" data-act="side" data-side="${sd}">Switch to this side</button>` : ''}</div>`;
      }).join('<div class="bigvs">VS</div>');
    } else {
      const slots = []; for (let i = 0; i < r.max; i++) slots.push(r.players[i] || null);
      arena = slots.map((p, i) => card(p, i % 2 === 1)).join('<div class="bigvs">VS</div>');
    }
    const cd = r.countdown ? Math.ceil(r.countdown / 1000) : 0;
    const roboIn = this.waitSince ? Math.max(0, Math.ceil((12000 - (Date.now() - this.waitSince)) / 1000)) : 12;
    const status = cd ? `<div class="countdown">FIGHT STARTS IN <b>${cd}</b></div>` : r.quick ? `<div class="countdown wait">Looking for opponents… ${r.players.length <= 1 ? `ROBOPLAY joins in <b>${roboIn}</b>s` : 'the fight starts automatically'}</div>` : '';
    return `<div class="banner" style="background-image:linear-gradient(90deg,rgba(8,4,4,.92),rgba(8,4,4,.35)),url(${stageImg(r.stage)})">
        <span class="mode m-${r.mode}">${MODE_INFO[r.mode].short}</span><h2>${esc(r.name)}</h2><p>${esc((ARENAS[r.stage] || {}).name || '')} · ${r.players.length}/${r.max} fighters</p>${status}</div>
      <div class="vsarea ${r.mode === 'team' ? 'team' : ''}">${arena}</div>
      <section><h3>YOUR FIGHTER</h3>${this.heroCarousel(mine.hero || this.me.hero)}</section>
      ${isHost && !r.quick ? `<section><h3>STAGE</h3><div class="stages">${ARENAS.map((st, i) => `<button class="stage ${r.stage === i ? 'sel' : ''}" data-act="roomStage" data-i="${i}" style="background-image:url(${stageImg(i)})"><span>${esc(st.name)}</span></button>`).join('')}</div></section>` : ''}
      <div class="actions">
        ${r.quick ? '' : isHost ? `<button class="btn gold big" data-act="start">⚔ START FIGHT</button>` : `<button class="btn ${mine.ready ? '' : 'gold'} big" data-act="ready">${mine.ready ? 'Cancel ready' : '✓ I\'M READY'}</button>`}
        ${r.quick && r.players.length <= 1 ? `<button class="btn gold big" data-act="robo" data-mode="${r.mode}">⚙ Fight ROBOPLAY now</button>` : ''}
        <button class="btn big" data-act="leaveRoom">Leave</button></div>`;
  },
  friendsView() {
    const s = this.social;
    const reqs = s.requests.map(r => `<div class="pchip">${this.avatar('mustafa', 38)}<div class="pinfo"><b>${esc(r.name)}</b><small>wants to be your friend</small></div>
      <button class="btn sm gold" data-act="accept" data-id="${r.id}">Accept</button><button class="btn sm" data-act="decline" data-id="${r.id}">Decline</button></div>`).join('');
    const list = s.friends.map(f => `<div class="pchip">${this.avatar('mustafa', 38)}<div class="pinfo"><b>${esc(f.name)}</b><small><i class="dot ${f.status === 'offline' ? 'off' : f.status === 'idle' ? 'on' : 'busy'}"></i>${esc(f.status)}</small></div>
      ${f.online && f.status === 'idle' ? `<button class="btn sm gold" data-act="challenge" data-id="${f.id}">⚔ Duel</button>` : ''}
      ${s.team && s.team.owner === this.me.id && !s.team.members.some(m => m.id === f.id) ? `<button class="btn sm" data-act="teamInvite" data-id="${f.id}">+ Team</button>` : ''}
      <button class="btn sm" data-act="unfriend" data-id="${f.id}" title="Remove friend">&times;</button></div>`).join('');
    return `${reqs ? `<section><h3>FRIEND REQUESTS</h3><div class="pchips">${reqs}</div></section>` : ''}
      <section><h3>YOUR FRIENDS <small>${s.friends.length}</small></h3><div class="pchips">${list || '<div class="empty big">No friends yet. Add players from <b>Online now</b> on the Play tab with the +♥ button.</div>'}</div></section>`;
  },
  teamView() {
    const s = this.social, t = s.team;
    const inv = s.teamInvites.map(x => `<div class="pchip"><div class="pinfo"><b>Team ${esc(x.name)}</b><small>invited you to join</small></div>
      <button class="btn sm gold" data-act="teamAccept" data-id="${x.id}">Join</button><button class="btn sm" data-act="teamDecline" data-id="${x.id}">No</button></div>`).join('');
    if (!t) return `${inv ? `<section><h3>TEAM INVITES</h3><div class="pchips">${inv}</div></section>` : ''}
      <section class="teamnew"><h3>CREATE A TEAM</h3><p>Form a team with your friends (up to 8) and challenge other teams to a team battle.</p>
        <div class="row"><input id="teamName" maxlength="24" placeholder="Team name, e.g. Dhaka Tigers"><button class="btn gold" data-act="teamCreate">Create team</button></div></section>`;
    const rivals = [...new Set(this.players.filter(p => p.team && p.team !== t.name).map(p => p.team))];
    const friendsOut = s.friends.filter(f => !t.members.some(m => m.id === f.id));
    return `${inv ? `<section><h3>TEAM INVITES</h3><div class="pchips">${inv}</div></section>` : ''}
      <section><div class="teamcard"><span class="crest">⚑</span><div><h2>${esc(t.name)}</h2><small>${t.members.length}/8 members · captain ${esc((t.members.find(m => m.id === t.owner) || {}).name || '')}</small></div>
        <button class="btn sm" data-act="teamLeave">Leave team</button></div>
        <div class="pchips">${t.members.map(m => `<div class="pchip">${this.avatar('mustafa', 38)}<div class="pinfo"><b>${esc(m.name)}${m.id === t.owner ? ' ♛' : ''}</b><small><i class="dot ${m.status === 'offline' ? 'off' : m.status === 'idle' ? 'on' : 'busy'}"></i>${esc(m.status)}</small></div></div>`).join('')}</div></section>
      <section><h3>CHALLENGE A TEAM</h3><div class="pchips">${rivals.map(name => `<div class="pchip"><span class="crest sm">⚑</span><div class="pinfo"><b>${esc(name)}</b><small>online in #${esc(this.channel || '')}</small></div>
        <button class="btn sm gold" data-act="teamChallenge" data-team="${esc(name)}">⚔ Team battle</button></div>`).join('') || '<div class="empty">No other teams online in this channel right now.</div>'}</div></section>
      ${t.owner === this.me.id ? `<section><h3>INVITE FRIENDS</h3><div class="pchips">${friendsOut.map(f => `<div class="pchip">${this.avatar('mustafa', 38)}<div class="pinfo"><b>${esc(f.name)}</b><small>${esc(f.status)}</small></div><button class="btn sm gold" data-act="teamInvite" data-id="${f.id}">Invite</button></div>`).join('') || '<div class="empty">Add friends first, then invite them here.</div>'}</div></section>` : ''}`;
  },
  chatView() {
    const r = this.room, s = this.social;
    const scopes = ['channel', ...(r ? ['room'] : []), ...(s.team ? ['team'] : [])];
    if (!scopes.includes(this.chatScope)) this.chatScope = 'channel';
    const msgs = this.chat.filter(c => c.scope === this.chatScope).slice(-60)
      .map(c => `<div class="msg"><b class="${c.from === this.me.id ? 'me' : ''}">${esc(c.name)}</b> ${esc(c.text)}</div>`).join('') || '<div class="empty">Say hello to everyone!</div>';
    return `<aside class="chat"><div class="chathead"><b>💬 CHAT</b><button class="cclose" data-act="chatToggle" aria-label="Close chat">✕</button></div><div class="ctabs">${scopes.map(sc => `<button class="ctab ${sc === this.chatScope ? 'sel' : ''}" data-act="scope" data-scope="${sc}">${sc === 'channel' ? '#' + esc(this.channel || 'chat') : sc === 'room' ? 'Match' : 'Team'}</button>`).join('')}</div>
      <div class="msgs" id="msgs">${msgs}</div><div class="row"><input id="chatInput" maxlength="200" placeholder="Type a message…"><button class="btn sm gold" data-act="chat">Send</button></div></aside>`;
  },
  sendChat() {
    const i = document.getElementById('chatInput'); if (!i || !i.value.trim()) return;
    this.send({ t: 'chat', text: i.value, scope: this.chatScope }); i.value = '';
  },
  onChange(e) {
    if (e.target.id === 'nameInput') { const name = e.target.value.trim(); if (name) { this.me.name = name; this.send({ t: 'profile', name }); this.saveIdent({ name }); } }
    if (e.target.id === 'chanSelect') this.send({ t: 'join', channel: e.target.value });
  },
  onClick(e) {
    if (e.target === this.el) return this.closeHub();
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    this.act(b.dataset.act, b.dataset);
  },
  act(a, d = {}) {
    const val = id => (document.getElementById(id) || {}).value;
    Sound.play('select');
    switch (a) {
      case 'close': this.closeHub(); break;
      case 'back': if (this.chatOpen) { this.chatOpen = false; this.render(); } else if (this.tab !== 'play') { this.tab = 'play'; this.render(); } else if (this.room) this.send({ t: 'roomLeave' }); else this.closeHub(); break;
      case 'reconnect': this.retry = 0; this.connect(); break;
      case 'tab': this.tab = d.tab; this.render(); break;
      case 'hero': this.me.hero = d.hero; this.saveIdent({ hero: d.hero }); G.selIdx = Math.max(0, HEROES.findIndex(h => h.id === d.hero));
        this.send({ t: 'profile', hero: d.hero }); if (this.room) this.send({ t: 'roomUpdate', hero: d.hero }); this.render(); break;
      case 'joinCustom': { const ch = (val('chanInput') || '').trim(); if (ch) this.send({ t: 'join', channel: ch }); break; }
      case 'quick':
        if (this.status !== 'online') { this.toast('Server unreachable — ROBOPLAY will fight you instead!'); this.act('robo', d); return; }
        this.send({ t: 'quick', mode: d.mode }); Sound.play('confirm'); break;
      case 'robo': { const mode = d.mode || (this.room && this.room.mode) || this.qmode || 'duel'; if (this.room) { this.send({ t: 'roomLeave' }); this.room = null; } this.waitSince = 0; this.hideHub(); startBotMatch(mode); break; }
      case 'qmode': this.qmode = d.mode; this.render(); break;
      case 'chatToggle': this.chatOpen = !this.chatOpen; this.render(); break;
      case 'heroStep': { const keys = Object.keys(HERO_NAMES), cur = (this.room && (this.room.players.find(p => p.id === this.me.id) || {}).hero) || this.me.hero; const nx = keys[(keys.indexOf(cur) + (+d.d) + keys.length) % keys.length]; this.act('hero', { hero: nx }); return; }
      case 'toggleCreate': this.creating = !this.creating; this.render(); break;
      case 'newMode': this.newMode = d.mode; this.render(); break;
      case 'newStage': this.newStage = +d.i; this.render(); break;
      case 'createRoom': this.creating = false; this.send({ t: 'roomCreate', mode: this.newMode, stage: this.newStage }); break;
      case 'roomStage': this.send({ t: 'roomUpdate', stage: +d.i }); break;
      case 'challenge': this.send({ t: 'challenge', to: d.id, mode: 'duel', stage: Math.floor(Math.random() * ARENAS.length) }); break;
      case 'friend': this.send({ t: 'friendRequest', to: d.id }); break;
      case 'unfriend': this.send({ t: 'friendRemove', id: d.id }); break;
      case 'accept': this.send({ t: 'friendAccept', from: d.id }); break;
      case 'decline': this.send({ t: 'friendDecline', from: d.id }); break;
      case 'teamCreate': this.send({ t: 'teamCreate', name: val('teamName') }); break;
      case 'teamInvite': this.send({ t: 'teamInvite', to: d.id }); break;
      case 'teamAccept': this.send({ t: 'teamAccept', teamId: d.id }); break;
      case 'teamDecline': this.send({ t: 'teamDecline', teamId: d.id }); break;
      case 'teamLeave': this.send({ t: 'teamLeave' }); break;
      case 'teamChallenge': { const p = this.players.find(x => x.team === d.team); if (p) this.send({ t: 'teamChallengeByMember', member: p.id }); this.tab = 'play'; break; }
      case 'joinRoom': this.send({ t: 'roomJoin', roomId: d.id }); break;
      case 'leaveRoom': this.send({ t: 'roomLeave' }); break;
      case 'ready': { const mine = this.room.players.find(p => p.id === this.me.id); this.send({ t: 'roomUpdate', ready: !(mine && mine.ready) }); break; }
      case 'side': this.send({ t: 'roomUpdate', side: d.side }); break;
      case 'start': this.send({ t: 'roomStart' }); break;
      case 'scope': this.chatScope = d.scope; this.render(); break;
      case 'chat': this.sendChat(); break;
      case 'inviteYes': case 'inviteNo': {
        const iv = this.invites.splice(+d.i, 1)[0];
        if (iv && a === 'inviteYes') { if (iv.kind === 'team') this.send({ t: 'teamAccept', teamId: iv.teamId }); else this.send({ t: 'roomJoin', roomId: iv.roomId }); }
        else if (iv && iv.kind === 'team') this.send({ t: 'teamDecline', teamId: iv.teamId });
        this.render(); break;
      }
    }
  },
};
