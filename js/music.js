'use strict';
/* =========================================================
   MUSTAFA — original cinematic battle score, synthesized live.
   Orchestral-style layers: driving string ostinato, string pads,
   brass swells, choir, taiko & timpani, cymbal swells, reverb hall.
   Same API as before: Music.play(name, transpose), Music.stop(), Music.update().
   ========================================================= */
const N = (name) => { // note name -> semitones from A (e.g. 'D' -> -7)
  return { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 }[name];
};
// chord = [root, minor?] ; melody numbers = semitones above the song key root (A4 base), null = rest, '-' = hold
const SCORES = {
  title: { bpm: 76, key: N('D'), bars: [['D', 1], ['Bb', 0], ['F', 0], ['C', 0], ['D', 1], ['Bb', 0], ['G', 1], ['A', 0]],
    ost: false, choir: true, taiko: 'T.......T...t.t.', brass: [12, '-', '-', '-', 15, '-', 17, '-', 13, '-', '-', '-', 12, '-', 10, '-', 8, '-', '-', '-', 10, '-', 12, '-', 7, '-', '-', '-', '-', '-', '-', '-',
      12, '-', '-', '-', 15, '-', 17, '-', 20, '-', '-', '-', 19, '-', 17, '-', 15, '-', '-', '-', 13, '-', 12, '-', 14, '-', '-', '-', 13, '-', '-', '-'] },
  stage: { bpm: 132, key: N('D'), bars: [['D', 1], ['D', 1], ['Bb', 0], ['C', 0], ['D', 1], ['D', 1], ['F', 0], ['C', 0]],
    ost: [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 10, 0, 7, 0], choir: false,
    taiko: 'T..tT.t.T..tT.tt', rim: '....r.......r..r',
    brass: [null, null, null, null, null, null, null, null, 12, '-', '-', 10, 12, '-', 15, '-', 13, '-', '-', '-', 12, '-', 10, '-', 12, '-', '-', '-', '-', '-', null, null,
      null, null, null, null, null, null, null, null, 17, '-', '-', 15, 17, '-', 20, '-', 19, '-', '-', '-', 17, '-', 15, '-', 17, '-', '-', '-', '-', '-', null, null] },
  boss: { bpm: 150, key: N('D'), bars: [['D', 1], ['Eb', 0], ['D', 1], ['Eb', 0], ['Bb', 0], ['A', 0], ['D', 1], ['A', 0]],
    ost: [0, 12, 0, 13, 0, 12, 0, 7, 0, 12, 0, 13, 0, 15, 13, 12], choir: true,
    taiko: 'T.tTT.t.T.tTTttt', rim: '..r...r...r...rr',
    brass: [12, '-', 13, '-', 12, '-', '-', '-', 13, '-', 15, '-', 13, '-', '-', '-', 10, '-', 12, '-', 13, '-', 15, '-', 16, '-', '-', '-', '-', '-', '-', '-'] },
  victory: { bpm: 96, key: N('D'), bars: [['D', 0], ['G', 0], ['A', 0], ['D', 0]], ost: false, choir: true, taiko: 'T.......T.t.T...',
    brass: [12, '-', 16, '-', 19, '-', '-', '-', 17, '-', 19, '-', 21, '-', '-', '-', 19, '-', 21, '-', 23, '-', '-', '-', 24, '-', '-', '-', '-', '-', '-', '-'] },
};

