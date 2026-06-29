import {
  World,
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  Follower,
  ScreenSpace,
  eq,
  InputComponent,
  MeshStandardMaterial,
  MeshBasicMaterial,
  AdditiveBlending,
  BoxGeometry,
  SphereGeometry,
  ConeGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  TorusGeometry,
  IcosahedronGeometry,
  Mesh,
  Group,
  Vector3,
  Color,
  PointLight,
  DirectionalLight,
  AmbientLight,
  FogExp2,
  GridHelper,
  LineBasicMaterial,
  TorusKnotGeometry,
} from '@iwsdk/core';

// ─────────────────────── TYPES & CONSTANTS ───────────────────────

type GameState = 'title' | 'playing' | 'spinning' | 'showing_win' | 'free_spins' | 'bonus_wheel' | 'gamble' | 'paused' | 'paytable' | 'settings' | 'achievements' | 'stats' | 'machines' | 'help' | 'leaderboard';

interface SymbolDef {
  name: string;
  color: string;
  emissive: string;
  geoType: 'box' | 'sphere' | 'octahedron' | 'cone' | 'cylinder' | 'torus' | 'icosahedron' | 'torusknot';
  pay3: number;
  pay4: number;
  pay5: number;
  isWild?: boolean;
  isScatter?: boolean;
  weight: number;
}

const SYMBOLS: SymbolDef[] = [
  { name: 'Cherry', color: '#ff2244', emissive: '#ff0022', geoType: 'sphere', pay3: 5, pay4: 15, pay5: 40, weight: 25 },
  { name: 'Lemon', color: '#ffee00', emissive: '#ccaa00', geoType: 'box', pay3: 5, pay4: 15, pay5: 40, weight: 25 },
  { name: 'Orange', color: '#ff8800', emissive: '#cc6600', geoType: 'sphere', pay3: 8, pay4: 25, pay5: 60, weight: 20 },
  { name: 'Plum', color: '#9900ff', emissive: '#7700cc', geoType: 'octahedron', pay3: 8, pay4: 25, pay5: 60, weight: 20 },
  { name: 'Bell', color: '#ffcc00', emissive: '#cc9900', geoType: 'cone', pay3: 15, pay4: 50, pay5: 150, weight: 15 },
  { name: 'Bar', color: '#00ff88', emissive: '#00cc66', geoType: 'cylinder', pay3: 15, pay4: 50, pay5: 150, weight: 15 },
  { name: 'Seven', color: '#00ccff', emissive: '#0099cc', geoType: 'cylinder', pay3: 25, pay4: 100, pay5: 500, weight: 8 },
  { name: 'Diamond', color: '#ff00ff', emissive: '#cc00cc', geoType: 'octahedron', pay3: 50, pay4: 200, pay5: 1000, weight: 5 },
  { name: 'Wild', color: '#ffffff', emissive: '#aaaaff', geoType: 'torus', pay3: 100, pay4: 500, pay5: 2000, isWild: true, weight: 3 },
  { name: 'Scatter', color: '#00ffff', emissive: '#00cccc', geoType: 'icosahedron', pay3: 5, pay4: 20, pay5: 50, isScatter: true, weight: 6 },
];

const PAYLINES: number[][] = [
  [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2],
  [0,1,2,1,0], [2,1,0,1,2], [0,0,1,2,2],
  [2,2,1,0,0], [1,0,0,0,1], [1,2,2,2,1],
  [0,1,0,1,0], [2,1,2,1,2], [1,0,1,0,1],
  [1,2,1,2,1], [0,1,1,1,0], [2,1,1,1,2],
  [0,2,0,2,0], [2,0,2,0,2], [1,1,0,1,1],
  [1,1,2,1,1], [0,2,2,2,0],
];

const REELS = 5;
const ROWS = 3;
const REEL_STRIP_LEN = 30;
const SYMBOL_SIZE = 0.22;
const REEL_SPACING_X = 0.55;
const REEL_SPACING_Y = 0.5;
const MACHINE_X = 0;
const MACHINE_Y = 1.4;
const MACHINE_Z = -2.5;

const COIN_VALUES = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];

interface Theme {
  name: string;
  grid: string; accent: string; bg: string; fog: string;
  machine: string; reelBg: string; frame: string; glow: string;
}

const THEMES: Theme[] = [
  { name: 'Neon Holodeck', grid: '#00ffff', accent: '#ff00ff', bg: '#000011', fog: '#000011', machine: '#0a0a2a', reelBg: '#050520', frame: '#00ccff', glow: '#00ffff' },
  { name: 'Crimson Casino', grid: '#ff2244', accent: '#ffcc00', bg: '#110005', fog: '#110005', machine: '#2a0a0a', reelBg: '#200505', frame: '#ff4466', glow: '#ff2244' },
  { name: 'Gold Palace', grid: '#ffcc00', accent: '#ff8800', bg: '#0a0800', fog: '#0a0800', machine: '#2a2000', reelBg: '#201800', frame: '#ffdd44', glow: '#ffcc00' },
  { name: 'Toxic Neon', grid: '#00ff44', accent: '#44ff00', bg: '#000a00', fog: '#000a00', machine: '#0a2a0a', reelBg: '#052005', frame: '#00ff66', glow: '#00ff44' },
  { name: 'Ultra Violet', grid: '#9900ff', accent: '#ff00ff', bg: '#0a0011', fog: '#0a0011', machine: '#1a0a2a', reelBg: '#100520', frame: '#aa44ff', glow: '#9900ff' },
];

