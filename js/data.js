'use strict';
/* =========================================================
   MUSTAFA — game data: heroes, the Black Fang gang, dinosaurs,
   weapons, moves and the six stages.
   ========================================================= */

// look = costume read by drawFigure(); royal = Royal Pass costume overrides.
const HEROES = [
  {
    id: 'mustafa', name: 'MUSTAFA', title: 'The Hunter', hp: 100, speed: 4.7, power: 1.1, finisher: 'uppercut', gunBonus: 1.3,
    desc: 'Jungle hunter. Solid fists, and deadly with every gun he picks up.', stats: [4, 4, 5],
    look: { skin: '#b5764a', hair: '#16100b', hairStyle: 'cap', cap: '#f0b422', shirt: '#4e8a3c', top: 'military', sleeves: 'short',
            pants: '#e6b437', boots: '#6e4020', belt: '#5a3517' },
    royal: { cap: '#151515', shirt: '#1d1d22', pants: '#d4af37', boots: '#121212', belt: '#d4af37', sash: '#d4af37' },
  },
  {
    id: 'rakib', name: 'BOLT', title: 'The Mechanic', hp: 100, speed: 4.8, power: 1.0, finisher: 'kick',
    desc: 'Ace mechanic and street brawler. Builds anything, breaks anyone. Finishes with a flying kick.', stats: [4, 4, 4],
    look: { skin: '#d49b6c', hair: '#1b1410', hairStyle: 'slick', shirt: '#efebe0', top: 'dress', sleeves: 'rolled',
            pants: '#262a36', boots: '#2a1c12', belt: '#3a2414', holster: '#5a3517' },
    royal: { shirt: '#f6f1df', pants: '#121216', boots: '#d4af37', belt: '#d4af37', sash: '#d4af37' },
  },
  {
    id: 'nadia', name: 'NOVA', title: 'The Storm', hp: 95, speed: 5.3, power: 0.9, finisher: 'spinkick',
    desc: 'Ex-special forces scout, lightning fast. Her spinning kicks clear a whole crowd.', stats: [3, 5, 4],
    look: { female: true, build: 0.86, skin: '#e3ad86', hair: '#140d0d', hairStyle: 'wavy', shirt: '#d23a2c', top: 'knot', sleeves: 'rolled',
            pants: '#f1ede3', boots: '#7a4824', belt: '#6a3d1c', holster: '#5a3517', lips: '#b0242a' },
    royal: { shirt: '#161616', pants: '#f5efe0', boots: '#d4af37', belt: '#d4af37', sash: '#d4af37' },
  },
  {
    id: 'bablu', name: 'TITAN', title: 'The Bulldozer', hp: 118, speed: 4.0, power: 1.4, finisher: 'slam',
    desc: 'A walking wall. Slow, but his ground slam shakes the earth.', stats: [5, 2, 3],
    look: { build: 1.3, scale: 1.06, skin: '#c78a5c', hair: '#15100c', hairStyle: 'flattop', shirt: '#e8681c', top: 'tee', sleeves: 'short',
            pants: '#6e9a58', boots: '#3a2a1a', belt: '#4a2d16' },
    royal: { shirt: '#161616', pants: '#2a2a30', boots: '#d4af37', belt: '#d4af37', sash: '#d4af37' },
  },
];

const BANDANA = ['#b8241c', '#1f5fae', '#2f8a3a', '#d89a1c'];
const JEANS = ['#3b5a8a', '#4a4a55', '#6a3a2a'];

