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
  RingGeometry,
  CircleGeometry,
} from '@iwsdk/core';

// ─────────────────────── TYPES & CONSTANTS ───────────────────────

type GameState = 'title' | 'playing' | 'spinning' | 'showing_win' | 'free_spins' | 'bonus_wheel' | 'gamble' | 'paused' | 'paytable' | 'settings' | 'achievements' | 'stats' | 'machines' | 'help' | 'leaderboard' | 'daily' | 'win_celebration' | 'buy_bonus' | 'jackpots' | 'pick_bonus' | 'tournament' | 'vip' | 'history' | 'daily_wheel' | 'autoconfig' | 'prestige';

interface SymbolDef {
  name: string;
  color: string;
  emissive: string;
  geoType: 'box' | 'sphere' | 'octahedron' | 'cone' | 'cylinder' | 'torus' | 'icosahedron' | 'torusknot' | 'ring';
  pay3: number;
  pay4: number;
  pay5: number;
  isWild?: boolean;
  isScatter?: boolean;
  isBonus?: boolean;
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
  { name: 'Bonus', color: '#ff6600', emissive: '#cc4400', geoType: 'ring', pay3: 0, pay4: 0, pay5: 0, isBonus: true, weight: 4 },
  { name: 'Mystery', color: '#8888ff', emissive: '#6666cc', geoType: 'torusknot', pay3: 0, pay4: 0, pay5: 0, weight: 5 },
];

interface MachineConfig {
  name: string;
  desc: string;
  volatility: string;
  weightMods: number[]; // multipliers for each symbol's weight
  payMult: number; // payout multiplier
  minLevel: number;
}

const MACHINES: MachineConfig[] = [
  { name: 'Classic', desc: 'Balanced payouts, steady play', volatility: 'Medium', weightMods: [1,1,1,1,1,1,1,1,1,1,1,1], payMult: 1.0, minLevel: 1 },
  { name: 'High Roller', desc: 'Fewer wins, bigger payouts', volatility: 'High', weightMods: [1.3,1.3,1.2,1.2,0.8,0.8,0.6,0.4,0.5,0.8,0.7,0.8], payMult: 1.5, minLevel: 5 },
  { name: 'Diamond Rush', desc: 'More diamonds appear', volatility: 'Med-High', weightMods: [0.9,0.9,0.9,0.9,0.9,0.9,0.8,2.5,0.8,0.8,0.8,0.9], payMult: 1.0, minLevel: 10 },
  { name: 'Scatter Frenzy', desc: 'Scatters everywhere!', volatility: 'Medium', weightMods: [0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.7,2.5,1.0,0.9], payMult: 0.9, minLevel: 15 },
  { name: 'Jackpot Hunter', desc: 'More wilds, jackpot focus', volatility: 'Very High', weightMods: [1.1,1.1,1.0,1.0,0.7,0.7,0.7,0.5,2.5,0.6,1.0,1.2], payMult: 1.2, minLevel: 20 },
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
  { id: 'expanding_wild', name: 'Expanding Wild', desc: 'Trigger an expanding wild', check: s => s.expandingWilds >= 1 },
  { id: 'expanding_wild_5', name: 'Wild Column', desc: 'Trigger 5 expanding wilds', check: s => s.expandingWilds >= 5 },
  { id: 'hold_respin', name: 'Hold and Win', desc: 'Win from a hold respin', check: s => s.holdRespinWins >= 1 },
  { id: 'mega_win_ach', name: 'MEGA WIN', desc: 'Get a Mega Win (100x+)', check: s => s.biggestWinMultiplier >= 100 },
  { id: 'ultra_win_ach', name: 'ULTRA WIN', desc: 'Get an Ultra Win (500x+)', check: s => s.biggestWinMultiplier >= 500 },
  { id: 'bonus_collect_500', name: 'Wheel Fortune', desc: 'Collect 500+ from bonus wheel', check: s => s.bestBonusWheelWin >= 500 },
  { id: 'all_daily', name: 'Daily Sweep', desc: 'Complete all 3 daily challenges', check: s => s.dailySweeps >= 1 },
  { id: 'respin_3', name: 'Lucky Respin', desc: 'Win 3 hold respins', check: s => s.holdRespinWins >= 3 },
  { id: 'spin_1000', name: 'Veteran', desc: 'Complete 1000 spins', check: s => s.totalSpins >= 1000 },
  // New achievements for Round 3 features
  { id: 'cascade_3', name: 'Chain Reaction', desc: 'Get a 3-chain cascade', check: s => s.bestCascadeChain >= 3 },
  { id: 'cascade_5', name: 'Cascade Master', desc: 'Get a 5-chain cascade', check: s => s.bestCascadeChain >= 5 },
  { id: 'cascade_win_1k', name: 'Cascade Fortune', desc: 'Win 1000+ from a single cascade chain', check: s => s.bestCascadeWin >= 1000 },
  { id: 'mystery_10', name: 'Mystery Solver', desc: 'Reveal 10 mystery symbols', check: s => s.mysteryReveals >= 10 },
  { id: 'mystery_50', name: 'Enigma Decoder', desc: 'Reveal 50 mystery symbols', check: s => s.mysteryReveals >= 50 },
  { id: 'jp_mini', name: 'Mini Jackpot', desc: 'Hit the Mini jackpot', check: s => s.jpMiniWins >= 1 },
  { id: 'jp_minor', name: 'Minor Jackpot', desc: 'Hit the Minor jackpot', check: s => s.jpMinorWins >= 1 },
  { id: 'jp_major', name: 'Major Jackpot', desc: 'Hit the Major jackpot', check: s => s.jpMajorWins >= 1 },
  { id: 'jp_grand', name: 'Grand Jackpot', desc: 'Hit the Grand jackpot', check: s => s.jpGrandWins >= 1 },
  { id: 'buy_bonus_1', name: 'Bonus Buyer', desc: 'Use Buy Bonus once', check: s => s.buyBonusUsed >= 1 },
  { id: 'buy_bonus_5', name: 'Bonus Addict', desc: 'Use Buy Bonus 5 times', check: s => s.buyBonusUsed >= 5 },
  { id: 'mega_spins', name: 'Mega Spinner', desc: 'Trigger Mega Spins', check: s => s.megaSpinsTriggered >= 1 },
  { id: 'total_cascade_50', name: 'Tumble Pro', desc: 'Trigger 50 cascades', check: s => s.totalCascades >= 50 },
  { id: 'level_100', name: 'Casino Royale', desc: 'Reach level 100', check: s => s.level >= 100 },
  // Round 4 achievements
  { id: 'sticky_wild', name: 'Stuck on You', desc: 'Get a sticky wild during free spins', check: s => s.stickyWildPositions.length > 0 || s.expandingWilds >= 3 },
  { id: 'pick_bonus_1', name: 'Lucky Pick', desc: 'Trigger the pick bonus', check: s => s.pickBonusTriggered >= 1 },
  { id: 'pick_bonus_big', name: 'Treasure Hunter', desc: 'Win 500+ from pick bonus', check: s => s.bestPickBonusWin >= 500 },
  { id: 'tourn_first', name: 'Tournament Debut', desc: 'Complete a tournament', check: s => s.tournamentPlayed >= 1 },
  { id: 'tourn_10', name: 'Tournament Regular', desc: 'Complete 10 tournaments', check: s => s.tournamentPlayed >= 10 },
  { id: 'tourn_best_500', name: 'Tournament Champion', desc: 'Score 500+ in a tournament', check: s => s.tournamentBestScore >= 500 },
  { id: 'vip_silver', name: 'Silver Status', desc: 'Reach Silver VIP tier', check: s => s.vipTier >= 1 },
  { id: 'vip_gold', name: 'Gold Status', desc: 'Reach Gold VIP tier', check: s => s.vipTier >= 2 },
  { id: 'vip_redeem', name: 'Points Spender', desc: 'Redeem comp points', check: s => s.compRedeemed >= 1 },
  { id: 'total_won_1m', name: 'Millionaire', desc: 'Win 1,000,000 total credits', check: s => s.totalCreditsWon >= 1000000 },
  // Multiplier Wilds
  { id: 'mult_wild_first', name: 'Wild Multiplier!', desc: 'Get your first multiplier wild', check: s => s.multiplierWildsHit >= 1 },
  { id: 'mult_wild_5x', name: '5x Wild Power', desc: 'Hit a 5x multiplier wild', check: s => s.bestWildMultiplier >= 5 },
  { id: 'mult_wild_10', name: 'Wild Streak', desc: 'Hit 10 multiplier wilds', check: s => s.multiplierWildsHit >= 10 },
  // Nudge
  { id: 'nudge_first', name: 'Lucky Nudge', desc: 'Get your first nudge', check: s => s.nudgesTriggered >= 1 },
  { id: 'nudge_win', name: 'Nudge Winner', desc: 'Win from a nudge', check: s => s.nudgeWins >= 1 },
  { id: 'nudge_10', name: 'Nudge Expert', desc: 'Trigger 10 nudges', check: s => s.nudgesTriggered >= 10 },
  // Daily Wheel
  { id: 'dwheel_first', name: 'Daily Spinner', desc: 'Spin the daily wheel', check: s => s.dailyWheelSpins >= 1 },
  { id: 'dwheel_7', name: 'Weekly Spinner', desc: 'Spin daily wheel 7 times', check: s => s.dailyWheelSpins >= 7 },
  { id: 'dwheel_big', name: 'Lucky Wheel', desc: 'Win 500+ from daily wheel', check: s => s.dailyWheelTotal >= 500 },
  // Symbol Collection
  { id: 'collect_3', name: 'Novice Collector', desc: 'Collect 3 unique symbols', check: s => s.collectedSymbols.length >= 3 },
  { id: 'collect_6', name: 'Symbol Seeker', desc: 'Collect 6 unique symbols', check: s => s.collectedSymbols.length >= 6 },
  { id: 'collect_9', name: 'Expert Collector', desc: 'Collect 9 unique symbols', check: s => s.collectedSymbols.length >= 9 },
  { id: 'collect_all', name: 'Master Collector', desc: 'Collect all 12 symbols', check: s => s.collectedSymbols.length >= 12 },
  // History
  { id: 'spins_200', name: 'Veteran Spinner', desc: 'Complete 200 spins', check: s => s.totalSpins >= 200 },
  { id: 'spins_500', name: 'Slot Legend', desc: 'Complete 500 spins', check: s => s.totalSpins >= 500 },
  // Linked Reels
  { id: 'linked_first', name: 'In Sync', desc: 'Trigger linked reels', check: s => s.linkedReelsTriggered >= 1 },
  { id: 'linked_5', name: 'Sync Master', desc: 'Trigger linked reels 5 times', check: s => s.linkedReelsTriggered >= 5 },
  { id: 'linked_4reels', name: 'Quad Link', desc: 'Get 4 linked reels', check: s => s.bestLinkedReelCount >= 4 },
  { id: 'linked_win', name: 'Linked Win!', desc: 'Win with linked reels', check: s => s.linkedReelWins >= 1 },
  // Prestige
  { id: 'prestige_first', name: 'Reborn', desc: 'Prestige for the first time', check: s => s.totalPrestiges >= 1 },
  { id: 'prestige_3', name: 'Star Chaser', desc: 'Reach Prestige Star III', check: s => s.prestigeLevel >= 3 },
  { id: 'prestige_max', name: 'Prestige Master', desc: 'Reach max prestige', check: s => s.prestigeLevel >= 5 },
  // Streak multiplier
  { id: 'streak_3x', name: 'Hot Hand', desc: 'Earn a 3-win streak multiplier', check: s => s.streakMultipliersEarned >= 1 },
  { id: 'streak_5x', name: 'On a Roll', desc: 'Earn a 5-win streak multiplier', check: s => s.bestStreakMultiplier >= 1.3 },
  { id: 'streak_7x', name: 'Inferno Streak', desc: 'Earn a 7-win streak multiplier', check: s => s.bestStreakMultiplier >= 1.5 },
  // Milestone
  { id: 'spins_1000', name: 'Eternal Spinner', desc: 'Complete 1,000 spins', check: s => s.totalSpins >= 1000 },
];

// Daily challenge templates
interface DailyChallengeTemplate {
  text: string;
  field: keyof SaveData;
  targetFn: (seed: number) => number;
  rewardFn: (seed: number) => number;
  getProgress: (s: SaveData, start: number) => number;
}

const DAILY_TEMPLATES: DailyChallengeTemplate[] = [
  { text: 'Complete {n} spins', field: 'totalSpins', targetFn: s => 10 + (s % 4) * 10, rewardFn: s => 50 + (s % 3) * 25, getProgress: (s, st) => s.totalSpins - st },
  { text: 'Win {n} times', field: 'totalWins', targetFn: s => 3 + (s % 3) * 2, rewardFn: s => 75 + (s % 3) * 25, getProgress: (s, st) => s.totalWins - st },
  { text: 'Win {n} credits', field: 'totalCreditsWon', targetFn: s => 100 + (s % 5) * 50, rewardFn: s => 100 + (s % 3) * 50, getProgress: (s, st) => s.totalCreditsWon - st },
  { text: 'Get {n} win streak', field: 'bestWinStreak', targetFn: s => 2 + (s % 2), rewardFn: () => 150, getProgress: (s, _st) => s.currentWinStreak },
  { text: 'Bet {n} total credits', field: 'totalCreditsBet', targetFn: s => 50 + (s % 4) * 25, rewardFn: s => 60 + (s % 3) * 30, getProgress: (s, st) => s.totalCreditsBet - st },
  { text: 'Trigger {n} free spins', field: 'freeSpinsTriggered', targetFn: () => 1, rewardFn: () => 200, getProgress: (s, st) => s.freeSpinsTriggered - st },
];

const BONUS_WHEEL_PRIZES = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 10, 25];

// VIP tiers
interface VipTier {
  name: string;
  color: string;
  minPoints: number;
  compRate: number; // multiplier on comp point earning
  xpBonus: number; // extra XP per spin
}

const VIP_TIERS: VipTier[] = [
  { name: 'Bronze', color: '#cd7f32', minPoints: 0, compRate: 1.0, xpBonus: 0 },
  { name: 'Silver', color: '#c0c0c0', minPoints: 500, compRate: 1.5, xpBonus: 1 },
  { name: 'Gold', color: '#ffd700', minPoints: 2000, compRate: 2.0, xpBonus: 2 },
  { name: 'Platinum', color: '#e5e4e2', minPoints: 5000, compRate: 3.0, xpBonus: 3 },
  { name: 'Diamond', color: '#b9f2ff', minPoints: 15000, compRate: 5.0, xpBonus: 5 },
];

// Pick bonus prizes (multipliers of bet)
const PICK_PRIZES = [3, 5, 8, 10, 15, 20, 25, 30, 50, 75, 100, 0]; // 0 = extra pick

// Daily wheel prizes (credit amounts)
const DAILY_WHEEL_PRIZES = [25, 50, 75, 100, 150, 200, 300, 500];

// Multiplier Wild chances
const WILD_MULT_CHANCES: { mult: number; chance: number }[] = [
  { mult: 5, chance: 0.05 },
  { mult: 3, chance: 0.10 },
  { mult: 2, chance: 0.25 },
];

