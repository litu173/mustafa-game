'use strict';
/* =========================================================
   MUSTAFA REBORN — cut-out skeletal animation for the heroes.
   Each hero is ONE painting split into parts (the head is cut from
   the cover art, so the face never changes). Bones are posed every
   frame from the fighter's state, and poses blend smoothly, so walks,
   punches and falls move continuously instead of flipping frames.
   ========================================================= */
const RIGIMG = {}, RIGFLASH = {};
function loadRigs() {
  if (!HERO_RIG) return;
  for (const id of Object.keys(window.RIG || {})) {
    const im = new Image(); SPR.total++;
    im.onload = () => { RIGIMG[id] = im; RIGFLASH[id] = tinted(im, '#fff6e0', 1); SPR.loaded++; };
    im.onerror = () => { if (im.src.includes('.webp')) { im.src = 'assets/sprites/rig_' + id + '.png?v=' + SPRITE_V; return; } SPR.total--; };
    im.src = 'assets/sprites/rig_' + id + '.webp?v=' + SPRITE_V;
  }
}
// Off: the heroes are drawn as single whole-body paintings (head to boots in one piece), like
// every other character, so the neck and body always match. The cut-out puppet is kept for reference.
const HERO_RIG = false;
const hasRig = id => HERO_RIG && !!RIGIMG[id] && !!(window.RIG && window.RIG[id]);

// a few hand-tuned numbers per hero (head size and seat of the head on the neck)
// head size and neck seat tuned by .claude/proportions.js against the cover painting

const RIG_TUNE = { mustafa: { head: 1.023, neckDy: 13.6 }, rakib: { head: 1.085, neckDy: 27.6 }, nadia: { head: 1.099, neckDy: 88.4 }, bablu: { head: 1.014, neckDy: 54.1 } };   // matched to the cover: chin-to-hip ≈ 2.1 heads, neck ≈ 0.2 head

const PK = ['lean', 'head', 'uF', 'fF', 'uB', 'fB', 'tF', 'sF', 'tB', 'sB', 'rot', 'lift'];
const GUARD = { lean: 0.03, head: 0, uF: -0.55, fF: -1.95, uB: -0.3, fB: -2.0, tF: -0.14, sF: 0.2, tB: 0.2, sB: 0.12, rot: 0, lift: 0 };
const ease = k => k * k * (3 - 2 * k);
const mix = (a, b, k) => a + (b - a) * k;

// How far through an attack are we? 0 = guard, 1 = fully extended
function strikeK(f, m) {
  const a0 = m.a0 || m.fire || 4, a1 = m.a1 || a0 + 4, t = f.t;
  if (t < a0) return ease(t / a0) * 0.85;
  if (t <= a1 + 2) return 1;
  return Math.max(0, 1 - (t - a1 - 2) / Math.max(4, m.dur - a1 - 2));
}

