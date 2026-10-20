// Dev test: measure each hero puppet against the cover painting's proportions.
//   heads   = standing height / head height (crown to chin)
//   torso   = chin-to-hip / head height  (cover: ~2.0)
//   neck    = chin-to-collar / head height (cover: ~0.3)
window.__proportions = function () {
  return ['mustafa', 'rakib', 'nadia', 'bablu'].map(id => {
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 700;
    const c = cv.getContext('2d'), def = HEROES.find(h => h.id === id), dbg = {};
    const f = { def, id: 0, state: 'idle', t: 0, vx: 0, z: 0, facing: 1 };
    for (let k = 0; k < 40; k++) { c.clearRect(0, 0, 600, 700); drawRig(c, f, 300, 650, 1, { dbg }); }
    const a = c.getImageData(0, 0, 600, 700).data;
    let top = 700, bot = 0;
    for (let y = 0; y < 700; y++) for (let x = 0; x < 600; x++) if (a[(y * 600 + x) * 4 + 3] > 40) { if (y < top) top = y; if (y > bot) bot = y; }
    const head = dbg.chin[1] - top;
    return { id, tall: bot - top, head: Math.round(head), heads: +((bot - top) / head).toFixed(2),
      torso: +((dbg.hip[1] - dbg.chin[1]) / head).toFixed(2), neck: +((dbg.collar[1] - dbg.chin[1]) / head).toFixed(2) };
  });
};