// Symbol collection: 12 symbols total
const COLLECTION_MILESTONES = [
  { count: 3, reward: 100, name: 'Novice Collector' },
  { count: 6, reward: 300, name: 'Symbol Seeker' },
  { count: 9, reward: 750, name: 'Expert Collector' },
  { count: 12, reward: 2000, name: 'Master Collector' },
];

// ─────────────── PRESTIGE SYSTEM ───────────────

interface PrestigeTier {
  name: string;
  color: string;
  minLevel: number;
  payoutBonus: number; // permanent % bonus to all payouts
  xpBonus: number; // permanent XP bonus per spin
  startCredits: number; // credits after prestige reset
}

const PRESTIGE_TIERS: PrestigeTier[] = [
  { name: 'None', color: '#888888', minLevel: 0, payoutBonus: 0, xpBonus: 0, startCredits: 1000 },
  { name: 'Star I', color: '#ffcc00', minLevel: 25, payoutBonus: 5, xpBonus: 1, startCredits: 1500 },
  { name: 'Star II', color: '#ff8800', minLevel: 25, payoutBonus: 10, xpBonus: 2, startCredits: 2000 },
  { name: 'Star III', color: '#ff2244', minLevel: 25, payoutBonus: 15, xpBonus: 3, startCredits: 3000 },
  { name: 'Star IV', color: '#ff00ff', minLevel: 25, payoutBonus: 20, xpBonus: 4, startCredits: 4000 },
  { name: 'Star V', color: '#00ffff', minLevel: 25, payoutBonus: 30, xpBonus: 5, startCredits: 5000 },
];

// ─────────────── AUTO-PLAY STOP CONDITIONS ───────────────

interface AutoPlayConfig {
  stopOnBonus: boolean;
  stopOnJackpot: boolean;
  stopOnFreeSpins: boolean;
  lossLimit: number; // 0 = disabled
  singleWinLimit: number; // 0 = disabled
  balanceTarget: number; // 0 = disabled
}

// ─────────────── STREAK MULTIPLIER ───────────────

const STREAK_MULTIPLIERS: { streak: number; mult: number }[] = [
  { streak: 7, mult: 1.5 },
  { streak: 5, mult: 1.3 },
  { streak: 3, mult: 1.1 },
];

// ─────────────── LINKED REELS ───────────────

const LINKED_REELS_CHANCE = 0.12; // 12% chance per spin
const MIN_LINKED = 2;
const MAX_LINKED = 4;

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
  expandingWilds: number;
  holdRespinWins: number;
  bestBonusWheelWin: number;
  dailySweeps: number;
  dailyStartSnapshot: number[];
  dailyClaimed: boolean[];
  holdSpinsUsed: number;
  totalBonusWheelWins: number;
  // Multi-tier jackpots
  jpGrand: number;
  jpMajor: number;
  jpMinor: number;
  jpMini: number;
  jpGrandWins: number;
  jpMajorWins: number;
  jpMinorWins: number;
  jpMiniWins: number;
  lastJackpotType: string;
  lastJackpotAmount: number;
  // Cascading reels
  bestCascadeChain: number;
  totalCascades: number;
  bestCascadeWin: number;
  // Quick spin
  quickSpin: boolean;
  // Buy bonus
  buyBonusUsed: number;
  // Mystery symbol
  mysteryReveals: number;
  // Mega spins
  megaSpinsTriggered: number;
  // Sticky wilds
  stickyWildPositions: { r: number; row: number }[];
  // Pick bonus
  pickBonusTriggered: number;
  bestPickBonusWin: number;
  // Tournament
  tournamentPlayed: number;
  tournamentBestScore: number;
  tournamentHistory: { score: number; date: string; spins: number }[];
  // VIP
  compPoints: number;
  totalCompEarned: number;
  compRedeemed: number;
  vipTier: number;
  // Spin history
  spinHistory: { syms: string; win: number; bet: number; machine: string }[];
  // Multiplier wilds
  multiplierWildsHit: number;
  bestWildMultiplier: number;
  // Nudge
  nudgesTriggered: number;
  nudgeWins: number;
  // Daily wheel
  dailyWheelLastDate: string;
  dailyWheelTotal: number;
  dailyWheelSpins: number;
  // Symbol collection
  collectedSymbols: string[];
  collectionMilestonesClaimed: number[];
  // Prestige system
  prestigeLevel: number;
  totalPrestiges: number;
  // Linked reels
  linkedReelsTriggered: number;
  bestLinkedReelCount: number;
  linkedReelWins: number;
  // Streak multiplier
  streakMultipliersEarned: number;
  bestStreakMultiplier: number;
  // Auto-play config
  autoConfig: AutoPlayConfig;
  autoSessionStartCredits: number;
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
    expandingWilds: 0, holdRespinWins: 0, bestBonusWheelWin: 0, dailySweeps: 0,
    dailyStartSnapshot: [], dailyClaimed: [false, false, false],
    holdSpinsUsed: 0, totalBonusWheelWins: 0,
    // Multi-tier jackpots
    jpGrand: 5000, jpMajor: 1000, jpMinor: 250, jpMini: 50,
    jpGrandWins: 0, jpMajorWins: 0, jpMinorWins: 0, jpMiniWins: 0,
    lastJackpotType: '', lastJackpotAmount: 0,
    // Cascading reels
    bestCascadeChain: 0, totalCascades: 0, bestCascadeWin: 0,
    // Quick spin
    quickSpin: false,
    // Buy bonus
    buyBonusUsed: 0,
    // Mystery symbol
    mysteryReveals: 0,
    // Mega spins
    megaSpinsTriggered: 0,
    // Sticky wilds
    stickyWildPositions: [],
    // Pick bonus
    pickBonusTriggered: 0,
    bestPickBonusWin: 0,
    // Tournament
    tournamentPlayed: 0,
    tournamentBestScore: 0,
    tournamentHistory: [],
    // VIP
    compPoints: 0,
    totalCompEarned: 0,
    compRedeemed: 0,
    vipTier: 0,
    // Spin history
    spinHistory: [],
    // Multiplier wilds
    multiplierWildsHit: 0,
    bestWildMultiplier: 0,
    // Nudge
    nudgesTriggered: 0,
    nudgeWins: 0,
    // Daily wheel
    dailyWheelLastDate: '',
    dailyWheelTotal: 0,
    dailyWheelSpins: 0,
    // Symbol collection
    collectedSymbols: [],
    collectionMilestonesClaimed: [],
    // Prestige system
    prestigeLevel: 0,
    totalPrestiges: 0,
    // Linked reels
    linkedReelsTriggered: 0,
    bestLinkedReelCount: 0,
    linkedReelWins: 0,
    // Streak multiplier
    streakMultipliersEarned: 0,
    bestStreakMultiplier: 1,
    // Auto-play config
    autoConfig: {
      stopOnBonus: false,
      stopOnJackpot: true,
      stopOnFreeSpins: false,
      lossLimit: 0,
      singleWinLimit: 0,
      balanceTarget: 0,
    },
    autoSessionStartCredits: 0,
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

function dateSeed(): number {
  const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}


// ─────────────────────── REEL STRIP GENERATION ───────────────────────

function generateReelStrip(rng: () => number, machineIdx: number): number[] {
  const strip: number[] = [];
  const machine = MACHINES[machineIdx];
  const weights = SYMBOLS.map((sym, i) => sym.weight * machine.weightMods[i]);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < REEL_STRIP_LEN; i++) {
    let r = rng() * totalWeight;
    let picked = 0;
    for (let j = 0; j < weights.length; j++) {
      r -= weights[j];
      if (r <= 0) { picked = j; break; }
    }
    strip.push(picked);
  }
  return strip;
}

// ─────────────────────── DAILY CHALLENGES ───────────────────────