// Target pose for this frame
function rigTarget(f) {
  const P = { ...GUARD }, st = f.visState || f.state, t = G.t + f.id * 17;
  const ph = (f.dist || 0) / 75 * Math.PI;           // one stride ≈ 150 px of travel
  P.lean += Math.sin(t * 0.06) * 0.012; P.uF += Math.sin(t * 0.06) * 0.03;   // breathing
  switch (st) {
    case 'walk': case 'enter': {
      const run = f.running, A = run ? 0.62 : 0.42, Kn = run ? 1.25 : 0.85;
      P.tF = -A * Math.sin(ph); P.tB = -A * Math.sin(ph + Math.PI);
      P.sF = 0.12 + Kn * Math.pow(Math.max(0, Math.cos(ph)), 1.4);
      P.sB = 0.12 + Kn * Math.pow(Math.max(0, Math.cos(ph + Math.PI)), 1.4);
      P.uF += 0.14 * Math.sin(ph) * (run ? 2 : 1); P.uB -= 0.14 * Math.sin(ph) * (run ? 2 : 1);
      P.lean = run ? -0.16 : -0.04; P.head = run ? 0.08 : 0.02;
      break;
    }
    case 'jump': case 'drop':
      if (f.jatk) Object.assign(P, { tF: -1.45, sF: 0.05, tB: 0.45, sB: 1.5, lean: 0.25, uF: -0.9, fF: -1.2 });
      else Object.assign(P, { tF: -1.0, sF: 1.7, tB: -0.45, sB: 1.6, uF: -1.1, fF: -1.6, uB: -0.6, lean: -0.05 });
      break;
    case 'hurt': case 'grabbed': {
      const k = Math.max(0, 1 - f.t / 14);
      Object.assign(P, { lean: 0.18 + 0.2 * k, head: 0.15 + 0.25 * k, uF: 0.25, fF: -0.9, uB: 0.5, fB: -0.7, tF: -0.3, sF: 0.4, tB: 0.25, sB: 0.3 });
      break;
    }
    case 'fall': Object.assign(P, { rot: Math.min(1.45, f.t * 0.12), head: 0.3, uF: -2.2, fF: -0.4, uB: -2.6, fB: -0.3, tF: -0.6, sF: 0.6, tB: -0.2, sB: 0.4 }); break;
    case 'down': case 'dead': Object.assign(P, { rot: 1.5, head: 0.1, uF: -2.9, fF: -0.2, uB: -2.7, fB: -0.2, tF: -0.15, sF: 0.1, tB: 0.05, sB: 0.1, lift: 0 }); break;
    case 'getup': { const k = ease(Math.min(1, f.t / 18)); Object.assign(P, { rot: mix(1.5, 0, k), tF: mix(-0.15, -1.3, Math.sin(k * Math.PI)), sF: mix(0.1, 2.2, Math.sin(k * Math.PI)), uF: mix(-2.9, -0.55, k) }); break; }
    // seated in the Cadillac: thighs level, shins down, back against the seat. A driver keeps
    // both hands up on the wheel; a passenger rests the near arm on the door.
    case 'sit': case 'drive':
      Object.assign(P, { lean: -0.12, head: 0.06, tF: -1.5, sF: 1.45, tB: -1.42, sB: 1.4 });
      if (f.seat === 'driver') Object.assign(P, { uF: -0.95, fF: -0.55, uB: -0.85, fB: -0.65 });
      else Object.assign(P, { uF: -0.35, fF: -1.35, uB: -0.2, fB: -1.5, head: -0.04 });
      P.lean += Math.sin(t * 0.09) * 0.015;   // a little road sway
      break;
    case 'win': Object.assign(P, { uF: -3.0, fF: -0.1, uB: -0.25, fB: -0.6, lean: -0.06, head: -0.12 }); break;
    case 'grab': Object.assign(P, { uF: -1.25, fF: -0.35, uB: -1.0, fB: -0.5, lean: -0.08, tF: -0.3, sF: 0.35 }); break;
    case 'attack': {
      const m = f.move; if (!m) break;
      const k = strikeK(f, m), pose = m.pose;
      if (pose === 'jab' || pose === 'dash') { P.uF = mix(-0.55, -1.52, k); P.fF = mix(-1.95, -0.05, k); P.lean = mix(0.03, -0.1, k); P.tF = -0.3; P.sF = 0.25; if (pose === 'dash') { P.lean = -0.3; P.tB = 0.5; } }
      else if (pose === 'cross') { P.uB = mix(-0.3, -1.52, k); P.fB = mix(-2.0, -0.05, k); P.lean = mix(0.03, -0.16, k); P.uF = mix(-0.55, -0.2, k); P.tF = -0.35; P.sF = 0.3; P.tB = 0.35; }
      else if (pose === 'kick' || pose === 'spinkick') {
        P.tF = mix(-0.14, -1.5, k); P.sF = k < 0.55 ? mix(0.2, 1.7, k / 0.55) : mix(1.7, 0.02, (k - 0.55) / 0.45);
        P.lean = 0.32 * k; P.uF = -0.9; P.uB = 0.3; P.tB = 0.12;
        if (pose === 'spinkick') P.flip = (f.t >> 3) % 2 === 1;
      }
      else if (pose === 'uppercut' || pose === 'rising') {
        const crouch = f.t < (m.a0 || 6) ? ease(f.t / (m.a0 || 6)) : 0;
        P.uF = mix(-0.6, -2.95, k); P.fF = mix(-1.9, -0.2, k); P.lean = mix(0.1, -0.1, k);
        P.tF = mix(-0.1, -0.7, crouch); P.sF = mix(0.2, 1.1, crouch); P.tB = 0.3 + 0.3 * crouch; P.sB = 0.15 + 0.8 * crouch;
      }
      else if (pose === 'slam') { const up = f.t < (m.a0 || 12); P.uF = P.uB = up ? mix(-0.6, -2.9, ease(f.t / (m.a0 || 12))) : mix(-2.9, -0.7, Math.min(1, (f.t - (m.a0 || 12)) / 5)); P.fF = P.fB = -0.3; P.lean = up ? 0.1 : -0.45; P.tF = -0.5; P.sF = up ? 0.3 : 1.0; P.sB = up ? 0.2 : 0.9; }
      else if (pose === 'special') { P.uF = -1.57; P.fF = -0.05; P.uB = -1.57; P.fB = -0.05; P.flip = (f.t >> 2) % 2 === 1; P.tF = -0.3; P.sF = 0.4; }
      else if (pose === 'swing' || pose === 'whip') { P.uF = mix(-2.8, -1.1, k); P.fF = mix(-1.2, -0.05, k); P.lean = mix(0.12, -0.12, k); }
      else if (pose === 'shoot' || pose === 'bazooka') { P.uF = -1.55; P.fF = -0.04; P.uB = -1.3; P.fB = -0.45; P.lean = 0.05; }
      else if (pose === 'toss' || pose === 'throw') { P.uF = mix(-2.6, -1.2, k); P.fF = mix(-2.2, -0.2, k); P.uB = -0.4; P.lean = mix(0.15, -0.1, k); }
      break;
    }
  }
  return P;
}

