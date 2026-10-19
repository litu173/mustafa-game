'use strict';
/* =========================================================
   MUSTAFA — adaptive cinematic score, synthesized live.
   Every mission has its own theme. Each theme is built from layers
   (pads, bass, ostinato, drums, arps, melodies, choir) that switch in
   and out with the fight's intensity 0..3, on bar lines, like the
   adaptive scores of modern action games. Stingers (KO, boss, objective)
   punch through on top while the music ducks.
   API: Music.play(name, transpose), Music.stop(), Music.update(),
        Music.setIntensity(n), Music.danger(on), Music.stinger(name)
   ========================================================= */
const N = (name) => ({ C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 }[name]);
const HOLD = '-';
// melodies: semitones above the key (8th notes), '-' holds the previous note, null rests
const SCORES = (() => { const _ = null, h = HOLD; return {
  title: { bpm: 76, key: N('D'), bars: [['D', 1], ['Bb', 0], ['F', 0], ['C', 0], ['D', 1], ['Bb', 0], ['G', 1], ['A', 0]],
    choir: true, taiko: 'T.......T...t.t.', pad: 1,
    mels: [{ inst: 'brass', notes: [12, h, h, h, 15, h, 17, h, 13, h, h, h, 12, h, 10, h, 8, h, h, h, 10, h, 12, h, 7, h, h, h, h, h, h, h,
      12, h, h, h, 15, h, 17, h, 20, h, h, h, 19, h, 17, h, 15, h, h, h, 13, h, 12, h, 14, h, h, h, 13, h, h, h] }] },
  story: { bpm: 70, key: N('D'), bars: [['D', 1], ['Bb', 0], ['F', 0], ['C', 0], ['G', 1], ['Bb', 0], ['A', 0], ['A', 0]],
    choir: true, pad: 0.9, arp: { pat: [0, 2, 3, 4, 3, 2, 1, 2], inst: 'harp', every: 2 },
    mels: [{ inst: 'flute', notes: [12, h, h, h, 10, h, 9, h, 7, h, h, h, h, h, h, h, 9, h, h, h, 10, h, 12, h, 14, h, h, h, h, h, h, h,
      15, h, h, h, 14, h, 12, h, 10, h, h, h, 9, h, h, h, 7, h, 9, h, 10, h, 9, h, 7, h, h, h, h, h, h, h] }] },
  brief: { bpm: 100, key: N('A'), bars: [['A', 1], ['A', 1], ['F', 0], ['E', 0]], pad: 0.7,
    ost: [0, _, 0, 0, 7, _, 0, 0, 0, _, 0, 0, 8, _, 7, _], kit: { s: 's.ss..s.s.ss.sss', k: 'K.......K.......' },
    mels: [{ inst: 'brass', oct: -12, notes: [0, h, h, h, h, h, h, h, _, _, _, _, _, _, _, _, 3, h, h, h, h, h, 2, h, 0, h, h, h, h, h, h, h] }] },
  sea: { bpm: 132, key: N('D'), bars: [['D', 1], ['D', 1], ['Bb', 0], ['C', 0], ['D', 1], ['D', 1], ['F', 0], ['C', 0]],
    lv: { ost: 1, taiko: 1, rim: 2, mel: 2, choir: 3 },
    ost: [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 10, 0, 7, 0], taiko: 'T..tT.t.T..tT.tt', rim: '....r.......r..r', choir: true,
    arp: { pat: [0, 1, 2, 3, 2, 1, 2, 1], inst: 'harp', every: 2, maxLv: 1 },
    mels: [{ inst: 'brass', notes: [_, _, _, _, _, _, _, _, 12, h, h, 10, 12, h, 15, h, 13, h, h, h, 12, h, 10, h, 12, h, h, h, h, h, _, _,
      _, _, _, _, _, _, _, _, 17, h, h, 15, 17, h, 20, h, 19, h, h, h, 17, h, 15, h, 17, h, h, h, h, h, _, _] }] },
  stealth: { bpm: 96, key: N('E'), bars: [['E', 1], ['C', 0], ['A', 1], ['B', 0], ['E', 1], ['C', 0], ['D', 0], ['B', 0]], pad: 0.8, bass: 'pulse',
    lv: { arp: 0, rim: 1, taiko: 2, ost: 2, mel: 3 },
    arp: { pat: [0, _, 2, _, 1, _, 3, _, 0, _, 2, _, 4, _, 2, _], inst: 'marimba', every: 1 },
    rim: '....r.......r.r.', taiko: 'T.......T.....t.', ost: [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, _, 1, _],
    mels: [{ inst: 'brass', notes: [12, h, h, h, h, h, h, h, 10, h, h, h, 15, h, h, h, 14, h, h, h, h, h, h, h, 12, h, h, h, 11, h, h, h] }] },
  chase: { bpm: 152, key: N('A'), bars: [['A', 1], ['F', 0], ['G', 0], ['E', 0], ['A', 1], ['F', 0], ['D', 1], ['E', 0]], pad: 0.6, bass: '8th',
    lv: { kit: 0, gtr: 1, mel: 1, ost: 2 },
    kit: { k: 'K...K...K.K.K...', s: '....S.......S..S', h: 'h.h.h.h.h.h.h.hh' }, gtr: 'x.xx.x.xx.xx.x.x', ost: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 12],
    mels: [{ inst: 'lead', notes: [12, h, 15, h, 17, h, 19, h, 17, h, 15, h, 12, h, 10, h, 12, h, 15, h, 17, h, 22, h, 20, h, 19, h, 17, h, h, h] },
      { inst: 'brass', lv: 3, notes: [24, h, h, h, _, _, _, _, 22, h, h, h, _, _, _, _, 24, h, h, h, _, _, _, _, 28, h, h, h, h, h, h, h] }] },
  jungle: { bpm: 116, key: N('G'), bars: [['G', 0], ['F', 0], ['C', 0], ['G', 0], ['E', 1], ['C', 0], ['D', 0], ['D', 0]], pad: 0.8,
    lv: { arp: 0, mel: 0, taiko: 1, ost: 2, choir: 3 },
    arp: { pat: [0, 2, 3, 2, 4, 2, 3, 1, 0, 2, 3, 2, 5, 3, 2, 1], inst: 'marimba', every: 1 }, taiko: 'T.t.t.T.t.tT.t.t', tabla: true,
    ost: [0, _, 7, _, 12, _, 7, _, 0, _, 7, _, 14, _, 12, _], choir: true,
    mels: [{ inst: 'flute', notes: [7, h, 9, h, 12, h, h, 9, 7, h, 4, h, 2, h, h, h, 4, h, 7, h, 9, h, 12, 14, 12, h, 9, h, 7, h, h, h,
      16, h, 14, h, 12, h, 14, 12, 9, h, 7, h, 9, h, h, h, 7, h, 4, h, 2, h, 4, h, 7, h, h, h, h, h, h, h] },
      { inst: 'brass', lv: 3, notes: [19, h, h, h, 21, h, h, h, 24, h, h, h, h, h, h, h, 21, h, h, h, 19, h, h, h, 16, h, h, h, h, h, h, h] }] },
  swamp: { bpm: 108, key: N('C'), bars: [['C', 1], ['Db', 0], ['C', 1], ['Ab', 0], ['F', 1], ['Db', 0], ['G', 0], ['G', 0]], pad: 0.9,
    lv: { choir: 0, ost: 1, taiko: 1, mel: 2, rim: 2 }, choir: true,
    ost: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 1, 0, 0], taiko: 'T...T..tT...T.tt', rim: '..r...r...r..r.r',
    mels: [{ inst: 'brass', notes: [12, h, h, 13, h, h, 15, h, 13, h, 12, h, h, h, _, _, 8, h, h, 7, h, h, 8, h, 10, h, 12, h, h, h, _, _] }] },
  rock: { bpm: 140, key: N('E'), bars: [['E', 1], ['E', 1], ['C', 0], ['D', 0], ['E', 1], ['E', 1], ['G', 0], ['D', 0]], pad: 0.4, bass: '8th',
    lv: { kit: 0, gtr: 0, mel: 2 },
    kit: { k: 'K.....K.K.....K.', s: '....S.......S...', h: 'h.h.h.h.h.h.h.h.' }, gtr: 'xxx.xxx.xx.xxx.x',
    mels: [{ inst: 'lead', notes: [7, h, 10, h, 12, h, 10, 7, 5, h, 7, h, h, h, _, _, 7, h, 10, h, 12, h, 15, h, 14, h, 12, h, 10, h, h, h] },
      { inst: 'brass', lv: 3, notes: [19, h, h, h, h, h, h, h, 17, h, h, h, 19, h, h, h, 22, h, h, h, h, h, h, h, 21, h, h, h, h, h, h, h] }] },
  village: { bpm: 124, key: N('D'), bars: [['D', 1], ['C', 0], ['D', 1], ['A', 1], ['G', 0], ['C', 0], ['D', 1], ['A', 0]], pad: 0.8,
    lv: { taiko: 0, mel: 0, ost: 1, choir: 3 }, taiko: 'T.tT..t.T.tT.tt.', tabla: true, choir: true,
    ost: [0, 0, 7, 0, 10, 0, 7, 0, 0, 0, 7, 0, 12, 10, 7, 5],
    mels: [{ inst: 'flute', notes: [12, h, 14, h, 15, h, 17, h, 15, 14, 12, h, 10, h, 12, h, 17, h, 19, h, 17, 15, 14, h, 12, h, h, h, _, _, _, _,
      15, h, 14, h, 12, h, 10, h, 12, h, 14, h, 15, h, 17, h, 19, h, 17, h, 15, h, 14, h, 12, h, h, h, h, h, h, h] },
      { inst: 'brass', lv: 2, oct: -12, notes: [12, h, h, h, h, h, h, h, 10, h, h, h, 12, h, h, h, 17, h, h, h, 15, h, h, h, 12, h, h, h, h, h, h, h] }] },
  fortress: { bpm: 132, key: N('F#'), bars: [['F#', 1], ['D', 0], ['E', 0], ['F#', 1], ['B', 1], ['D', 0], ['C#', 0], ['C#', 0]], pad: 0.8,
    lv: { metal: 0, ost: 0, taiko: 1, kit: 2, mel: 2, choir: 3 }, metal: 'm...m.m.....m...', choir: true,
    ost: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 13, 12, 10, 7], taiko: 'T..T..T.T..T.Ttt', kit: { k: 'K.......K.......' },
    mels: [{ inst: 'brass', notes: [12, h, h, h, 13, h, 12, h, 10, h, h, h, 8, h, h, h, 7, h, h, h, 8, h, 10, h, 12, h, h, h, h, h, h, h] }] },
  lab: { bpm: 138, key: N('B'), bars: [['B', 1], ['G', 0], ['D', 0], ['A', 0], ['B', 1], ['G', 0], ['E', 1], ['F#', 0]], pad: 0.5, bass: 'pulse',
    lv: { arp: 0, kit: 1, mel: 2 },
    arp: { pat: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3], inst: 'sq', every: 1 },
    kit: { k: 'K...K...K...K...', h: '..h...h...h...h.', s: '....S.......S...' },
    mels: [{ inst: 'lead', notes: [12, h, h, 14, h, h, 15, h, 17, h, h, h, 15, h, 14, h, 12, h, h, 10, h, h, 9, h, 10, h, h, h, _, _, _, _] },
      { inst: 'brass', lv: 3, notes: [24, h, h, h, h, h, h, h, 22, h, h, h, h, h, h, h, 19, h, h, h, h, h, h, h, 21, h, h, h, h, h, h, h] }] },
  boss: { bpm: 150, key: N('D'), bars: [['D', 1], ['Eb', 0], ['D', 1], ['Eb', 0], ['Bb', 0], ['A', 0], ['D', 1], ['A', 0]],
    ost: [0, 12, 0, 13, 0, 12, 0, 7, 0, 12, 0, 13, 0, 15, 13, 12], choir: true, taiko: 'T.tTT.t.T.tTTttt', rim: '..r...r...r...rr', kit: { k: 'K.......K.K.....' },
    mels: [{ inst: 'brass', notes: [12, h, 13, h, 12, h, h, h, 13, h, 15, h, 13, h, h, h, 10, h, 12, h, 13, h, 15, h, 16, h, h, h, h, h, h, h] }] },
  final: { bpm: 160, key: N('D'), bars: [['D', 1], ['Bb', 0], ['G', 1], ['A', 0], ['D', 1], ['Eb', 0], ['C', 1], ['A', 0]],
    ost: [0, 12, 0, 12, 1, 12, 0, 12, 0, 12, 0, 12, 3, 1, 0, 12], choir: true, taiko: 'T.tTT.tTT.tTTttt', kit: { k: 'K...K...K...K.K.', s: '....S.......S.SS' },
    gtr: 'x.x.x.x.x.x.xx.x', bass: '8th',
    mels: [{ inst: 'brass', notes: [12, h, h, h, 15, h, 13, h, 12, h, 10, h, 12, h, h, h, 17, h, h, h, 15, h, 13, h, 15, h, 16, h, 17, h, h, h] },
      { inst: 'lead', notes: [24, h, 22, h, 20, h, 19, h, 20, h, 19, h, 17, h, 15, h, 24, h, 22, h, 20, h, 22, h, 25, h, h, h, 24, h, h, h] }] },
  victory: { bpm: 96, key: N('D'), bars: [['D', 0], ['G', 0], ['A', 0], ['D', 0]], choir: true, taiko: 'T.......T.t.T...',
    mels: [{ inst: 'brass', notes: [12, h, 16, h, 19, h, h, h, 17, h, 19, h, 21, h, h, h, 19, h, 21, h, 23, h, h, h, 24, h, h, h, h, h, h, h] }] },
  defeat: { bpm: 66, key: N('D'), bars: [['D', 1], ['Bb', 0], ['G', 1], ['A', 0]], choir: true, pad: 1,
    mels: [{ inst: 'brass', notes: [12, h, h, h, 10, h, h, h, 9, h, h, h, 7, h, h, h, 5, h, h, h, 7, h, 9, h, 7, h, h, h, h, h, h, h] }] },
}; })();
SCORES.stage = SCORES.sea;
// themes whose layers follow the fight
const ADAPTIVE = new Set(['sea', 'stage', 'stealth', 'chase', 'jungle', 'swamp', 'rock', 'village', 'fortress', 'lab']);