/* Enemies. dino: 'raptor' | 'rex' | 'trike' | 'ptera'. docile dinos only fight once hit. */
const ENEMY_DEFS = {
  razor: {
    name: 'RAZOR', hp: 46, speed: 3.6, reach: 66, melee: ['eslash'], cool: [45, 85], score: 200, weapon: 'knife',
    drop: { knife: 0.22, hotdog: 0.15 },
    look: { skin: '#cf9a72', hair: '#2a1c12', hairStyle: 'bandana', bandana: '#b8241c', shirt: '#2a2522', top: 'vest', sleeves: 'none',
            pants: '#3b5a8a', boots: '#2a1d14', belt: '#1a1210', extra: ['scar'] },
  },
  motka: {
    name: 'MOTKA', hp: 115, speed: 2.5, reach: 72, melee: ['epunch', 'ebelly'], cool: [60, 100], score: 400, drop: { meat: 0.35 },
    look: { build: 1.55, fat: true, scale: 1.08, skin: '#c98d62', hair: '#2a1a10', hairStyle: 'bald', shirt: '#ece6d4', top: 'tank', sleeves: 'none',
            pants: '#4a3a2a', boots: '#2a1c12', belt: '#1a1a1a', suspenders: '#8a2a1a', extra: ['beard'] },
  },
  poacher: {
    name: 'POACHER', hp: 54, speed: 2.9, reach: 66, melee: ['epunch'], ranged: 'eshoot', keepAway: true, cool: [70, 120], score: 350,
    weapon: 'rifle', drop: { rifle: 0.3, shotgun: 0.15, pistol: 0.15 },
    look: { skin: '#c4875a', hair: '#3a2616', hairStyle: 'safari', hat: '#a8915f', shirt: '#b29a64', top: 'safari', sleeves: 'short',
            pants: '#6b5a3a', boots: '#3a2616', belt: '#3a2616', strap: '#5a3a1a', extra: ['mustache'] },
  },
  biker: {
    name: 'BIKER', hp: 62, speed: 3.3, reach: 112, melee: ['ewhip'], weapon: 'chain', cool: [55, 95], score: 300, drop: { pipe: 0.3, pizza: 0.2 },
    look: { skin: '#d6a07a', hair: '#3a2a1a', hairStyle: 'helmet', helmet: '#7a1c1c', shirt: '#1e1c1f', top: 'jacket', sleeves: 'long',
            pants: '#2a2a33', boots: '#111111', belt: '#111111', extra: ['shades'] },
  },
  lash: {
    name: 'LASH', hp: 52, speed: 3.8, reach: 118, melee: ['ewhip'], weapon: 'whip', cool: [55, 95], score: 300, drop: { apple: 0.3, gem: 0.1 },
    look: { female: true, build: 0.86, skin: '#e0aa83', hair: '#d6402c', hairStyle: 'long', shirt: '#5d2a8a', top: 'knot', sleeves: 'none',
            pants: '#18161e', boots: '#5d2a8a', belt: '#c9a227', lips: '#8a1c3a' },
  },
  raptor: {
    name: 'RAPTOR', hp: 62, speed: 5.2, reach: 96, melee: ['ebite'], cool: [40, 80], score: 450, dino: 'raptor', radius: 24,
    col: '#6f9a3a', stripe: '#34521a', drop: { meat: 0.2 },
  },
  trike: {
    name: 'TRICERATOPS', hp: 150, speed: 2.2, reach: 120, melee: ['egore'], charge: true, cool: [50, 90], score: 800, dino: 'trike', radius: 46,
    docile: true, col: '#8d906a', drop: { meat: 1 },
  },
  ptera: {
    name: 'PTERANODON', hp: 34, speed: 4.2, reach: 80, flyer: true, cool: [60, 110], score: 300, dino: 'ptera', radius: 20, col: '#b0703c',
    melee: ['eswoop'],
  },
  // ---- elite variants (same art, recoloured, much tougher) ----
  razorX: { spr: 'razor', hue: 190, name: 'FANG ELITE', hp: 82, speed: 4.3, reach: 70, melee: ['eslash', 'edash'], cool: [32, 60], score: 500, weapon: 'knife', drop: { knife: 0.3, pizza: 0.2 }, elite: true },
  motkaX: { spr: 'motka', hue: 250, name: 'IRON MOTKA', hp: 210, speed: 2.8, reach: 76, melee: ['epunch', 'ebelly', 'eheavy'], cool: [45, 80], score: 900, heavy: true, drop: { meat: 0.6 }, elite: true },
  poacherX: { spr: 'poacher', hue: 70, name: 'FANG SNIPER', hp: 76, speed: 3.1, reach: 66, melee: ['epunch'], ranged: 'eshoot', keepAway: true, cool: [40, 75], score: 700, weapon: 'rifle', drop: { rifle: 0.5, shotgun: 0.2 }, elite: true },
  raptorX: { spr: 'raptor', hue: 150, sprScale: 1.22, name: 'ALPHA RAPTOR', hp: 150, speed: 6.0, reach: 110, melee: ['ebite', 'egore'], cool: [30, 60], score: 1500, dino: 'raptor', radius: 30, heavy: true, col: '#3a7a8a', stripe: '#1a3a44', drop: { meat: 0.8 }, elite: true },
  captain: { spr: 'razor', hue: 320, sprScale: 1.12, name: 'FANG CAPTAIN', hp: 300, speed: 4.0, reach: 80, melee: ['eslash', 'edash', 'eheavy'], cool: [28, 55], score: 3000, weapon: 'knife', heavy: true, mini: true, drop: { meat: 1 }, elite: true },
  // ---- Kaiser's sci-fi soldiers ----
  raptorC: { spr: 'raptor', hue: 185, sprScale: 1.06, name: 'CYBER RAPTOR', hp: 105, speed: 5.8, reach: 100, melee: ['ebite'], ranged: 'elaser', cool: [32, 62], score: 1100, dino: 'raptor', radius: 24, col: '#3a8a9a', stripe: '#123a44', drop: { meat: 0.3 }, elite: true, cyber: true },
  trooper: { spr: 'poacher', hue: 255, name: 'FANG TROOPER', hp: 84, speed: 3.3, reach: 66, melee: ['epunch', 'ekick'], ranged: 'elaser', keepAway: true, cool: [38, 68], score: 800, weapon: 'rifle', drop: { rifle: 0.3, grenade: 0.15 }, elite: true, cyber: true },
  // ---- bosses ----
  tusker: {
    name: 'TUSKER', boss: true, hp: 540, speed: 3.8, reach: 150, melee: ['ebite', 'estomp'], charge: true, cool: [35, 70], score: 7000,
    dino: 'rex', scale: 1.5, radius: 50, col: '#e0892e', stripe: '#8a4210',
  },
  butcher: {
    name: 'BUTCHER BHOLA', boss: true, hp: 480, speed: 3.3, reach: 112, melee: ['emachete', 'ecross'], charge: true, cool: [40, 75], score: 6000,
    weapon: 'machete', weapon2: 'machete', radius: 16,
    look: { build: 1.6, scale: 1.25, skin: '#a86a44', hair: '#1a120c', hairStyle: 'bald', shirt: '#a86a44', top: 'bare', sleeves: 'none',
            pants: '#3a3326', boots: '#2a1c12', belt: '#2b1d12', necklace: 'skull', extra: ['beard', 'eyepatch'] },
  },
  hog: {
    name: 'HOG BAHADUR', boss: true, hp: 320, speed: 6, score: 7000, rider: true, radius: 30,
    look: { build: 1.45, scale: 1.0, skin: '#c98d62', hair: '#2a1a10', hairStyle: 'bandana', bandana: '#2a2a2a', shirt: '#1e1c1f', top: 'vest',
            sleeves: 'none', pants: '#3a3a44', boots: '#111111', belt: '#111111', extra: ['beard', 'shades'] },
  },
  saju: {
    name: 'SHADOW SAJU', boss: true, hp: 460, speed: 5.6, reach: 74, melee: ['eslash', 'edash', 'edash'], cool: [30, 55], score: 8000,
    weapon: 'knife', shadow: true, radius: 12,
    look: { scale: 1.08, skin: '#d29c74', hair: '#e8e8f4', hairStyle: 'mohawk', shirt: '#2a1b3a', top: 'jacket', sleeves: 'none',
            pants: '#1a1a22', boots: '#111111', belt: '#d4af37', extra: ['shades'] },
  },
  morgol: {
    name: 'MORGOL', boss: true, hp: 580, speed: 3.0, reach: 92, melee: ['epunch', 'eheavy'], ranged: 'eshotgun', charge: true, cool: [40, 70],
    score: 9000, weapon: 'shotgun', radius: 16,
    look: { build: 1.5, scale: 1.25, skin: '#b9784c', hair: '#2a1a10', hairStyle: 'safari', hat: '#7a2a1a', shirt: '#8a6a3a', top: 'safari',
            sleeves: 'short', pants: '#4a3a24', boots: '#2a1a10', belt: '#2a1a10', strap: '#3a2414', extra: ['beard', 'scar'] },
  },
  kaiser: {
    name: 'DR. KAISER', boss: true, final: true, hp: 820, speed: 3.0, reach: 96, melee: ['epunch', 'eheavy'], ranged: 'eorb', charge: true,
    cool: [35, 65], score: 20000, radius: 16,
    look: { build: 1.1, scale: 1.18, skin: '#d6b08f', hair: '#f2f2f2', hairStyle: 'wild', shirt: '#2f3448', top: 'labcoat', coat: '#ecebe4',
            sleeves: 'long', pants: '#262833', boots: '#121212', belt: '#121212', extra: ['glasses'] },
    look2: { build: 1.6, scale: 1.5, skin: '#8a63c4', hair: '#f2f2f2', hairStyle: 'wild', shirt: '#8a63c4', top: 'bare', sleeves: 'none',
             pants: '#262833', boots: '#121212', belt: '#121212', heads3: true, extra: [] },
  },
};

