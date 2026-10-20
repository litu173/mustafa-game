'use strict';
/* =========================================================
   MUSTAFA REBORN — Hell Road: how the Cadillac drives, and the
   set pieces along the road.
   Feel: throttle and brakes have inertia, the body pitches (nose up
   when you accelerate, down when you brake), the springs bounce over
   the road, the wheels turn with the speed, the exhaust smokes, and a
   hard swerve leaves tire smoke.
   Route: biker gang → raptor stampede → rockslide → nitro run → Hog Bahadur.
   ========================================================= */

// wheel centres and tire radius, as fractions of the painted car (frame 0 of car_park)
// the rear wheel sits under a fender skirt (its top is hidden below `skirt`, a fraction of the car height)
const CAR_WHEELS = [{ fx: 0.262, fy: 0.79, r: 0.057, skirt: 0.745 }, { fx: 0.838, fy: 0.77, r: 0.057 }];
const DRIVE_SECTIONS = [
  { at: 0, kind: 'bikers', title: 'HELL ROAD', sub: 'Ram the bikers off the road', who: 'rakib', say: 'Convoy’s up ahead. Put your foot down!' },
  { at: 0.25, kind: 'raptors', title: 'RAPTOR STAMPEDE!', sub: 'Swerve, or ram them', who: 'nadia', say: 'Raptors on the road! Kaiser let them loose!' },
  { at: 0.5, kind: 'rocks', title: 'ROCKSLIDE!', sub: 'Watch for the shadows', who: 'bablu', say: 'The cliffs are coming down! Eyes on the road!' },
  { at: 0.75, kind: 'blockade', title: 'NITRO RUN', sub: 'Boost through the blockade (J)', who: 'rakib', say: 'Roadblock ahead. Hit the nitro and go through the gap!' },
];

function driveSection(st) { const k = G.camX / st.len; let s = DRIVE_SECTIONS[0]; for (const d of DRIVE_SECTIONS) if (k >= d.at) s = d; return s; }

// ---- how the car moves (replaces the old fixed-speed steering) ----
function driveFeel(p, d, ix, iy) {
  const boost = p.boostT > 0;
  // throttle / brake with inertia
  const target = ix * 8 + (boost ? 12 : 0);
  p.cv = (p.cv || 0) + (target - (p.cv || 0)) * (boost ? 0.14 : 0.07);
  const accel = p.cv - (p.lastCv || 0); p.lastCv = p.cv;
  // steering between lanes, also with a little weight to it
  p.vy = (p.vy || 0) + (iy * 5.5 - (p.vy || 0)) * 0.16;
  p.x += d.speed + p.cv; p.y += p.vy;
  // body pitch: nose lifts under power, dips under braking
  const pitchT = clamp(-accel * 0.06 - (boost ? 0.012 : 0), -0.035, 0.03);
  p.pitch = (p.pitch || 0) + (pitchT - (p.pitch || 0)) * 0.18;
  // suspension: a spring that the road keeps kicking
  p.bz = p.bz || 0; p.bv = p.bv || 0;
  if (Math.random() < 0.035) p.bv -= rand(0.8, 2.2) * (1 + (d.speed + p.cv) / 20);
  p.bv += -p.bz * 0.22 - p.bv * 0.16; p.bz += p.bv;
  // wheels turn with the ground speed (radius in screen px)
  const r = CAR_LEN * CAR_WHEELS[0].r;
  p.wheelA = ((p.wheelA || 0) + (d.speed + p.cv) / r) % (Math.PI * 2);
  // exhaust from the tailpipe (rear bumper, low) — thick black puffs and flame on nitro
  const tail = p.x - CAR_LEN * 0.47;
  if (G.t % (boost ? 1 : 3) === 0) addPart({ type: 'smoke', x: tail, y: p.y + 2, z: 34 + p.bz, vx: -2.5 - (d.speed + p.cv) * 0.15, vz: rand(0.3, 1.2), life: boost ? 34 : 26, size: boost ? rand(30, 44) : rand(16, 26), color: boost ? 'rgba(60,50,45,' : 'rgba(150,150,150,' });
  if (boost && G.t % 2 === 0) addPart({ type: 'fire', x: tail - 10, y: p.y + 2, z: 34, vx: -6, vz: 0.5, life: 10, size: rand(26, 40) });
  // tire smoke on a hard swerve, dust off the rear wheel
  if (Math.abs(p.vy) > 4.2 && G.t % 2 === 0) for (const w of CAR_WHEELS) addPart({ type: 'smoke', x: p.x - CAR_LEN / 2 + CAR_LEN * w.fx, y: p.y, z: 6, vx: -3, vz: 0.8, life: 22, size: 26, color: 'rgba(225,225,225,' });
  if (G.t % 3 === 0) addPart({ type: 'dust', x: p.x - CAR_LEN / 2 + CAR_LEN * CAR_WHEELS[0].fx - 30, y: p.y, z: 6, vx: -3, vz: 0.6, life: 24, size: 22, color: 'rgba(220,190,150,' });
}