const Music = {
  name: '', score: null, step: 0, next: 0, transpose: 0, bus: null, verb: null,
  play(name, transpose = 0) {
    if (name === 'title' || name === 'stage' || name === 'boss' || name === 'victory') { /* known */ } else name = 'stage';
    if (this.name === name && this.transpose === transpose && this.score) return;
    const fresh = this.name !== name;
    this.score = SCORES[name]; this.name = name; this.transpose = transpose; this.step = 0; this.next = 0;
    if (fresh && Sound.ac) this.swell(Sound.ac.currentTime + 0.02);
  },
  stop() { this.score = null; this.name = ''; },
  ensureBus() {
    const ac = Sound.ac;
    if (this.bus || !ac) return;
    // music bus -> compressor -> master, with a parallel reverb hall
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    comp.connect(Sound.mus);
    this.bus = ac.createGain(); this.bus.gain.value = 0.9; this.bus.connect(comp);
    this.verb = ac.createConvolver(); this.verb.buffer = this.impulse(3.2);
    const wet = ac.createGain(); wet.gain.value = 0.55;
    this.send = ac.createGain(); this.send.gain.value = 1;
    this.send.connect(this.verb); this.verb.connect(wet); wet.connect(comp);
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
  out(node, dry, wet) {
    const d = Sound.ac.createGain(); d.gain.value = dry; node.connect(d); d.connect(this.bus);
    const w = Sound.ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.send);
  },
  strings(f, t, dur, vol, bright = 1600) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.4;
    for (const det of [-9, 0, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 1.2); }
    lp.connect(g); this.env(g, t, 0.18, vol, dur, 0.9); this.out(g, 0.7, 0.6);
  },
  ostinato(f, t, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    for (const det of [-6, 6]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + 0.25); }
    lp.connect(g); this.env(g, t, 0.006, vol, 0.04, 0.12); this.out(g, 0.85, 0.25);
  },
  brass(f, t, dur, vol) {
    const ac = Sound.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.12); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.5);
    for (const [type, mul, det] of [['sawtooth', 1, -5], ['sawtooth', 1, 5], ['square', 0.5, 0]]) {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f * mul; o.detune.value = det;
      const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.2; vg.gain.value = 4;
      vib.connect(vg); vg.connect(o.detune); vib.start(t + 0.2); vib.stop(t + dur + 0.6);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    }
    lp.connect(g); this.env(g, t, 0.06, vol, dur, 0.35); this.out(g, 0.75, 0.55);
  },
  choir(f, t, dur, vol) {
    const ac = Sound.ac, g = ac.createGain(), mix = ac.createGain();
    for (const det of [-12, 0, 11]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(mix); o.start(t); o.stop(t + dur + 1.6); }
    for (const [fq, q, gain] of [[750, 6, 1], [1150, 7, 0.6], [2600, 9, 0.25]]) {     // "aah" formants
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
      const bg = ac.createGain(); bg.gain.value = gain; mix.connect(bp); bp.connect(bg); bg.connect(g);
    }
    this.env(g, t, 0.5, vol, dur, 1.4); this.out(g, 0.5, 0.9);
  },
  taiko(t, vol, pitch = 1) {
    const ac = Sound.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95 * pitch, t); o.frequency.exponentialRampToValueAtTime(42 * pitch, t + 0.35);
    o.connect(g); this.env(g, t, 0.003, vol, 0.02, 0.55); o.start(t); o.stop(t + 0.7);
    const s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ac.createGain(); this.env(ng, t, 0.002, vol * 0.6, 0.01, 0.12);
    s.connect(lp); lp.connect(ng); s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
    this.out(g, 1, 0.35); this.out(ng, 1, 0.3);
  },
  rim(t, vol) {
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 1.4;
    const g = ac.createGain(); this.env(g, t, 0.002, vol, 0.01, 0.09);
    s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.15); this.out(g, 0.9, 0.4);
  },
  bass(f, t, dur, vol) {
    const ac = Sound.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = f; o.connect(g); this.env(g, t, 0.02, vol, dur, 0.3);
    o.start(t); o.stop(t + dur + 0.4); this.out(g, 1, 0.1);
  },
  swell(t) {   // cymbal/riser into a new section
    if (!this.bus && Sound.ac) this.ensureBus();
    if (!this.bus) return;
    const ac = Sound.ac, s = ac.createBufferSource(); s.buffer = Sound.noiseBuf; s.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(hp); hp.connect(g); s.start(t); s.stop(t + 1.7); this.out(g, 0.6, 0.8);
  },

  /* ---------- the sequencer: one call per 16th note ---------- */
  tick(i, t, st) {
    const sc = this.score, step = i % 16, barIdx = Math.floor(i / 16) % sc.bars.length;
    const [chordName, minor] = sc.bars[barIdx];
    let root = N(chordName) - 12; while (root > sc.key - 6) root -= 12;   // keep chords voiced near the key
    const third = minor ? 3 : 4, barLen = st * 16;
    if (step === 0) {
      // pads: low strings chord + sub bass every bar, choir doubles in epic songs
      for (const iv of [0, third, 7, 12]) this.strings(this.freq(root + iv - 12), t, barLen * 0.85, sc.ost ? 0.045 : 0.06, sc.ost ? 1300 : 1900);
      this.bass(this.freq(root - 24), t, barLen * 0.9, 0.35);
      if (sc.choir) for (const iv of [0, third, 7]) this.choir(this.freq(root + iv), t, barLen * 0.9, 0.05);
      if (barIdx === 0 && i > 0) this.swell(t - 1.1);
    }
    if (sc.ost) this.ostinato(this.freq(root + sc.ost[step] - 12), t, step % 4 === 0 ? 0.11 : 0.075);
    const tk = sc.taiko[step];
    if (tk === 'T') this.taiko(t, 0.9, 1);
    else if (tk === 't') this.taiko(t, 0.5, 1.35);
    if (sc.rim && sc.rim[step] === 'r') this.rim(t, 0.25);
    // brass melody on 8ths, holding through '-'
    if (step % 2 === 0) {
      const mel = sc.brass, mi = (Math.floor(i / 2)) % mel.length, n = mel[mi];
      if (typeof n === 'number') {
        let len = 1; while (mel[(mi + len) % mel.length] === '-' && len < 16) len++;
        this.brass(this.freq(sc.key + n - 12), t, st * 2 * len * 0.9, 0.07);
      }
    }
  },
};
