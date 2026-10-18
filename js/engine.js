'use strict';
/* =========================================================
   MUSTAFA — engine
   Canvas setup, keyboard/mouse input, synthesized audio, save data.
   ========================================================= */
const W = 1280, H = 720;
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
const cvs = document.getElementById('game');
const mainCtx = cvs.getContext('2d');
let ctx = mainCtx;
const LOW = document.createElement('canvas');
LOW.width = LOW_W; LOW.height = LOW_H;
const lowCtx = LOW.getContext('2d');
const VIEW = { k: 1 };
function fitCanvas() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.style.width = Math.round(W * s) + 'px';
  cvs.style.height = Math.round(H * s) + 'px';
  cvs.width = Math.round(W * s * dpr);
  cvs.height = Math.round(H * s * dpr);
  VIEW.k = s * dpr;
}
addEventListener('resize', fitCanvas);
fitCanvas();

/* ---------- Input ---------- */
const Input = {
  keys: {}, pressed: {}, locked: false,
  mouse: { x: -1, y: -1, click: false, moved: false },
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
cvs.addEventListener('mousemove', trackMouse);
cvs.addEventListener('mousedown', e => { Sound.init(); trackMouse(e); if (!Input.locked) Input.mouse.click = true; });

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
    this.master.connect(this.ac.destination);
    this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.mus = this.ac.createGain(); this.mus.gain.value = 0.55; this.mus.connect(this.master);
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
    if (typeof G !== 'undefined' && G.arena && G.arena.isHost) G.arena.events.push({ s: name });
    if (!this.ac) return;
    switch (name) {
      case 'punch': this.noise(0.09, 0.7, 'lowpass', 1600, 300); this.osc('sine', 170, 50, 0.12, 0.7); break;
      case 'heavy': this.noise(0.2, 0.9, 'lowpass', 1000, 110); this.osc('sine', 120, 32, 0.28, 1); break;
      case 'whoosh': this.noise(0.13, 0.22, 'bandpass', 500, 2800); break;
      case 'slash': this.noise(0.11, 0.3, 'highpass', 3200, 1200); break;
      case 'jump': this.osc('square', 230, 520, 0.12, 0.06); break;
      case 'land': this.noise(0.1, 0.35, 'lowpass', 500, 90); break;
      case 'gun': this.noise(0.14, 0.7, 'highpass', 2500, 500); this.osc('square', 200, 50, 0.1, 0.22); break;
      case 'egun': this.noise(0.12, 0.45, 'bandpass', 1500, 400); this.osc('square', 150, 45, 0.1, 0.15); break;
      case 'pickup': this.arp([660, 880, 1320], 0.05, 'triangle', 0.18); break;
      case 'eat': this.arp([523, 659, 784, 1047], 0.05, 'triangle', 0.18); break;
      case 'gem': this.arp([1047, 1319, 1568, 2093], 0.045, 'sine', 0.2); break;
      case 'select': this.osc('square', 880, 0, 0.05, 0.07); break;
      case 'confirm': this.arp([523, 784, 1047], 0.06, 'square', 0.08); break;
      case 'special': this.noise(0.5, 0.45, 'bandpass', 300, 3200); this.osc('sawtooth', 90, 420, 0.4, 0.18); break;
      case 'roar': this.osc('sawtooth', 130, 38, 0.9, 0.35); this.osc('square', 95, 30, 0.9, 0.15); this.noise(0.9, 0.5, 'lowpass', 900, 120); break;
      case 'ko': this.osc('sine', 220, 28, 1.0, 0.9); this.noise(0.7, 0.6, 'lowpass', 700, 60); break;
      case 'break': this.noise(0.28, 0.7, 'bandpass', 1300, 250); this.osc('triangle', 300, 90, 0.15, 0.2); break;
      case 'hurt': this.osc('square', 320, 120, 0.15, 0.1); break;
      case 'tick': this.osc('square', 1400, 0, 0.03, 0.05); break;
      case 'go': this.arp([784, 1047], 0.08, 'square', 0.08); break;
      case 'fanfare': this.arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.1); break;
      case 'over': this.arp([392, 330, 262, 196], 0.22, 'triangle', 0.2); break;
      case 'boom': this.noise(0.7, 1, 'lowpass', 900, 60); this.osc('sine', 90, 25, 0.6, 1); break;
      case 'crash': this.noise(0.35, 0.9, 'bandpass', 900, 200); this.osc('square', 140, 40, 0.25, 0.25); break;
      case 'shotgun': this.noise(0.22, 0.9, 'lowpass', 3000, 300); this.osc('square', 120, 40, 0.15, 0.3); break;
      case 'splash': this.noise(0.2, 0.25, 'bandpass', 1200, 500); break;
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