// ---- set pieces ----
function driveSpawns(st, d, p) {
  const sec = driveSection(st);
  if (d.section !== sec.kind) {
    d.section = sec.kind;
    G.banner = { title: sec.title, sub: sec.sub, t: 0, dur: 150, big: sec.at > 0 };
    if (typeof Mission !== 'undefined') Mission.say(sec.who, sec.say);
    if (sec.kind === 'blockade') d.blockT = 40;
  }
  const x = G.camX + W + 120;
  if (--d.spawnT > 0) return;
  switch (sec.kind) {
    case 'bikers': {
      d.spawnT = rand(26, 56);
      const r = Math.random(), y = rand(520, 690);
      if (r < 0.6) { const e = makeEnemy(Math.random() < 0.5 ? 'razor' : 'biker', x, y); e.runner = true; e.thrower = Math.random() < 0.35; e.cool = rand(10, 60); G.enemies.push(e); }
      else if (r < 0.85) G.props.push(makeProp(x, y, Math.random() < 0.5 ? 'barrel' : 'crate', Math.random() < 0.25 ? pick(['pizza', 'hotdog', 'meat']) : null));
      else spawnItem(pick(['pizza', 'hotdog', 'apple', 'gem']), x, y);
      break;
    }
    case 'raptors': {   // packs charge down the road and pounce at the car
      d.spawnT = rand(30, 60);
      const n = Math.random() < 0.4 ? 2 : 1;
      for (let i = 0; i < n; i++) { const e = makeEnemy('raptor', x + i * 160, rand(525, 685)); e.runner = true; e.raptorRun = true; e.vz = 0; G.enemies.push(e); }
      if (Math.random() < 0.2) spawnItem('meat', x + 80, rand(530, 680));
      break;
    }
    case 'rocks': {     // boulders fall from the cliff; a shadow marks where each will land
      d.spawnT = rand(34, 62);
      const lead = (d.speed + (p.cv || 0)) * 52;   // aim roughly where the car will be when it lands
      d.rocks.push({ x: clamp(p.x + lead + rand(-150, 350), G.camX + 300, G.camX + W + 200), y: Math.random() < 0.5 ? p.y + rand(-30, 30) : rand(520, 690), z: 820, vz: 0, s: rand(0.9, 1.35) });
      if (Math.random() < 0.3) { const e = makeEnemy('biker', x, rand(520, 690)); e.runner = true; e.cool = rand(10, 60); G.enemies.push(e); }
      break;
    }
    case 'blockade': {  // walls of barrels across the road with one gap; bikers in between
      d.spawnT = rand(70, 95);
      const gap = rand(540, 670);
      for (let y = 520; y <= 690; y += 34) if (Math.abs(y - gap) > 50) G.props.push(makeProp(x + rand(-10, 10), y, Math.random() < 0.7 ? 'barrel' : 'crate', null));
      if (Math.random() < 0.5) { const e = makeEnemy('razor', x + 300, gap); e.runner = true; e.thrower = true; e.cool = rand(10, 40); G.enemies.push(e); }
      break;
    }
  }
}

