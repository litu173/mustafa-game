'use strict';
/* =========================================================
   MUSTAFA — engine
   Canvas setup, keyboard/mouse input, synthesized audio, save data.
   ========================================================= */
// H is fixed; W stretches between 1280 (16:9) and 1600 (20:9) so wide phone screens are filled edge to edge
let W = 1280;
const H = 720, BASE_W = 1280;
const HORIZON = 420, BELT_TOP = 482, BELT_BOT = 702;
const CS = 1.85;              // character scale: fighters ~300px tall like the arcade original
const LOW_W = 427, LOW_H = 240; // arcade-style low-res buffer (CPS-1 is 384x224)
const TAU = Math.PI * 2;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vnoise = (x, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 157.3), hash(i + 1 + seed * 157.3), u);
};

const _shade = new Map();
function hexRGB(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
// Lighten (amt > 0) or darken (amt < 0) a hex colour. Cached: called every frame.
function shade(hex, amt) {
  const key = hex + '|' + amt;
  const hit = _shade.get(key);
  if (hit) return hit;
  let [r, g, b] = hexRGB(hex);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  const out = `rgb(${r},${g},${b})`;
  _shade.set(key, out);
  return out;
}
function rgba(hex, a) { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; }

/* ---------- Canvas ---------- */
const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches;
if (TOUCH) document.documentElement.classList.add('touch');
const cvs = document.getElementById('game');
const mainCtx = cvs.getContext('2d');
let ctx = mainCtx;
const LOW = document.createElement('canvas');
LOW.width = LOW_W; LOW.height = LOW_H;
const lowCtx = LOW.getContext('2d');
const VIEW = { k: 1 };
const SAFE = { l: 0, r: 0, t: 0, b: 0 };   // notch / home-bar insets, in game pixels
const safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.documentElement.appendChild(safeProbe);
function fitCanvas() {
  const aspect = innerWidth / Math.max(1, innerHeight);
  W = innerWidth > innerHeight ? Math.round(clamp(H * aspect, BASE_W, 1600) / 2) * 2 : BASE_W;
  const s = Math.min(innerWidth / W, innerHeight / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.style.width = Math.round(W * s) + 'px';
  cvs.style.height = Math.round(H * s) + 'px';
  cvs.width = Math.round(W * s * dpr);
  cvs.height = Math.round(H * s * dpr);
  VIEW.k = s * dpr;
  const cs = getComputedStyle(safeProbe);
  SAFE.l = parseFloat(cs.paddingLeft) / s || 0; SAFE.r = parseFloat(cs.paddingRight) / s || 0;
  SAFE.t = parseFloat(cs.paddingTop) / s || 0; SAFE.b = parseFloat(cs.paddingBottom) / s || 0;
}
addEventListener('resize', fitCanvas);
fitCanvas();

/* ---------- Input ---------- */
const Input = {
  keys: {}, pressed: {}, locked: false,
  mouse: { x: -1, y: -1, click: false, moved: false, down: false },
  map: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    atk: ['KeyJ', 'KeyZ'], jump: ['KeyK', 'KeyX', 'Space'], spc: ['KeyL', 'KeyC'],
    ok: ['Enter', 'NumpadEnter'], back: ['Escape', 'Backspace'],
    pause: ['KeyP', 'Escape'], mute: ['KeyM'], royal: ['KeyR'],
  },
  held(a) { return !this.locked && this.map[a].some(k => this.keys[k]); },
  hit(a) { return !this.locked && this.map[a].some(k => this.pressed[k]); },
  confirm() { return this.hit('ok') || this.hit('atk'); },
  anyKey() { return !this.locked && Object.keys(this.pressed).length > 0; },
  clear() { this.keys = {}; this.pressed = {}; },
  endFrame() { this.pressed = {}; this.mouse.click = false; this.mouse.moved = false; },
};
const BLOCK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace'];
addEventListener('keydown', e => {
  Sound.init();
  if (Input.locked) return;
  if (BLOCK_KEYS.includes(e.code)) e.preventDefault();
  if (!Input.keys[e.code]) Input.pressed[e.code] = true;
  Input.keys[e.code] = true;
});
addEventListener('keyup', e => { Input.keys[e.code] = false; });
addEventListener('blur', () => Input.clear());
function trackMouse(e) {
  const r = cvs.getBoundingClientRect();
  Input.mouse.x = (e.clientX - r.left) / r.width * W;
  Input.mouse.y = (e.clientY - r.top) / r.height * H;
  Input.mouse.moved = true;
}
cvs.addEventListener('pointermove', trackMouse);
cvs.addEventListener('pointerdown', e => { Sound.init(); trackMouse(e); Input.mouse.down = true; if (!Input.locked) Input.mouse.click = true; });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => { Input.mouse.down = false; });
// iOS only unlocks WebAudio from a touchend/click, not from pointerdown
for (const ev of ['touchend', 'click']) addEventListener(ev, () => Sound.init(), { passive: true });