/* Moves (frames at 60fps). a0..a1 = active window. pose = animation. next = combo chain. */
const MOVES = {
  jab:      { dur: 12, a0: 3, a1: 6, range: 80, depth: 26, dmg: 6, kb: 2, pose: 'jab', next: 'jab2', sfx: 'whoosh' },
  jab2:     { dur: 13, a0: 3, a1: 6, range: 82, depth: 26, dmg: 7, kb: 2, pose: 'cross', next: 'fin', sfx: 'whoosh' },
  uppercut: { dur: 26, a0: 6, a1: 10, range: 86, depth: 28, dmg: 15, down: true, kbx: 4, kbz: 10, pose: 'uppercut', lunge: 2, sfx: 'whoosh' },
  kick:     { dur: 24, a0: 6, a1: 11, range: 100, depth: 28, dmg: 14, down: true, kbx: 6, kbz: 6, pose: 'kick', lunge: 2, sfx: 'whoosh' },
  spinkick: { dur: 28, a0: 5, a1: 17, range: 102, depth: 32, dmg: 7, tick: 6, down: true, kbx: 5, kbz: 7, pose: 'spinkick', sfx: 'whoosh' },
  slam:     { dur: 32, a0: 12, a1: 15, range: 96, depth: 34, dmg: 20, down: true, kbx: 5, kbz: 8, pose: 'slam', shake: 10, quake: true, sfx: 'heavy' },
  dash:     { dur: 24, a0: 2, a1: 15, range: 80, depth: 28, dmg: 13, down: true, kbx: 7, kbz: 6, pose: 'dash', lunge: 9, sfx: 'whoosh' },
  rising:   { dur: 36, a0: 4, a1: 20, range: 88, depth: 30, dmg: 18, down: true, kbx: 4, kbz: 12, pose: 'rising', rise: 120, sfx: 'whoosh' },
  wswing:   { dur: 20, a0: 6, a1: 10, range: 118, depth: 30, dmg: 17, kb: 4, pose: 'swing', sfx: 'whoosh' },
  gun:      { dur: 14, fire: 3, pose: 'shoot' },
  uzi:      { dur: 6, fire: 2, pose: 'shoot', auto: true },
  shotgun:  { dur: 28, fire: 4, pose: 'shoot' },
  bazooka:  { dur: 34, fire: 10, pose: 'bazooka' },
  toss:     { dur: 18, fire: 7, pose: 'toss' },
  throwA:   { dur: 22, pose: 'throw' },
  special:  { dur: 40, a0: 4, a1: 32, radius: 125, depth: 48, dmg: 9, tick: 9, down: true, kbx: 6, kbz: 9, pose: 'special', sfx: 'special' },
  // enemies — longer wind-ups so players can react
  eslash:   { dur: 30, a0: 12, a1: 16, range: 72, depth: 22, dmg: 7, kb: 2.5, pose: 'swing', sfx: 'slash' },
  epunch:   { dur: 32, a0: 13, a1: 17, range: 76, depth: 22, dmg: 9, kb: 3, pose: 'jab', sfx: 'whoosh' },
  eheavy:   { dur: 40, a0: 18, a1: 22, range: 82, depth: 24, dmg: 13, down: true, kbx: 5, kbz: 7, pose: 'uppercut', sfx: 'whoosh' },
  ebelly:   { dur: 40, a0: 16, a1: 24, range: 70, depth: 26, dmg: 12, down: true, kbx: 7, kbz: 5, pose: 'dash', lunge: 6, sfx: 'heavy' },
  ekick:    { dur: 30, a0: 10, a1: 15, range: 94, depth: 22, dmg: 10, down: true, kbx: 5, kbz: 6, pose: 'kick', sfx: 'whoosh' },
  ewhip:    { dur: 40, a0: 16, a1: 22, range: 126, depth: 22, dmg: 9, kb: 3, pose: 'whip', sfx: 'slash' },
  emachete: { dur: 40, a0: 18, a1: 22, range: 112, depth: 28, dmg: 16, down: true, kbx: 6, kbz: 8, pose: 'swing', shake: 7, sfx: 'slash' },
  ecross:   { dur: 46, a0: 16, a1: 26, range: 104, depth: 28, dmg: 9, tick: 5, kb: 2, pose: 'special', sfx: 'slash' },
  edash:    { dur: 34, a0: 10, a1: 24, range: 70, depth: 26, dmg: 11, down: true, kbx: 6, kbz: 7, pose: 'dash', lunge: 13, sfx: 'slash' },
  ebite:    { dur: 34, a0: 12, a1: 18, range: 96, depth: 24, dmg: 10, kb: 3, pose: 'bite', lunge: 5, sfx: 'slash' },
  egore:    { dur: 40, a0: 16, a1: 24, range: 116, depth: 30, dmg: 16, down: true, kbx: 9, kbz: 9, pose: 'bite', lunge: 6, sfx: 'heavy' },
  eswoop:   { dur: 40, a0: 14, a1: 26, range: 70, depth: 30, dmg: 9, down: true, kbx: 5, kbz: 6, pose: 'swoop', sfx: 'whoosh' },
  estomp:   { dur: 46, a0: 24, a1: 27, radius: 175, depth: 64, dmg: 14, down: true, kbx: 6, kbz: 8, pose: 'stomp', shake: 14, quake: true, sfx: 'heavy' },
  eshoot:   { dur: 42, fire: 22, pose: 'shoot', proj: 'ebullet' },
  eshotgun: { dur: 46, fire: 22, pose: 'shoot', proj: 'epellets' },
  eorb:     { dur: 44, fire: 22, pose: 'cast', proj: 'orb' },
  elaser:   { dur: 40, fire: 20, pose: 'shoot', proj: 'elaser', sfx: 'laser' },
};