function getDailyChallenges(seed: number): { text: string; target: number; reward: number; templateIdx: number }[] {
  const rng = mulberry32(seed);
  const challenges: { text: string; target: number; reward: number; templateIdx: number }[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let idx: number;
    do { idx = Math.floor(rng() * DAILY_TEMPLATES.length); } while (used.has(idx));
    used.add(idx);
    const tmpl = DAILY_TEMPLATES[idx];
    const target = tmpl.targetFn(seed + i);
    const reward = tmpl.rewardFn(seed + i);
    challenges.push({ text: tmpl.text.replace('{n}', String(target)), target, reward, templateIdx: idx });
  }
  return challenges;
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
    [660, 880, 1100].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.2, 0.15), i * 80); });
  }

  bigWin() {
    if (!this.ctx) return;
    [440, 554, 659, 880, 1100, 1320].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 100); });
  }

  megaWin() {
    if (!this.ctx) return;
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.playTone(440 + i * 88, 'sine', 0.35, 0.22);
        this.playTone(330 + i * 66, 'triangle', 0.25, 0.15);
      }, i * 100);
    }
  }

  ultraWin() {
    if (!this.ctx) return;
    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        this.playTone(330 + i * 110, 'sine', 0.4, 0.25);
        this.playTone(220 + i * 55, 'triangle', 0.35, 0.18);
        this.playTone(165 + i * 33, 'sawtooth', 0.3, 0.08);
      }, i * 90);
    }
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
    [1100, 1320, 1540, 1760].forEach((f, i) => { setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.2), i * 60); });
  }

  bonusTrigger() {
    if (!this.ctx) return;
    [330, 440, 550, 660, 880].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 100); });
  }

  wheelTick() { this.playTone(600 + Math.random() * 400, 'triangle', 0.05, 0.12); }
  wheelResult() {
    if (!this.ctx) return;
    [880, 1100, 1320, 1540, 1760, 2200].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.25, 0.2), i * 70); });
  }
  
  gambleWin() {
    [660, 880, 1100, 1320].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.2, 0.18), i * 80); });
  }

  gambleLose() {
    [440, 330, 220].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.12), i * 120); });
  }

  click() { this.playTone(1000, 'sine', 0.05, 0.08); }

  achievement() {
    [880, 1100, 1320, 1540, 1760].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.2, 0.12), i * 70); });
  }

  levelUp() {
    [440, 554, 659, 880, 1100, 1320].forEach((f, i) => { setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.15), i * 80); });
  }

  expandingWild() {
    if (!this.ctx) return;
    [440, 660, 880, 1100, 1320].forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 60); });
  }

  holdRespin() {
    if (!this.ctx) return;
    this.playTone(550, 'triangle', 0.15, 0.15);
    setTimeout(() => this.playTone(660, 'triangle', 0.15, 0.15), 100);
    setTimeout(() => this.playTone(880, 'sine', 0.2, 0.2), 200);
  }

  startDrone() {
    if (!this.ctx || this.dronePlaying) return;
    this.dronePlaying = true;
    const freqs = [55, 82.5, 110];
    const types: OscillatorType[] = ['sine', 'triangle', 'sine'];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = types[i]; osc.frequency.value = f;
      g.gain.value = 0.06;
      const lfo = this.ctx!.createOscillator();
      const lfoG = this.ctx!.createGain();
      lfo.frequency.value = 0.15; lfoG.gain.value = 0.02;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
      osc.connect(g); g.connect(this.musicGain); osc.start();
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

  constructor(private scene: any, max: number = 200) {
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

  megaBurst(x: number, y: number, z: number, colors: string[], count: number = 40) {
    colors.forEach(color => this.burst(x + (Math.random() - 0.5), y + (Math.random() - 0.5) * 0.5, z, color, Math.ceil(count / colors.length)));
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
  let reelStrips: number[][] = [];
  const rng = Math.random;
  function regenerateReels() {
    reelStrips = [];
    for (let r = 0; r < REELS; r++) reelStrips.push(generateReelStrip(rng, save.currentMachine));
  }
  regenerateReels();
  
  const currentGrid: number[][] = [];
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
  let reelSpeeds: number[] = [0, 0, 0, 0, 0];
  let targetGrid: number[][] = [];
  let spinStartTime = 0;

  // Free spins
  let freeSpinsRemaining = 0;
  let freeSpinsTotal = 0;
  let freeSpinsWinnings = 0;
  let freeSpinMultiplier = 2;

  // Bonus wheel
  let bonusWheelAngle = 0;
  let bonusWheelSpeed = 0;
  let bonusWheelSpinning = false;
  let bonusWheelResult = -1;
  let bonusWheelBet = 0;

  // Gamble
  let gambleWinAmount = 0;
  let gambleActive = false;
  let currentGambleStreak = 0;

  // Auto-spin
  let autoSpinRemaining = 0;

  // Win display
  let showingWin = false;
  let winDisplayTimer = 0;
  let lastWinAmount = 0;
  let winningLines: { line: number; symbols: number; symbolIdx: number; payout: number }[] = [];

  // Win celebration
  let celebrationTimer = 0;
  let winTier: 'normal' | 'big' | 'mega' | 'ultra' = 'normal';

  // Expanding wilds
  let expandingWildReels: number[] = [];
  let expandingWildTimer = 0;
  let expandingWildAnimating = false;

  // Hold/Respin
  let holdReelsAvailable = false;
  let heldReels: boolean[] = [false, false, false, false, false];
  let isRespin = false;

  // Cascading reels
  let cascadeLevel = 0;
  let cascadeTotal = 0;
  let cascading = false;
  let cascadeTimer = 0;
  let cascadePhase: 'idle' | 'removing' | 'dropping' | 'evaluating' = 'idle';
  let winPositions: { r: number; row: number }[] = [];

  // Quick spin
  let quickSpinMode = false;

  // Buy bonus / Mega spins
  let megaSpinMultiplier = 1;
  let megaSpinsRemaining = 0;

  // Pick bonus state
  let pickPrizes: number[] = [];
  let pickRevealed: boolean[] = [];
  let pickPicksRemaining = 0;
  let pickTotal = 0;
  let pickBet = 0;

  // Tournament state
  let tournamentActive = false;
  let tournamentSpins = 0;
  let tournamentMaxSpins = 20;
  let tournamentWinnings = 0;
  let tournamentBestSpin = 0;
  let tournamentBet = 0;
  let tournamentStreak = 0;

  // Multiplier wild state
  let wildMultipliers: Map<string, number> = new Map(); // key: "r,row" -> multiplier
  let nudgeAnimating = false;
  let nudgePending = false;
  let nudgeTimer = 0;
  let nudgeReel = -1;
  let nudgeDir = 0;

  // Daily wheel state
  let dailyWheelAngle = 0;
  let dailyWheelSpeed = 0;
  let dailyWheelSpinning = false;
  let dailyWheelResult = -1;

  // Linked reels state
  let linkedReels: number[] = []; // indices of reels that are linked this spin
  let linkedReelsActive = false;

  // Streak multiplier state
  let currentStreakMult = 1;

  // Auto-play tracking
  let autoSessionLoss = 0;

  // VIP helpers
  function getVipTier(points: number): number {
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (points >= VIP_TIERS[i].minPoints) return i;
    }
    return 0;
  }

  function earnCompPoints(betAmount: number) {
    const tier = VIP_TIERS[save.vipTier];
    const pts = Math.floor(betAmount * 2 * tier.compRate);
    if (pts > 0) {
      save.compPoints += pts;
      save.totalCompEarned += pts;
      // Check for tier upgrade
      const newTier = getVipTier(save.totalCompEarned);
      if (newTier > save.vipTier) {
        save.vipTier = newTier;
        showToast(`VIP Upgrade: ${VIP_TIERS[newTier].name}!`);
        audio.levelUp();
      }
    }
  }

  // Daily challenges
  let dailyChallenges = getDailyChallenges(dateSeed());
  function initDailyChallenges() {
    const today = todayStr();
    if (save.dailyLastDate !== today) {
      save.dailyLastDate = today;
      save.dailyStartSnapshot = [save.totalSpins, save.totalWins, save.totalCreditsWon, save.bestWinStreak, save.totalCreditsBet, save.freeSpinsTriggered];
      save.dailyClaimed = [false, false, false];
      saveSave(save);
    }
    dailyChallenges = getDailyChallenges(dateSeed());
  }
  initDailyChallenges();

  // ─────────────── SCENE SETUP ───────────────

  const decoMeshes: Mesh[] = [];

  function buildEnvironment() {
    const c = new Color(theme.bg);
    world.scene.background = c;
    world.scene.fog = new FogExp2(new Color(theme.fog).getHex(), 0.08);

    const floorGrid = new GridHelper(20, 20, new Color(theme.grid).getHex(), new Color(theme.grid).getHex());
    (floorGrid.material as LineBasicMaterial).opacity = 0.15;
    (floorGrid.material as LineBasicMaterial).transparent = true;
    world.scene.add(floorGrid);

    const ceilGrid = new GridHelper(20, 20, new Color(theme.grid).getHex(), new Color(theme.grid).getHex());
    ceilGrid.position.y = 4;
    (ceilGrid.material as LineBasicMaterial).opacity = 0.08;
    (ceilGrid.material as LineBasicMaterial).transparent = true;
    world.scene.add(ceilGrid);

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

  // ─────────────── SLOT MACHINE 3D ───────────────

  const machineGroup = new Group();
  machineGroup.position.set(MACHINE_X, 0, MACHINE_Z);
  world.scene.add(machineGroup);

  const bodyMat = new MeshStandardMaterial({ color: new Color(theme.machine).getHex(), metalness: 0.5, roughness: 0.4 });
  const body = new Mesh(new BoxGeometry(3.2, 2.8, 0.6), bodyMat);
  body.position.set(0, MACHINE_Y, 0);
  machineGroup.add(body);

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

  const reelBgMat = new MeshStandardMaterial({ color: new Color(theme.reelBg).getHex(), metalness: 0.2, roughness: 0.8 });
  const reelBg = new Mesh(new BoxGeometry(REELS * REEL_SPACING_X + 0.3, ROWS * REEL_SPACING_Y + 0.2, 0.05), reelBgMat);
  reelBg.position.set(0, MACHINE_Y + 0.2, 0.28);
  machineGroup.add(reelBg);

  for (let r = 0; r < REELS - 1; r++) {
    const x = (r + 1 - (REELS - 1) / 2 - 0.5) * REEL_SPACING_X;
    const div = new Mesh(new BoxGeometry(0.02, ROWS * REEL_SPACING_Y + 0.15, 0.03),
      new MeshBasicMaterial({ color: new Color(theme.frame).getHex(), transparent: true, opacity: 0.3 }));
    div.position.set(x, MACHINE_Y + 0.2, 0.31);
    machineGroup.add(div);
  }

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
      case 'ring': geo = new RingGeometry(s * 0.2, s * 0.45, 12); break;
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

    const wireMat = new MeshBasicMaterial({ color: new Color(sym.color).getHex(), wireframe: true, transparent: true, opacity: 0.4 });
    const wire = new Mesh(geo.clone(), wireMat);
    wire.scale.setScalar(1.08);
    mesh.add(wire);

    const glowMat = new MeshBasicMaterial({ color: new Color(sym.color).getHex(), transparent: true, opacity: 0.15, blending: AdditiveBlending });
    const glow = new Mesh(new SphereGeometry(s * 0.7, 8, 8), glowMat);
    mesh.add(glow);

    return mesh;
  }

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

  const paylineIndicators: Mesh[] = [];
  for (let i = 0; i < 20; i++) {
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

  const jackpotBar = new Mesh(
    new BoxGeometry(2.5, 0.3, 0.1),
    new MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 })
  );
  jackpotBar.position.set(0, MACHINE_Y + 1.6, 0.1);
  machineGroup.add(jackpotBar);

  const machineLight = new PointLight(new Color(theme.glow).getHex(), 2, 5);
  machineLight.position.set(0, MACHINE_Y + 0.5, 1.5);
  machineGroup.add(machineLight);

  // ─────────────── BONUS WHEEL 3D ───────────────

  const wheelGroup = new Group();
  wheelGroup.position.set(MACHINE_X + 2.5, MACHINE_Y + 0.5, MACHINE_Z + 0.5);
  wheelGroup.visible = false;
  world.scene.add(wheelGroup);

  // Wheel disc
  const wheelDisc = new Mesh(
    new CircleGeometry(0.8, 24),
    new MeshStandardMaterial({ color: 0x1a0a2a, metalness: 0.4, roughness: 0.5 })
  );
  wheelDisc.rotation.y = -Math.PI / 2;
  wheelGroup.add(wheelDisc);

  // Wheel segments (12 colored wedges)
  const segColors = ['#ff2244', '#ffcc00', '#00ff88', '#00ccff', '#ff00ff', '#ff8800',
    '#ff2244', '#ffcc00', '#00ff88', '#00ccff', '#ff00ff', '#ff8800'];
  for (let i = 0; i < 12; i++) {
    const segAngle = (Math.PI * 2) / 12;
    const segGeo = new RingGeometry(0.3, 0.75, 3, 1, i * segAngle, segAngle * 0.9);
    const segMat = new MeshBasicMaterial({
      color: new Color(segColors[i]).getHex(),
      transparent: true,
      opacity: 0.6,
      side: 2,
    });
    const seg = new Mesh(segGeo, segMat);
    seg.rotation.y = -Math.PI / 2;
    seg.position.x = 0.01;
    wheelGroup.add(seg);
  }

  // Wheel pointer
  const pointer = new Mesh(
    new ConeGeometry(0.06, 0.15, 4),
    new MeshBasicMaterial({ color: 0xffcc00 })
  );
  pointer.rotation.z = Math.PI / 2;
  pointer.position.set(-0.02, 0.82, 0);
  wheelGroup.add(pointer);

  // Wheel frame ring
  const wheelFrame = new Mesh(
    new TorusGeometry(0.8, 0.03, 8, 24),
    new MeshBasicMaterial({ color: new Color(theme.frame).getHex(), transparent: true, opacity: 0.8 })
  );
  wheelFrame.rotation.y = -Math.PI / 2;
  wheelGroup.add(wheelFrame);

  // Wheel light
  const wheelLight = new PointLight(0xffcc00, 1.5, 4);
  wheelLight.position.set(-0.3, 0, 0);
  wheelGroup.add(wheelLight);

  buildEnvironment();

  // ─────────────── MYSTERY SYMBOL RESOLUTION ───────────────

  function resolveMysterySymbols() {
    const mysteryIdx = SYMBOLS.findIndex(s => s.name === 'Mystery');
    if (mysteryIdx < 0) return;
    // Pick one random non-special symbol to replace all mysteries
    const normalSymbols = SYMBOLS.map((s, i) => ({ s, i })).filter(x => !x.s.isWild && !x.s.isScatter && !x.s.isBonus && x.s.name !== 'Mystery');
    if (normalSymbols.length === 0) return;
    const chosen = normalSymbols[Math.floor(Math.random() * normalSymbols.length)];
    let revealed = false;
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        if (currentGrid[r][row] === mysteryIdx) {
          currentGrid[r][row] = chosen.i;
          updateSymbolMesh(r, row, chosen.i);
          save.mysteryReveals++;
          revealed = true;
        }
      }
    }
    if (revealed) {
      showToast(`Mystery reveals: ${chosen.s.name}!`);
      audio.expandingWild(); // reuse the sound
    }
  }

  // ─────────────── CASCADING REELS ───────────────

  function startCascade() {
    // Mark winning positions for removal
    winPositions = [];
    for (const wl of winningLines) {
      const line = PAYLINES[wl.line];
      for (let r = 0; r < wl.symbols; r++) {
        const pos = { r, row: line[r] };
        if (!winPositions.some(p => p.r === pos.r && p.row === pos.row)) {
          winPositions.push(pos);
        }
      }
    }
    if (winPositions.length === 0) return;
    
    cascading = true;
    cascadePhase = 'removing';
    cascadeTimer = 0;
    save.totalCascades++;
  }

  function cascadeRemove() {
    // Set winning positions to empty (use a "blank" - we'll re-use sphere with low opacity)
    for (const pos of winPositions) {
      symbolMeshes[pos.r][pos.row].visible = false;
    }
  }

  function cascadeDrop() {
    // For each reel, drop symbols down to fill gaps and add new ones at top
    for (let r = 0; r < REELS; r++) {
      const reelWins = winPositions.filter(p => p.r === r).map(p => p.row).sort((a, b) => b - a);
      if (reelWins.length === 0) continue;
      
      // Build new column: keep non-winning symbols, push them down, fill top with new
      const remaining: number[] = [];
      for (let row = 0; row < ROWS; row++) {
        if (!reelWins.includes(row)) {
          remaining.push(currentGrid[r][row]);
        }
      }
      // Generate new symbols for the removed positions
      const newSyms: number[] = [];
      for (let i = 0; i < reelWins.length; i++) {
        const offset = Math.floor(Math.random() * REEL_STRIP_LEN);
        newSyms.push(reelStrips[r][offset]);
      }
      // Combine: new symbols on top, then remaining
      const combined = [...newSyms, ...remaining];
      for (let row = 0; row < ROWS; row++) {
        currentGrid[r][row] = combined[row];
        updateSymbolMesh(r, row, combined[row]);
        symbolMeshes[r][row].visible = true;
      }
    }
  }

  // ─────────────── GAME LOGIC ───────────────

  function getBet(): number {
    return COIN_VALUES[save.coinValueIdx] * save.linesActive;
  }

  function spinReels() {
    if (spinning || state === 'paused' || state === 'bonus_wheel' || state === 'gamble' || state === 'win_celebration') return;
    const bet = getBet();
    if (save.credits < bet && freeSpinsRemaining <= 0 && !isRespin) {
      showToast('Not enough credits!');
      return;
    }

    if (!audio.isReady()) audio.init();
    audio.startDrone();

    if (freeSpinsRemaining <= 0 && !isRespin) {
      save.credits -= bet;
      save.totalCreditsBet += bet;
      save.jackpotPool += bet * 0.02;
      earnCompPoints(bet);
    } else if (freeSpinsRemaining > 0) {
      freeSpinsRemaining--;
      // Clear sticky wilds after last free spin
      if (freeSpinsRemaining <= 0) {
        // Sticky wilds will be cleared after evaluation
      }
    }

    if (!isRespin) save.totalSpins++;
    if (tournamentActive) {
      tournamentSpins++;
      if (tournamentSpins >= tournamentMaxSpins) {
        // Tournament will end after this spin's evaluation
      }
    }
    if (bet >= COIN_VALUES[COIN_VALUES.length - 1] * 20) save.maxBetPlaced = true;
    
    const machineName = MACHINES[save.currentMachine].name;
    if (!save.machinesPlayed.includes(machineName)) save.machinesPlayed.push(machineName);
    if (!save.themesUsed.includes(theme.name)) save.themesUsed.push(theme.name);

    spinning = true;
    state = 'spinning';
    spinStartTime = 0;
    expandingWildReels = [];
    expandingWildAnimating = false;
    holdReelsAvailable = false;
    cascadeLevel = 0;
    cascadeTotal = 0;
    cascading = false;
    cascadePhase = 'idle';

    // Generate target
    targetGrid = [];
    for (let r = 0; r < REELS; r++) {
      if (isRespin && heldReels[r]) {
        targetGrid.push([...currentGrid[r]]);
        continue;
      }
      targetGrid.push([]);
      const offset = Math.floor(Math.random() * REEL_STRIP_LEN);
      for (let row = 0; row < ROWS; row++) {
        targetGrid[r].push(reelStrips[r][(offset + row) % REEL_STRIP_LEN]);
      }
    }

    // Linked reels: chance to sync adjacent reels
    linkedReels = [];
    linkedReelsActive = false;
    if (!isRespin && Math.random() < LINKED_REELS_CHANCE) {
      const linkCount = MIN_LINKED + Math.floor(Math.random() * (MAX_LINKED - MIN_LINKED + 1));
      const startReel = Math.floor(Math.random() * (REELS - linkCount + 1));
      linkedReels = [];
      for (let i = 0; i < linkCount; i++) linkedReels.push(startReel + i);
      linkedReelsActive = true;
      // Copy the first linked reel's symbols to all other linked reels
      const sourceReel = linkedReels[0];
      for (let i = 1; i < linkedReels.length; i++) {
        for (let row = 0; row < ROWS; row++) {
          targetGrid[linkedReels[i]][row] = targetGrid[sourceReel][row];
        }
      }
      save.linkedReelsTriggered++;
      save.bestLinkedReelCount = Math.max(save.bestLinkedReelCount, linkCount);
      audio.holdRespin();
      showToast(`${linkCount} LINKED REELS!`);
    }

    // Apply sticky wilds during free spins
    if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) {
      const wildIdx = SYMBOLS.findIndex(s => s.isWild);
      for (const sp of save.stickyWildPositions) {
        targetGrid[sp.r][sp.row] = wildIdx;
      }
    }

    if (isRespin) {
      reelSpinning = heldReels.map(h => !h);
    } else {
      reelSpinning = [true, true, true, true, true];
    }
    reelSpeeds = reelSpinning.map(s => s ? (quickSpinMode ? 25 : 15) : 0);
    reelOffsets = [0, 0, 0, 0, 0];

    isRespin = false;
    heldReels = [false, false, false, false, false];

    updateHUD();
    saveSave(save);
  }

  // ─────────────── MULTIPLIER WILDS ───────────────

  function assignWildMultipliers() {
    wildMultipliers.clear();
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        if (SYMBOLS[currentGrid[r][row]].isWild) {
          const roll = Math.random();
          for (const wm of WILD_MULT_CHANCES) {
            if (roll < wm.chance) {
              wildMultipliers.set(`${r},${row}`, wm.mult);
              save.multiplierWildsHit++;
              save.bestWildMultiplier = Math.max(save.bestWildMultiplier, wm.mult);
              showToast(`${wm.mult}x WILD!`);
              break;
            }
          }
        }
      }
    }
  }

  function getLineWildMultiplier(lineIdx: number, matchCount: number): number {
    const line = PAYLINES[lineIdx];
    let maxMult = 1;
    for (let r = 0; r < matchCount; r++) {
      const key = `${r},${line[r]}`;
      const m = wildMultipliers.get(key);
      if (m && m > maxMult) maxMult = m;
    }
    return maxMult;
  }

  // ─────────────── NUDGE FEATURE ───────────────

  function tryNudge(): boolean {
    // Try nudging each reel up/down by 1 to see if it creates a win
    for (let r = 0; r < REELS; r++) {
      for (const dir of [1, -1]) {
        // Simulate nudge
        const savedRow: number[] = [];
        for (let row = 0; row < ROWS; row++) savedRow.push(currentGrid[r][row]);
        
        // Apply nudge: shift symbols in the reel
        const strip = reelStrips[r];
        // Find current position in strip
        let stripPos = 0;
        for (let i = 0; i < REEL_STRIP_LEN; i++) {
          if (strip[i] === currentGrid[r][0]) { stripPos = i; break; }
        }
        const newPos = (stripPos + dir + REEL_STRIP_LEN) % REEL_STRIP_LEN;
        for (let row = 0; row < ROWS; row++) {
          currentGrid[r][row] = strip[(newPos + row) % REEL_STRIP_LEN];
        }
        
        // Check if this creates any payline win
        let hasWin = false;
        for (let lineIdx = 0; lineIdx < save.linesActive; lineIdx++) {
          const line = PAYLINES[lineIdx];
          let baseSym = -1;
          for (let rr = 0; rr < REELS; rr++) {
            const sym = currentGrid[rr][line[rr]];
            if (!SYMBOLS[sym].isWild && !SYMBOLS[sym].isScatter && !SYMBOLS[sym].isBonus && SYMBOLS[sym].name !== 'Mystery') {
              baseSym = sym; break;
            }
          }
          if (baseSym === -1) continue;
          let matchCount = 0;
          for (let rr = 0; rr < REELS; rr++) {
            const sym = currentGrid[rr][line[rr]];
            if (sym === baseSym || SYMBOLS[sym].isWild) matchCount++;
            else break;
          }
          if (matchCount >= 3) { hasWin = true; break; }
        }
        
        if (hasWin) {
          // Keep the nudge, animate it
          nudgeReel = r;
          nudgeDir = dir;
          save.nudgesTriggered++;
          for (let row = 0; row < ROWS; row++) {
            updateSymbolMesh(r, row, currentGrid[r][row]);
          }
          audio.holdRespin();
          showToast('NUDGE!');
          return true;
        }
        
        // Restore original
        for (let row = 0; row < ROWS; row++) currentGrid[r][row] = savedRow[row];
      }
    }
    return false;
  }

  // ─────────────── SYMBOL COLLECTION ───────────────

  function updateCollection() {
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        const sym = SYMBOLS[currentGrid[r][row]];
        if (!save.collectedSymbols.includes(sym.name)) {
          save.collectedSymbols.push(sym.name);
          showToast(`Collected: ${sym.name}!`);
          audio.click();
          // Check milestones
          for (const ms of COLLECTION_MILESTONES) {
            if (save.collectedSymbols.length >= ms.count && !save.collectionMilestonesClaimed.includes(ms.count)) {
              save.collectionMilestonesClaimed.push(ms.count);
              save.credits += ms.reward;
              save.peakCredits = Math.max(save.peakCredits, save.credits);
              showToast(`${ms.name}! +${ms.reward} credits!`);
              audio.achievement();
            }
          }
        }
      }
    }
  }

  // ─────────────── SPIN HISTORY ───────────────

  function recordSpinHistory(totalWin: number) {
    const bet = getBet();
    const symNames = [];
    for (let r = 0; r < REELS; r++) {
      const row1 = SYMBOLS[currentGrid[r][1]]?.name || '?';
      symNames.push(row1);
    }
    save.spinHistory.unshift({
      syms: symNames.join(' '),
      win: totalWin,
      bet: bet,
      machine: MACHINES[save.currentMachine].name,
    });
    if (save.spinHistory.length > 20) save.spinHistory.length = 20;
  }

  function applyExpandingWilds(): boolean {
    let expanded = false;
    for (let r = 0; r < REELS; r++) {
      let hasWild = false;
      for (let row = 0; row < ROWS; row++) {
        if (SYMBOLS[currentGrid[r][row]].isWild) { hasWild = true; break; }
      }
      if (hasWild) {
        let alreadyFull = true;
        for (let row = 0; row < ROWS; row++) {
          if (!SYMBOLS[currentGrid[r][row]].isWild) { alreadyFull = false; break; }
        }
        if (!alreadyFull) {
          expandingWildReels.push(r);
          for (let row = 0; row < ROWS; row++) {
            const wildIdx = SYMBOLS.findIndex(s => s.isWild);
            currentGrid[r][row] = wildIdx;
            updateSymbolMesh(r, row, wildIdx);
          }
          expanded = true;
          save.expandingWilds++;
        }
      }
    }
    return expanded;
  }

  // ─────────────── AUTO-PLAY STOP CHECKS ───────────────

  function shouldStopAutoPlay(winAmount: number, bonusTriggered: boolean, jackpotTriggered: boolean, freeSpinTriggered: boolean): boolean {
    if (autoSpinRemaining <= 0) return false;
    const cfg = save.autoConfig;
    if (cfg.stopOnBonus && bonusTriggered) { showToast('Auto-stop: Bonus!'); return true; }
    if (cfg.stopOnJackpot && jackpotTriggered) { showToast('Auto-stop: Jackpot!'); return true; }
    if (cfg.stopOnFreeSpins && freeSpinTriggered) { showToast('Auto-stop: Free Spins!'); return true; }
    if (cfg.singleWinLimit > 0 && winAmount >= cfg.singleWinLimit) { showToast(`Auto-stop: Win >= ${cfg.singleWinLimit}!`); return true; }
    if (cfg.lossLimit > 0) {
      const sessionLoss = save.autoSessionStartCredits - save.credits;
      if (sessionLoss >= cfg.lossLimit) { showToast(`Auto-stop: Loss limit!`); return true; }
    }
    if (cfg.balanceTarget > 0 && save.credits >= cfg.balanceTarget) { showToast(`Auto-stop: Balance target!`); return true; }
    return false;
  }

  // ─────────────── PRESTIGE SYSTEM ───────────────

  function canPrestige(): boolean {
    return save.level >= 25 && save.prestigeLevel < PRESTIGE_TIERS.length - 1;
  }

  function doPrestige() {
    if (!canPrestige()) return;
    save.prestigeLevel++;
    save.totalPrestiges++;
    const tier = PRESTIGE_TIERS[save.prestigeLevel];
    
    // Reset progress but keep permanent bonuses, achievements, and prestige
    save.credits = tier.startCredits;
    save.level = 1;
    save.xp = 0;
    save.totalSpins = 0;
    save.totalWins = 0;
    save.totalCreditsWon = 0;
    save.totalCreditsBet = 0;
    save.biggestWin = 0;
    save.biggestWinMultiplier = 0;
    save.currentWinStreak = 0;
    save.bestWinStreak = 0;
    save.peakCredits = tier.startCredits;
    save.currentMachine = 0;
    save.compPoints = 0;
    save.vipTier = 0;
    save.totalCompEarned = 0;
    save.leaderboard = [];
    save.spinHistory = [];
    save.tournamentHistory = [];
    save.jpGrand = 5000;
    save.jpMajor = 1000;
    save.jpMinor = 250;
    save.jpMini = 50;
    
    regenerateReels();
    audio.levelUp();
    showToast(`PRESTIGE: ${tier.name}! +${tier.payoutBonus}% payouts!`);
    checkAchievements();
    updateHUD();
    saveSave(save);
  }

  function evaluateWin() {
    const bet = getBet();
    const lineBet = COIN_VALUES[save.coinValueIdx];
    const machinePayMult = MACHINES[save.currentMachine].payMult;
    winningLines = [];
    let totalWin = 0;
    let wildCount = 0;
    let scatterCount = 0;
    let bonusCount = 0;

    // Resolve mystery symbols first (before evaluating)
    resolveMysterySymbols();

    // Check expanding wilds
    const didExpand = applyExpandingWilds();
    if (didExpand) {
      audio.expandingWild();
      expandingWildAnimating = true;
      expandingWildTimer = 0;
      showToast('EXPANDING WILD!');
    }

    // Assign multiplier wilds
    assignWildMultipliers();

    // Update symbol collection
    updateCollection();

    // Sticky wilds during free spins: record wild positions
    if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) {
      for (let r = 0; r < REELS; r++) {
        for (let row = 0; row < ROWS; row++) {
          if (SYMBOLS[currentGrid[r][row]].isWild) {
            if (!save.stickyWildPositions.some(p => p.r === r && p.row === row)) {
              save.stickyWildPositions.push({ r, row });
              if (!didExpand) showToast('STICKY WILD!');
            }
          }
        }
      }
    }

    // Clear sticky wilds when free spins end
    if (freeSpinsRemaining <= 0 && freeSpinsTotal > 0 && save.stickyWildPositions.length > 0) {
      // Will be cleared after last free spin evaluates
    }

    // Count specials
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        if (SYMBOLS[currentGrid[r][row]].isWild) wildCount++;
        if (SYMBOLS[currentGrid[r][row]].isScatter) scatterCount++;
        if (SYMBOLS[currentGrid[r][row]].isBonus) bonusCount++;
      }
    }

    save.mostWildsInSpin = Math.max(save.mostWildsInSpin, wildCount);
    save.mostScattersInSpin = Math.max(save.mostScattersInSpin, scatterCount);

    // Check paylines
    for (let lineIdx = 0; lineIdx < save.linesActive; lineIdx++) {
      const line = PAYLINES[lineIdx];
      
      let baseSym = -1;
      for (let r = 0; r < REELS; r++) {
        const sym = currentGrid[r][line[r]];
        if (!SYMBOLS[sym].isWild && !SYMBOLS[sym].isScatter && !SYMBOLS[sym].isBonus) {
          baseSym = sym;
          break;
        }
      }
      if (baseSym === -1) {
        const firstSym = currentGrid[0][line[0]];
        if (SYMBOLS[firstSym].isWild) baseSym = SYMBOLS.findIndex(s => s.isWild);
        else continue;
      }

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

        payout *= lineBet * machinePayMult;
        if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) payout *= freeSpinMultiplier;
        // Cascade multiplier
        if (cascadeLevel > 0) payout *= (1 + cascadeLevel * 0.5);
        // Mega spin multiplier
        if (megaSpinMultiplier > 1) payout *= megaSpinMultiplier;
        // Multiplier wild
        const wMult = getLineWildMultiplier(lineIdx, matchCount);
        if (wMult > 1) payout *= wMult;
        // Prestige payout bonus
        if (save.prestigeLevel > 0) {
          payout *= (1 + PRESTIGE_TIERS[save.prestigeLevel].payoutBonus / 100);
        }
        // Streak multiplier
        if (currentStreakMult > 1) payout *= currentStreakMult;

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

      const freeCount = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
      freeSpinsRemaining += freeCount;
      freeSpinsTotal += freeCount;
      save.freeSpinsTriggered++;
      audio.scatter();
      showToast(`${freeCount} FREE SPINS!`);
    }

    // Bonus wheel trigger: 3 bonus symbols; Pick bonus: 4+ bonus symbols
    if (bonusCount >= 4) {
      save.pickBonusTriggered++;
      pickBet = bet;
      audio.bonusTrigger();
      showToast('PICK A PRIZE!');
      setTimeout(() => {
        startPickBonus();
      }, totalWin > 0 ? 2000 : 500);
    } else if (bonusCount >= 3) {
      save.bonusWheelTriggered++;
      bonusWheelBet = bet;
      audio.bonusTrigger();
      showToast('BONUS WHEEL!');
      setTimeout(() => {
        state = 'bonus_wheel';
        wheelGroup.visible = true;
        bonusWheelAngle = 0;
        bonusWheelSpeed = 0;
        bonusWheelSpinning = false;
        bonusWheelResult = -1;
        updateBonusWheelPanel();
      }, totalWin > 0 ? 2000 : 500);
    }

    // Multi-tier jackpot checks
    // Feed the jackpot pools
    save.jpGrand += bet * 0.005;
    save.jpMajor += bet * 0.01;
    save.jpMinor += bet * 0.015;
    save.jpMini += bet * 0.02;

    // GRAND: 5 Wilds on line 1
    if (winningLines.some(w => w.line === 0 && w.symbols === 5 && SYMBOLS[w.symbolIdx].isWild)) {
      totalWin += save.jpGrand;
      save.jpGrandWins++;
      save.jackpotWins++;
      save.lastJackpotType = 'GRAND';
      save.lastJackpotAmount = save.jpGrand;
      audio.jackpotWin();
      showToast(`GRAND JACKPOT! ${save.jpGrand.toFixed(2)}!`);
      save.jpGrand = 5000;
    }
    // MAJOR: 5 Diamonds on any line
    else if (winningLines.some(w => w.symbols === 5 && w.symbolIdx === 7)) {
      totalWin += save.jpMajor;
      save.jpMajorWins++;
      save.lastJackpotType = 'MAJOR';
      save.lastJackpotAmount = save.jpMajor;
      audio.jackpotWin();
      showToast(`MAJOR JACKPOT! ${save.jpMajor.toFixed(2)}!`);
      save.jpMajor = 1000;
    }
    // MINOR: 5 Sevens on any line
    else if (winningLines.some(w => w.symbols === 5 && w.symbolIdx === 6)) {
      totalWin += save.jpMinor;
      save.jpMinorWins++;
      save.lastJackpotType = 'MINOR';
      save.lastJackpotAmount = save.jpMinor;
      audio.bigWin();
      showToast(`MINOR JACKPOT! ${save.jpMinor.toFixed(2)}!`);
      save.jpMinor = 250;
    }
    // MINI: Random chance on any 5-of-a-kind
    else if (winningLines.some(w => w.symbols === 5) && Math.random() < 0.15) {
      totalWin += save.jpMini;
      save.jpMiniWins++;
      save.lastJackpotType = 'MINI';
      save.lastJackpotAmount = save.jpMini;
      audio.bigWin();
      showToast(`MINI JACKPOT! ${save.jpMini.toFixed(2)}!`);
      save.jpMini = 50;
    }

    // Update jackpot display
    updateJackpotPanel();

    // Check auto-play stop conditions
    const jackpotHit = save.lastJackpotType !== '' && (save.jpGrandWins + save.jpMajorWins + save.jpMinorWins + save.jpMiniWins) > 0;
    const bonusHit = bonusCount >= 3;
    const freeSpinHit = scatterCount >= 3;
    if (shouldStopAutoPlay(totalWin, bonusHit, jackpotHit, freeSpinHit)) {
      autoSpinRemaining = 0;
    }

    if (totalWin > 0) {
      save.credits += totalWin;
      save.totalWins++;
      save.totalCreditsWon += totalWin;
      save.biggestWin = Math.max(save.biggestWin, totalWin);
      const winMult = totalWin / bet;
      save.biggestWinMultiplier = Math.max(save.biggestWinMultiplier, winMult);
      save.currentWinStreak++;
      save.bestWinStreak = Math.max(save.bestWinStreak, save.currentWinStreak);

      // Update streak multiplier for next spin
      currentStreakMult = 1;
      for (const sm of STREAK_MULTIPLIERS) {
        if (save.currentWinStreak >= sm.streak) {
          currentStreakMult = sm.mult;
          save.bestStreakMultiplier = Math.max(save.bestStreakMultiplier, sm.mult);
          save.streakMultipliersEarned++;
          break;
        }
      }
      if (currentStreakMult > 1) {
        showToast(`${save.currentWinStreak} WIN STREAK! ${currentStreakMult}x next!`);
      }

      // Track linked reel wins
      if (linkedReelsActive) {
        save.linkedReelWins++;
        linkedReelsActive = false;
      }
      save.peakCredits = Math.max(save.peakCredits, save.credits);
      lastWinAmount = totalWin;
      cascadeTotal += totalWin;

      // Track nudge wins
      if (nudgePending) {
        save.nudgeWins++;
        nudgePending = false;
      }

      // XP (with VIP bonus + prestige bonus)
      const vipXpBonus = VIP_TIERS[save.vipTier].xpBonus;
      const prestigeXpBonus = PRESTIGE_TIERS[save.prestigeLevel].xpBonus;
      const xpGain = Math.max(1, Math.floor(totalWin / 10)) + vipXpBonus + prestigeXpBonus;
      save.xp += xpGain;
      const nextLevelXp = 100 + save.level * 50;
      if (save.xp >= nextLevelXp) {
        save.xp -= nextLevelXp;
        save.level++;
        audio.levelUp();
        showToast(`Level ${save.level}!`);
      }

      if (freeSpinsRemaining > 0 || freeSpinsTotal > 0) freeSpinsWinnings += totalWin;

      // Determine win tier
      if (winMult >= 500) {
        winTier = 'ultra';
        audio.ultraWin();
        celebrationTimer = 0;
        state = 'win_celebration';
        for (let i = 0; i < 8; i++) {
          setTimeout(() => particles.megaBurst(
            MACHINE_X + (Math.random() - 0.5) * 3, MACHINE_Y + Math.random() * 2, MACHINE_Z + 1,
            ['#ff00ff', '#00ffff', '#ffcc00', '#ff2244', '#00ff88'], 30
          ), i * 200);
        }
      } else if (winMult >= 100) {
        winTier = 'mega';
        audio.megaWin();
        celebrationTimer = 0;
        state = 'win_celebration';
        for (let i = 0; i < 6; i++) {
          setTimeout(() => particles.megaBurst(
            MACHINE_X + (Math.random() - 0.5) * 2.5, MACHINE_Y + Math.random() * 1.5, MACHINE_Z + 1,
            ['#ff00ff', '#ffcc00', '#00ffff'], 25
          ), i * 200);
        }
      } else if (winMult >= 10) {
        winTier = 'big';
        audio.bigWin();
        celebrationTimer = 0;
        state = 'win_celebration';
        for (let i = 0; i < 5; i++) {
          setTimeout(() => particles.burst(
            MACHINE_X + (Math.random() - 0.5) * 2, MACHINE_Y + Math.random() * 1.5, MACHINE_Z + 1, theme.glow, 20
          ), i * 200);
        }
      } else {
        winTier = 'normal';
        audio.smallWin();
        particles.burst(MACHINE_X, MACHINE_Y + 0.2, MACHINE_Z + 0.8, theme.accent, 15);
        
        // Start cascade instead of showing win immediately
        if (bonusCount < 3) { // Don't cascade during bonus wheel trigger
          startCascade();
          if (cascading) {
            // Will continue via cascade system
            showingWin = true;
            winDisplayTimer = 0;
            state = 'showing_win';
            gambleWinAmount = totalWin;
            updateTumblePanel();
          } else {
            showingWin = true;
            winDisplayTimer = 0;
            state = 'showing_win';
            gambleWinAmount = totalWin;
          }
        } else {
          showingWin = true;
          winDisplayTimer = 0;
          state = 'showing_win';
          gambleWinAmount = totalWin;
        }
      }

      // Update celebration panel
      if (state === 'win_celebration') {
        gambleWinAmount = totalWin;
        updateWinCelebration();
        // Also start cascade for big wins after celebration
        if (bonusCount < 3) {
          startCascade();
          if (cascading) updateTumblePanel();
        }
      }

      // Highlight winning lines
      winningLines.forEach(wl => {
        const idx = wl.line;
        if (idx < paylineIndicators.length) {
          (paylineIndicators[idx].material as MeshBasicMaterial).color.set(SYMBOLS[wl.symbolIdx].color);
          (paylineIndicators[idx].material as MeshBasicMaterial).opacity = 1;
        }
      });

      // Leaderboard
      save.leaderboard.push({ score: totalWin, machine: MACHINES[save.currentMachine].name, date: todayStr() });
      save.leaderboard.sort((a, b) => b.score - a.score);
      if (save.leaderboard.length > 20) save.leaderboard.length = 20;

      // Tournament tracking
      if (tournamentActive) {
        tournamentWinnings += totalWin;
        tournamentBestSpin = Math.max(tournamentBestSpin, totalWin);
        tournamentStreak++;
      }

      // Record spin history
      recordSpinHistory(totalWin);
    } else {
      save.currentWinStreak = 0;
      currentStreakMult = 1;
      linkedReelsActive = false;
      lastWinAmount = 0;
      cascadeLevel = 0;
      cascadeTotal = 0;
      if (tournamentActive) tournamentStreak = 0;

      // Record spin history (no win)
      recordSpinHistory(0);

      // Nudge chance: 12% on non-winning spins (not during free spins/auto/tournament)
      if (freeSpinsRemaining <= 0 && autoSpinRemaining <= 0 && megaSpinsRemaining <= 0 && !tournamentActive && Math.random() < 0.12 && bonusCount < 3) {
        const didNudge = tryNudge();
        if (didNudge) {
          // Re-evaluate the spin after nudge
          nudgePending = true;
          setTimeout(() => evaluateWin(), 400);
          checkAchievements();
          checkDailyChallenges();
          updateHUD();
          saveSave(save);
          return;
        }
      }

      // Hold/Respin chance: 15% chance on non-winning spin (not during free spins or auto or mega or tournament)
      if (freeSpinsRemaining <= 0 && autoSpinRemaining <= 0 && megaSpinsRemaining <= 0 && !tournamentActive && Math.random() < 0.15 && bonusCount < 3) {
        holdReelsAvailable = true;
        showToast('HOLD available! Press H or use XR A button');
        state = 'playing';
      } else if (freeSpinsRemaining > 0) {
        setTimeout(() => spinReels(), quickSpinMode ? 400 : 800);
      } else if (freeSpinsTotal > 0 && freeSpinsRemaining <= 0) {
        // Free spins just ended - clear sticky wilds
        save.stickyWildPositions = [];
        freeSpinsTotal = 0;
        if (freeSpinsWinnings > 0) {
          showToast(`Free Spins done! Won ${freeSpinsWinnings.toFixed(2)}`);
        }
        freeSpinsWinnings = 0;
        state = 'playing';
        megaSpinMultiplier = 1;
      } else if (megaSpinsRemaining > 0) {
        megaSpinsRemaining--;
        setTimeout(() => spinReels(), quickSpinMode ? 300 : 600);
      } else if (autoSpinRemaining > 0) {
        autoSpinRemaining--;
        save.autoSpinsCompleted++;
        setTimeout(() => spinReels(), quickSpinMode ? 300 : 500);
      } else {
        state = 'playing';
        megaSpinMultiplier = 1;
      }
    }

    // Update cascade best
    save.bestCascadeWin = Math.max(save.bestCascadeWin, cascadeTotal);

    // Check tournament end
    if (tournamentActive && tournamentSpins >= tournamentMaxSpins) {
      setTimeout(() => endTournament(), 1000);
    }

    checkAchievements();
    checkDailyChallenges();
    updateHUD();
    saveSave(save);
  }

  function triggerHoldRespin() {
    if (!holdReelsAvailable) return;
    holdReelsAvailable = false;
    audio.holdRespin();
    
    // Auto-hold reels with the best symbols
    const reelScores: number[] = [];
    for (let r = 0; r < REELS; r++) {
      let score = 0;
      for (let row = 0; row < ROWS; row++) {
        const sym = SYMBOLS[currentGrid[r][row]];
        if (sym.isWild) score += 100;
        else if (sym.isScatter) score += 50;
        else if (sym.isBonus) score += 40;
        else score += sym.pay3;
      }
      reelScores.push(score);
    }
    
    // Hold the best 2-3 reels
    const sorted = reelScores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
    const holdCount = 2 + (Math.random() < 0.3 ? 1 : 0);
    heldReels = [false, false, false, false, false];
    for (let i = 0; i < holdCount; i++) {
      heldReels[sorted[i].i] = true;
    }
    
    save.holdSpinsUsed++;
    isRespin = true;
    showToast('HOLD & RESPIN!');
    setTimeout(() => spinReels(), 600);
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

  // ─────────────── PICK BONUS LOGIC ───────────────

  function startPickBonus() {
    // Shuffle prizes
    pickPrizes = [...PICK_PRIZES];
    for (let i = pickPrizes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pickPrizes[i], pickPrizes[j]] = [pickPrizes[j], pickPrizes[i]];
    }
    pickRevealed = new Array(12).fill(false);
    pickPicksRemaining = 3;
    pickTotal = 0;
    state = 'pick_bonus';
    updatePickPanel();
  }

  function pickPrize(idx: number) {
    if (pickRevealed[idx] || pickPicksRemaining <= 0) return;
    pickRevealed[idx] = true;
    const prize = pickPrizes[idx];
    
    if (prize === 0) {
      // Extra pick!
      pickPicksRemaining++; // doesn't decrease, net +1
      audio.scatter();
      showToast('EXTRA PICK!');
    } else {
      const amount = prize * pickBet;
      pickTotal += amount;
      audio.smallWin();
      particles.burst(MACHINE_X, MACHINE_Y + 0.5, MACHINE_Z + 0.8, '#ff8800', 15);
    }
    
    pickPicksRemaining--;
    updatePickPanel();
    
    if (pickPicksRemaining <= 0) {
      // Reveal all remaining
      setTimeout(() => {
        for (let i = 0; i < 12; i++) pickRevealed[i] = true;
        updatePickPanel();
      }, 500);
      
      // Award winnings
      save.credits += pickTotal;
      save.totalCreditsWon += pickTotal;
      save.peakCredits = Math.max(save.peakCredits, save.credits);
      save.bestPickBonusWin = Math.max(save.bestPickBonusWin, pickTotal);
      
      checkAchievements();
      updateHUD();
      saveSave(save);
    }
  }

  function collectPickBonus() {
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

  function updatePickPanel() {
    for (let i = 0; i < 12; i++) {
      if (pickRevealed[i]) {
        const prize = pickPrizes[i];
        if (prize === 0) {
          setText(pickBonusEntity, `pick-${i}`, '+1 PICK!');
        } else {
          setText(pickBonusEntity, `pick-${i}`, `${prize}x`);
        }
      } else {
        setText(pickBonusEntity, `pick-${i}`, '?');
      }
    }
    setText(pickBonusEntity, 'pick-picks', `Picks remaining: ${pickPicksRemaining}`);
    setText(pickBonusEntity, 'pick-total', `Total: ${pickTotal.toFixed(2)}`);
    setText(pickBonusEntity, 'pick-subtitle', pickPicksRemaining <= 0 ? 'All picks used! Collect your prize!' : 'Pick 3 prizes! Tap to reveal');
  }

  // ─────────────── TOURNAMENT LOGIC ───────────────

  function startTournament() {
    const entryCost = 50;
    if (save.credits < entryCost) {
      showToast('Need 50 credits to enter!');
      return;
    }
    save.credits -= entryCost;
    tournamentActive = true;
    tournamentSpins = 0;
    tournamentWinnings = 0;
    tournamentBestSpin = 0;
    tournamentBet = getBet();
    tournamentStreak = 0;
    state = 'playing';
    showToast('Tournament started! 20 spins!');
    updateHUD();
    saveSave(save);
  }

  function endTournament() {
    tournamentActive = false;
    save.tournamentPlayed++;
    save.credits += tournamentWinnings;
    save.tournamentBestScore = Math.max(save.tournamentBestScore, tournamentWinnings);
    save.tournamentHistory.push({
      score: tournamentWinnings,
      date: todayStr(),
      spins: tournamentSpins,
    });
    save.tournamentHistory.sort((a, b) => b.score - a.score);
    if (save.tournamentHistory.length > 10) save.tournamentHistory.length = 10;
    
    showToast(`Tournament done! Score: ${tournamentWinnings.toFixed(2)}`);
    state = 'tournament';
    checkAchievements();
    updateTournamentPanel();
    updateHUD();
    saveSave(save);
  }

  function updateTournamentPanel() {
    if (tournamentActive) {
      setText(tournamentEntity, 'tourn-spins', `Spins: ${tournamentSpins}/${tournamentMaxSpins}`);
      setText(tournamentEntity, 'tourn-winnings', tournamentWinnings.toFixed(2));
      setText(tournamentEntity, 'tourn-best-spin', `Best spin: ${tournamentBestSpin.toFixed(2)}`);
      setText(tournamentEntity, 'tourn-streak', `Streak: ${tournamentStreak}`);
      setText(tournamentEntity, 'tourn-status', 'Tournament in progress!');
      setText(tournamentEntity, 'btn-tourn-start', 'IN PROGRESS');
    } else {
      setText(tournamentEntity, 'tourn-spins', 'Spins: 0/20');
      setText(tournamentEntity, 'tourn-winnings', '0.00');
      setText(tournamentEntity, 'tourn-best-spin', `Best ever: ${save.tournamentBestScore.toFixed(2)}`);
      setText(tournamentEntity, 'tourn-streak', `Played: ${save.tournamentPlayed}`);
      setText(tournamentEntity, 'tourn-status', 'Ready to start!');
      setText(tournamentEntity, 'btn-tourn-start', 'START (50 credits)');
    }
    // History
    for (let i = 0; i < 5; i++) {
      if (i < save.tournamentHistory.length) {
        const h = save.tournamentHistory[i];
        setText(tournamentEntity, `tourn-hist-${i}`, `${i + 1}. ${h.score.toFixed(2)} - ${h.date}`);
      } else {
        setText(tournamentEntity, `tourn-hist-${i}`, '-');
      }
    }
  }

  // ─────────────── VIP LOGIC ───────────────

  function updateVipPanel() {
    const tier = VIP_TIERS[save.vipTier];
    const nextTier = save.vipTier < VIP_TIERS.length - 1 ? VIP_TIERS[save.vipTier + 1] : null;
    setText(vipEntity, 'vip-tier', tier.name.toUpperCase());
    setText(vipEntity, 'vip-points', `Comp Points: ${save.compPoints}`);
    if (nextTier) {
      setText(vipEntity, 'vip-progress', `Next tier (${nextTier.name}): ${save.totalCompEarned}/${nextTier.minPoints} pts`);
    } else {
      setText(vipEntity, 'vip-progress', 'Maximum tier reached!');
    }
    setText(vipEntity, 'vip-perk', `Perk: ${tier.compRate}x comp rate, +${tier.xpBonus} XP/spin`);
    setText(vipEntity, 'vip-status', '');
  }

  function redeemComp(points: number, credits: number) {
    if (save.compPoints < points) {
      setText(vipEntity, 'vip-status', 'Not enough points!');
      return;
    }
    save.compPoints -= points;
    save.credits += credits;
    save.compRedeemed++;
    save.peakCredits = Math.max(save.peakCredits, save.credits);
    audio.achievement();
    showToast(`Redeemed: +${credits} credits!`);
    checkAchievements();
    updateVipPanel();
    updateHUD();
    saveSave(save);
  }

  function redeemCompFreeSpins() {
    if (save.compPoints < 200) {
      setText(vipEntity, 'vip-status', 'Not enough points!');
      return;
    }
    save.compPoints -= 200;
    save.compRedeemed++;
    freeSpinsRemaining += 5;
    freeSpinsTotal += 5;
    save.freeSpinsTriggered++;
    audio.scatter();
    showToast('Redeemed: 5 Free Spins!');
    state = 'playing';
    checkAchievements();
    updateHUD();
    saveSave(save);
    setTimeout(() => spinReels(), 500);
  }

  // ─────────────── DAILY WHEEL LOGIC ───────────────

  function canSpinDailyWheel(): boolean {
    return save.dailyWheelLastDate !== todayStr();
  }

  function spinDailyWheel() {
    if (!canSpinDailyWheel()) {
      showToast('Already spun today! Come back tomorrow!');
      return;
    }
    if (!audio.isReady()) audio.init();
    dailyWheelSpinning = true;
    dailyWheelSpeed = 6 + Math.random() * 4;
    dailyWheelResult = -1;
    dailyWheelAngle = 0;
    setText(dailyWheelEntity, 'dwheel-status', 'Spinning...');
    setText(dailyWheelEntity, 'dwheel-prize', '');
    audio.bonusTrigger();
  }

  function resolveDailyWheel() {
    const segAngle = (Math.PI * 2) / DAILY_WHEEL_PRIZES.length;
    const normalAngle = ((dailyWheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segIdx = Math.floor(normalAngle / segAngle) % DAILY_WHEEL_PRIZES.length;
    dailyWheelResult = segIdx;
    const prizeAmount = DAILY_WHEEL_PRIZES[segIdx];

    save.credits += prizeAmount;
    save.totalCreditsWon += prizeAmount;
    save.peakCredits = Math.max(save.peakCredits, save.credits);
    save.dailyWheelLastDate = todayStr();
    save.dailyWheelTotal += prizeAmount;
    save.dailyWheelSpins++;

    audio.wheelResult();
    particles.burst(MACHINE_X, MACHINE_Y + 1, MACHINE_Z + 1, '#ffcc00', 25);

    setText(dailyWheelEntity, 'dwheel-status', `Won ${prizeAmount} credits!`);
    setText(dailyWheelEntity, 'dwheel-prize', `+${prizeAmount} CREDITS`);
    for (let i = 0; i < DAILY_WHEEL_PRIZES.length; i++) {
      setText(dailyWheelEntity, `dw-${i}`, i === segIdx ? `>>> ${DAILY_WHEEL_PRIZES[i]} <<<` : `${DAILY_WHEEL_PRIZES[i]}`);
    }

    checkAchievements();
    updateHUD();
    saveSave(save);
  }

  function updateDailyWheelPanel() {
    for (let i = 0; i < DAILY_WHEEL_PRIZES.length; i++) {
      setText(dailyWheelEntity, `dw-${i}`, `${DAILY_WHEEL_PRIZES[i]}`);
    }
    if (canSpinDailyWheel()) {
      setText(dailyWheelEntity, 'dwheel-status', 'Free daily spin available!');
      setText(dailyWheelEntity, 'btn-dwheel-spin', 'SPIN FREE!');
    } else {
      setText(dailyWheelEntity, 'dwheel-status', 'Come back tomorrow!');
      setText(dailyWheelEntity, 'btn-dwheel-spin', 'ALREADY SPUN');
    }
    setText(dailyWheelEntity, 'dwheel-prize', '');
    setText(dailyWheelEntity, 'dwheel-total', `Total won: ${save.dailyWheelTotal}`);
    setText(dailyWheelEntity, 'dwheel-spins', `Spins: ${save.dailyWheelSpins}`);
  }

  function collectDailyWheel() {
    state = 'title';
    updateHUD();
  }

  // ─────────────── SPIN HISTORY PANEL ───────────────

  function updateHistoryPanel() {
    for (let i = 0; i < 10; i++) {
      if (i < save.spinHistory.length) {
        const h = save.spinHistory[i];
        const winText = h.win > 0 ? `+${h.win.toFixed(2)}` : 'miss';
        setText(historyEntity, `hist-${i}`, `${h.syms} | ${winText} | bet ${h.bet.toFixed(2)} | ${h.machine}`);
      } else {
        setText(historyEntity, `hist-${i}`, '-');
      }
    }
    // Overall stats
    const recent = save.spinHistory.slice(0, 20);
    const wins = recent.filter(h => h.win > 0).length;
    const totalWon = recent.reduce((s, h) => s + h.win, 0);
    const totalBet = recent.reduce((s, h) => s + h.bet, 0);
    setText(historyEntity, 'hist-summary', `Recent: ${wins}/${recent.length} wins | Won: ${totalWon.toFixed(2)} | Bet: ${totalBet.toFixed(2)}`);
  }

  // ─────────────── BONUS WHEEL LOGIC ───────────────

  function spinBonusWheel() {
    if (bonusWheelSpinning) return;
    bonusWheelSpinning = true;
    bonusWheelSpeed = 8 + Math.random() * 4;
    bonusWheelResult = -1;
    setText(bonusWheelEntity, 'wheel-status', 'Spinning...');
    setText(bonusWheelEntity, 'wheel-prize', '');
  }

  function resolveBonusWheel() {
    const segAngle = (Math.PI * 2) / 12;
    const normalAngle = ((bonusWheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segIdx = Math.floor(normalAngle / segAngle) % 12;
    bonusWheelResult = segIdx;
    const prizeMult = BONUS_WHEEL_PRIZES[segIdx];
    const prizeAmount = prizeMult * bonusWheelBet;
    
    save.credits += prizeAmount;
    save.totalCreditsWon += prizeAmount;
    save.peakCredits = Math.max(save.peakCredits, save.credits);
    save.totalBonusWheelWins += prizeAmount;
    save.bestBonusWheelWin = Math.max(save.bestBonusWheelWin, prizeAmount);
    
    audio.wheelResult();
    particles.burst(wheelGroup.position.x, wheelGroup.position.y, wheelGroup.position.z + 0.5, '#ffcc00', 25);
    
    setText(bonusWheelEntity, 'wheel-status', `Landed on ${prizeMult}x!`);
    setText(bonusWheelEntity, 'wheel-prize', `+${prizeAmount.toFixed(2)} CREDITS`);
    
    // Highlight winning segment
    for (let i = 0; i < 12; i++) {
      setText(bonusWheelEntity, `seg-${i}`, i === segIdx ? `>>> ${BONUS_WHEEL_PRIZES[i]}x <<<` : `${BONUS_WHEEL_PRIZES[i]}x`);
    }
    
    checkAchievements();
    updateHUD();
    saveSave(save);
  }

  function collectBonusWheel() {
    state = 'playing';
    wheelGroup.visible = false;
    bonusWheelSpinning = false;
    if (freeSpinsRemaining > 0) {
      setTimeout(() => spinReels(), 500);
    } else if (autoSpinRemaining > 0) {
      autoSpinRemaining--;
      save.autoSpinsCompleted++;
      setTimeout(() => spinReels(), 500);
    }
    updateHUD();
  }

  function updateBonusWheelPanel() {
    for (let i = 0; i < 12; i++) {
      setText(bonusWheelEntity, `seg-${i}`, `${BONUS_WHEEL_PRIZES[i]}x`);
    }
    setText(bonusWheelEntity, 'wheel-status', 'Press SPIN to spin the wheel!');
    setText(bonusWheelEntity, 'wheel-prize', '');
  }

  // ─────────────── DAILY CHALLENGES ───────────────

  function checkDailyChallenges() {
    if (save.dailyLastDate !== todayStr()) return;
    const snap = save.dailyStartSnapshot;
    if (snap.length < 6) return;
    
    let allDone = true;
    for (let i = 0; i < 3; i++) {
      if (save.dailyClaimed[i]) continue;
      const ch = dailyChallenges[i];
      const tmpl = DAILY_TEMPLATES[ch.templateIdx];
      const progress = tmpl.getProgress(save, snap[ch.templateIdx < snap.length ? ch.templateIdx : 0]);
      if (progress >= ch.target) {
        save.dailyClaimed[i] = true;
        save.credits += ch.reward;
        save.dailyCompleted++;
        audio.achievement();
        showToast(`Daily done: +${ch.reward} credits!`);
      } else {
        allDone = false;
      }
    }
    
    if (allDone && save.dailyClaimed.every(c => c)) {
      // Bonus for completing all 3
      const bonus = 250;
      save.credits += bonus;
      save.dailySweeps++;
      showToast(`All dailies done! +${bonus} bonus!`);
    }
  }

  function updateDailyPanel() {
    setText(dailyEntity, 'daily-date', todayStr());
    const snap = save.dailyStartSnapshot;
    for (let i = 0; i < 3; i++) {
      const ch = dailyChallenges[i];
      const tmpl = DAILY_TEMPLATES[ch.templateIdx];
      const progress = snap.length >= 6 ? Math.min(ch.target, tmpl.getProgress(save, snap[ch.templateIdx < snap.length ? ch.templateIdx : 0])) : 0;
      const done = save.dailyClaimed[i];
      setText(dailyEntity, `ch-text-${i}`, ch.text);
      setText(dailyEntity, `ch-prog-${i}`, done ? 'DONE' : `${Math.max(0, Math.floor(progress))}/${ch.target}`);
      setText(dailyEntity, `ch-reward-${i}`, `+${ch.reward}`);
    }
    const allDone = save.dailyClaimed.every(c => c);
    setText(dailyEntity, 'daily-bonus', allDone ? 'All complete! Bonus claimed!' : 'Complete all 3 for +250 bonus!');
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
    setText(hudEntity, 'jackpot', `JP: G${save.jpGrand.toFixed(0)} M${save.jpMajor.toFixed(0)} m${save.jpMinor.toFixed(0)} n${save.jpMini.toFixed(0)}`);
    setText(hudEntity, 'level', `Lv.${save.level}`);
    // Prestige badge
    if (save.prestigeLevel > 0) {
      setText(hudEntity, 'prestige-badge', `[${PRESTIGE_TIERS[save.prestigeLevel].name}]`);
    } else {
      setText(hudEntity, 'prestige-badge', '');
    }
    const freeText = freeSpinsRemaining > 0 ? `FREE: ${freeSpinsRemaining}` : '';
    const megaText = megaSpinsRemaining > 0 ? `MEGA: ${megaSpinsRemaining} (${megaSpinMultiplier}x)` : '';
    setText(hudEntity, 'freespins', freeText || megaText);
    setText(hudEntity, 'autospin', autoSpinRemaining > 0 ? `AUTO: ${autoSpinRemaining}` : '');
    // Streak info
    const streakParts: string[] = [];
    if (currentStreakMult > 1) streakParts.push(`Streak ${currentStreakMult}x`);
    if (linkedReelsActive) streakParts.push(`Linked ${linkedReels.length} reels`);
    setText(hudEntity, 'streak-info', streakParts.join(' | '));
  }

  function updateGamblePanel() {
    setText(gambleEntity, 'gamble-amount', `Win: ${gambleWinAmount.toFixed(2)}`);
    setText(gambleEntity, 'gamble-streak', `Streak: ${currentGambleStreak}`);
  }

  function updateWinCelebration() {
    const tierLabels = { normal: 'WIN!', big: 'BIG WIN!', mega: 'MEGA WIN!', ultra: 'ULTRA WIN!' };
    setText(winCelebrationEntity, 'win-tier', tierLabels[winTier]);
    setText(winCelebrationEntity, 'win-total', lastWinAmount.toFixed(2));
    const bet = getBet();
    setText(winCelebrationEntity, 'win-multiplier', `${(lastWinAmount / bet).toFixed(1)}x bet`);
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

  function collectAfterWin() {
    cascadeLevel = 0;
    cascadeTotal = 0;
    cascading = false;
    cascadePhase = 'idle';
    if (freeSpinsRemaining > 0) {
      setTimeout(() => spinReels(), quickSpinMode ? 300 : 500);
    } else if (megaSpinsRemaining > 0) {
      megaSpinsRemaining--;
      setTimeout(() => spinReels(), quickSpinMode ? 300 : 600);
    } else if (autoSpinRemaining > 0) {
      autoSpinRemaining--;
      save.autoSpinsCompleted++;
      setTimeout(() => spinReels(), quickSpinMode ? 300 : 500);
    } else {
      megaSpinMultiplier = 1;
    }
    paylineIndicators.forEach(dot => {
      (dot.material as MeshBasicMaterial).color.set(0x444466);
      (dot.material as MeshBasicMaterial).opacity = 0.5;
    });
    lastWinAmount = 0;
    gambleWinAmount = 0;
    updateHUD();
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

  const panelConfigs = [
    { name: 'title', config: './ui/title.json', follower: false },
    { name: 'hud', config: './ui/hud.json', follower: true },
    { name: 'pause', config: './ui/pause.json', follower: false },
    { name: 'settings', config: './ui/settings.json', follower: false },
    { name: 'achvlist', config: './ui/achvlist.json', follower: false },
    { name: 'stats', config: './ui/stats.json', follower: false },
    { name: 'help', config: './ui/help.json', follower: false },
    { name: 'leaderboard', config: './ui/leaderboard.json', follower: false },
    { name: 'toast', config: './ui/toast.json', follower: true },
    { name: 'gamble', config: './ui/gamble.json', follower: false },
    { name: 'paytable', config: './ui/paytable.json', follower: false },
    { name: 'bonuswheel', config: './ui/bonuswheel.json', follower: false },
    { name: 'machines', config: './ui/machines.json', follower: false },
    { name: 'daily', config: './ui/daily.json', follower: false },
    { name: 'wincelebration', config: './ui/wincelebration.json', follower: true },
    { name: 'jackpots', config: './ui/jackpots.json', follower: false },
    { name: 'buybonus', config: './ui/buybonus.json', follower: false },
    { name: 'tumble', config: './ui/tumble.json', follower: true },
    { name: 'pickbonus', config: './ui/pickbonus.json', follower: false },
    { name: 'tournament', config: './ui/tournament.json', follower: false },
    { name: 'vip', config: './ui/vip.json', follower: false },
    { name: 'history', config: './ui/history.json', follower: false },
    { name: 'dailywheel', config: './ui/dailywheel.json', follower: false },
    { name: 'autoconfig', config: './ui/autoconfig.json', follower: false },
    { name: 'prestige', config: './ui/prestige.json', follower: false },
  ];

  const panelEntities: Record<string, any> = {};
  for (const pc of panelConfigs) {
    const entity = world.createEntity();
    entity.addComponent(PanelUI, { config: pc.config });
    if (pc.follower) {
      entity.addComponent(Follower, {});
      const fv = entity.getVectorView(Follower, 'offsetPosition');
      if (pc.name === 'wincelebration') {
        fv[0] = 0; fv[1] = 0.1; fv[2] = -1.0;
      } else if (pc.name === 'tumble') {
        fv[0] = 0.4; fv[1] = 0.15; fv[2] = -1.1;
      } else {
        fv[0] = 0; fv[1] = -0.25; fv[2] = -1.2;
      }
    } else {
      entity.addComponent(ScreenSpace, {});
    }
    panelEntities[pc.name] = entity;
  }

  const titleEntity = panelEntities['title'];
  const hudEntity = panelEntities['hud'];
  const pauseEntity = panelEntities['pause'];
  const settingsEntity = panelEntities['settings'];
  const achievementsEntity = panelEntities['achvlist'];
  const statsEntity = panelEntities['stats'];
  const helpEntity = panelEntities['help'];
  const leaderboardEntity = panelEntities['leaderboard'];
  const toastEntity = panelEntities['toast'];
  const gambleEntity = panelEntities['gamble'];
  const paytableEntity = panelEntities['paytable'];
  const bonusWheelEntity = panelEntities['bonuswheel'];
  const machinesEntity = panelEntities['machines'];
  const dailyEntity = panelEntities['daily'];
  const winCelebrationEntity = panelEntities['wincelebration'];
  const jackpotsEntity = panelEntities['jackpots'];
  const buyBonusEntity = panelEntities['buybonus'];
  const tumbleEntity = panelEntities['tumble'];
  const pickBonusEntity = panelEntities['pickbonus'];
  const tournamentEntity = panelEntities['tournament'];
  const vipEntity = panelEntities['vip'];
  const historyEntity = panelEntities['history'];
  const dailyWheelEntity = panelEntities['dailywheel'];
  const autoconfigEntity = panelEntities['autoconfig'];
  const prestigeEntity = panelEntities['prestige'];

  // ─────────────── UI SYSTEM ───────────────

  class GameUISystem extends createSystem({
    title: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
    hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
    pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
    settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
    achvlist: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achvlist.json')] },
    stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
    help: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
    leaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
    toast: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
    gamble: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gamble.json')] },
    paytable: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/paytable.json')] },
    bonuswheel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/bonuswheel.json')] },
    machines: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/machines.json')] },
    daily: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/daily.json')] },
    wincelebration: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/wincelebration.json')] },
    jackpots: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/jackpots.json')] },
    buybonus: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/buybonus.json')] },
    tumble: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tumble.json')] },
    pickbonus: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pickbonus.json')] },
    tournament: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tournament.json')] },
    vip: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/vip.json')] },
    history: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/history.json')] },
    dailywheel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/dailywheel.json')] },
    autoconfig: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/autoconfig.json')] },
    prestige: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/prestige.json')] },
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
        wire('btn-buybonus', () => { state = 'buy_bonus'; updateBuyBonusPanel(); });
        wire('btn-leaderboard', () => { state = 'leaderboard'; updateLeaderboard(); });
        wire('btn-tournament', () => { state = 'tournament'; updateTournamentPanel(); });
        wire('btn-vip', () => { state = 'vip'; updateVipPanel(); });
        wire('btn-history', () => { state = 'history'; updateHistoryPanel(); });
        wire('btn-dailywheel', () => { state = 'daily_wheel'; updateDailyWheelPanel(); });
        wire('btn-autoconfig', () => { state = 'autoconfig'; updateAutoConfigPanel(); });
        wire('btn-prestige', () => { state = 'prestige'; updatePrestigePanel(); });
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
        wire('btn-auto5', () => { autoSpinRemaining = 5; save.autoSessionStartCredits = save.credits; saveSave(save); spinReels(); });
        wire('btn-auto25', () => { autoSpinRemaining = 25; save.autoSessionStartCredits = save.credits; saveSave(save); spinReels(); });
        wire('btn-auto-stop', () => { autoSpinRemaining = 0; updateHUD(); });
        wire('btn-quick', () => {
          quickSpinMode = !quickSpinMode;
          save.quickSpin = quickSpinMode;
          saveSave(save);
          showToast(quickSpinMode ? 'Quick Spin ON' : 'Quick Spin OFF');
          setText(hudEntity, 'btn-quick', quickSpinMode ? 'QUICK*' : 'QUICK');
        });
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
      this.queries.achvlist.subscribe('qualify', (entity: any) => {
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

      // Bonus Wheel
      this.queries.bonuswheel.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-wheel-spin', () => { spinBonusWheel(); });
        wire('btn-wheel-collect', () => { if (bonusWheelResult >= 0) collectBonusWheel(); });
      });

      // Machines
      this.queries.machines.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        for (let i = 0; i < 5; i++) {
          const idx = i;
          (doc.getElementById(`btn-m-${idx}`) as UIKit.Text | undefined)?.addEventListener('click', () => {
            audio.click();
            if (save.level >= MACHINES[idx].minLevel) {
              save.currentMachine = idx;
              regenerateReels();
              saveSave(save);
              updateMachinesPanel();
              showToast(`Machine: ${MACHINES[idx].name}`);
            } else {
              showToast(`Unlock at level ${MACHINES[idx].minLevel}`);
            }
          });
        }
        (doc.getElementById('btn-machines-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Daily
      this.queries.daily.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-daily-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Win Celebration
      this.queries.wincelebration.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-win-collect', () => {
          state = 'playing';
          showingWin = false;
          collectAfterWin();
        });
        wire('btn-win-gamble', () => {
          if (gambleWinAmount > 0) startGamble();
        });
      });

      // Buy Bonus
      this.queries.buybonus.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-buy-freespins', () => {
          const cost = getBet() * 50;
          if (save.credits >= cost) {
            save.credits -= cost;
            save.buyBonusUsed++;
            freeSpinsRemaining += 10;
            freeSpinsTotal += 10;
            save.freeSpinsTriggered++;
            state = 'playing';
            showToast('Bought 10 Free Spins!');
            updateHUD();
            saveSave(save);
            setTimeout(() => spinReels(), 500);
          } else {
            setText(buyBonusEntity, 'buy-status', 'Not enough credits!');
          }
        });
        wire('btn-buy-bonuswheel', () => {
          const cost = getBet() * 30;
          if (save.credits >= cost) {
            save.credits -= cost;
            save.buyBonusUsed++;
            save.bonusWheelTriggered++;
            bonusWheelBet = getBet();
            state = 'bonus_wheel';
            wheelGroup.visible = true;
            bonusWheelAngle = 0;
            bonusWheelSpeed = 0;
            bonusWheelSpinning = false;
            bonusWheelResult = -1;
            updateBonusWheelPanel();
            showToast('Bought Bonus Wheel!');
            updateHUD();
            saveSave(save);
          } else {
            setText(buyBonusEntity, 'buy-status', 'Not enough credits!');
          }
        });
        wire('btn-buy-megaspins', () => {
          const cost = getBet() * 100;
          if (save.credits >= cost) {
            save.credits -= cost;
            save.buyBonusUsed++;
            save.megaSpinsTriggered++;
            megaSpinsRemaining = 5;
            megaSpinMultiplier = 3;
            state = 'playing';
            showToast('MEGA SPINS! 3x multiplier for 5 spins!');
            updateHUD();
            saveSave(save);
            setTimeout(() => spinReels(), 500);
          } else {
            setText(buyBonusEntity, 'buy-status', 'Not enough credits!');
          }
        });
        wire('btn-buy-back', () => { state = 'title'; });
      });

      // Pick Bonus
      this.queries.pickbonus.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        for (let i = 0; i < 12; i++) {
          const idx = i;
          (doc.getElementById(`pick-${idx}`) as UIKit.Text | undefined)?.addEventListener('click', () => {
            audio.click();
            if (state === 'pick_bonus') pickPrize(idx);
          });
        }
        (doc.getElementById('btn-pick-collect') as UIKit.Text | undefined)?.addEventListener('click', () => {
          audio.click();
          if (state === 'pick_bonus' && pickPicksRemaining <= 0) collectPickBonus();
        });
      });

      // Tournament
      this.queries.tournament.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-tourn-start', () => {
          if (!tournamentActive) startTournament();
        });
        wire('btn-tourn-back', () => { state = 'title'; });
      });

      // VIP
      this.queries.vip.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-vip-100', () => { redeemComp(100, 50); });
        wire('btn-vip-500', () => { redeemComp(500, 300); });
        wire('btn-vip-1000', () => { redeemComp(1000, 750); });
        wire('btn-vip-free', () => { redeemCompFreeSpins(); });
        wire('btn-vip-back', () => { state = 'title'; });
      });

      // History
      this.queries.history.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        (doc.getElementById('btn-hist-back') as UIKit.Text | undefined)?.addEventListener('click', () => { audio.click(); state = 'title'; });
      });

      // Daily Wheel
      this.queries.dailywheel.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-dwheel-spin', () => { if (canSpinDailyWheel()) spinDailyWheel(); });
        wire('btn-dwheel-collect', () => { if (dailyWheelResult >= 0) collectDailyWheel(); });
        wire('btn-dwheel-back', () => { state = 'title'; });
      });

      // Auto-play Config
      this.queries.autoconfig.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('ac-bonus', () => {
          save.autoConfig.stopOnBonus = !save.autoConfig.stopOnBonus;
          saveSave(save); updateAutoConfigPanel();
        });
        wire('ac-jackpot', () => {
          save.autoConfig.stopOnJackpot = !save.autoConfig.stopOnJackpot;
          saveSave(save); updateAutoConfigPanel();
        });
        wire('ac-freespins', () => {
          save.autoConfig.stopOnFreeSpins = !save.autoConfig.stopOnFreeSpins;
          saveSave(save); updateAutoConfigPanel();
        });
        wire('ac-loss-up', () => { save.autoConfig.lossLimit += 100; saveSave(save); updateAutoConfigPanel(); });
        wire('ac-loss-dn', () => { save.autoConfig.lossLimit = Math.max(0, save.autoConfig.lossLimit - 100); saveSave(save); updateAutoConfigPanel(); });
        wire('ac-win-up', () => { save.autoConfig.singleWinLimit += 100; saveSave(save); updateAutoConfigPanel(); });
        wire('ac-win-dn', () => { save.autoConfig.singleWinLimit = Math.max(0, save.autoConfig.singleWinLimit - 100); saveSave(save); updateAutoConfigPanel(); });
        wire('ac-bal-up', () => { save.autoConfig.balanceTarget += 500; saveSave(save); updateAutoConfigPanel(); });
        wire('ac-bal-dn', () => { save.autoConfig.balanceTarget = Math.max(0, save.autoConfig.balanceTarget - 500); saveSave(save); updateAutoConfigPanel(); });
        wire('btn-ac-back', () => { state = 'title'; });
      });

      // Prestige
      this.queries.prestige.subscribe('qualify', (entity: any) => {
        const doc = getDoc(entity);
        if (!doc) return;
        const wire = (id: string, fn: () => void) => {
          const el = doc.getElementById(id) as UIKit.Text | undefined;
          el?.addEventListener('click', () => { audio.click(); fn(); });
        };
        wire('btn-prestige', () => {
          if (canPrestige()) {
            doPrestige();
            updatePrestigePanel();
          } else {
            setText(prestigeEntity, 'pres-status', save.level < 25 ? `Need level 25 (current: ${save.level})` : 'Max prestige reached!');
          }
        });
        wire('btn-pres-back', () => { state = 'title'; });
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
    setText(statsEntity, 'stat-jackpots', `Jackpots: G${save.jpGrandWins} M${save.jpMajorWins} m${save.jpMinorWins} n${save.jpMiniWins}`);
    setText(statsEntity, 'stat-freespins', `Free Spins: ${save.freeSpinsTriggered} | Nudges: ${save.nudgesTriggered} (${save.nudgeWins} won)`);
    setText(statsEntity, 'stat-gambles', `Gambles Won/Lost: ${save.gambleWins}/${save.gambleLosses} | Mult Wilds: ${save.multiplierWildsHit}`);
    setText(statsEntity, 'stat-level', `Level: ${save.level} (${save.xp}/${100 + save.level * 50} XP) | Prestige: ${PRESTIGE_TIERS[save.prestigeLevel].name}`);
    setText(statsEntity, 'stat-peak', `Peak: ${save.peakCredits.toFixed(2)} | Linked: ${save.linkedReelsTriggered} (${save.linkedReelWins} won) | Streak Mult: ${save.bestStreakMultiplier}x`);
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
      if (sym.isWild) text += ' [WILD - Expands!]';
      if (sym.isScatter) text += ' [SCATTER]';
      if (sym.isBonus) text += ' [BONUS WHEEL]';
      if (sym.name === 'Mystery') text = 'Mystery: Reveals as random symbol!';
      setText(paytableEntity, `pay-${i}`, text);
    }
    setText(paytableEntity, 'pay-info', 'Cascading wins! Symbols drop in after wins. Wild expands. Mystery reveals.');
  }

  function updateMachinesPanel() {
    for (let i = 0; i < 5; i++) {
      const m = MACHINES[i];
      const locked = save.level < m.minLevel;
      setText(machinesEntity, `m-name-${i}`, locked ? `[Lv.${m.minLevel}] ${m.name}` : m.name);
      setText(machinesEntity, `m-info-${i}`, locked ? `Unlock at level ${m.minLevel}` : `${m.volatility} - ${m.desc}`);
      setText(machinesEntity, `btn-m-${i}`, i === save.currentMachine ? 'ACTIVE' : (locked ? 'LOCKED' : 'SELECT'));
    }
  }

  function updateJackpotPanel() {
    setText(jackpotsEntity, 'jp-grand-val', save.jpGrand.toFixed(2));
    setText(jackpotsEntity, 'jp-major-val', save.jpMajor.toFixed(2));
    setText(jackpotsEntity, 'jp-minor-val', save.jpMinor.toFixed(2));
    setText(jackpotsEntity, 'jp-mini-val', save.jpMini.toFixed(2));
    if (save.lastJackpotType) {
      setText(jackpotsEntity, 'jp-last-hit', `Last: ${save.lastJackpotType} - ${save.lastJackpotAmount.toFixed(2)}`);
    }
  }

  function updateBuyBonusPanel() {
    const bet = getBet();
    setText(buyBonusEntity, 'buy-fs-cost', `${(bet * 50).toFixed(2)} credits`);
    setText(buyBonusEntity, 'buy-bw-cost', `${(bet * 30).toFixed(2)} credits`);
    setText(buyBonusEntity, 'buy-ms-cost', `${(bet * 100).toFixed(2)} credits`);
    setText(buyBonusEntity, 'buy-status', '');
  }

  function updateTumblePanel() {
    const mult = 1 + cascadeLevel * 0.5;
    setText(tumbleEntity, 'tumble-level', `x${mult.toFixed(1)}`);
    setText(tumbleEntity, 'tumble-chain', `${cascadeLevel}`);
    setText(tumbleEntity, 'tumble-total', cascadeTotal.toFixed(2));
  }

  function updateAutoConfigPanel() {
    const cfg = save.autoConfig;
    setText(autoconfigEntity, 'ac-bonus', cfg.stopOnBonus ? 'ON' : 'OFF');
    setText(autoconfigEntity, 'ac-jackpot', cfg.stopOnJackpot ? 'ON' : 'OFF');
    setText(autoconfigEntity, 'ac-freespins', cfg.stopOnFreeSpins ? 'ON' : 'OFF');
    setText(autoconfigEntity, 'ac-loss-val', cfg.lossLimit > 0 ? `${cfg.lossLimit}` : 'OFF');
    setText(autoconfigEntity, 'ac-win-val', cfg.singleWinLimit > 0 ? `${cfg.singleWinLimit}` : 'OFF');
    setText(autoconfigEntity, 'ac-bal-val', cfg.balanceTarget > 0 ? `${cfg.balanceTarget}` : 'OFF');
    setText(autoconfigEntity, 'ac-status', '');
  }

  function updatePrestigePanel() {
    const tier = PRESTIGE_TIERS[save.prestigeLevel];
    setText(prestigeEntity, 'pres-current', `Current: ${tier.name}`);
    setText(prestigeEntity, 'pres-bonus', `Payout Bonus: +${tier.payoutBonus}%`);
    setText(prestigeEntity, 'pres-xp', `XP Bonus: +${tier.xpBonus} per spin`);
    setText(prestigeEntity, 'pres-total', `Total Prestiges: ${save.totalPrestiges}`);
    if (canPrestige()) {
      const nextTier = PRESTIGE_TIERS[save.prestigeLevel + 1];
      setText(prestigeEntity, 'pres-next', `Next: ${nextTier.name} (+${nextTier.payoutBonus}% payouts)`);
      setText(prestigeEntity, 'btn-prestige', 'PRESTIGE NOW');
    } else if (save.prestigeLevel >= PRESTIGE_TIERS.length - 1) {
      setText(prestigeEntity, 'pres-next', 'Maximum prestige reached!');
      setText(prestigeEntity, 'btn-prestige', 'MAX PRESTIGE');
    } else {
      setText(prestigeEntity, 'pres-next', `Reach Level 25 to prestige (current: ${save.level})`);
      setText(prestigeEntity, 'btn-prestige', `LOCKED (Lv.${save.level}/25)`);
    }
    setText(prestigeEntity, 'pres-status', '');
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

      // Bonus wheel spinning
      if (bonusWheelSpinning && state === 'bonus_wheel') {
        bonusWheelAngle += bonusWheelSpeed * dt;
        bonusWheelSpeed *= 0.985;
        
        // Tick sound
        const segAngle = (Math.PI * 2) / 12;
        if (Math.floor(bonusWheelAngle / segAngle) !== Math.floor((bonusWheelAngle - bonusWheelSpeed * dt) / segAngle)) {
          audio.wheelTick();
        }
        
        // Rotate wheel segments visually
        wheelDisc.rotation.z = bonusWheelAngle;
        
        if (bonusWheelSpeed < 0.15) {
          bonusWheelSpinning = false;
          resolveBonusWheel();
        }
      }

      // Wheel light pulse when active
      if (wheelGroup.visible) {
        wheelLight.intensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
      }

      // Daily wheel spinning
      if (dailyWheelSpinning && state === 'daily_wheel') {
        dailyWheelAngle += dailyWheelSpeed * dt;
        dailyWheelSpeed *= 0.985;
        if (dailyWheelSpeed < 0.15) {
          dailyWheelSpinning = false;
          resolveDailyWheel();
        }
      }

      // Expanding wild animation
      if (expandingWildAnimating) {
        expandingWildTimer += dt;
        expandingWildReels.forEach(r => {
          for (let row = 0; row < ROWS; row++) {
            const mesh = symbolMeshes[r][row];
            if (mesh) {
              const flashVal = Math.sin(expandingWildTimer * 10) * 0.3 + 1.2;
              mesh.scale.setScalar(flashVal);
            }
          }
        });
        if (expandingWildTimer > 1.5) {
          expandingWildAnimating = false;
          expandingWildReels.forEach(r => {
            for (let row = 0; row < ROWS; row++) {
              symbolMeshes[r][row]?.scale.setScalar(1);
            }
          });
        }
      }

      // Win celebration timer
      if (state === 'win_celebration') {
        celebrationTimer += dt;
        // Continuous particle effects during celebration
        if (celebrationTimer < 3 && Math.random() < 0.1) {
          const colors = winTier === 'ultra' ? ['#ff00ff', '#00ffff', '#ffcc00'] :
                         winTier === 'mega' ? ['#ffcc00', '#ff00ff'] : ['#00ffff'];
          particles.burst(
            MACHINE_X + (Math.random() - 0.5) * 3,
            MACHINE_Y + Math.random() * 2,
            MACHINE_Z + 1,
            colors[Math.floor(Math.random() * colors.length)], 10
          );
        }
        // Auto-collect after 5 seconds during auto-spin or free spins
        if (celebrationTimer > 5 && (autoSpinRemaining > 0 || freeSpinsRemaining > 0)) {
          state = 'playing';
          showingWin = false;
          collectAfterWin();
        }
      }

      // Reel spinning animation
      if (spinning) {
        spinStartTime += dt;
        let allStopped = true;

        for (let r = 0; r < REELS; r++) {
          if (!reelSpinning[r]) continue;
          allStopped = false;

          const stopDelay = quickSpinMode ? (0.3 + r * 0.15) : (0.6 + r * 0.35);
          if (spinStartTime > stopDelay) {
            reelSpeeds[r] *= 0.92;
            if (reelSpeeds[r] < 0.5) {
              reelSpinning[r] = false;
              reelSpeeds[r] = 0;
              reelOffsets[r] = 0;
              audio.reelStop();

              for (let row = 0; row < ROWS; row++) {
                currentGrid[r][row] = targetGrid[r][row];
                updateSymbolMesh(r, row, currentGrid[r][row]);
              }
            }
          }

          if (reelSpinning[r]) {
            reelOffsets[r] += reelSpeeds[r] * dt;
            if (reelOffsets[r] > REEL_SPACING_Y) {
              reelOffsets[r] -= REEL_SPACING_Y;
              const randSym = Math.floor(Math.random() * SYMBOLS.length);
              updateSymbolMesh(r, 0, randSym);
              if (Math.random() < 0.3) audio.reelTick();
            }

            for (let row = 0; row < ROWS; row++) {
              const baseY = MACHINE_Y + 0.2 + ((ROWS - 1) / 2 - row) * REEL_SPACING_Y;
              symbolMeshes[r][row].position.y = baseY + reelOffsets[r];
            }
          } else {
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

      // Cascading reels animation
      if (cascading) {
        cascadeTimer += dt;
        if (cascadePhase === 'removing') {
          if (cascadeTimer > 0.4) {
            cascadeRemove();
            cascadePhase = 'dropping';
            cascadeTimer = 0;
          }
        } else if (cascadePhase === 'dropping') {
          if (cascadeTimer > 0.5) {
            cascadeDrop();
            cascadePhase = 'evaluating';
            cascadeTimer = 0;
            cascadeLevel++;
            save.bestCascadeChain = Math.max(save.bestCascadeChain, cascadeLevel);
            audio.reelStop();
            particles.burst(MACHINE_X, MACHINE_Y + 0.2, MACHINE_Z + 0.8, '#00ffff', 10);
          }
        } else if (cascadePhase === 'evaluating') {
          if (cascadeTimer > 0.3) {
            // Re-evaluate wins after cascade
            cascadePhase = 'idle';
            cascading = false;
            
            // Resolve mystery symbols that may have cascaded in
            resolveMysterySymbols();
            
            // Re-evaluate
            const oldWins = [...winningLines];
            const bet = getBet();
            const lineBet = COIN_VALUES[save.coinValueIdx];
            const machinePayMult = MACHINES[save.currentMachine].payMult;
            winningLines = [];
            let newWin = 0;
            
            // Check paylines again
            for (let lineIdx = 0; lineIdx < save.linesActive; lineIdx++) {
              const line = PAYLINES[lineIdx];
              let baseSym = -1;
              for (let r = 0; r < REELS; r++) {
                const sym = currentGrid[r][line[r]];
                if (!SYMBOLS[sym].isWild && !SYMBOLS[sym].isScatter && !SYMBOLS[sym].isBonus && SYMBOLS[sym].name !== 'Mystery') {
                  baseSym = sym;
                  break;
                }
              }
              if (baseSym === -1) continue;
              let matchCount = 0;
              for (let r = 0; r < REELS; r++) {
                const sym = currentGrid[r][line[r]];
                if (sym === baseSym || SYMBOLS[sym].isWild) matchCount++;
                else break;
              }
              if (matchCount >= 3) {
                const symDef = SYMBOLS[baseSym];
                let payout = 0;
                if (matchCount === 3) payout = symDef.pay3;
                else if (matchCount === 4) payout = symDef.pay4;
                else if (matchCount === 5) payout = symDef.pay5;
                payout *= lineBet * machinePayMult;
                payout *= (1 + cascadeLevel * 0.5);
                if (megaSpinMultiplier > 1) payout *= megaSpinMultiplier;
                winningLines.push({ line: lineIdx, symbols: matchCount, symbolIdx: baseSym, payout });
                newWin += payout;
              }
            }
            
            if (newWin > 0) {
              save.credits += newWin;
              save.totalCreditsWon += newWin;
              cascadeTotal += newWin;
              save.peakCredits = Math.max(save.peakCredits, save.credits);
              audio.smallWin();
              particles.burst(MACHINE_X, MACHINE_Y + 0.2, MACHINE_Z + 0.8, theme.accent, 15);
              const mult = 1 + cascadeLevel * 0.5;
              showToast(`CASCADE x${mult.toFixed(1)}! +${newWin.toFixed(2)}`);
              updateTumblePanel();
              // Continue cascading
              startCascade();
              updateHUD();
              saveSave(save);
            } else {
              // No more cascades, done
              save.bestCascadeWin = Math.max(save.bestCascadeWin, cascadeTotal);
              if (cascadeLevel > 0) {
                showToast(`Cascade complete! ${cascadeLevel} chains, ${cascadeTotal.toFixed(2)} total`);
              }
              cascadeLevel = 0;
              cascadeTotal = 0;
              
              // Continue with auto/free spins
              if (freeSpinsRemaining > 0) {
                setTimeout(() => spinReels(), quickSpinMode ? 400 : 800);
              } else if (megaSpinsRemaining > 0) {
                megaSpinsRemaining--;
                setTimeout(() => spinReels(), quickSpinMode ? 300 : 600);
              } else if (autoSpinRemaining > 0) {
                autoSpinRemaining--;
                save.autoSpinsCompleted++;
                setTimeout(() => spinReels(), quickSpinMode ? 300 : 500);
              }
              checkAchievements();
              saveSave(save);
            }
          }
        }
      }

      // Win display timer
      if (showingWin && state === 'showing_win') {
        winDisplayTimer += dt;
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

        if (winDisplayTimer > (quickSpinMode ? 2 : 4) && (autoSpinRemaining > 0 || freeSpinsRemaining > 0 || megaSpinsRemaining > 0)) {
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
      const bonusVisible = state === 'bonus_wheel';
      const machinesVisible = state === 'machines';
      const dailyVisible = state === 'daily';
      const winCelebVisible = state === 'win_celebration';
      const jackpotsVisible = state === 'jackpots' || (state === 'playing' && !spinning);
      const buyBonusVisible = state === 'buy_bonus';
      const tumbleVisible = cascading && cascadeLevel > 0;
      const pickBonusVisible = state === 'pick_bonus';
      const tournamentVisible = state === 'tournament';
      const vipVisible = state === 'vip';
      const historyVisible = state === 'history';
      const dailyWheelVisible = state === 'daily_wheel';
      const autoconfigVisible = state === 'autoconfig';
      const prestigeVisible = state === 'prestige';

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
      setEntityVisibility(bonusWheelEntity, bonusVisible);
      setEntityVisibility(machinesEntity, machinesVisible);
      setEntityVisibility(dailyEntity, dailyVisible);
      setEntityVisibility(winCelebrationEntity, winCelebVisible);
      setEntityVisibility(jackpotsEntity, jackpotsVisible);
      setEntityVisibility(buyBonusEntity, buyBonusVisible);
      setEntityVisibility(tumbleEntity, tumbleVisible);
      setEntityVisibility(pickBonusEntity, pickBonusVisible);
      setEntityVisibility(tournamentEntity, tournamentVisible);
      setEntityVisibility(vipEntity, vipVisible);
      setEntityVisibility(historyEntity, historyVisible);
      setEntityVisibility(dailyWheelEntity, dailyWheelVisible);
      setEntityVisibility(autoconfigEntity, autoconfigVisible);
      setEntityVisibility(prestigeEntity, prestigeVisible);
      setEntityVisibility(toastEntity, !!currentToast);

      // XR controller input
      const right = (world.input as any).xr?.gamepads?.right;
      if (right) {
        if (right.getButtonDown(InputComponent.Trigger)) {
          if (state === 'playing') spinReels();
          else if (state === 'bonus_wheel' && !bonusWheelSpinning) spinBonusWheel();
        }
        if (right.getButtonDown(InputComponent.B_Button)) {
          if (state === 'playing' || state === 'spinning') state = 'paused';
          else if (state === 'paused') { state = 'playing'; updateHUD(); }
        }
        if (right.getButtonDown(InputComponent.A_Button)) {
          if (state === 'playing' && holdReelsAvailable) triggerHoldRespin();
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
      else if (state === 'bonus_wheel' && !bonusWheelSpinning) spinBonusWheel();
    }
    if (e.code === 'Escape') {
      if (state === 'playing' || state === 'spinning') state = 'paused';
      else if (state === 'paused') { state = 'playing'; updateHUD(); }
      else if (state !== 'title') state = 'title';
    }
    if (e.code === 'KeyR') {
      if (state === 'showing_win') { showingWin = false; state = 'playing'; collectAfterWin(); }
      if (state === 'win_celebration') { state = 'playing'; showingWin = false; collectAfterWin(); }
    }
    if (e.code === 'KeyG') {
      if ((state === 'showing_win' || state === 'win_celebration') && gambleWinAmount > 0) startGamble();
    }
    if (e.code === 'KeyH') {
      if (state === 'playing' && holdReelsAvailable) triggerHoldRespin();
    }
    if (e.code === 'KeyM') {
      if (state === 'title') { state = 'machines'; updateMachinesPanel(); }
    }
    if (e.code === 'KeyD') {
      if (state === 'title') { state = 'daily'; updateDailyPanel(); }
    }
    if (e.code === 'KeyQ') {
      quickSpinMode = !quickSpinMode;
      save.quickSpin = quickSpinMode;
      saveSave(save);
      showToast(quickSpinMode ? 'Quick Spin ON' : 'Quick Spin OFF');
      setText(hudEntity, 'btn-quick', quickSpinMode ? 'QUICK*' : 'QUICK');
    }
    if (e.code === 'KeyB') {
      if (state === 'title') { state = 'buy_bonus'; updateBuyBonusPanel(); }
    }
    if (e.code === 'KeyJ') {
      if (state === 'playing') updateJackpotPanel();
    }
    if (e.code === 'KeyT') {
      if (state === 'title') { state = 'tournament'; updateTournamentPanel(); }
    }
    if (e.code === 'KeyV') {
      if (state === 'title') { state = 'vip'; updateVipPanel(); }
    }
    if (e.code === 'KeyI') {
      if (state === 'title') { state = 'history'; updateHistoryPanel(); }
    }
    if (e.code === 'KeyL') {
      if (state === 'title') { state = 'daily_wheel'; updateDailyWheelPanel(); }
    }
    if (e.code === 'KeyA') {
      if (state === 'title') { state = 'autoconfig'; updateAutoConfigPanel(); }
    }
    if (e.code === 'KeyP') {
      if (state === 'title') { state = 'prestige'; updatePrestigePanel(); }
    }
  });

  audio.setVolumes(save.masterVol, save.sfxVol, save.musicVol);
  quickSpinMode = save.quickSpin;
}

main();
