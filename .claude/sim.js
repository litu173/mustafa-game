// Dev helper: headless bot playthrough. window.__sim(frames) -> JSON log in document.body.dataset.res
window.__sim = function (maxFrames) {
  function bot() {
    const p = G.players[0]; if (!p) return;
    Input.keys = {};
    if (G.scene === 'intro' || G.scene === 'clear' || G.scene === 'brief' || G.scene === 'story') { if (G.t % 3 === 0) Input.pressed.Enter = true; return; }
    if (G.scene === 'failed') { window.__fails = (window.__fails || 0) + 1; Input.pressed.Enter = true; return; }
    if (G.scene === 'gameover') { Input.pressed.ArrowDown = true; return; }
    if (G.scene !== 'play') return;
    if (p.hp < 40) p.hp = 100;
    if (G.drive) {
      const tgt = G.boss && !G.boss.remove ? G.boss : G.enemies.find(e => e.hp > 0 && e.x > p.x);
      if (tgt) { if (Math.abs(tgt.y - p.y) > 10) Input.keys[tgt.y > p.y ? 'KeyS' : 'KeyW'] = true; Input.keys.KeyD = true; if (G.t % 30 === 0) Input.pressed.KeyJ = true; }
      return;
    }
    const e = G.enemies.filter(e => e.hp > 0 && !e.docile && !e.leaving).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (e) {
      const dx = e.x - p.x, dy = e.y - p.y;
      if (Math.abs(dy) > 10) Input.keys[dy > 0 ? 'KeyS' : 'KeyW'] = true;
      if (Math.abs(dx) > 120) Input.keys[dx > 0 ? 'KeyD' : 'KeyA'] = true;
      else { p.facing = Math.sign(dx) || 1; if (G.t % 6 === 0) Input.pressed.KeyJ = true; if (G.t % 97 === 0) Input.pressed.KeyL = true; if (e.def.flyer && G.t % 40 === 0) Input.pressed.KeyK = true; }
    } else {
      const tg = G.props.find(q => q.obj && !q.remove && q.x < G.camX + W);
      if (tg) { const dx = tg.x - 90 - p.x, dy = tg.y - p.y; if (Math.abs(dy) > 10) Input.keys[dy > 0 ? 'KeyS' : 'KeyW'] = true; if (Math.abs(dx) > 30) Input.keys[dx > 0 ? 'KeyD' : 'KeyA'] = true; else { p.facing = 1; if (G.t % 8 === 0) Input.pressed.KeyJ = true; } }
      else Input.keys.KeyD = true;
    }
  }
  const log = [], errs = []; let ls = '', lst = -1, lw = -1, stuck = 0, lastCam = -1;
  try {
    for (let i = 0; i < maxFrames && G.scene !== 'ending'; i++) {
      bot(); update();
      if (i % 300 === 0) render();
      if (G.scene !== ls || G.stageIdx !== lst || G.waveIdx !== lw) {
        log.push('f' + i + ' ' + G.scene + ' st' + G.stageIdx + ' w' + G.waveIdx + ' en' + G.enemies.length + ' cam' + Math.round(G.camX) + ' boss' + (G.boss ? G.boss.def.name + ':' + G.boss.hp : ''));
        ls = G.scene; lst = G.stageIdx; lw = G.waveIdx; stuck = 0;
      }
      if (++stuck > 60 * 90) { log.push('STUCK f' + i + ' ' + JSON.stringify(G.enemies.map(e => [e.def.name, e.state, Math.round(e.x), Math.round(e.y), Math.round(e.z), e.hp, e.docile, e.leaving]))); break; }
    }
  } catch (e) { errs.push(String(e.stack)); }
  return JSON.stringify({ log, errs, scene: G.scene, st: G.stageIdx, score: G.score });
};
// Jump to a stage/wave and simulate a few frames with the bot (dev helper)
window.__jump = function (st, wave, frames) {
  window.render = window.__origRender || window.render;
  G.titleReady = true; startGame(st); G.scene = 'play';
  if (!STAGES[st].drive && wave != null) { const w = STAGES[st].waves[wave]; G.waveIdx = wave; G.camX = w.at; G.players[0].x = w.at + 400; }
  return window.__sim(frames);
};