/* ---------- Audio (all synthesized, no files) ---------- */
const Sound = {
  ac: null, master: null, sfx: null, mus: null, noiseBuf: null, muted: false,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.muted = !!Save.d.muted;
    this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.6;
    this.applyVol = () => { if (this.sfx) { this.sfx.gain.value = 0.9 * (Save.d.sfxVol ?? 1); this.mus.gain.value = 0.55 * (Save.d.musVol ?? 1); } };
    this.master.connect(this.ac.destination);
    this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.mus = this.ac.createGain(); this.mus.gain.value = 0.55; this.mus.connect(this.master);
    this.applyVol();
    const len = this.ac.sampleRate;
    this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  toggleMute() {
    this.muted = !this.muted; Save.d.muted = this.muted; Save.write();
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
  },
  osc(type, f0, f1, dur, vol, dest, when) {
    const ac = this.ac, t = when || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, ftype, f0, f1, dest, when) {
    const ac = this.ac, t = when || ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  arp(notes, step, type, vol) {
    const t = this.ac.currentTime;
    notes.forEach((f, i) => this.osc(type, f, 0, step * 2.2, vol, null, t + i * step));
  },
  play(name) {
    if (!this.ac) return;
    const v = 0.85 + Math.random() * 0.3;   // every hit sounds a little different
    switch (name) {
      case 'punch': this.noise(0.09, 0.7 * v, 'lowpass', 1400 + Math.random() * 600, 300); this.osc('sine', 150 + Math.random() * 50, 50, 0.12, 0.7); break;
      case 'heavy': this.noise(0.22, 0.95, 'lowpass', 1100, 100); this.osc('sine', 120 * v, 30, 0.3, 1); this.noise(0.05, 0.5, 'highpass', 3000, 1500); break;
      case 'whoosh': this.noise(0.13, 0.22, 'bandpass', 400 * v, 2800 * v); break;
      case 'slash': this.noise(0.11, 0.3, 'highpass', 3200, 1200); this.osc('sawtooth', 2400 * v, 900, 0.08, 0.04); break;
      case 'metal': this.osc('square', 1300 * v, 900, 0.18, 0.08); this.osc('triangle', 2100 * v, 1500, 0.25, 0.08); this.noise(0.08, 0.5, 'bandpass', 2500, 1200); break;
      case 'jump': this.noise(0.12, 0.18, 'bandpass', 600, 2000); this.osc('sine', 180, 300, 0.1, 0.12); break;
      case 'land': this.noise(0.12, 0.4, 'lowpass', 500, 80); this.osc('sine', 90, 40, 0.1, 0.3); break;
      case 'bodyfall': this.noise(0.25, 0.7, 'lowpass', 700, 60); this.osc('sine', 80, 30, 0.25, 0.6); break;
      case 'step': this.osc('sine', 70, 30, 0.25, 0.5); this.noise(0.15, 0.35, 'lowpass', 300, 60); break;
      case 'gun': this.noise(0.14, 0.7, 'highpass', 2500, 500); this.osc('square', 200, 50, 0.1, 0.22); this.noise(0.3, 0.2, 'lowpass', 800, 100); break;
      case 'egun': this.noise(0.12, 0.45, 'bandpass', 1500, 400); this.osc('square', 150, 45, 0.1, 0.15); break;
      case 'pickup': this.arp([660, 880, 1320], 0.05, 'triangle', 0.18); break;
      case 'eat': this.arp([523, 659, 784, 1047], 0.05, 'triangle', 0.18); break;
      case 'gem': this.arp([1047, 1319, 1568, 2093, 2637], 0.04, 'sine', 0.2); break;
      case 'select': this.osc('triangle', 1200, 900, 0.05, 0.08); this.noise(0.03, 0.08, 'highpass', 5000, 4000); break;
      case 'confirm': this.arp([523, 784, 1047], 0.06, 'square', 0.08); this.noise(0.25, 0.12, 'highpass', 6000, 3000); break;
      case 'denied': this.osc('square', 220, 150, 0.12, 0.1); this.osc('square', 160, 110, 0.18, 0.1, null, this.ac.currentTime + 0.1); break;
      case 'page': this.noise(0.18, 0.12, 'bandpass', 2500, 800); break;
      case 'deploy': Music.stinger('deploy'); break;
      case 'objective': Music.stinger('objective'); break;
      case 'radio': this.noise(0.12, 0.18, 'bandpass', 1800, 1200); this.osc('square', 1400, 0, 0.04, 0.05); this.osc('square', 1900, 0, 0.04, 0.05, null, this.ac.currentTime + 0.06); break;
      case 'static': this.noise(0.5, 0.3, 'bandpass', 3000, 900); break;
      case 'alarm': for (let i = 0; i < 3; i++) this.osc('sawtooth', 520, 880, 0.28, 0.06, null, this.ac.currentTime + i * 0.32); break;
      case 'special': this.noise(0.5, 0.45, 'bandpass', 300, 3200); this.osc('sawtooth', 90, 420, 0.4, 0.18); this.osc('sine', 60, 30, 0.5, 0.5); break;
      case 'roar': this.osc('sawtooth', 130 * v, 38, 0.9, 0.35); this.osc('square', 95 * v, 30, 0.9, 0.15); this.noise(0.9, 0.5, 'lowpass', 900, 120); break;
      case 'laugh': for (let i = 0; i < 4; i++) this.osc('sawtooth', 180 - i * 12, 140 - i * 10, 0.1, 0.07, null, this.ac.currentTime + i * 0.13); break;
      case 'counter': this.osc('sawtooth', 300, 80, 0.3, 0.12); this.noise(0.2, 0.5, 'lowpass', 1500, 200); break;
      case 'ko': {   // a real K.O.: double impact, glass-like crack, sub drop and the "ta-da ta-da ta-da BOOM" stinger
        const t = this.ac.currentTime;
        this.osc('sine', 220, 28, 1.2, 1); this.noise(0.9, 0.8, 'lowpass', 2400, 50);
        this.noise(0.12, 0.6, 'highpass', 4000, 2000); this.osc('sine', 160, 25, 1.4, 0.9, null, t + 0.12);
        Music.stinger('ko'); break;
      }
      case 'break': this.noise(0.28, 0.7, 'bandpass', 1300, 250); this.osc('triangle', 300, 90, 0.15, 0.2); break;
      case 'hurt': this.osc('square', 320 * v, 120, 0.15, 0.1); this.noise(0.08, 0.3, 'lowpass', 1200, 300); break;
      case 'tick': this.osc('square', 1400, 0, 0.03, 0.05); break;
      case 'go': this.arp([784, 1047], 0.08, 'square', 0.08); Music.stinger('wave'); break;
      case 'fanfare': this.arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.1); break;
      case 'over': this.arp([392, 330, 262, 196], 0.22, 'triangle', 0.2); Music.stinger('fail'); break;
      case 'boom': this.noise(0.8, 1, 'lowpass', 1200, 50); this.osc('sine', 90, 25, 0.7, 1); this.noise(0.1, 0.5, 'highpass', 3000, 1000); break;
      case 'crash': this.noise(0.35, 0.9, 'bandpass', 900, 200); this.osc('square', 140, 40, 0.25, 0.25); break;
      case 'shotgun': this.noise(0.22, 0.9, 'lowpass', 3000, 300); this.osc('square', 120, 40, 0.15, 0.3); break;
      case 'splash': this.noise(0.2, 0.25, 'bandpass', 1200, 500); break;
      case 'heartbeat': { const t = this.ac.currentTime; this.osc('sine', 60, 40, 0.12, 0.6); this.osc('sine', 55, 38, 0.12, 0.45, null, t + 0.18); break; }
      case 'combo': this.arp([880, 1175, 1568], 0.04, 'square', 0.06); break;
      case 'royal': this.arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.07, 'triangle', 0.16); break;
    }
  },
};

/* Music lives in js/music.js (orchestral score). */

/* ---------- Save data (localStorage, per browser) ---------- */
const Save = {
  d: { premium: false, plan: null, since: 0, best: 0, royal: false, muted: false, pixel: false },
  load() { try { Object.assign(this.d, JSON.parse(localStorage.getItem('mustafa.save.v2') || '{}')); } catch (e) { /* storage blocked */ } },
  write() { try { localStorage.setItem('mustafa.save.v2', JSON.stringify(this.d)); } catch (e) { /* storage blocked */ } },
};
Save.load();
