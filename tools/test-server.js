// Server smoke test: 4 scripted players form two teams and start a team war.
// Usage: node tools/test-server.js  (server must be running on PORT, default 8137)
const WebSocket = require('ws');
const URL = process.env.SERVER_WS || `ws://localhost:${process.env.PORT || 8137}/ws`;
const wait = ms => new Promise(r => setTimeout(r, ms));
function client(name) {
  const c = { name, msgs: [], last: {} };
  c.ws = new WebSocket(URL);
  c.ws.on('message', d => { const m = JSON.parse(d); c.msgs.push(m); c.last[m.t] = m; if (m.t === 'welcome') c.id = m.you.id; });
  c.send = m => c.ws.send(JSON.stringify(m));
  c.ready = new Promise(r => c.ws.on('open', () => { c.send({ t: 'hello', name, hero: 'rakib' }); r(); }));
  return c;
}
(async () => {
  const [a, b, x, y] = ['Tiger1', 'Tiger2', 'Lion1', 'Lion2'].map(client);
  await Promise.all([a, b, x, y].map(c => c.ready)); await wait(800);
  a.send({ t: 'teamCreate', name: 'Tigers ' + Date.now() % 1000 }); x.send({ t: 'teamCreate', name: 'Lions ' + Date.now() % 1000 }); await wait(200);
  a.send({ t: 'teamInvite', to: b.id }); x.send({ t: 'teamInvite', to: y.id }); await wait(200);
  b.send({ t: 'teamAccept', teamId: a.last.social.team.id }); y.send({ t: 'teamAccept', teamId: x.last.social.team.id }); await wait(800);
  console.log('teams:', a.last.social.team.members.map(m => m.name).join(','), '|', x.last.social.team.members.map(m => m.name).join(','));
  a.send({ t: 'teamChallengeByMember', member: x.id, stage: 1 }); await wait(800);
  for (const c of [b, x, y]) { const inv = c.msgs.filter(m => m.t === 'invite' && m.kind === 'room').pop(); c.send({ t: 'roomJoin', roomId: inv.roomId }); }
  await wait(800);
  for (const c of [b, x, y]) c.send({ t: 'roomUpdate', ready: true });
  await wait(800);
  console.log('room:', a.last.room.room.name, a.last.room.room.players.map(p => `${p.name}:${p.side}`).join(' '));
  a.send({ t: 'roomStart' }); await wait(800);
  const st = y.last.start;
  console.log('start:', st ? st.players.map(p => `${p.name}:${p.side}`).join(' ') + ' host=' + (st.host === a.id ? 'Tiger1' : '?') : 'NO START');
  // relay: guest input reaches host, host state reaches guests
  y.send({ t: 'input', d: { h: 1, p: 16 } }); a.send({ t: 'state', d: { tm: 1, p: [], b: [], i: [], e: [] } }); await wait(1500);
  console.log('relay input->host:', !!a.last.input, ' state->guest:', !!b.last.state);
  for (const c of [a, b, x, y]) c.send({ t: 'teamLeave' });
  await wait(200); for (const c of [a, b, x, y]) c.ws.close();
  process.exit(st ? 0 : 1);
})();