interface Achievement {
  id: string; name: string; desc: string; check: (s: SaveData) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_spin', name: 'First Spin', desc: 'Spin the reels for the first time', check: s => s.totalSpins >= 1 },
  { id: 'ten_spins', name: 'Getting Warmed Up', desc: 'Complete 10 spins', check: s => s.totalSpins >= 10 },
  { id: 'hundred_spins', name: 'Regular', desc: 'Complete 100 spins', check: s => s.totalSpins >= 100 },
  { id: 'five_hundred_spins', name: 'High Roller', desc: 'Complete 500 spins', check: s => s.totalSpins >= 500 },
  { id: 'first_win', name: 'Winner', desc: 'Win for the first time', check: s => s.totalWins >= 1 },
  { id: 'ten_wins', name: 'Lucky Streak', desc: 'Win 10 times', check: s => s.totalWins >= 10 },
  { id: 'fifty_wins', name: 'Fortune Favors', desc: 'Win 50 times', check: s => s.totalWins >= 50 },
  { id: 'big_win', name: 'Big Win', desc: 'Win 50x your bet in a single spin', check: s => s.biggestWinMultiplier >= 50 },
  { id: 'mega_win', name: 'Mega Win', desc: 'Win 200x your bet in a single spin', check: s => s.biggestWinMultiplier >= 200 },
  { id: 'jackpot', name: 'Jackpot!', desc: 'Hit the progressive jackpot', check: s => s.jackpotWins >= 1 },
  { id: 'free_spins', name: 'Free Spins!', desc: 'Trigger the free spins bonus', check: s => s.freeSpinsTriggered >= 1 },
  { id: 'free_spins_5', name: 'Scatter Hunter', desc: 'Trigger free spins 5 times', check: s => s.freeSpinsTriggered >= 5 },
  { id: 'bonus_wheel', name: 'Bonus Round', desc: 'Trigger the bonus wheel', check: s => s.bonusWheelTriggered >= 1 },
  { id: 'bonus_5', name: 'Wheel Master', desc: 'Trigger bonus wheel 5 times', check: s => s.bonusWheelTriggered >= 5 },
  { id: 'gamble_win', name: 'Risk Taker', desc: 'Win a gamble', check: s => s.gambleWins >= 1 },
  { id: 'gamble_5', name: 'Daredevil', desc: 'Win 5 gambles', check: s => s.gambleWins >= 5 },
  { id: 'gamble_streak_3', name: 'Triple or Nothing', desc: 'Win 3 gambles in a row', check: s => s.bestGambleStreak >= 3 },
  { id: 'credits_1k', name: 'Thousandaire', desc: 'Reach 1,000 credits', check: s => s.peakCredits >= 1000 },
  { id: 'credits_10k', name: 'High Society', desc: 'Reach 10,000 credits', check: s => s.peakCredits >= 10000 },
  { id: 'credits_100k', name: 'Mogul', desc: 'Reach 100,000 credits', check: s => s.peakCredits >= 100000 },
  { id: 'win_streak_3', name: 'Hot Streak', desc: 'Win 3 spins in a row', check: s => s.bestWinStreak >= 3 },
  { id: 'win_streak_5', name: 'On Fire', desc: 'Win 5 spins in a row', check: s => s.bestWinStreak >= 5 },
  { id: 'win_streak_10', name: 'Unstoppable', desc: 'Win 10 spins in a row', check: s => s.bestWinStreak >= 10 },
  { id: 'wild_3', name: 'Wild Thing', desc: 'Get 3 wilds in one spin', check: s => s.mostWildsInSpin >= 3 },
  { id: 'wild_5', name: 'Wild Frenzy', desc: 'Get 5 wilds in one spin', check: s => s.mostWildsInSpin >= 5 },
  { id: 'full_line_7', name: 'Lucky Sevens', desc: 'Fill a payline with Sevens', check: s => s.fullLineSeven },
  { id: 'full_line_diamond', name: 'Diamond Line', desc: 'Fill a payline with Diamonds', check: s => s.fullLineDiamond },
  { id: 'scatter_5', name: 'Scatter Storm', desc: 'Get 5 scatters in one spin', check: s => s.mostScattersInSpin >= 5 },
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a daily challenge', check: s => s.dailyCompleted >= 1 },
  { id: 'daily_3', name: 'Dedicated', desc: 'Complete 3 daily challenges', check: s => s.dailyCompleted >= 3 },
  { id: 'daily_7', name: 'Weekly Warrior', desc: 'Complete 7 daily challenges', check: s => s.dailyCompleted >= 7 },
  { id: 'max_bet', name: 'All In', desc: 'Place a maximum bet', check: s => s.maxBetPlaced },
  { id: 'all_machines', name: 'Machine Master', desc: 'Play on all machines', check: s => s.machinesPlayed.length >= 5 },
  { id: 'total_won_10k', name: 'Big Earner', desc: 'Win 10,000 total credits', check: s => s.totalCreditsWon >= 10000 },
  { id: 'total_won_100k', name: 'Fortune Builder', desc: 'Win 100,000 total credits', check: s => s.totalCreditsWon >= 100000 },
  { id: 'theme_all', name: 'Theme Tourist', desc: 'Play with all 5 themes', check: s => s.themesUsed.length >= 5 },
  { id: 'auto_100', name: 'Auto Pilot', desc: 'Complete 100 auto-spins', check: s => s.autoSpinsCompleted >= 100 },
  { id: 'near_miss', name: 'So Close', desc: 'Get 4 matching symbols on a payline', check: s => s.nearMisses >= 1 },
  { id: 'five_kind', name: 'Five of a Kind', desc: 'Get 5 matching symbols on a payline', check: s => s.fiveOfKind >= 1 },
  { id: 'level_25', name: 'Seasoned Player', desc: 'Reach level 25', check: s => s.level >= 25 },
  { id: 'level_50', name: 'Slot Legend', desc: 'Reach level 50', check: s => s.level >= 50 },
];

interface SaveData {
  credits: number;
  totalSpins: number;
  totalWins: number;
  totalCreditsWon: number;
  totalCreditsBet: number;
  biggestWin: number;
  biggestWinMultiplier: number;
  jackpotWins: number;
  jackpotPool: number;
  freeSpinsTriggered: number;
  bonusWheelTriggered: number;
  gambleWins: number;
  gambleLosses: number;
  bestGambleStreak: number;
  peakCredits: number;
  bestWinStreak: number;
  currentWinStreak: number;
  mostWildsInSpin: number;
  mostScattersInSpin: number;
  fullLineSeven: boolean;
  fullLineDiamond: boolean;
  dailyCompleted: number;
  dailyLastDate: string;
  maxBetPlaced: boolean;
  machinesPlayed: string[];
  themesUsed: string[];
  autoSpinsCompleted: number;
  nearMisses: number;
  fiveOfKind: number;
  xp: number;
  level: number;
  currentMachine: number;
  currentTheme: number;
  coinValueIdx: number;
  linesActive: number;
  achievements: string[];
  masterVol: number;
  sfxVol: number;
  musicVol: number;
  leaderboard: { score: number; machine: string; date: string }[];
}

function defaultSave(): SaveData {
  return {
    credits: 1000, totalSpins: 0, totalWins: 0, totalCreditsWon: 0, totalCreditsBet: 0,
    biggestWin: 0, biggestWinMultiplier: 0, jackpotWins: 0, jackpotPool: 500,
    freeSpinsTriggered: 0, bonusWheelTriggered: 0, gambleWins: 0, gambleLosses: 0,
    bestGambleStreak: 0, peakCredits: 1000, bestWinStreak: 0, currentWinStreak: 0,
    mostWildsInSpin: 0, mostScattersInSpin: 0, fullLineSeven: false, fullLineDiamond: false,
    dailyCompleted: 0, dailyLastDate: '', maxBetPlaced: false,
    machinesPlayed: [], themesUsed: [], autoSpinsCompleted: 0, nearMisses: 0, fiveOfKind: 0,
    xp: 0, level: 1, currentMachine: 0, currentTheme: 0, coinValueIdx: 2, linesActive: 20,
    achievements: [], masterVol: 80, sfxVol: 80, musicVol: 50,
    leaderboard: [],
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem('neon-slots-save');
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {}
  return defaultSave();
}

function saveSave(s: SaveData) {
  try { localStorage.setItem('neon-slots-save', JSON.stringify(s)); } catch {}
}

// Seeded PRNG
function mulberry32(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function dateSeed(): number {
  const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ─────────────────────── REEL STRIP GENERATION ───────────────────────

function generateReelStrip(rng: () => number): number[] {
  const strip: number[] = [];
  const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  for (let i = 0; i < REEL_STRIP_LEN; i++) {
    let r = rng() * totalWeight;
    let picked = 0;
    for (let j = 0; j < SYMBOLS.length; j++) {
      r -= SYMBOLS[j].weight;
      if (r <= 0) { picked = j; break; }
    }
    strip.push(picked);
  }
  return strip;
}

// ─────────────────────── AUDIO MANAGER ───────────────────────

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private droneOscs: OscillatorNode[] = [];
  private dronePlaying = false;

  isReady() { return this.ctx !== null; }

  init() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
  }

  setVolumes(master: number, sfx: number, music: number) {
    if (!this.ctx) return;
    this.masterGain.gain.value = master / 100;
    this.sfxGain.gain.value = sfx / 100;
    this.musicGain.gain.value = music / 100;
  }

  private playTone(freq: number, type: OscillatorType, dur: number, vol: number = 0.15, dest?: GainNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g); g.connect(dest || this.sfxGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  reelTick() { this.playTone(800 + Math.random() * 200, 'square', 0.03, 0.05); }
  reelStop() { this.playTone(200, 'triangle', 0.15, 0.2); this.playTone(150, 'square', 0.1, 0.1); }
  
  smallWin() {
    if (!this.ctx) return;
    [660, 880, 1100].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.15), i * 80);
    });
  }

  bigWin() {
    if (!this.ctx) return;
    [440, 554, 659, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 100);
    });
  }

  jackpotWin() {
    if (!this.ctx) return;
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        this.playTone(440 + i * 110, 'sine', 0.4, 0.25);
        this.playTone(220 + i * 55, 'triangle', 0.3, 0.15);
      }, i * 120);
    }
  }

  scatter() {
    if (!this.ctx) return;
    [1100, 1320, 1540, 1760].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.2), i * 60);
    });
  }

  bonusTrigger() {
    if (!this.ctx) return;
    [330, 440, 550, 660, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 100);
    });
  }

  wheelTick() { this.playTone(600 + Math.random() * 400, 'triangle', 0.05, 0.12); }
  
  gambleWin() {
    [660, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.18), i * 80);
    });
  }

  gambleLose() {
    [440, 330, 220].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.12), i * 120);
    });
  }

  click() { this.playTone(1000, 'sine', 0.05, 0.08); }

  achievement() {
    [880, 1100, 1320, 1540, 1760].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.12), i * 70);
    });
  }

  levelUp() {
    [440, 554, 659, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.15), i * 80);
    });
  }

  startDrone() {
    if (!this.ctx || this.dronePlaying) return;
    this.dronePlaying = true;
    const freqs = [55, 82.5, 110];
    const types: OscillatorType[] = ['sine', 'triangle', 'sine'];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = types[i];
      osc.frequency.value = f;
      g.gain.value = 0.06;
      const lfo = this.ctx!.createOscillator();
      const lfoG = this.ctx!.createGain();
      lfo.frequency.value = 0.15;
      lfoG.gain.value = 0.02;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start();
      osc.connect(g); g.connect(this.musicGain);
      osc.start();
      this.droneOscs.push(osc, lfo);
    });
  }

  stopDrone() {
    this.droneOscs.forEach(o => { try { o.stop(); } catch {} });
    this.droneOscs = [];
    this.dronePlaying = false;
  }
}