const Music = {
  name: '', score: null, step: 0, next: 0, transpose: 0, bus: null, verb: null, level: 2, want: 2,
  play(name, transpose = 0) {
    if (!SCORES[name]) name = 'sea';
    if (this.name === name && this.transpose === transpose && this.score) return;
    const fresh = this.name !== name;
    this.score = SCORES[name]; this.name = name; this.transpose = transpose; this.step = 0; this.next = 0;
    this.level = this.want = ADAPTIVE.has(name) ? 1 : 3;
    if (fresh && Sound.ac) this.swell(Sound.ac.currentTime + 0.02);
  },
  stop() { this.score = null; this.name = ''; },
  setIntensity(n) { if (ADAPTIVE.has(this.name)) this.want = Math.max(0, Math.min(3, n)); },
  danger(on) {
    if (!this.lp || !Sound.ac || this.dangerOn === on) return;
    this.dangerOn = on;
    const t = Sound.ac.currentTime;
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setTargetAtTime(on ? 900 : 18000, t, 0.4);
  },
  ensureBus() {
    const ac = Sound.ac;
    if (this.bus || !ac) return;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.lp = ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000; this.lp.Q.value = 0.7;
    this.duck = ac.createGain(); this.duck.gain.value = 1;
    comp.connect(this.lp); this.lp.connect(this.duck); this.duck.connect(Sound.mus);
    this.bus = ac.createGain(); this.bus.gain.value = 0.9; this.bus.connect(comp);
    this.verb = ac.createConvolver(); this.verb.buffer = this.impulse(3.2);
    const wet = ac.createGain(); wet.gain.value = 0.55;
    this.send = ac.createGain(); this.send.gain.value = 1;
    this.send.connect(this.verb); this.verb.connect(wet); wet.connect(comp);
    // stingers bypass the duck so they cut through
    this.stBus = ac.createGain(); this.stBus.gain.value = 1.1; this.stBus.connect(Sound.mus);
    const sw = ac.createGain(); sw.gain.value = 0.5; this.stSend = sw; sw.connect(this.verb);
    this.dist = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; this.dist[i] = Math.tanh(x * 6) * 0.8; }
  },
  impulse(sec) {
    const ac = Sound.ac, len = Math.floor(ac.sampleRate * sec), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  },
  update() {
    const ac = Sound.ac;
    if (!ac || !this.score || ac.state !== 'running') return;
    this.ensureBus();
    const st = 60 / this.score.bpm / 4;          // one 16th note
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;
    while (this.next < ac.currentTime + 0.2) { this.tick(this.step, this.next, st); this.next += st; this.step++; }
  },
  freq(semi) { return 440 * Math.pow(2, (semi + this.transpose) / 12); },

  /* ---------- instruments ---------- */
  env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  },
  out(node, dry, wet, stinger) {
    const d = Sound.ac.createGain(); d.gain.value = dry; node.connect(d); d.connect(stinger ? this.stBus : this.bus);
    const w = Sound.ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(stinger ? this.stSend : this.send);
  },
  osc(type, f, t, dur, det = 0) { const o = Sound.ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(t + dur); return o; },
  strings(f, t, dur, vol, bright = 1600, st) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.4;
    for (const det of [-9, 0, 8]) this.osc('sawtooth', f, t, dur + 1.2, det).connect(lp);
    lp.connect(g); this.env(g, t, 0.18, vol, dur, 0.9); this.out(g, 0.7, 0.6, st);
  },
  ostinato(f, t, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    for (const det of [-6, 6]) this.osc('sawtooth', f, t, 0.25, det).connect(lp);
    lp.connect(g); this.env(g, t, 0.006, vol, 0.04, 0.12); this.out(g, 0.85, 0.25);
  },
  brass(f, t, dur, vol, st) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.12); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.5);
    for (const [type, mul, det] of [['sawtooth', 1, -5], ['sawtooth', 1, 5], ['square', 0.5, 0]]) {
      const o = this.osc(type, f * mul, t, dur + 0.6, det);
      const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.2; vg.gain.value = 4;
      vib.connect(vg); vg.connect(o.detune); vib.start(t + 0.2); vib.stop(t + dur + 0.6);
      o.connect(lp);
    }
    lp.connect(g); this.env(g, t, 0.06, vol, dur, 0.35); this.out(g, 0.75, 0.55, st);
  },
  flute(f, t, dur, vol) {   // bansuri-like: breathy sine with a late vibrato
    const ac = Sound.ac, g = ac.createGain();
    const o = this.osc('sine', f, t, dur + 0.5), o2 = this.osc('triangle', f * 2, t, dur + 0.5);
    const g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o.connect(g);
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.4; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(14, t + Math.min(0.5, dur));
    vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune); vib.start(t); vib.stop(t + dur + 0.5);
    const s = ac.createBufferSource(); s.buffer = Sound.noiseBuf; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
    const ng = ac.createGain(); this.env(ng, t, 0.03, vol * 0.25, 0.05, 0.2); s.connect(bp); bp.connect(ng); ng.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.4);
    this.env(g, t, 0.07, vol, dur, 0.25); this.out(g, 0.7, 0.7);
  },
  lead(f, t, dur, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 3;
    for (const [ty, det] of [['sawtooth', -8], ['sawtooth', 8], ['square', 0]]) this.osc(ty, f, t, dur + 0.4, det).connect(lp);
    lp.connect(g); this.env(g, t, 0.02, vol, dur, 0.2); this.out(g, 0.8, 0.45);
  },
  marimba(f, t, vol) {
    const ac = Sound.ac, g = ac.createGain();
    this.osc('sine', f, t, 0.6).connect(g);
    const g2 = ac.createGain(); g2.gain.value = 0.25; this.osc('sine', f * 4, t, 0.15).connect(g2); g2.connect(g);
    this.env(g, t, 0.003, vol, 0.01, 0.4); this.out(g, 0.8, 0.4);
  },
  harp(f, t, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(600, t + 1);
    this.osc('triangle', f, t, 1.6).connect(lp); this.osc('sawtooth', f, t, 0.4, 4).connect(lp);
    lp.connect(g); this.env(g, t, 0.004, vol, 0.02, 1.3); this.out(g, 0.6, 0.8);
  },
  sq(f, t, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.osc('square', f, t, 0.2).connect(lp); lp.connect(g); this.env(g, t, 0.003, vol, 0.03, 0.1); this.out(g, 0.7, 0.35);
  },
  guitar(f, t, dur, vol) {   // distorted power chord (root, fifth, octave)
    const ac = Sound.ac, pre = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter(), hp = ac.createBiquadFilter();
    pre.gain.value = 1.4; lp.type = 'lowpass'; lp.frequency.value = 2400; hp.type = 'highpass'; hp.frequency.value = 90;
    for (const m of [1, 1.4983, 2]) this.osc('sawtooth', f * m, t, dur + 0.2, rand(-6, 6)).connect(pre);
    const sh = ac.createWaveShaper(); sh.curve = this.dist;
    pre.connect(sh); sh.connect(lp); lp.connect(hp); hp.connect(g);
    this.env(g, t, 0.004, vol, dur * 0.5, 0.08); this.out(g, 0.9, 0.2);
  },
  choir(f, t, dur, vol, st) {
    const ac = Sound.ac, g = ac.createGain(), mix = ac.createGain();
    for (const det of [-12, 0, 11]) this.osc('sawtooth', f, t, dur + 1.6, det).connect(mix);
    for (const [fq, q, gain] of [[750, 6, 1], [1150, 7, 0.6], [2600, 9, 0.25]]) {     // "aah" formants
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
      const bg = ac.createGain(); bg.gain.value = gain; mix.connect(bp); bp.connect(bg); bg.connect(g);
    }
    this.env(g, t, st ? 0.05 : 0.5, vol, dur, 1.4); this.out(g, 0.5, 0.9, st);
  },
  taiko(t, vol, pitch = 1, st) {
    const ac = Sound.ac, g = ac.createGain();
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95 * pitch, t); o.frequency.exponentialRampToValueAtTime(42 * pitch, t + 0.35);
    o.connect(g); this.env(g, t, 0.003, vol, 0.02, 0.55); o.start(t); o.stop(t + 0.7);
    const s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ac.createGain(); this.env(ng, t, 0.002, vol * 0.6, 0.01, 0.12);
    s.connect(lp); lp.connect(ng); s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
    this.out(g, 1, 0.35, st); this.out(ng, 1, 0.3, st);
  },
  kick(t, vol) {
    const ac = Sound.ac, g = ac.createGain(), o = ac.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(g); this.env(g, t, 0.002, vol, 0.03, 0.25); o.start(t); o.stop(t + 0.4); this.out(g, 1, 0.08);
  },
  snare(t, vol) {
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.8;
    const g = ac.createGain(); this.env(g, t, 0.002, vol, 0.02, 0.16); s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
    const o = this.osc('triangle', 210, t, 0.12), og = ac.createGain(); this.env(og, t, 0.002, vol * 0.6, 0.01, 0.07); o.connect(og);
    this.out(g, 0.9, 0.3); this.out(og, 0.9, 0.2);
  },
  hat(t, vol) {
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = ac.createGain(); this.env(g, t, 0.001, vol, 0.005, 0.04); s.connect(hp); hp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
    this.out(g, 0.7, 0.1);
  },
  metal(t, vol) {   // industrial anvil hit
    const ac = Sound.ac, g = ac.createGain();
    for (const f of [1210, 1837, 2650]) this.osc('square', f, t, 0.35).connect(g);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 3;
    g.connect(bp); const g2 = ac.createGain(); this.env(g2, t, 0.001, vol, 0.01, 0.28); bp.connect(g2); this.out(g2, 0.6, 0.6);
  },
  rim(t, vol) {
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 1.4;
    const g = ac.createGain(); this.env(g, t, 0.002, vol, 0.01, 0.09);
    s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.15); this.out(g, 0.9, 0.4);
  },
  bass(f, t, dur, vol, type = 'triangle') {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(type === 'triangle' ? 3000 : 1200, t); lp.frequency.exponentialRampToValueAtTime(type === 'triangle' ? 2000 : 300, t + Math.max(0.1, dur));
    this.osc(type, f, t, dur + 0.4).connect(lp); lp.connect(g); this.env(g, t, 0.01, vol, dur, 0.2); this.out(g, 1, 0.08);
  },
  swell(t) {   // cymbal/riser into a new section
    if (!this.bus && Sound.ac) this.ensureBus();
    if (!this.bus) return;
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf; s.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(hp); hp.connect(g); s.start(t); s.stop(t + 1.7); this.out(g, 0.6, 0.8);
  },
  crash(t, vol, st) {
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf; s.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    const g = ac.createGain(); this.env(g, t, 0.002, vol, 0.05, 1.6); s.connect(hp); hp.connect(g); s.start(t); s.stop(t + 1.8); this.out(g, 0.7, 0.7, st);
  },
  boom(t, vol) {   // cinematic impact: sub drop + noise body
    const ac = Sound.ac, g = ac.createGain(), o = ac.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    o.connect(g); this.env(g, t, 0.004, vol, 0.1, 1.4); o.start(t); o.stop(t + 1.8);
    const s = ac.createBufferSource(); s.buffer = Sound.noiseBuf; s.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(80, t + 1.2);
    const ng = ac.createGain(); this.env(ng, t, 0.002, vol * 0.8, 0.05, 1.1); s.connect(lp); lp.connect(ng); s.start(t); s.stop(t + 1.4);
    this.out(g, 1, 0.4, true); this.out(ng, 1, 0.5, true);
  },

  /* ---------- stingers: short scored hits over the music ---------- */
  stinger(name) {
    const ac = Sound.ac; if (!ac) return;
    this.ensureBus(); if (!this.bus) return;
    const t = ac.currentTime + 0.02, F = s => 440 * Math.pow(2, (s + N('D')) / 12);
    const duck = (len) => { this.duck.gain.cancelScheduledValues(t); this.duck.gain.setTargetAtTime(0.15, t, 0.03); this.duck.gain.setTargetAtTime(1, t + len, 0.4); };
    switch (name) {
      case 'ko': {   // "ta-da ta-da ta-da — BOOM": triplet brass stabs climbing into a huge impact
        duck(3.2);
        const stab = 0.11;
        [[0, 3], [5, 8], [10, 12]].forEach((pair, i) => pair.forEach((n, j) => {
          const tt = t + i * stab * 2.2 + j * stab;
          for (const iv of [0, 7, 12]) this.brass(F(n + iv - 12), tt, stab * 0.8, 0.07, true);
          this.taiko(tt, j ? 0.6 : 0.9, j ? 1.3 : 1, true);
        }));
        const big = t + 3 * stab * 2.2;
        this.boom(big, 1.2); this.crash(big, 0.5, true);
        for (const iv of [0, 3, 7, 12, 15]) this.brass(F(iv), big, 1.4, 0.06, true);
        for (const iv of [0, 7, 12]) this.choir(F(iv), big, 1.6, 0.07, true);
        for (let i = 0; i < 4; i++) this.taiko(big + i * 0.09, 1, 0.8, true);
        break;
      }
      case 'boss': {   // the horn: a huge low brass blast as a boss walks in
        duck(2.4);
        for (const iv of [-24, -12, -5, 0]) this.brass(F(iv), t, 1.6, 0.09, true);
        this.boom(t, 0.9); this.taiko(t, 1, 0.7, true); this.taiko(t + 0.9, 1, 0.7, true);
        break;
      }
      case 'objective': {
        for (const [i, n] of [[0, 12], [1, 16], [2, 19], [3, 24]]) this.brass(F(n), t + i * 0.08, i === 3 ? 0.6 : 0.08, 0.06, true);
        this.taiko(t + 0.24, 0.7, 1.2, true); this.crash(t + 0.24, 0.25, true);
        break;
      }
      case 'wave': {
        for (const iv of [0, 7, 12]) this.brass(F(iv), t, 0.35, 0.05, true);
        this.taiko(t, 0.8, 1, true); this.taiko(t + 0.12, 0.6, 1.3, true);
        break;
      }
      case 'deploy': {
        duck(1.6);
        for (let i = 0; i < 8; i++) this.taiko(t + i * 0.06, 0.3 + i * 0.08, 1.4, true);
        const b = t + 0.5; for (const iv of [0, 7, 12, 19]) this.brass(F(iv), b, 0.9, 0.06, true);
        this.boom(b, 0.6); this.crash(b, 0.35, true);
        break;
      }
      case 'fail': {
        duck(3);
        [[12, 0], [11, 0.35], [10, 0.7], [7, 1.05]].forEach(([n, d]) => this.brass(F(n - 12), t + d, d > 1 ? 1.4 : 0.3, 0.07, true));
        this.boom(t + 1.05, 0.7);
        break;
      }
    }
  },

  /* ---------- the sequencer: one call per 16th note ---------- */
  on(layer) {   // is this layer playing at the current intensity?
    const sc = this.score, need = (sc.lv && sc.lv[layer]) ?? 0;
    return this.level >= need;
  },
  tick(i, t, st) {
    const sc = this.score, step = i % 16, barIdx = Math.floor(i / 16) % sc.bars.length;
    if (step === 0 && this.level !== this.want) this.level += Math.sign(this.want - this.level);   // layers change on bar lines
    const [chordName, minor] = sc.bars[barIdx];
    let root = N(chordName) - 12; while (root > sc.key - 6) root -= 12;   // keep chords voiced near the key
    const third = minor ? 3 : 4, barLen = st * 16, tones = [0, third, 7, 12, 12 + third, 19];
    const lvl = this.level, epic = lvl >= 3;
    if (step === 0) {
      const pv = (sc.pad ?? 1) * (sc.ost ? 0.045 : 0.06);
      for (const iv of [0, third, 7, 12]) this.strings(this.freq(root + iv - 12), t, barLen * 0.85, pv, sc.ost && lvl >= 2 ? 1300 : 1900);
      if (!sc.bass) this.bass(this.freq(root - 24), t, barLen * 0.9, 0.35);
      if (sc.choir && this.on('choir')) for (const iv of [0, third, 7]) this.choir(this.freq(root + iv), t, barLen * 0.9, epic ? 0.06 : 0.045);
      if (barIdx === 0 && i > 0) this.swell(t - 1.1);
    }
    if (sc.bass === '8th' && step % 2 === 0) this.bass(this.freq(root - 24 + (step % 8 === 6 ? 12 : 0)), t, st * 1.6, 0.3, 'sawtooth');
    if (sc.bass === 'pulse' && step % 2 === 0) this.bass(this.freq(root - 24), t, st * 1.2, step % 4 === 0 ? 0.32 : 0.2, 'sawtooth');
    if (sc.ost && this.on('ost')) { const n = sc.ost[step]; if (n !== null && n !== undefined) this.ostinato(this.freq(root + n - 12), t, step % 4 === 0 ? 0.11 : 0.075); }
    if (sc.arp && this.on('arp') && !(sc.arp.maxLv !== undefined && lvl > sc.arp.maxLv + 1) && step % (sc.arp.every || 1) === 0) {
      const p = sc.arp.pat[(step / (sc.arp.every || 1)) % sc.arp.pat.length];
      if (p !== null && p !== undefined) {
        const f = this.freq(root + tones[p] + (sc.arp.inst === 'sq' ? 0 : 12));
        if (sc.arp.inst === 'harp') this.harp(f, t, 0.08); else if (sc.arp.inst === 'sq') this.sq(f, t, 0.05); else this.marimba(f, t, 0.11);
      }
    }
    if (sc.taiko && this.on('taiko')) {
      const tk = sc.taiko[step];
      if (tk === 'T') this.taiko(t, 0.9, sc.tabla ? 1.6 : 1); else if (tk === 't') this.taiko(t, 0.5, sc.tabla ? 2.4 : 1.35);
    }
    if (sc.rim && this.on('rim') && sc.rim[step] === 'r') this.rim(t, 0.25);
    if (sc.metal && this.on('metal') && sc.metal[step] === 'm') this.metal(t, 0.09);
    if (sc.kit && this.on('kit')) {
      if (sc.kit.k && sc.kit.k[step] === 'K') this.kick(t, 0.9);
      if (sc.kit.s) { const c = sc.kit.s[step]; if (c === 'S') this.snare(t, 0.5); else if (c === 's') this.snare(t, 0.2); }
      if (sc.kit.h && sc.kit.h[step] === 'h') this.hat(t, 0.12);
    }
    if (sc.gtr && this.on('gtr') && sc.gtr[step] === 'x') this.guitar(this.freq(root - 12), t, st * 0.9, 0.05);
    // melodies on 8ths, holding through '-'
    if (step % 2 === 0 && sc.mels) for (const m of sc.mels) {
      if (m.lv !== undefined ? lvl < m.lv : !this.on('mel')) continue;
      const mi = Math.floor(i / 2) % m.notes.length, n = m.notes[mi];
      if (typeof n !== 'number') continue;
      let len = 1; while (m.notes[(mi + len) % m.notes.length] === HOLD && len < 16) len++;
      const f = this.freq(sc.key + n - 12 + (m.oct || 0)), dur = st * 2 * len * 0.9;
      if (m.inst === 'flute') this.flute(f * 2, t, dur, 0.06);
      else if (m.inst === 'lead') this.lead(f, t, dur, 0.035);
      else this.brass(f, t, dur, 0.07);
    }
  },
};
