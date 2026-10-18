// Dev helper for two-tab multiplayer tests (load with a <script> tag).
window.__guest = function () {
  G.titleReady = true; Net.openHub();
  window.__autoJoin = setInterval(() => { if (Net.invites.length) { Net.act('inviteYes', { i: 0 }); setTimeout(() => Net.act('ready'), 400); clearInterval(window.__autoJoin); } }, 200);
};
window.__host = function (guestName, mode) {
  G.titleReady = true; Net.openHub();
  setTimeout(() => { const g = Net.players.find(p => p.name === guestName); if (g) Net.act('challenge', { id: g.id }); }, 1200);
  setTimeout(() => Net.act('start'), 4000);
};
window.__peek = () => JSON.stringify({ scene: G.scene, host: G.arena && G.arena.isHost, t: G.t, players: G.players.map(p => `${p.name}@${Math.round(p.x)},${Math.round(p.y)} ${p.state} hp${p.hp} st${p.stock}`) });
