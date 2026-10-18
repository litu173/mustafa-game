// Dev helper: paste into the console (or inject) to show a character sheet instead of the game.
window.render = function () {
  mainCtx.setTransform(VIEW.k, 0, 0, VIEW.k, 0, 0);
  const c = mainCtx, t = G.t; c.fillStyle = '#7a8a9a'; c.fillRect(0, 0, W, H);
  const pose = window.__pose || 'idle';
  HEROES.forEach((h, i) => drawFigure(c, h.look, poseFor(i, pose, t, i === 0 ? { weapon: 'rifle' } : null), 140 + i * 300, 500, 1, 2.6, { t, weapon: i === 0 ? 'rifle' : null }));
  ['razor', 'motka', 'poacher', 'biker', 'lash', 'butcher'].forEach((k, i) => drawFigure(c, ENEMY_DEFS[k].look, poseFor(i, 'idle', t), 70 + i * 120, 712, -1, 1.15 * (ENEMY_DEFS[k].look.scale || 1), { t, weapon: ENEMY_DEFS[k].weapon, weapon2: ENEMY_DEFS[k].weapon2 }));
  drawTheropod(c, 860, 712, 1, 1.1, { ph: t * 0.1, jaw: 0.3, lean: 0, rot: 0, head: 0 }, { kind: 'raptor', col: '#6f9a3a', stripe: '#34521a' });
  drawTrike(c, 1130, 712, -1, 1.0, { ph: t * 0.05, jaw: 0, lean: 0, rot: 0, head: 0 }, { col: '#8d906a' });
};