// raptors in Hell Road: sprint at the car, then leap at it
function updateRaptorRun(e) {
  const p = G.players[0];
  e.walkPh += 0.6; e.facing = -1;
  if (!e.leapt) {
    e.x -= 7; e.state = 'walk'; e.running = true;
    if (p) e.y += clamp(p.y - e.y, -1.8, 1.8);
    const rel = p ? e.x - p.x : 9999;
    if (p && p.state === 'drive' && rel < 640 && rel > 300 && Math.abs(e.y - p.y) < 70) { e.leapt = true; e.vz = 13; Sound.play('roar'); }
  } else {
    e.x -= 9; e.z += e.vz; e.vz -= 0.62; e.state = 'jump';
    if (p && p.state === 'drive' && !e.bit && e.z > 50) {
      const rel = e.x - p.x;
      if (rel > -380 && rel < 420 && Math.abs(e.y - p.y) < 60) {
        e.bit = true; G.shake = 12; Sound.play('bite');
        if (p.inv <= 0) { p.hp = Math.max(0, p.hp - 9 * DIF().dmg); p.flash = 10; p.inv = 30; popText(p.x, p.y, 240, 'CHOMP!', '#ff7a5a', 46); if (p.hp <= 0) { p.setState('dead'); p.t = 0; } }
        e.vz = 8; e.x -= 60;   // bounced off the car
      }
    }
    if (e.z <= 0) { e.z = 0; e.vz = 0; e.leapt = e.bit ? 'done' : false; if (e.leapt === 'done') e.x -= 4; }
  }
  if (e.x < G.camX - 300) e.remove = true;
}

// falling boulders
function updateRocks(d, p) {
  for (const r of d.rocks) {
    r.vz -= 0.9; r.z += r.vz;
    if (r.z <= 0 && !r.landed) {
      r.landed = true;
      G.shake = Math.max(G.shake, 10); Sound.play('boom');
      for (let i = 0; i < 10; i++) addPart({ type: 'dust', x: r.x + rand(-60, 60), y: r.y, z: 8, vx: rand(-4, 4), vz: rand(1, 4), life: 34, size: rand(30, 50), color: 'rgba(170,140,110,' });
      const rel = r.x - p.x;
      if (p.state === 'drive' && rel > -440 && rel < 460 && Math.abs(r.y - p.y) < 55 && p.inv <= 0) {
        p.hp = Math.max(0, p.hp - 14 * DIF().dmg); p.flash = 12; p.inv = 40; p.bv -= 6; Sound.play('crash');
        popText(p.x, p.y, 260, 'CRASH!', '#ff7a5a', 50); if (p.hp <= 0) { p.setState('dead'); p.t = 0; }
      } else G.props.push(Object.assign(makeProp(r.x, r.y, 'rock', null), { hp: 2 }));   // it stays on the road
      r.done = true;
    }
  }
  d.rocks = d.rocks.filter(r => !r.done && r.x > G.camX - 300);
}

// the passenger leans out and fires at whatever is ahead
function passengerGun(p) {
  if (p.state !== 'drive' || (p.gunT = (p.gunT || 0) - 1) > 0) return;
  const t = G.enemies.filter(e => e.canBeHit && !e.def.rider && e.x - p.x > 350 && e.x - p.x < 1100 && Math.abs(e.y - p.y) < 110 && e.hp > 0).sort((a, b) => a.x - b.x)[0];
  if (!t) { p.gunT = 20; return; }
  p.gunT = rand(55, 85);
  const x = p.x + CAR_LEN * (CAR_SEATS.passenger.fx - 0.5) + 40, z = 150;
  G.projs.push({ kind: 'bullet', x, y: p.y, z, vx: 30 + G.drive.speed, vy: (t.y - p.y) / 25, team: 'hero', owner: p, dmg: 16, life: 45 });
  addPart({ type: 'flash', x: x + 12, y: p.y, z, life: 5, size: 36, color: '#fff2b0' });
  Sound.play('gun');
}

function drawDriveFx(c) {
  const d = G.drive; if (!d) return;
  for (const r of d.rocks) {
    const x = r.x - G.camX, k = clamp(1 - r.z / 900, 0.15, 1);
    c.save(); c.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * k})`; c.beginPath(); c.ellipse(x, r.y, 70 * r.s * k, 16 * r.s * k, 0, 0, TAU); c.fill(); c.restore();   // landing shadow
    drawItemSpr(c, 'rock', x, r.y - r.z, 0.85 * r.s);
  }
}
