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
    id: 'rakib', name: 'RAKIB', title: 'The Mechanic', hp: 100, speed: 4.8, power: 1.0, finisher: 'kick',
    desc: 'Ace mechanic and street brawler. Finishes with a flying kick.', stats: [4, 4, 4],
    look: { skin: '#d49b6c', hair: '#1b1410', hairStyle: 'slick', shirt: '#efebe0', top: 'dress', sleeves: 'rolled',
            pants: '#262a36', boots: '#2a1c12', belt: '#3a2414', holster: '#5a3517' },
    royal: { shirt: '#f6f1df', pants: '#121216', boots: '#d4af37', belt: '#d4af37', sash: '#d4af37' },
  },
  {
    id: 'nadia', name: 'NADIA', title: 'The Diplomat', hp: 95, speed: 5.3, power: 0.9, finisher: 'spinkick',
    desc: 'Lightning fast. Her spinning kicks clear a whole crowd.', stats: [3, 5, 4],
    look: { female: true, build: 0.86, skin: '#e3ad86', hair: '#140d0d', hairStyle: 'wavy', shirt: '#d23a2c', top: 'knot', sleeves: 'rolled',
            pants: '#f1ede3', boots: '#7a4824', belt: '#6a3d1c', holster: '#5a3517', lips: '#b0242a' },
    royal: { shirt: '#161616', pants: '#f5efe0', boots: '#d4af37', belt: '#d4af37', sash: '#d4af37' },
  },
  {
    id: 'bablu', name: 'BABLU', title: 'The Bulldozer', hp: 118, speed: 4.0, power: 1.4, finisher: 'slam',
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

/* Stages. waves[].at = camera x where the screen locks.
   props: [x, y, 'barrel'|'crate', itemInside]. drive: auto-scrolling car stage. */
const STAGES = [
  {
    name: 'CITY IN THE SEA', sub: 'The rooftops of the drowned city', theme: 'sea', transpose: 0, len: 5400, maxOn: 3,
    waves: [
      { at: 500, list: ['razor', 'razor'] },
      { at: 1400, list: ['razor', 'motka', 'razor'] },
      { at: 2300, list: ['poacher', 'razor', 'lash', 'razor'] },
      { at: 3200, list: ['raptor', 'razor', 'raptor'] },
      { at: 4120, list: ['tusker', 'razor', 'razor'], boss: true },
    ],
    props: [[880, 620, 'barrel', 'pizza'], [1750, 540, 'crate', 'pistol'], [2650, 660, 'barrel', 'uzi'], [3550, 580, 'crate', 'hotdog'], [4400, 640, 'barrel', 'meat']],
  },
  {
    name: 'SWAMP FOREST', sub: 'Poachers wade through the black water', theme: 'swamp', water: true, transpose: 2, len: 5400, maxOn: 4,
    waves: [
      { at: 500, list: ['poacher', 'razor', 'razor'] },
      { at: 1400, list: ['razor', 'motka', 'poacher'] },
      { at: 2300, list: ['raptor', 'raptor', 'poacher'] },
      { at: 3200, list: ['motka', 'lash', 'razor', 'poacher'] },
      { at: 4120, list: ['butcher', 'razor', 'poacher'], boss: true },
    ],
    props: [[800, 650, 'crate', 'shotgun'], [1700, 560, 'barrel', 'meat'], [2600, 620, 'crate', 'grenade'], [3500, 540, 'barrel', 'pizza'], [4450, 650, 'crate', 'gem']],
  },
  {
    name: 'HELL ROAD', sub: 'Floor it! Black Fang bikers on the highway', theme: 'road', drive: true, transpose: -2, len: 11000,
    waves: [], props: [],
  },
  {
    name: "MUSTAFA'S GARAGE", sub: 'The gang has taken over our garage', theme: 'garage', transpose: 3, len: 5400, maxOn: 4,
    waves: [
      { at: 500, list: ['biker', 'razor', 'biker'] },
      { at: 1400, list: ['motka', 'biker', 'lash'] },
      { at: 2300, list: ['poacher', 'poacher', 'razor', 'biker'] },
      { at: 3200, list: ['motka', 'biker', 'motka', 'razor', 'lash'] },
      { at: 4120, list: ['saju', 'biker', 'razor'], boss: true },
    ],
    props: [[760, 620, 'crate', 'pipe'], [1680, 560, 'barrel', 'pizza'], [2580, 660, 'crate', 'bazooka'], [3480, 560, 'barrel', 'hotdog'], [4400, 620, 'crate', 'meat']],
  },
  {
    name: 'VILLAGE OF FLAME', sub: 'Save the villagers. Leave the beasts in peace', theme: 'village', transpose: -3, len: 5400, maxOn: 4,
    waves: [
      { at: 500, list: ['trike', 'poacher', 'razor', 'razor'] },
      { at: 1400, list: ['ptera', 'ptera', 'biker', 'razor'] },
      { at: 2300, list: ['raptor', 'poacher', 'raptor', 'motka'] },
      { at: 3200, list: ['trike', 'lash', 'poacher', 'ptera', 'biker'] },
      { at: 4120, list: ['morgol', 'poacher', 'razor'], boss: true },
    ],
    props: [[820, 600, 'barrel', 'meat'], [1720, 650, 'crate', 'rifle'], [2620, 560, 'barrel', 'pizza'], [3520, 640, 'crate', 'grenade'], [4420, 580, 'barrel', 'meat']],
  },
  {
    name: 'THE LAB', sub: "Dr. Kaiser's final experiment", theme: 'lab', transpose: -4, len: 5400, maxOn: 5,
    waves: [
      { at: 500, list: ['razor', 'poacher', 'lash', 'razor', 'raptor'] },
      { at: 1400, list: ['motka', 'raptor', 'motka', 'raptor'] },
      { at: 2300, list: ['poacher', 'poacher', 'lash', 'biker', 'razor'] },
      { at: 3200, list: ['raptor', 'raptor', 'motka', 'poacher', 'biker', 'lash'] },
      { at: 4120, list: ['kaiser', 'raptor', 'poacher', 'razor'], boss: true },
    ],
    props: [[760, 640, 'barrel', 'meat'], [1660, 560, 'crate', 'uzi'], [2560, 620, 'barrel', 'meat'], [3460, 660, 'crate', 'bazooka'], [4380, 560, 'barrel', 'meat']],
  },
];