/* Weapons. Guns hold ammo; thrown weapons are spent; melee wears out. */
const GUNS = {
  pistol:  { ammo: 12, move: 'gun', proj: 'bullet', dmg: 12, label: 'PISTOL' },
  rifle:   { ammo: 16, move: 'gun', proj: 'bullet', dmg: 15, label: 'RIFLE' },
  uzi:     { ammo: 48, move: 'uzi', proj: 'bullet', dmg: 5, label: 'UZI' },
  shotgun: { ammo: 8, move: 'shotgun', proj: 'pellets', dmg: 9, label: 'SHOTGUN' },
  bazooka: { ammo: 5, move: 'bazooka', proj: 'rocket', dmg: 42, label: 'BAZOOKA' },
};
const THROWN = {
  knife:   { ammo: 1, proj: 'knife', dmg: 20, label: 'KNIFE' },
  grenade: { ammo: 3, proj: 'grenade', dmg: 36, label: 'GRENADE' },
  rock:    { ammo: 1, proj: 'rock', dmg: 16, label: 'ROCK' },
};
const MELEE_W = { pipe: { dur: 14, dmg: 17, label: 'PIPE' }, machete: { dur: 12, dmg: 21, label: 'MACHETE' } };
const WEAPONS = [...Object.keys(GUNS), ...Object.keys(THROWN), ...Object.keys(MELEE_W)];
const FOOD = { pizza: 35, hotdog: 25, meat: 60, apple: 15 };
const TREASURE = { gem: 2000, gold: 1000 };