// ─────────────────────── PARTICLE SYSTEM ───────────────────────

interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; }

class ParticlePool {
  particles: Particle[] = [];
  private pool: Particle[] = [];

  constructor(private scene: any, max: number = 150) {
    for (let i = 0; i < max; i++) {
      const geo = new SphereGeometry(0.015, 4, 4);
      const mat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: AdditiveBlending });
      const mesh = new Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
    }
  }

  burst(x: number, y: number, z: number, color: string, count: number = 15) {
    const c = new Color(color);
    for (let i = 0; i < count; i++) {
      const p = this.pool.pop();
      if (!p) break;
      p.mesh.position.set(x, y, z);
      (p.mesh.material as MeshBasicMaterial).color.copy(c);
      p.mesh.visible = true;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      const elev = (Math.random() - 0.3) * Math.PI;
      p.vx = Math.cos(angle) * Math.cos(elev) * speed;
      p.vy = Math.sin(elev) * speed + 1;
      p.vz = Math.sin(angle) * Math.cos(elev) * speed;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.6;
      this.particles.push(p);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.pool.push(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 4 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      (p.mesh.material as MeshBasicMaterial).opacity = 1 - p.life / p.maxLife;
    }
  }
}

// ─────────────────────── MAIN GAME ───────────────────────