// Draw a hero's puppet with its feet at (x, y). o: { flash, alpha }
function drawRig(c, f, x, y, face, o = {}) {
  const id = f.def.id, R = window.RIG[id], img = o.flash ? RIGFLASH[id] : RIGIMG[id];
  if (!R || !img) return false;
  // blend toward the target pose; attacks snap a little faster so hits read crisply
  const T = rigTarget(f), rate = f.state === 'attack' ? 0.5 : 0.3;
  if (!f.rp) f.rp = { ...T };
  for (const k of PK) f.rp[k] += (T[k] - f.rp[k]) * rate;
  const P = f.rp, tune = RIG_TUNE[id] || { head: 0.95, neckDy: 6 };
  const d = SPRITE_DEFS[id], tor = R.torso, th = R.thighF, sh = R.shinF;
  const legLen = (th.j.end[1] - th.j.top[1]) + (sh.j.foot[1] - sh.j.top[1]), torsoLen = tor.j.hip[1] - tor.j.neck[1];
  const k = d.h / ((legLen + torsoLen) * 1.2) * (f.def.look && f.def.look.scale || 1);   // puppet pixels -> world pixels
  const rot2 = (vx, vy, a) => [vx * Math.cos(a) - vy * Math.sin(a), vx * Math.sin(a) + vy * Math.cos(a)];
  // forward kinematics in puppet pixels, hip at the origin, facing right
  const limb = (part, from, a) => { const p = R[part], [ex, ey] = rot2(p.j.end ? p.j.end[0] - p.j.top[0] : p.j.foot[0] - p.j.top[0], (p.j.end || p.j.foot)[1] - p.j.top[1], a); return [from[0] + ex, from[1] + ey]; };
  const hipF = [6, 0], hipB = [-6, 0];
  const kneeF = limb('thighF', hipF, P.tF), footF = limb('shinF', kneeF, P.tF + P.sF);
  const kneeB = limb('thighB', hipB, P.tB), footB = limb('shinB', kneeB, P.tB + P.sB);
  const [nx, ny] = rot2(tor.j.neck[0] - tor.j.hip[0], tor.j.neck[1] - tor.j.hip[1], P.lean);
  const neck = [nx, ny];
  const shoulder = key => { const [sx, sy] = rot2(tor.j[key][0] - tor.j.hip[0], tor.j[key][1] - tor.j.hip[1], P.lean); return [sx, sy]; };
  const sF = shoulder('shF'), sB = shoulder('shB');
  const elF = limb('upperF', sF, P.uF), elB = limb('upperB', sB, P.uB);
  // stand on the lower foot (both feet stay planted as the hip rises and falls)
  // o.seat: hips are pinned at (x, y) instead (sitting in the car)
  const ground = o.seat ? 0 : Math.max(footF[1], footB[1]) + 4;
  c.save();
  c.translate(x, y - (P.rot > 0.05 ? 30 * Math.min(1, P.rot) : 0));
  c.scale((P.flip ? -face : face) * k, k);
  if (P.rot > 0.01) { c.translate(0, -ground * (1 - Math.min(1, P.rot / 1.5) * 0.85)); c.rotate(-P.rot); c.translate(0, ground * (1 - Math.min(1, P.rot / 1.5) * 0.85)); }
  c.translate(0, -ground);
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  const draw = (part, at, a, pivot) => {
    const p = R[part], pv = pivot || p.j.top;
    c.save(); c.translate(at[0], at[1]); c.rotate(a);
    c.drawImage(img, p.x, p.y, p.w, p.h, -pv[0], -pv[1], p.w, p.h);
    c.restore();
  };
  // back limbs, torso, front leg, head, front arm
  draw('upperB', sB, P.uB); draw('foreB', elB, P.uB + P.fB);
  draw('thighB', hipB, P.tB); draw('shinB', kneeB, P.tB + P.sB);
  // the painted side heads carry a full neck that fades out over the torso's own neck
  const side = R.head && R.head.j.chin;
  const drawHead = () => {
    const hd = R.head, hs = side ? (torsoLen * 0.5) / hd.j.chin[1] * tune.head : (torsoLen * 0.62) / hd.h * tune.head;
    c.save(); c.translate(neck[0], neck[1] + (side ? tune.neckDy * 0.5 : tune.neckDy)); c.rotate(P.lean * 0.5 + P.head); c.scale(hs, hs);
    c.drawImage(img, hd.x, hd.y, hd.w, hd.h, -hd.j.neck[0], -hd.j.neck[1], hd.w, hd.h);
    if (o.dbg) {   // measurement hook for tests: crown, chin, neck seat, collar and belt in canvas pixels
      const M = c.getTransform(), pt = (px, py) => { const q = M.transformPoint(new DOMPoint(px, py)); return [q.x, q.y]; };
      o.dbg.crown = pt(0, -hd.j.neck[1]);
      { const hsInv = 1 / hs, r = -(P.lean * 0.5 + P.head);   // collar (torso neck joint) and hip, from the head's frame
        const back = (px, py) => { const dx = px - neck[0], dy = py - (neck[1] + (side ? tune.neckDy * 0.5 : tune.neckDy)); return [(dx * Math.cos(r) - dy * Math.sin(r)) * hsInv, (dx * Math.sin(r) + dy * Math.cos(r)) * hsInv]; };
        const cl = back(neck[0], neck[1]), hp = back(0, 0); o.dbg.collar = pt(cl[0], cl[1]); o.dbg.hip = pt(hp[0], hp[1]); } o.dbg.chin = pt(0, (side ? hd.j.chin[1] : hd.h * 0.8) - hd.j.neck[1]); o.dbg.neck = pt(0, 0);
    }
    c.restore();
  };
  draw('torso', [0, 0], P.lean, tor.j.hip);
  draw('thighF', hipF, P.tF); draw('shinF', kneeF, P.tF + P.sF);
  if (R.head) drawHead();
  draw('upperF', sF, P.uF); draw('foreF', elF, P.uF + P.fF);
  // a held weapon sits in the front fist
  if (f.weapon && typeof drawItemSpr === 'function' && (GUNS[f.weapon] || MELEE_W[f.weapon])) {
    const fist = limb('foreF', elF, P.uF + P.fF);
    c.save(); c.translate(fist[0], fist[1]); c.rotate(P.uF + P.fF + Math.PI / 2); c.scale(1 / k, 1 / k);
    drawItemSpr(c, f.weapon, 0, 18, itemScale(f.weapon, 26)); c.restore();   // true-to-life size in the fist
  }
  c.restore();
  return true;
}