/* Campaign missions (the story mode). waves[].at = camera x where the screen locks.
   props: [x, y, kind, itemInside] — kinds: barrel, crate, and objective targets jammer, tank, lock, cage, hut.
   obj: what the mission asks for. wave.survive = seconds to hold out; wave.defend = protect the car there.
   look: time of day / weather for the live background. bark: radio chatter keyed by wave index. */
const STAGES = [
  // ---------- CHAPTER 1 · THE DROWNED CITY ----------
  {
    id: 'm1', chapter: 0, name: 'DROWNED ROOFTOPS', sub: 'Find the gang’s radio post', theme: 'sea', transpose: 0, len: 5400, maxOn: 4, music: 'sea',
    obj: { type: 'clear', text: 'Fight through the Black Fang scouts' },
    brief: 'The Black Fang dragged Dada Hakim through the drowned city. Their scouts hold the rooftops. Clear a path and find out where the convoy went.',
    waves: [
      { at: 500, list: ['razor', 'razor', 'razor'] },
      { at: 1400, list: ['razor', 'motka', 'razor', 'lash'] },
      { at: 2300, list: ['poacher', 'razor', 'lash', 'razor', 'razorX'] },
      { at: 3200, list: ['raptor', 'razor', 'raptor', 'motka'] },
      { at: 4120, list: ['captain', 'razor', 'razorX', 'razor'], boss: true },
    ],
    props: [[880, 620, 'barrel', 'pizza'], [1750, 540, 'crate', 'pistol'], [2650, 660, 'barrel', 'uzi'], [3550, 580, 'crate', 'hotdog'], [4400, 640, 'barrel', 'meat']],
    bark: { 0: ['nadia', 'Mustafa, the scouts are on every rooftop. Stay sharp!'], 2: ['rakib', 'Poachers with rifles. Close the distance fast!'], 3: ['nadia', 'Raptors! They smell the blood on those crates.'], 4: ['captain', 'Nobody touches the convoy. Get him!'] },
  },
  {
    id: 'm2', chapter: 0, name: 'RADIO SILENCE', sub: 'Night falls on the drowned city', theme: 'sea', look: 'night', weather: 'rain', transpose: -1, len: 5400, maxOn: 4, music: 'stealth',
    obj: { type: 'destroy', kind: 'jammer', text: 'Destroy the radio jammers' },
    brief: 'Three jammers are blocking our radio. Smash them so Nova can track the convoy. Something huge is stirring in the black water.',
    waves: [
      { at: 500, list: ['razor', 'poacher', 'razor', 'razor'] },
      { at: 1400, list: ['lash', 'razorX', 'razor', 'poacher'] },
      { at: 2300, list: ['motka', 'razor', 'poacherX', 'razor', 'lash'] },
      { at: 3200, list: ['raptor', 'raptor', 'razorX', 'lash'] },
      { at: 4120, list: ['tusker', 'razor', 'razor', 'poacher'], boss: true },
    ],
    props: [[800, 600, 'jammer'], [1700, 560, 'crate', 'shotgun'], [2500, 620, 'jammer'], [2900, 560, 'barrel', 'pizza'], [3500, 600, 'jammer'], [4400, 640, 'barrel', 'meat']],
    bark: { 0: ['nadia', 'I see the first jammer. Smash it!'], 2: ['rakib', 'That one has a sniper on it. Careful.'], 3: ['nadia', 'Last jammer! Then I can hear them again.'], 4: ['nadia', 'The water... it is TUSKER! Fight or run!'] },
  },
  {
    id: 'm3', chapter: 0, name: 'HELL ROAD', sub: 'Catch the convoy before the border', theme: 'road', drive: true, transpose: -2, len: 11000, music: 'chase',
    obj: { type: 'drive', text: 'Run down the bikers and stop Hog Bahadur' },
    brief: 'The radio is back: the convoy is racing down Hell Road. Floor the Cadillac, ram the bikers and stop their leader, Hog Bahadur.',
    waves: [], props: [],
  },
  // ---------- CHAPTER 2 · GREEN VALLEY ----------
  {
    id: 'm4', chapter: 1, name: 'THE LOST VALLEY', sub: 'Where the crystal sleeps', theme: 'jungle', transpose: 1, len: 5400, maxOn: 4, music: 'jungle',
    obj: { type: 'rescue', kind: 'cage', text: 'Free the caged baby dinosaurs' },
    brief: 'Kaiser’s diggers are tearing up the Green Valley looking for the Chrono-Fang crystal, and caging the hatchlings to drain their blood. Set them free.',
    waves: [
      { at: 500, list: ['poacher', 'razor', 'razor', 'razor'] },
      { at: 1400, list: ['poacher', 'lash', 'poacherX', 'razor'] },
      { at: 2300, list: ['trike', 'poacher', 'motka', 'razorX'] },
      { at: 3200, list: ['ptera', 'ptera', 'razorX', 'poacher', 'lash'] },
      { at: 4120, list: ['raptorX', 'raptor', 'raptor', 'raptor'], boss: true },
    ],
    props: [[900, 610, 'cage'], [1700, 560, 'crate', 'rifle'], [2600, 640, 'cage'], [3000, 560, 'barrel', 'apple'], [3500, 600, 'cage'], [4400, 620, 'barrel', 'meat']],
    bark: { 0: ['nadia', 'Babies in cages... break those locks!'], 2: ['bablu', 'Do not hit the big one with the horns. It is on our side!'], 4: ['nadia', 'The pack alpha! It thinks we took its young!'] },
  },
  {
    id: 'm5', chapter: 1, name: 'BLACK WATER', sub: 'An ambush in the glowing swamp', theme: 'swamp', look: 'dusk', weather: 'fog', water: true, transpose: 2, len: 4500, maxOn: 5, music: 'ambush',
    obj: { type: 'survive', text: 'Survive the ambush until Bolt brings the boat' },
    brief: 'Following the poachers into the swamp was a trap, and the water glows green with leaked serum. Hold the line until Bolt arrives with the boat.',
    waves: [
      { at: 500, list: ['poacher', 'razor', 'razor', 'lash'] },
      { at: 1400, list: ['razorX', 'poacher', 'lash', 'motka'] },
      { at: 3220, survive: 80, pool: ['razor', 'razor', 'poacher', 'lash', 'motka', 'razorX', 'raptor', 'poacherX', 'trooper'], list: [] },
    ],
    props: [[800, 650, 'crate', 'shotgun'], [1700, 560, 'barrel', 'meat'], [2600, 620, 'crate', 'grenade'], [3500, 600, 'barrel', 'pizza'], [3900, 650, 'crate', 'uzi']],
    bark: { 0: ['nadia', 'Too quiet. Keep your fists up.'], 2: ['rakib', 'Boat is coming! Hold them off, brother!'] },
  },
  {
    id: 'm6', chapter: 1, name: 'BUTCHER’S CAMP', sub: 'The man who sells dinosaur blood', theme: 'swamp', look: 'night', weather: 'fireflies', water: true, transpose: 2, len: 3600, maxOn: 5, music: 'swamp',
    obj: { type: 'boss', text: 'Defeat Butcher Bhola' },
    brief: 'Bhola the Butcher drains captured dinosaurs for Kaiser’s serum vats. Tonight his camp burns.',
    waves: [
      { at: 500, list: ['razor', 'motka', 'poacher', 'razorX', 'razor'] },
      { at: 1400, list: ['motkaX', 'poacher', 'lash', 'razor', 'trooper'] },
      { at: 2320, list: ['butcher', 'razor', 'poacherX', 'razor'], boss: true },
    ],
    props: [[800, 600, 'barrel', 'meat'], [1700, 640, 'crate', 'machete'], [2500, 560, 'barrel', 'pizza']],
    bark: { 1: ['bablu', 'That one is made of iron. Hit, move, hit again!'], 2: ['butcher', 'Fresh meat walked into my kitchen!'] },
  },
  // ---------- CHAPTER 3 · HOME UNDER SIEGE ----------
  {
    id: 'm7', chapter: 2, name: 'GARAGE TAKEOVER', sub: 'They came for our Cadillac', theme: 'garage', transpose: 3, len: 4500, maxOn: 5, music: 'rock',
    obj: { type: 'defend', text: 'Protect the Cadillac' },
    brief: 'While we were in the valley, the gang raided our garage. They want the Cadillac and the crystal map in its trunk. Over our dead bodies.',
    waves: [
      { at: 500, list: ['biker', 'razor', 'biker', 'razor'] },
      { at: 1400, list: ['motka', 'biker', 'lash', 'razorX'] },
      { at: 3220, defend: 800, survive: 60, pool: ['biker', 'biker', 'razor', 'motka', 'razorX', 'lash', 'poacher', 'trooper'], list: [] },
    ],
    props: [[760, 620, 'crate', 'pipe'], [1680, 560, 'barrel', 'pizza'], [2580, 660, 'crate', 'bazooka'], [3000, 560, 'barrel', 'hotdog']],
    bark: { 0: ['rakib', 'My tools! My beautiful tools!'], 2: ['rakib', 'They are going for the car! Do not let them scratch it!'] },
  },
  {
    id: 'm8', chapter: 2, name: 'SHADOW IN THE RAIN', sub: 'Saju strikes from the dark', theme: 'garage', look: 'night', weather: 'storm', transpose: 3, len: 3600, maxOn: 5, music: 'storm', after: 'abduction',
    obj: { type: 'boss', text: 'Defeat Shadow Saju' },
    brief: 'The lights died. Shadow Saju, Kaiser’s assassin, is hunting us in our own home. Trust nothing in the dark.',
    waves: [
      { at: 500, list: ['razorX', 'biker', 'lash', 'razor', 'trooper'] },
      { at: 1400, list: ['motkaX', 'biker', 'razorX', 'lash', 'trooper'] },
      { at: 2320, list: ['saju', 'razorX', 'biker', 'trooper'], boss: true },
    ],
    props: [[760, 620, 'crate', 'pistol'], [1680, 560, 'barrel', 'meat'], [2500, 620, 'crate', 'uzi']],
    bark: { 0: ['nadia', 'The power is cut. Fight by the lightning!'], 2: ['saju', 'You will not even see the blade.'] },
  },
  {
    id: 'm9', chapter: 2, name: 'VILLAGE OF FLAME', sub: 'Save the villagers', theme: 'village', weather: 'embers', transpose: -3, len: 5400, maxOn: 5, music: 'village',
    obj: { type: 'rescue', kind: 'hut', text: 'Rescue the villagers from the burning huts' },
    brief: 'To slow us down, Kaiser set Shobuj Village on fire. Families are trapped in the huts. Break the doors, get them out, then we go after {CAPTIVE}.',
    waves: [
      { at: 500, list: ['trike', 'poacher', 'razor', 'razor', 'razorX'] },
      { at: 1400, list: ['ptera', 'ptera', 'biker', 'razorX', 'trooper'] },
      { at: 2300, list: ['raptor', 'poacher', 'raptor', 'motka', 'raptorC'] },
      { at: 3200, list: ['trike', 'lash', 'poacherX', 'ptera', 'biker', 'trooper'] },
      { at: 4120, list: ['captain', 'motkaX', 'poacher', 'razorX'], boss: true },
    ],
    props: [[880, 560, 'hut'], [1720, 650, 'crate', 'rifle'], [2550, 560, 'hut'], [2900, 640, 'barrel', 'pizza'], [3450, 560, 'hut'], [4420, 580, 'barrel', 'meat']],
    bark: { 0: ['{ALLY}', 'I hear children in that hut! Break the door!'], 2: ['{ALLY}', 'That raptor has a laser in its eye! Kaiser is building cyborgs!'], 4: ['captain', 'Burn it all! Kaiser’s orders!'] },
  },
  // ---------- CHAPTER 4 · THE SKY PRISON ----------
  {
    id: 'm10', chapter: 3, name: 'MORGOL’S DAM', sub: 'The fortress on the water', theme: 'fortress', weather: 'rain', transpose: -2, len: 5400, maxOn: 5, music: 'fortress',
    obj: { type: 'destroy', kind: 'lock', text: 'Break the cage locks and free the dinosaurs' },
    brief: 'The dam fortress is where Kaiser keeps captured dinosaurs, and somewhere below it, {CAPTIVE}. Free the cages and the beasts will cover us. Morgol guards the gate.',
    waves: [
      { at: 500, list: ['poacher', 'razorX', 'razor', 'poacher', 'trooper'] },
      { at: 1400, list: ['motkaX', 'poacherX', 'biker', 'razor', 'trooper'] },
      { at: 2300, list: ['raptor', 'raptorX', 'poacher', 'lash', 'raptorC'] },
      { at: 3200, list: ['razorX', 'motkaX', 'poacherX', 'biker', 'lash', 'trooper'] },
      { at: 4120, list: ['morgol', 'poacherX', 'razorX', 'trooper'], boss: true },
    ],
    props: [[880, 600, 'lock'], [1720, 650, 'crate', 'grenade'], [2600, 580, 'lock'], [3000, 640, 'barrel', 'meat'], [3500, 600, 'lock'], [4420, 640, 'crate', 'bazooka']],
    bark: { 0: ['{ALLY}', 'Searchlights everywhere. Break the locks and keep moving!'], 2: ['{ALLY}', 'Cyber-raptors on the deck! Watch the lasers!'], 4: ['morgol', 'Every beast in this valley belongs to Kaiser. You too!'] },
  },
  {
    id: 'm11', chapter: 3, name: 'PRISON BLOCK NINE', sub: 'Bring {CAPTIVE} home', theme: 'lab', look: 'alarm', transpose: -3, len: 5400, maxOn: 5, music: 'prison', captive: true,
    obj: { type: 'destroy', kind: 'core', text: 'Shut down the power cores and break {CAPTIVE} out' },
    brief: '{CAPTIVE} is locked in a stasis capsule in Prison Block Nine, being prepared for Kaiser’s cyborg program. Destroy the power cores, then smash the capsule. Nobody gets left behind.',
    waves: [
      { at: 500, list: ['trooper', 'razorX', 'razor', 'trooper'] },
      { at: 1400, list: ['motkaX', 'raptorC', 'trooper', 'lash'] },
      { at: 2300, list: ['raptorC', 'raptorC', 'poacherX', 'trooper', 'razorX'] },
      { at: 3200, list: ['captain', 'trooper', 'raptorC', 'motkaX', 'trooper'], boss: true },
    ],
    props: [[800, 600, 'core'], [1650, 560, 'crate', 'uzi'], [2500, 600, 'core'], [2950, 640, 'barrel', 'meat'], [3450, 620, 'core'], [3900, 600, 'capsule']],
    bark: { 0: ['{ALLY}', 'Those cores power the whole cell block. Smash them!'], 2: ['kaiser', 'Your friend will make a magnificent first cyborg, Mustafa.'], 3: ['{ALLY}', 'There! The capsule! Break it open!'] },
  },
  // ---------- CHAPTER 5 · THE TIME RIFT ----------
  {
    id: 'm12', chapter: 4, name: 'SERUM FACTORY', sub: 'Destroy the Fang Serum', theme: 'lab', look: 'alarm', transpose: -4, len: 5400, maxOn: 5, music: 'lab', timer: 300,
    obj: { type: 'destroy', kind: 'tank', text: 'Destroy the serum tanks before the shipment leaves' },
    brief: 'Five minutes until the serum shipment leaves the lab. Smash every tank. If it leaves, every poacher in Asia becomes a monster.',
    waves: [
      { at: 500, list: ['razorX', 'poacher', 'lash', 'razor', 'trooper'] },
      { at: 1400, list: ['motkaX', 'raptor', 'motka', 'raptorC'] },
      { at: 2300, list: ['poacherX', 'trooper', 'lash', 'biker', 'razorX'] },
      { at: 3200, list: ['raptorX', 'raptorC', 'motkaX', 'trooper', 'biker'] },
    ],
    props: [[760, 600, 'tank'], [1250, 560, 'tank'], [1660, 640, 'crate', 'uzi'], [2550, 580, 'tank'], [3000, 640, 'barrel', 'meat'], [3400, 560, 'tank'], [3700, 640, 'tank']],
    bark: { 0: ['nadia', 'Alarm! The clock is running, Mustafa!'], 2: ['rakib', 'Those tanks are glass. Hit them hard!'], 3: ['kaiser', 'You are too late. The rift is already opening.'] },
  },
  {
    id: 'm13', chapter: 4, name: 'THE TIME RIFT', sub: 'A doorway to 65 million years ago', theme: 'jungle', look: 'rift', weather: 'storm', transpose: -1, len: 5400, maxOn: 5, music: 'rift',
    obj: { type: 'destroy', kind: 'pylon', text: 'Destroy the rift pylons before the past breaks through' },
    brief: 'Kaiser fed the Chrono-Fang crystal into his machine and tore a hole in time above the Green Valley. Cyber-raptors and wild beasts are pouring out. Destroy the pylons holding the rift open.',
    waves: [
      { at: 500, list: ['raptor', 'raptorC', 'raptor', 'trooper'] },
      { at: 1400, list: ['raptorX', 'raptorC', 'ptera', 'ptera', 'trooper'] },
      { at: 2300, survive: 45, pool: ['raptor', 'raptorC', 'raptor', 'trooper', 'ptera', 'raptorX'], list: [] },
      { at: 3200, list: ['tusker', 'raptorC', 'raptorC', 'trooper'], boss: true },
    ],
    props: [[900, 600, 'pylon'], [1700, 640, 'crate', 'bazooka'], [2600, 600, 'pylon'], [3000, 560, 'barrel', 'meat'], [3500, 620, 'pylon']],
    bark: { 0: ['nadia', 'Look at the sky... the whole valley is bending!'], 2: ['{ALLY}', 'Hold on! The rift spits them out faster every second!'], 3: ['bablu', 'Tusker came back through the rift. Bigger. Angrier.'] },
  },
  {
    id: 'm14', chapter: 4, name: 'DR. KAISER', sub: 'End the Black Fang forever', theme: 'lab', look: 'rift', transpose: -4, len: 3600, maxOn: 5, music: 'final',
    obj: { type: 'boss', text: 'Defeat Dr. Kaiser and rescue Dada Hakim' },
    brief: 'Dada Hakim is in Kaiser’s final chamber, beside the Chrono-Fang. Kaiser has injected himself with the serum. This ends tonight.',
    waves: [
      { at: 500, list: ['razorX', 'motkaX', 'poacherX', 'raptorX', 'trooper'] },
      { at: 1400, list: ['captain', 'raptorC', 'razorX', 'trooper', 'biker'] },
      { at: 2320, list: ['kaiser', 'raptorC', 'trooper', 'razorX'], boss: true },
    ],
    props: [[760, 640, 'barrel', 'meat'], [1660, 560, 'crate', 'bazooka'], [2500, 620, 'barrel', 'meat']],
    bark: { 0: ['nadia', 'Hakim is behind that door. Everything we have, Mustafa!'], 2: ['kaiser', 'Behold evolution! Kneel before the king of every age!'] },
  },
];
const CHAPTERS = ['THE DROWNED CITY', 'GREEN VALLEY', 'HOME UNDER SIEGE', 'THE SKY PRISON', 'THE TIME RIFT'];

/* Online arenas: open floors for duels and team wars (index is what the server sends). */
const ARENAS = [
  { name: 'DROWNED ROOFTOPS', theme: 'sea', transpose: 0 },
  { name: 'LOST VALLEY', theme: 'jungle', transpose: 1 },
  { name: 'BLACK SWAMP', theme: 'swamp', water: true, transpose: 2 },
  { name: 'THE GARAGE', theme: 'garage', transpose: 3 },
  { name: 'VILLAGE OF FLAME', theme: 'village', weather: 'embers', transpose: -3 },
  { name: 'DAM FORTRESS', theme: 'fortress', weather: 'rain', transpose: -2 },
  { name: 'THE LAB', theme: 'lab', look: 'alarm', transpose: -4 },
];