async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' },
    features: {
      locomotion: { browserControls: true } as any,
    },
  });

  const save = loadSave();
  const audio = new AudioManager();
  let state: GameState = 'title';
  let theme = THEMES[save.currentTheme];
  const particles = new ParticlePool(world.scene);

  // Reel state
  const reelStrips: number[][] = [];
  const rng = Math.random;
  for (let r = 0; r < REELS; r++) reelStrips.push(generateReelStrip(rng));
  
  const currentGrid: number[][] = []; // currentGrid[reel][row] = symbol index
  for (let r = 0; r < REELS; r++) {
    currentGrid.push([]);
    for (let row = 0; row < ROWS; row++) {
      currentGrid[r].push(reelStrips[r][(r * 3 + row) % REEL_STRIP_LEN]);
    }
  }

  // Spin state
  let spinning = false;
  let reelSpinning: boolean[] = [false, false, false, false, false];
  let reelOffsets: number[] = [0, 0, 0, 0, 0];
  let reelTargetOffsets: number[] = [0, 0, 0, 0, 0];
  let reelSpeeds: number[] = [0, 0, 0, 0, 0];
  let targetGrid: number[][] = [];
  let spinStartTime = 0;

  // Free spins
  let freeSpinsRemaining = 0;
  let freeSpinsTotal = 0;
  let freeSpinsWinnings = 0;
  let freeSpinMultiplier = 2;

  // Bonus wheel
  let bonusWheelActive = false;
  let bonusWheelAngle = 0;
  let bonusWheelSpeed = 0;
  const BONUS_WHEEL_PRIZES = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 10, 25];

  // Gamble
  let gambleWinAmount = 0;
  let gambleActive = false;
  let currentGambleStreak = 0;

  // Auto-spin
  let autoSpinCount = 0;
  let autoSpinRemaining = 0;

  // Win display
  let showingWin = false;
  let winDisplayTimer = 0;
  let lastWinAmount = 0;
  let winningLines: { line: number; symbols: number; symbolIdx: number; payout: number }[] = [];

  // ─────────────── SCENE SETUP ───────────────

  // Holodeck environment
  function buildEnvironment() {
    const c = new Color(theme.bg);
    world.scene.background = c;
    world.scene.fog = new FogExp2(new Color(theme.fog).getHex(), 0.08);

    // Floor grid
    const floorGrid = new GridHelper(20, 20, new Color(theme.grid).getHex(), new Color(theme.grid).getHex());
    (floorGrid.material as LineBasicMaterial).opacity = 0.15;
    (floorGrid.material as LineBasicMaterial).transparent = true;
    world.scene.add(floorGrid);

    // Ceiling grid
    const ceilGrid = new GridHelper(20, 20, new Color(theme.grid).getHex(), new Color(theme.grid).getHex());
    ceilGrid.position.y = 4;
    (ceilGrid.material as LineBasicMaterial).opacity = 0.08;
    (ceilGrid.material as LineBasicMaterial).transparent = true;
    world.scene.add(ceilGrid);

    // Lights
    const ambient = new AmbientLight(0x222244, 0.4);
    world.scene.add(ambient);
    const dir = new DirectionalLight(0xffffff, 0.5);
    dir.position.set(2, 4, 2);
    world.scene.add(dir);

    const accentL1 = new PointLight(new Color(theme.accent).getHex(), 1.5, 10);
    accentL1.position.set(-3, 2.5, -2);
    world.scene.add(accentL1);
    const accentL2 = new PointLight(new Color(theme.glow).getHex(), 1.5, 10);
    accentL2.position.set(3, 2.5, -2);
    world.scene.add(accentL2);

    // Floating decorations
    const decoGeos = [
      new TorusGeometry(0.15, 0.05, 8, 16),
      new BoxGeometry(0.2, 0.2, 0.2),
      new SphereGeometry(0.12, 8, 8),
      new ConeGeometry(0.1, 0.25, 6),
    ];
    for (let i = 0; i < 14; i++) {
      const geo = decoGeos[i % decoGeos.length];
      const mat = new MeshBasicMaterial({
        color: new Color(i % 2 === 0 ? theme.grid : theme.accent).getHex(),
        wireframe: true, transparent: true, opacity: 0.2,
      });
      const m = new Mesh(geo, mat);
      const angle = (i / 14) * Math.PI * 2;
      m.position.set(Math.cos(angle) * 6 + (Math.random() - 0.5) * 2, 1 + Math.random() * 2.5,
        Math.sin(angle) * 6 + (Math.random() - 0.5) * 2);
      m.userData.floatSpeed = 0.3 + Math.random() * 0.5;
      m.userData.floatOffset = Math.random() * Math.PI * 2;
      m.userData.rotSpeed = 0.2 + Math.random() * 0.5;
      world.scene.add(m);
      decoMeshes.push(m);
    }
  }

  const decoMeshes: Mesh[] = [];

  // ─────────────── SLOT MACHINE 3D ───────────────

  const machineGroup = new Group();
  machineGroup.position.set(MACHINE_X, 0, MACHINE_Z);
  world.scene.add(machineGroup);

  // Machine body
  const bodyMat = new MeshStandardMaterial({ color: new Color(theme.machine).getHex(), metalness: 0.5, roughness: 0.4 });
  const body = new Mesh(new BoxGeometry(3.2, 2.8, 0.6), bodyMat);
  body.position.set(0, MACHINE_Y, 0);
  machineGroup.add(body);

  // Machine frame (neon edges)
  const frameMat = new MeshBasicMaterial({ color: new Color(theme.frame).getHex(), transparent: true, opacity: 0.8 });
  const edgeParts: { w: number; h: number; d: number; x: number; y: number; z: number }[] = [
    { w: 3.3, h: 0.05, d: 0.05, x: 0, y: MACHINE_Y + 1.42, z: 0.32 },
    { w: 3.3, h: 0.05, d: 0.05, x: 0, y: MACHINE_Y - 1.42, z: 0.32 },
    { w: 0.05, h: 2.9, d: 0.05, x: -1.62, y: MACHINE_Y, z: 0.32 },
    { w: 0.05, h: 2.9, d: 0.05, x: 1.62, y: MACHINE_Y, z: 0.32 },
  ];
  edgeParts.forEach(e => {
    const m = new Mesh(new BoxGeometry(e.w, e.h, e.d), frameMat);
    m.position.set(e.x, e.y, e.z);
    machineGroup.add(m);
  });

  // Reel background
  const reelBgMat = new MeshStandardMaterial({ color: new Color(theme.reelBg).getHex(), metalness: 0.2, roughness: 0.8 });
  const reelBg = new Mesh(new BoxGeometry(REELS * REEL_SPACING_X + 0.3, ROWS * REEL_SPACING_Y + 0.2, 0.05), reelBgMat);
  reelBg.position.set(0, MACHINE_Y + 0.2, 0.28);
  machineGroup.add(reelBg);

  // Reel dividers
  for (let r = 0; r < REELS - 1; r++) {
    const divX = -((REELS - 1) * REEL_SPACING_X) / 2 + (r + 1) * REEL_SPACING_X - REEL_SPACING_X / 2 + REEL_SPACING_X / 2;
    const divX2 = (-(REELS - 1) / 2 + r + 1) * REEL_SPACING_X - REEL_SPACING_X / 2 + REEL_SPACING_X / 2;
    // Simplified: evenly spaced dividers
    const x = (r + 1 - (REELS - 1) / 2 - 0.5) * REEL_SPACING_X;
    const div = new Mesh(new BoxGeometry(0.02, ROWS * REEL_SPACING_Y + 0.15, 0.03),
      new MeshBasicMaterial({ color: new Color(theme.frame).getHex(), transparent: true, opacity: 0.3 }));
    div.position.set(x, MACHINE_Y + 0.2, 0.31);
    machineGroup.add(div);
  }

  // Symbol meshes
  function createSymbolMesh(symIdx: number): Mesh {
    const sym = SYMBOLS[symIdx];
    let geo: any;
    const s = SYMBOL_SIZE;
    switch (sym.geoType) {
      case 'box': geo = new BoxGeometry(s, s, s); break;
      case 'sphere': geo = new SphereGeometry(s * 0.5, 8, 8); break;
      case 'octahedron': geo = new OctahedronGeometry(s * 0.5); break;
      case 'cone': geo = new ConeGeometry(s * 0.35, s, 8); break;
      case 'cylinder': geo = new CylinderGeometry(s * 0.3, s * 0.3, s, 8); break;
      case 'torus': geo = new TorusGeometry(s * 0.35, s * 0.12, 8, 16); break;
      case 'icosahedron': geo = new IcosahedronGeometry(s * 0.45); break;
      case 'torusknot': geo = new TorusKnotGeometry(s * 0.3, s * 0.08, 32, 8); break;
      default: geo = new BoxGeometry(s, s, s);
    }
    const mat = new MeshStandardMaterial({
      color: new Color(sym.color).getHex(),
      emissive: new Color(sym.emissive).getHex(),
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.3,
    });
    const mesh = new Mesh(geo, mat);

    // Wireframe overlay
    const wireMat = new MeshBasicMaterial({ color: new Color(sym.color).getHex(), wireframe: true, transparent: true, opacity: 0.4 });
    const wire = new Mesh(geo.clone(), wireMat);
    wire.scale.setScalar(1.08);
    mesh.add(wire);

    // Glow
    const glowMat = new MeshBasicMaterial({ color: new Color(sym.color).getHex(), transparent: true, opacity: 0.15, blending: AdditiveBlending });
    const glow = new Mesh(new SphereGeometry(s * 0.7, 8, 8), glowMat);
    mesh.add(glow);

    return mesh;
  }

  // Grid of symbol meshes
  const symbolMeshes: Mesh[][] = [];
  for (let r = 0; r < REELS; r++) {
    symbolMeshes.push([]);
    for (let row = 0; row < ROWS; row++) {
      const mesh = createSymbolMesh(currentGrid[r][row]);
      const x = (r - (REELS - 1) / 2) * REEL_SPACING_X;
      const y = MACHINE_Y + 0.2 + ((ROWS - 1) / 2 - row) * REEL_SPACING_Y;
      mesh.position.set(x, y, 0.35);
      machineGroup.add(mesh);
      symbolMeshes[r].push(mesh);
    }
  }

  function updateSymbolMesh(reel: number, row: number, symIdx: number) {
    const oldMesh = symbolMeshes[reel][row];
    machineGroup.remove(oldMesh);
    const newMesh = createSymbolMesh(symIdx);
    newMesh.position.copy(oldMesh.position);
    machineGroup.add(newMesh);
    symbolMeshes[reel][row] = newMesh;
  }

  // Payline indicators (small dots on left side)
  const paylineIndicators: Mesh[] = [];
  for (let i = 0; i < 20; i++) {
    const row = i < 10 ? i : i - 10;
    const side = i < 10 ? -1 : 1;
    const y = MACHINE_Y + 0.2 + ((ROWS - 1) / 2 - PAYLINES[i][0]) * REEL_SPACING_Y;
    const x = side * ((REELS * REEL_SPACING_X) / 2 + 0.25);
    const dot = new Mesh(
      new SphereGeometry(0.03, 6, 6),
      new MeshBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.5 })
    );
    dot.position.set(x, y, 0.35);
    machineGroup.add(dot);
    paylineIndicators.push(dot);
  }

  // Jackpot display bar on top
  const jackpotBar = new Mesh(
    new BoxGeometry(2.5, 0.3, 0.1),
    new MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 })
  );
  jackpotBar.position.set(0, MACHINE_Y + 1.6, 0.1);
  machineGroup.add(jackpotBar);

  // Machine accent light
  const machineLight = new PointLight(new Color(theme.glow).getHex(), 2, 5);
  machineLight.position.set(0, MACHINE_Y + 0.5, 1.5);
  machineGroup.add(machineLight);

  buildEnvironment();

  // ─────────────── GAME LOGIC ───────────────

  function getBet(): number {
    return COIN_VALUES[save.coinValueIdx] * save.linesActive;
  }

  function spinReels() {
    if (spinning || state === 'paused') return;
    const bet = getBet();
    if (save.credits < bet && freeSpinsRemaining <= 0) {
      showToast('Not enough credits!');
      return;
    }

    if (!audio.isReady()) audio.init();
    audio.startDrone();

    if (freeSpinsRemaining <= 0) {
      save.credits -= bet;
      save.totalCreditsBet += bet;
      save.jackpotPool += bet * 0.02;
    } else {
      freeSpinsRemaining--;
    }

    save.totalSpins++;
    if (bet >= COIN_VALUES[COIN_VALUES.length - 1] * 20) save.maxBetPlaced = true;
    
    const machineName = THEMES[save.currentMachine || 0].name;
    if (!save.machinesPlayed.includes(machineName)) save.machinesPlayed.push(machineName);
    if (!save.themesUsed.includes(theme.name)) save.themesUsed.push(theme.name);

    spinning = true;
    state = 'spinning';
    spinStartTime = 0;

    // Generate target
    targetGrid = [];
    for (let r = 0; r < REELS; r++) {
      targetGrid.push([]);
      const offset = Math.floor(Math.random() * REEL_STRIP_LEN);
      for (let row = 0; row < ROWS; row++) {
        targetGrid[r].push(reelStrips[r][(offset + row) % REEL_STRIP_LEN]);
      }
    }

    reelSpinning = [true, true, true, true, true];
    reelSpeeds = [15, 15, 15, 15, 15];
    reelOffsets = [0, 0, 0, 0, 0];

    updateHUD();
    saveSave(save);
  }

  function evaluateWin() {
    const bet = getBet();
    const lineBet = COIN_VALUES[save.coinValueIdx];
    winningLines = [];
    let totalWin = 0;
    let wildCount = 0;
    let scatterCount = 0;

    // Count specials
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        if (SYMBOLS[currentGrid[r][row]].isWild) wildCount++;
        if (SYMBOLS[currentGrid[r][row]].isScatter) scatterCount++;
      }
    }

    save.mostWildsInSpin = Math.max(save.mostWildsInSpin, wildCount);
    save.mostScattersInSpin = Math.max(save.mostScattersInSpin, scatterCount);

    // Check paylines
    for (let lineIdx = 0; lineIdx < save.linesActive; lineIdx++) {
      const line = PAYLINES[lineIdx];
      const firstSym = currentGrid[0][line[0]];
      const firstDef = SYMBOLS[firstSym];
      
      // Find the base symbol (skip wilds at start)
      let baseSym = -1;
      for (let r = 0; r < REELS; r++) {
        const sym = currentGrid[r][line[r]];
        if (!SYMBOLS[sym].isWild && !SYMBOLS[sym].isScatter) {
          baseSym = sym;
          break;
        }
      }
      if (baseSym === -1 && SYMBOLS[firstSym].isWild) baseSym = SYMBOLS.findIndex(s => s.isWild);
      if (baseSym === -1) continue;

      // Count matching from left
      let matchCount = 0;
      for (let r = 0; r < REELS; r++) {
        const sym = currentGrid[r][line[r]];
        if (sym === baseSym || SYMBOLS[sym].isWild) {
          matchCount++;
        } else break;
      }

      if (matchCount >= 3) {
        const symDef = SYMBOLS[baseSym];
        let payout = 0;
        if (matchCount === 3) payout = symDef.pay3;
        else if (matchCount === 4) payout = symDef.pay4;
        else if (matchCount === 5) payout = symDef.pay5;

        payout *= lineBet;
        if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) payout *= freeSpinMultiplier;

        winningLines.push({ line: lineIdx, symbols: matchCount, symbolIdx: baseSym, payout });
        totalWin += payout;

        if (matchCount === 4) save.nearMisses++;
        if (matchCount === 5) {
          save.fiveOfKind++;
          if (baseSym === 6) save.fullLineSeven = true;
          if (baseSym === 7) save.fullLineDiamond = true;
        }
      }
    }

    // Scatter pays
    if (scatterCount >= 3) {
      const scatterDef = SYMBOLS.find(s => s.isScatter)!;
      let scatterPay = 0;
      if (scatterCount === 3) scatterPay = scatterDef.pay3 * bet;
      else if (scatterCount === 4) scatterPay = scatterDef.pay4 * bet;
      else scatterPay = scatterDef.pay5 * bet;
      totalWin += scatterPay;

      // Trigger free spins
      const freeCount = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
      freeSpinsRemaining += freeCount;
      freeSpinsTotal += freeCount;
      save.freeSpinsTriggered++;
      audio.scatter();
      showToast(`${freeCount} FREE SPINS!`);
    }

    // Jackpot check: 5 wilds on line 1
    if (winningLines.some(w => w.line === 0 && w.symbols === 5 && SYMBOLS[w.symbolIdx].isWild)) {
      totalWin += save.jackpotPool;
      save.jackpotWins++;
      audio.jackpotWin();
      showToast(`JACKPOT! ${save.jackpotPool.toFixed(2)} CREDITS!`);
      save.jackpotPool = 500;
    }

    if (totalWin > 0) {
      save.credits += totalWin;
      save.totalWins++;
      save.totalCreditsWon += totalWin;
      save.biggestWin = Math.max(save.biggestWin, totalWin);
      save.biggestWinMultiplier = Math.max(save.biggestWinMultiplier, totalWin / bet);
      save.currentWinStreak++;
      save.bestWinStreak = Math.max(save.bestWinStreak, save.currentWinStreak);
      save.peakCredits = Math.max(save.peakCredits, save.credits);
      lastWinAmount = totalWin;

      // XP
      const xpGain = Math.max(1, Math.floor(totalWin / 10));
      save.xp += xpGain;
      const nextLevelXp = 100 + save.level * 50;
      if (save.xp >= nextLevelXp) {
        save.xp -= nextLevelXp;
        save.level++;
        audio.levelUp();
        showToast(`Level ${save.level}!`);
      }

      if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) freeSpinsWinnings += totalWin;

      // Win effects
      if (totalWin >= bet * 50) {
        audio.bigWin();
        for (let i = 0; i < 5; i++) {
          setTimeout(() => particles.burst(
            MACHINE_X + (Math.random() - 0.5) * 2,
            MACHINE_Y + Math.random() * 1.5,
            MACHINE_Z + 1, theme.glow, 20
          ), i * 200);
        }
      } else {
        audio.smallWin();
        particles.burst(MACHINE_X, MACHINE_Y + 0.2, MACHINE_Z + 0.8, theme.accent, 15);
      }

      // Highlight winning lines
      winningLines.forEach(wl => {
        const idx = wl.line;
        if (idx < paylineIndicators.length) {
          (paylineIndicators[idx].material as MeshBasicMaterial).color.set(SYMBOLS[wl.symbolIdx].color);
          (paylineIndicators[idx].material as MeshBasicMaterial).opacity = 1;
        }
      });

      showingWin = true;
      winDisplayTimer = 0;
      state = 'showing_win';

      gambleWinAmount = totalWin;
    } else {
      save.currentWinStreak = 0;
      lastWinAmount = 0;

      if (freeSpinsRemaining > 0) {
        setTimeout(() => spinReels(), 800);
      } else if (autoSpinRemaining > 0) {
        autoSpinRemaining--;
        save.autoSpinsCompleted++;
        setTimeout(() => spinReels(), 500);
      } else {
        state = 'playing';
      }
    }

    checkAchievements();
    updateHUD();
    saveSave(save);

    // Update leaderboard
    if (totalWin > 0) {
      save.leaderboard.push({ score: totalWin, machine: THEMES[save.currentMachine || 0].name, date: new Date().toISOString().slice(0, 10) });
      save.leaderboard.sort((a, b) => b.score - a.score);
      if (save.leaderboard.length > 20) save.leaderboard.length = 20;
    }
  }

  function startGamble() {
    if (gambleWinAmount <= 0) return;
    gambleActive = true;
    state = 'gamble';
    currentGambleStreak = 0;
    updateGamblePanel();
  }

  function doGamble(choice: 'red' | 'black') {
    const result = Math.random() < 0.5 ? 'red' : 'black';
    if (choice === result) {
      gambleWinAmount *= 2;
      save.gambleWins++;
      currentGambleStreak++;
      save.bestGambleStreak = Math.max(save.bestGambleStreak, currentGambleStreak);
      audio.gambleWin();
      showToast(`Doubled! ${gambleWinAmount.toFixed(2)} credits`);
    } else {
      save.gambleLosses++;
      save.credits -= gambleWinAmount;
      audio.gambleLose();
      showToast('Lost the gamble!');
      gambleWinAmount = 0;
      gambleActive = false;
      state = 'playing';
      if (autoSpinRemaining > 0) {
        autoSpinRemaining--;
        save.autoSpinsCompleted++;
        setTimeout(() => spinReels(), 500);
      }
    }
    checkAchievements();
    updateHUD();
    updateGamblePanel();
    saveSave(save);
  }

  function collectGamble() {
    gambleActive = false;
    gambleWinAmount = 0;
    state = 'playing';
    if (freeSpinsRemaining > 0) {
      setTimeout(() => spinReels(), 500);
    } else if (autoSpinRemaining > 0) {
      autoSpinRemaining--;
      save.autoSpinsCompleted++;
      setTimeout(() => spinReels(), 500);
    }
    updateHUD();
  }

  // ─────────────── UI HELPERS ───────────────

  const toastQueue: string[] = [];
  let toastTimer = 0;
  let currentToast = '';

  function showToast(msg: string) {
    toastQueue.push(msg);
  }

  function updateHUD() {
    setText(hudEntity, 'credits', `Credits: ${save.credits.toFixed(2)}`);
    setText(hudEntity, 'bet', `Bet: ${getBet().toFixed(2)}`);
    setText(hudEntity, 'lines', `Lines: ${save.linesActive}`);
    setText(hudEntity, 'coin', `Coin: ${COIN_VALUES[save.coinValueIdx].toFixed(2)}`);
    setText(hudEntity, 'win', lastWinAmount > 0 ? `WIN: ${lastWinAmount.toFixed(2)}` : '');
    setText(hudEntity, 'jackpot', `JACKPOT: ${save.jackpotPool.toFixed(2)}`);
    setText(hudEntity, 'level', `Lv.${save.level}`);
    if (freeSpinsRemaining > 0) {
      setText(hudEntity, 'freespins', `FREE SPINS: ${freeSpinsRemaining}`);
    } else {
      setText(hudEntity, 'freespins', '');
    }
    if (autoSpinRemaining > 0) {
      setText(hudEntity, 'autospin', `AUTO: ${autoSpinRemaining}`);
    } else {
      setText(hudEntity, 'autospin', '');
    }
  }

  function updateGamblePanel() {
    setText(gambleEntity, 'gamble-amount', `Win: ${gambleWinAmount.toFixed(2)}`);
    setText(gambleEntity, 'gamble-streak', `Streak: ${currentGambleStreak}`);
  }

  function checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (!save.achievements.includes(ach.id) && ach.check(save)) {
        save.achievements.push(ach.id);
        audio.achievement();
        showToast(`Achievement: ${ach.name}`);
      }
    }
  }

  // ─────────────── ENTITY & PANEL CREATION ───────────────

  const getDoc = (e: any) => e?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
  const setText = (e: any, id: string, text: string) => {
    if (!e) return;
    const doc = getDoc(e);
    if (!doc) return;
    const el = doc.getElementById(id) as UIKit.Text | undefined;
    el?.setProperties({ text });
  };

  // Create panel entities
  let titleEntity: any;
  let hudEntity: any;
  let pauseEntity: any;
  let settingsEntity: any;
  let achievementsEntity: any;
  let statsEntity: any;
  let helpEntity: any;
  let leaderboardEntity: any;
  let toastEntity: any;
  let gambleEntity: any;
  let paytableEntity: any;

  const panelConfigs = [
    { name: 'title', config: './ui/title.json', follower: false },
    { name: 'hud', config: './ui/hud.json', follower: true },
    { name: 'pause', config: './ui/pause.json', follower: false },
    { name: 'settings', config: './ui/settings.json', follower: false },
    { name: 'achievements', config: './ui/achievements.json', follower: false },
    { name: 'stats', config: './ui/stats.json', follower: false },
    { name: 'help', config: './ui/help.json', follower: false },
    { name: 'leaderboard', config: './ui/leaderboard.json', follower: false },
    { name: 'toast', config: './ui/toast.json', follower: true },
    { name: 'gamble', config: './ui/gamble.json', follower: false },
    { name: 'paytable', config: './ui/paytable.json', follower: false },
  ];

  const panelEntities: Record<string, any> = {};
  for (const pc of panelConfigs) {
    const entity = world.createEntity();
    entity.addComponent(PanelUI, { config: pc.config });
    if (pc.follower) {
      entity.addComponent(Follower, {});
      const fv = entity.getVectorView(Follower, 'offsetPosition');
      fv[0] = 0; fv[1] = -0.25; fv[2] = -1.2;
    } else {
      entity.addComponent(ScreenSpace, {});
    }
    panelEntities[pc.name] = entity;
  }

  titleEntity = panelEntities['title'];
  hudEntity = panelEntities['hud'];
  pauseEntity = panelEntities['pause'];
  settingsEntity = panelEntities['settings'];
  achievementsEntity = panelEntities['achievements'];
  statsEntity = panelEntities['stats'];
  helpEntity = panelEntities['help'];
  leaderboardEntity = panelEntities['leaderboard'];
  toastEntity = panelEntities['toast'];
  gambleEntity = panelEntities['gamble'];
  paytableEntity = panelEntities['paytable'];

  // ─────────────── UI SYSTEM ───────────────

  class GameUISystem extends createSystem({
    title: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
    hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
    pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
    settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
    achievements: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
    stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
    help: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
    leaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
    toast: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
    gamble: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gamble.json')] },
    paytable: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/paytable.json')] },
  }) {
    init() {
      // Title
      this.queries.title.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-play', () => { state = 'playing'; updateHUD(); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); });
        wire('btn-paytable', () => { state = 'paytable'; updatePaytable(); });
        wire('btn-achievements', () => { state = 'achievements'; updateAchievements(); });
        wire('btn-stats', () => { state = 'stats'; updateStats(); });
        wire('btn-settings', () => { state = 'settings'; updateSettings(); });
        wire('btn-help', () => { state = 'help'; });
        wire('btn-leaderboard', () => { state = 'leaderboard'; updateLeaderboard(); });
      });

      // HUD
      this.queries.hud.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-spin', () => { if (state === 'playing' || state === 'showing_win') spinReels(); });
        wire('btn-coin-up', () => { save.coinValueIdx = Math.min(save.coinValueIdx + 1, COIN_VALUES.length - 1); updateHUD(); saveSave(save); });
        wire('btn-coin-dn', () => { save.coinValueIdx = Math.max(save.coinValueIdx - 1, 0); updateHUD(); saveSave(save); });
        wire('btn-lines-up', () => { save.linesActive = Math.min(save.linesActive + 1, 20); updateHUD(); saveSave(save); });
        wire('btn-lines-dn', () => { save.linesActive = Math.max(save.linesActive - 1, 1); updateHUD(); saveSave(save); });
        wire('btn-max', () => { save.coinValueIdx = COIN_VALUES.length - 1; save.linesActive = 20; updateHUD(); saveSave(save); });
        wire('btn-auto5', () => { autoSpinRemaining = 5; spinReels(); });
        wire('btn-auto25', () => { autoSpinRemaining = 25; spinReels(); });
        wire('btn-auto-stop', () => { autoSpinRemaining = 0; updateHUD(); });
        wire('btn-gamble', () => { if (gambleWinAmount > 0 && state === 'showing_win') startGamble(); });
        wire('btn-collect', () => { if (state === 'showing_win') { showingWin = false; state = 'playing'; collectAfterWin(); } });
        wire('btn-pause', () => { state = 'paused'; });
      });

      // Pause
      this.queries.pause.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-resume', () => { state = 'playing'; updateHUD(); });
        wire('btn-title', () => { state = 'title'; autoSpinRemaining = 0; });
      });

      // Settings
      this.queries.settings.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-master-up', () => { save.masterVol = Math.min(save.masterVol + 10, 100); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-master-dn', () => { save.masterVol = Math.max(save.masterVol - 10, 0); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-sfx-up', () => { save.sfxVol = Math.min(save.sfxVol + 10, 100); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-sfx-dn', () => { save.sfxVol = Math.max(save.sfxVol - 10, 0); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-music-up', () => { save.musicVol = Math.min(save.musicVol + 10, 100); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-music-dn', () => { save.musicVol = Math.max(save.musicVol - 10, 0); audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol); updateSettings(); saveSave(save); });
        wire('btn-theme-prev', () => { save.currentTheme = (save.currentTheme - 1 + THEMES.length) % THEMES.length; theme = THEMES[save.currentTheme]; updateSettings(); saveSave(save); });
        wire('btn-theme-next', () => { save.currentTheme = (save.currentTheme + 1) % THEMES.length; theme = THEMES[save.currentTheme]; updateSettings(); saveSave(save); });
        wire('btn-settings-back', () => { state = state === 'settings' ? 'title' : 'playing'; });
      });

      // Achievements
      this.queries.achievements.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-ach-back', () => { state = 'title'; });
        wire('btn-ach-prev', () => { achPage = Math.max(0, achPage - 1); updateAchievements(); });
        wire('btn-ach-next', () => { achPage = Math.min(Math.floor((ACHIEVEMENTS.length - 1) / 15), achPage + 1); updateAchievements(); });
      });

      // Stats
      this.queries.stats.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-stats-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Help
      this.queries.help.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-help-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Leaderboard
      this.queries.leaderboard.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-lb-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Gamble
      this.queries.gamble.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-gamble-red', () => { if (gambleActive) doGamble('red'); });
        wire('btn-gamble-black', () => { if (gambleActive) doGamble('black'); });
        wire('btn-gamble-collect', () => { if (gambleActive) { gambleActive = false; collectGamble(); } });
      });

      // Paytable
      this.queries.paytable.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-pay-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });
    }
  }

  world.registerSystem(GameUISystem);

  let achPage = 0;

  function updateAchievements() {
    const start = achPage * 15;
    const end = Math.min(start + 15, ACHIEVEMENTS.length);
    for (let i = 0; i < 15; i++) {
      const idx = start + i;
      if (idx < end) {
        const ach = ACHIEVEMENTS[idx];
        const unlocked = save.achievements.includes(ach.id);
        setText(achievementsEntity, `ach-${i}`, `${unlocked ? '[x]' : '[ ]'} ${ach.name}`);
        setText(achievementsEntity, `ach-desc-${i}`, ach.desc);
      } else {
        setText(achievementsEntity, `ach-${i}`, '');
        setText(achievementsEntity, `ach-desc-${i}`, '');
      }
    }
    setText(achievementsEntity, 'ach-page', `${achPage + 1}/${Math.ceil(ACHIEVEMENTS.length / 15)}`);
    setText(achievementsEntity, 'ach-count', `${save.achievements.length}/${ACHIEVEMENTS.length}`);
  }

  function updateStats() {
    setText(statsEntity, 'stat-spins', `Total Spins: ${save.totalSpins}`);
    setText(statsEntity, 'stat-wins', `Total Wins: ${save.totalWins}`);
    setText(statsEntity, 'stat-winrate', `Win Rate: ${save.totalSpins > 0 ? ((save.totalWins / save.totalSpins) * 100).toFixed(1) : '0'}%`);
    setText(statsEntity, 'stat-wonamt', `Credits Won: ${save.totalCreditsWon.toFixed(2)}`);
    setText(statsEntity, 'stat-betamt', `Credits Bet: ${save.totalCreditsBet.toFixed(2)}`);
    setText(statsEntity, 'stat-biggest', `Biggest Win: ${save.biggestWin.toFixed(2)}`);
    setText(statsEntity, 'stat-streak', `Best Win Streak: ${save.bestWinStreak}`);
    setText(statsEntity, 'stat-jackpots', `Jackpots: ${save.jackpotWins}`);
    setText(statsEntity, 'stat-freespins', `Free Spins: ${save.freeSpinsTriggered}`);
    setText(statsEntity, 'stat-gambles', `Gambles Won/Lost: ${save.gambleWins}/${save.gambleLosses}`);
    setText(statsEntity, 'stat-level', `Level: ${save.level} (${save.xp}/${100 + save.level * 50} XP)`);
    setText(statsEntity, 'stat-peak', `Peak Credits: ${save.peakCredits.toFixed(2)}`);
  }

  function updateSettings() {
    setText(settingsEntity, 'master-val', `${save.masterVol}`);
    setText(settingsEntity, 'sfx-val', `${save.sfxVol}`);
    setText(settingsEntity, 'music-val', `${save.musicVol}`);
    setText(settingsEntity, 'theme-val', THEMES[save.currentTheme].name);
  }

  function updateLeaderboard() {
    for (let i = 0; i < 10; i++) {
      if (i < save.leaderboard.length) {
        const e = save.leaderboard[i];
        setText(leaderboardEntity, `lb-${i}`, `${i + 1}. ${e.score.toFixed(2)} - ${e.machine} - ${e.date}`);
      } else {
        setText(leaderboardEntity, `lb-${i}`, '');
      }
    }
  }

  function updatePaytable() {
    for (let i = 0; i < SYMBOLS.length; i++) {
      const sym = SYMBOLS[i];
      let text = `${sym.name}: 3x=${sym.pay3} 4x=${sym.pay4} 5x=${sym.pay5}`;
      if (sym.isWild) text += ' [WILD]';
      if (sym.isScatter) text += ' [SCATTER]';
      setText(paytableEntity, `pay-${i}`, text);
    }
    setText(paytableEntity, 'pay-info', 'Wild subs for all except Scatter. 3+ Scatters = Free Spins.');
  }

  function collectAfterWin() {
    if (freeSpinsRemaining > 0) {
      setTimeout(() => spinReels(), 500);
    } else if (autoSpinRemaining > 0) {
      autoSpinRemaining--;
      save.autoSpinsCompleted++;
      setTimeout(() => spinReels(), 500);
    }
    // Reset payline indicators
    paylineIndicators.forEach(dot => {
      (dot.material as MeshBasicMaterial).color.set(0x444466);
      (dot.material as MeshBasicMaterial).opacity = 0.5;
    });
    lastWinAmount = 0;
    gambleWinAmount = 0;
    updateHUD();
  }

  // ─────────────── GAME LOOP SYSTEM ───────────────

  class SlotGameSystem extends createSystem({}) {
    update(delta: number) {
      const dt = Math.min(delta, 0.05);

      // Particle update
      particles.update(dt);

      // Decoration float
      decoMeshes.forEach(m => {
        m.rotation.y += (m.userData.rotSpeed as number) * dt;
        m.position.y += Math.sin(Date.now() * 0.001 * (m.userData.floatSpeed as number) + (m.userData.floatOffset as number)) * 0.002;
      });

      // Symbol rotation
      for (let r = 0; r < REELS; r++) {
        for (let row = 0; row < ROWS; row++) {
          const mesh = symbolMeshes[r][row];
          if (mesh) mesh.rotation.y += 0.5 * dt;
        }
      }

      // Machine light pulse
      const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;
      machineLight.intensity = 2 * pulse;

      // Reel spinning animation
      if (spinning) {
        spinStartTime += dt;
        let allStopped = true;

        for (let r = 0; r < REELS; r++) {
          if (!reelSpinning[r]) continue;
          allStopped = false;

          const stopDelay = 0.6 + r * 0.35;
          if (spinStartTime > stopDelay) {
            // Decelerate
            reelSpeeds[r] *= 0.92;
            if (reelSpeeds[r] < 0.5) {
              // Stop this reel
              reelSpinning[r] = false;
              reelSpeeds[r] = 0;
              reelOffsets[r] = 0;
              audio.reelStop();

              // Update grid
              for (let row = 0; row < ROWS; row++) {
                currentGrid[r][row] = targetGrid[r][row];
                updateSymbolMesh(r, row, currentGrid[r][row]);
              }
            }
          }

          // Animate symbols during spin
          if (reelSpinning[r]) {
            reelOffsets[r] += reelSpeeds[r] * dt;
            if (reelOffsets[r] > REEL_SPACING_Y) {
              reelOffsets[r] -= REEL_SPACING_Y;
              // Cycle symbol appearance
              const randSym = Math.floor(Math.random() * SYMBOLS.length);
              updateSymbolMesh(r, 0, randSym);
              if (Math.random() < 0.3) audio.reelTick();
            }

            // Move symbol positions during spin
            for (let row = 0; row < ROWS; row++) {
              const baseY = MACHINE_Y + 0.2 + ((ROWS - 1) / 2 - row) * REEL_SPACING_Y;
              symbolMeshes[r][row].position.y = baseY + reelOffsets[r];
            }
          } else {
            // Reset positions
            for (let row = 0; row < ROWS; row++) {
              const baseY = MACHINE_Y + 0.2 + ((ROWS - 1) / 2 - row) * REEL_SPACING_Y;
              symbolMeshes[r][row].position.y = baseY;
            }
          }
        }

        if (allStopped) {
          spinning = false;
          evaluateWin();
        }
      }

      // Win display timer
      if (showingWin) {
        winDisplayTimer += dt;
        // Flash winning symbols
        winningLines.forEach(wl => {
          const line = PAYLINES[wl.line];
          for (let r = 0; r < wl.symbols; r++) {
            const mesh = symbolMeshes[r][line[r]];
            if (mesh) {
              const flashVal = Math.sin(winDisplayTimer * 8) * 0.5 + 0.5;
              mesh.scale.setScalar(1 + flashVal * 0.15);
            }
          }
        });

        // Auto-collect after 4 seconds if not interacted
        if (winDisplayTimer > 4 && (autoSpinRemaining > 0 || freeSpinsRemaining > 0)) {
          showingWin = false;
          state = 'playing';
          collectAfterWin();
        }
      }

      // Toast system
      if (currentToast) {
        toastTimer += dt;
        if (toastTimer > 2) {
          currentToast = '';
          setText(toastEntity, 'toast-msg', '');
        }
      } else if (toastQueue.length > 0) {
        currentToast = toastQueue.shift()!;
        toastTimer = 0;
        setText(toastEntity, 'toast-msg', currentToast);
      }

      // Panel visibility
      const titleVisible = state === 'title';
      const hudVisible = state === 'playing' || state === 'spinning' || state === 'showing_win' || state === 'free_spins';
      const pauseVisible = state === 'paused';
      const settingsVisible = state === 'settings';
      const achVisible = state === 'achievements';
      const statsVisible = state === 'stats';
      const helpVisible = state === 'help';
      const lbVisible = state === 'leaderboard';
      const gambleVisible = state === 'gamble';
      const payVisible = state === 'paytable';

      setEntityVisibility(titleEntity, titleVisible);
      setEntityVisibility(hudEntity, hudVisible);
      setEntityVisibility(pauseEntity, pauseVisible);
      setEntityVisibility(settingsEntity, settingsVisible);
      setEntityVisibility(achievementsEntity, achVisible);
      setEntityVisibility(statsEntity, statsVisible);
      setEntityVisibility(helpEntity, helpVisible);
      setEntityVisibility(leaderboardEntity, lbVisible);
      setEntityVisibility(gambleEntity, gambleVisible);
      setEntityVisibility(paytableEntity, payVisible);
      setEntityVisibility(toastEntity, !!currentToast);

      // Keyboard input is handled via window keydown listener (see below)

      // XR controller input
      const right = (world.input as any).xr?.gamepads?.right;
      if (right) {
        if (right.getButtonDown(InputComponent.Trigger)) {
          if (state === 'playing') spinReels();
        }
        if (right.getButtonDown(InputComponent.B_Button)) {
          if (state === 'playing' || state === 'spinning') state = 'paused';
          else if (state === 'paused') { state = 'playing'; updateHUD(); }
        }
      }
    }
  }

  function setEntityVisibility(entity: any, visible: boolean) {
    if (!entity) return;
    try {
      const obj = entity.object3D;
      if (obj) obj.visible = visible;
    } catch {}
  }

  world.registerSystem(SlotGameSystem);

  // Keyboard input
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (state === 'playing') spinReels();
    }
    if (e.code === 'Escape') {
      if (state === 'playing' || state === 'spinning') state = 'paused';
      else if (state === 'paused') { state = 'playing'; updateHUD(); }
      else if (state !== 'title') state = 'title';
    }
    if (e.code === 'KeyR') {
      if (state === 'showing_win') { showingWin = false; state = 'playing'; collectAfterWin(); }
    }
    if (e.code === 'KeyG') {
      if (state === 'showing_win' && gambleWinAmount > 0) startGamble();
    }
  });

  audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol);
}

main();
