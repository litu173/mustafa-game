'use strict';
/* =========================================================================
   Touch controls for phones and tablets: a floating thumb-stick on the left,
   ATTACK / JUMP / SPECIAL on the right and a few context buttons on top.
   Every control just presses the same keys the keyboard uses, so the game
   (and online play) needs no special cases.
   ========================================================================= */
const Touch = (() => {
  if (!TOUCH) return { active: false };

  function press(code) {
    Sound.init();
    if (Input.locked) return;
    if (!Input.keys[code]) Input.pressed[code] = true;
    Input.keys[code] = true;
  }
  function release(code) { Input.keys[code] = false; }
  function capture(el, id) { try { el.setPointerCapture(id); } catch (e) { /* pointer already gone */ } }
  function tap(code) { press(code); setTimeout(() => release(code), 90); }

  const pad = document.createElement('div');
  pad.id = 'pad';
  pad.innerHTML = `
    <div class="stick-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>
    <div class="btns">
      <button class="tb t-spc" data-key="KeyL" aria-label="Special"><i>✸</i><b>SPECIAL</b></button>
      <button class="tb t-jump" data-key="KeyK" aria-label="Jump"><i>⬆</i><b>JUMP</b></button>
      <button class="tb t-atk" data-key="KeyJ" aria-label="Attack"><i>⚔</i><b>ATTACK</b></button>
    </div>
    <div class="ctx">
      <button class="cb c-pause" data-tap="KeyP" aria-label="Pause">❚❚</button>
      <button class="cb c-back" data-tap="Escape" aria-label="Back">‹ BACK</button>
      <button class="cb c-royal" data-tap="KeyR" aria-label="Royal costume">♛ ROYAL</button>
      <button class="cb c-full" aria-label="Full screen">⛶</button>
    </div>
    <div class="rotate-tip">↻ Turn your phone sideways for a bigger view</div>`;
  document.body.appendChild(pad);

  /* ---- action buttons: each follows its own finger (multi-touch) ---- */
  for (const b of pad.querySelectorAll('.tb')) {
    const code = b.dataset.key;
    let pid = null;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); pid = e.pointerId; capture(b, pid);
      b.classList.add('on'); press(code);
      if (navigator.vibrate && (Save.d.vibrate ?? true)) navigator.vibrate(8);
    });
    const up = e => { if (e.pointerId !== pid) return; pid = null; b.classList.remove('on'); release(code); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  }
  for (const b of pad.querySelectorAll('[data-tap]')) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); tap(b.dataset.tap); });
  }

  /* ---- full screen + landscape lock where the browser allows it ---- */
  const root = document.documentElement;
  const fsReq = root.requestFullscreen || root.webkitRequestFullscreen;
  const full = pad.querySelector('.c-full');
  if (!fsReq) full.remove();
  else full.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      await fsReq.call(root, { navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* not allowed here */ }
  });

  /* ---- floating thumb-stick ---- */
  const zone = pad.querySelector('.stick-zone'), base = pad.querySelector('.stick-base'), knob = pad.querySelector('.stick-knob');
  const DIRS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
  const held = { left: false, right: false, up: false, down: false };
  let sid = null, ox = 0, oy = 0, R = 60, hard = 0;
  function setDir(d, on) {
    if (held[d] === on) return;
    held[d] = on;
    if (on) press(DIRS[d]); else release(DIRS[d]);
  }
  function stick(dx, dy) {
    const len = Math.hypot(dx, dy), k = len > R ? R / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = dx / R, ny = dy / R, dead = 0.28;
    setDir('right', nx > dead); setDir('left', nx < -dead);
    // vertical needs a slightly firmer push so walking sideways doesn't drift up/down
    setDir('down', ny > 0.42); setDir('up', ny < -0.42);
    // pushing the stick all the way = run (the game runs on a double-tap)
    const h = nx > 0.92 ? 1 : nx < -0.92 ? -1 : 0;
    if (h && h !== hard) {
      const code = h > 0 ? DIRS.right : DIRS.left;
      for (const ms of [20, 70]) setTimeout(() => { if (Input.keys[code]) Input.pressed[code] = true; }, ms);
    }
    hard = h;
  }
  zone.addEventListener('pointerdown', e => {
    if (sid !== null) return;
    e.preventDefault(); sid = e.pointerId; capture(zone, sid);
    const zr = zone.getBoundingClientRect();
    R = Math.max(44, Math.min(70, zr.height * 0.22));
    ox = e.clientX; oy = e.clientY;
    base.style.left = (ox - zr.left) + 'px'; base.style.top = (oy - zr.top) + 'px';
    pad.classList.add('sticking'); stick(0, 0);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === sid) stick(e.clientX - ox, e.clientY - oy); });
  const end = e => {
    if (e.pointerId !== sid) return;
    sid = null; hard = 0; pad.classList.remove('sticking');
    knob.style.transform = ''; base.style.left = base.style.top = '';
    for (const d in held) setDir(d, false);
  };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

  /* ---- no page zoom / scroll / long-press menus while playing ---- */
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault());
  pad.addEventListener('contextmenu', e => e.preventDefault());
  cvs.addEventListener('contextmenu', e => e.preventDefault());

  /* ---- show the right controls for the current screen ---- */
  let last = '';
  function sync() {
    const modal = !!document.querySelector('.modal:not(.hidden)') || (typeof G !== 'undefined' && !!G.settings);
    const g = typeof G !== 'undefined' ? G : null;
    let mode = 'off';
    if (g && !modal) {
      if (g.scene === 'play' && !g.paused) mode = 'play';
      else if (g.scene === 'select' || (g.scene === 'title' && g.overlay === 'stages')) mode = 'select';
    }
    const portrait = innerHeight > innerWidth;
    const cls = mode + (Save.d.lefty ? ' lefty' : '') + (portrait ? ' portrait' : '') + (g && g.scene === 'select' ? ' sel' : '') + (g && g.arena ? ' arena' : '');
    if (cls !== last) {
      last = cls;
      pad.className = cls; apply();
      if (mode !== 'play') { for (const d in held) setDir(d, false); for (const b of pad.querySelectorAll('.tb.on')) { b.classList.remove('on'); release(b.dataset.key); } }
    }
    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);

  function apply() {
    const k = 0.8 + 0.5 * (Save.d.padSize ?? 0.5), a = 0.35 + 0.65 * (Save.d.padAlpha ?? 0.7);
    pad.style.setProperty('--pk', k); pad.style.setProperty('--pa', a);
    pad.classList.toggle('lefty', !!Save.d.lefty);
  }
  apply();
  return { active: true, apply };
})();
