'use strict';
/* =========================================================
   MUSTAFA REBORN — ROBOPLAY: robot players for the online arena.
   When nobody else is online (or the server can't be reached), ROBOPLAY
   bots fill the match. A bot drives a normal fighter through the same
   controls a human uses (move, attack, jump, special), so it follows
   every rule of the arena. Bot matches run entirely on this device.
   ========================================================= */
const ROBO_NAMES = ['ROBOPLAY', 'ROBO-STRIKER', 'ROBO-RAPTOR', 'ROBO-TITAN', 'ROBO-VIPER', 'ROBO-BLAZE', 'ROBO-HUNTER'];

// The bot's "hands on the controller": same held()/hit() interface as Input.
class BotCtl {
  constructor(f) { this.f = f; this.k = {}; this.p = {}; this.react = 0; this.plan = 'approach'; this.planT = 0; this.runT = 0; this.combo = 0; }
  held(a) { return !!this.k[a]; }
  hit(a) { return !!this.p[a]; }
  think() {
    const f = this.f, D = DIF(), k = this.k = {}, p = this.p = {};
    if (f.state === 'out' || f.state === 'dead') return;
    const foes = arenaFoes(f).filter(o => o.state !== 'out' && o.state !== 'dead');
    if (!foes.length) return;
    const t = foes.reduce((a, b) => (Math.abs(b.x - f.x) + Math.abs(b.y - f.y) < Math.abs(a.x - f.x) + Math.abs(a.y - f.y) ? b : a));
    // low health: go for food if there is any
    let goal = t, gx = t.x, gy = t.y;
    const food = G.items.find(it => FOOD[it.kind] && it.z < 30);
    if (food && f.hp < f.maxHp * 0.45) { goal = food; gx = food.x; gy = food.y; }
    else if (!f.weapon) { const w = G.items.find(it => WEAPONS.includes(it.kind) && it.z < 30 && Math.abs(it.x - f.x) < 260); if (w) { goal = w; gx = w.x; gy = w.y; } }
    const dx = gx - f.x, dy = gy - f.y, adx = Math.abs(dx), ady = Math.abs(dy);
    const foeAttacking = t.state === 'attack' && Math.abs(t.x - f.x) < 150 && Math.abs(t.y - f.y) < 30;
    if (--this.planT <= 0) {   // re-decide a few times a second, like a person would
      this.planT = Math.round(rand(10, 26) / (0.7 + D.spd * 0.3));
      this.plan = foeAttacking && Math.random() < D.dodge + 0.1 ? (Math.random() < 0.5 ? 'jump' : 'retreat') : 'approach';
      this.side = Math.sign(f.x - t.x) || 1;
    }
    if (goal !== t) {   // walk onto the pickup; attacking picks up weapons
      if (adx > 18) k[dx > 0 ? 'right' : 'left'] = true;
      if (ady > 10) k[dy > 0 ? 'down' : 'up'] = true;
      if (adx < 40 && ady < 20 && WEAPONS.includes(goal.kind) && G.t % 6 === 0) p.atk = true;
      return;
    }
    if (this.plan === 'retreat') { k[dx > 0 ? 'left' : 'right'] = true; if (ady < 40) k[dy > 0 ? 'up' : 'down'] = true; return; }
    if (this.plan === 'jump' && f.state !== 'jump') { p.jump = true; this.plan = 'approach'; return; }
    const reach = f.weapon && GUNS[f.weapon] ? 520 : 95;
    // line up vertically first, then close the distance
    if (ady > 12) k[dy > 0 ? 'down' : 'up'] = true;
    if (adx > reach) {
      k[dx > 0 ? 'right' : 'left'] = true;
      if (adx > 420 && this.runT <= 0) { p[dx > 0 ? 'right' : 'left'] = true; this.runT = 40; this.runTap = 4; }   // double-tap to run
    }
    if (this.runTap > 0 && --this.runTap === 0) p[dx > 0 ? 'right' : 'left'] = true;
    if (this.runT > 0) this.runT--;
    // face the foe, then strike when lined up
    const facing = adx < 6 || (t.x > f.x ? 1 : -1) === f.facing;
    if (!facing) { k.left = k.right = false; k[t.x > f.x ? 'right' : 'left'] = true; }
    if (adx <= reach + 10 && ady < 22 && facing) {
      this.react--;
      if (this.react <= 0) {
        p.atk = true; this.combo++;
        this.react = Math.round(rand(5, 12) * (1.4 - D.spd * 0.4));
        if (this.combo > 3 && Math.random() < 0.3) { this.combo = 0; this.react += 20; }
      }
      if (f.state === 'idle' && Math.random() < 0.012) p.jump = true;            // jump-kick now and then
    }
    // surrounded or pinned down: special move
    const near = foes.filter(o => Math.abs(o.x - f.x) < 140 && Math.abs(o.y - f.y) < 40).length;
    if ((near >= 2 || (f.state === 'hurt' && Math.random() < 0.08)) && f.hp > 20 && Math.random() < 0.05) p.spc = true;
    if (f.state === 'jump' && adx < 140 && Math.random() < 0.2) p.atk = true;
  }
}

// Start a match against ROBOPLAY bots on this device. mode: duel | ffa | team
function startBotMatch(mode) {
  if (G.arena) return;
  const meHero = (Net.me && Net.me.hero) || HEROES[G.selIdx].id;
  const pool = HEROES.map(h => h.id).filter(id => id !== meHero);
  const n = mode === 'duel' ? 2 : 4;
  const players = [{ id: 'me', name: (Net.me && Net.me.name) || 'YOU', hero: meHero, side: mode === 'team' ? 'A' : 'p0' }];
  for (let i = 1; i < n; i++) players.push({ id: 'robo' + i, name: ROBO_NAMES[(i - 1) % ROBO_NAMES.length] + (mode === 'team' && i === 1 ? ' (ALLY)' : ''), hero: pool[(i - 1) % pool.length] || 'mustafa',
    side: mode === 'team' ? (i === 1 ? 'A' : 'B') : 'p' + i });
  const stage = Math.floor(Math.random() * ARENAS.length);
  startArena({ roomId: 'robo-' + Date.now(), mode, host: 'me', stage, players, offline: true, teamNames: mode === 'team' ? { A: 'TEAM REBORN', B: 'ROBOPLAY SQUAD' } : null });
  for (const f of G.players) if (f.netId !== 'me') { f.remote = false; f.bot = true; f.ctl = new BotCtl(f); f.buf = null; }
  G.banner = { title: 'FIGHT!', sub: 'VS ROBOPLAY', t: 0, dur: 110, big: true };
}
function updateBots() {
  for (const f of G.players) {
    if (!f.bot || f.state === 'out') continue;
    f.ctl.think();
    updatePlayer(f);
    // bots pick up food they walk over
    for (const it of G.items) if (FOOD[it.kind] && Math.abs(f.x - it.x) < 60 && Math.abs(f.y - it.y) < 34 && f.z < 30 && it.z < 10) hostTake(f.netId, it.id);
  }
}
