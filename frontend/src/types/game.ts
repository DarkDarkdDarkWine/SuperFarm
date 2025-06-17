// 游戏核心类型定义

export interface AnimalCollection {
  rabbit: number;
  sheep: number;
  pig: number;
  cow: number;
  horse: number;
}

export interface ProtectionCollection {
  smallDog: number;
  bigDog: number;
}

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  animals: AnimalCollection;
  protection: ProtectionCollection;
  isWinner: boolean;
}

export interface GameState {
  gameId: string;
  currentRound: number;
  currentPlayer: 'human' | 'ai';
  gamePhase: 'preparing' | 'rolling' | 'processing' | 'exchanging' | 'ai_thinking' | 'finished';
  winner: string | null;
  bank: AnimalCollection & ProtectionCollection;
  diceResult: DiceResult[];
  gameHistory: GameAction[];
}

export interface GameAction {
  type: 'roll' | 'breed' | 'exchange' | 'buy_protection' | 'attack';
  player: string;
  timestamp: number;
  details: any;
}

export interface ExchangeAction {
  from: keyof AnimalCollection;
  to: keyof AnimalCollection;
  fromCount: number;
  toCount: number;
}

export interface AIDecision {
  analysis: string;
  actions: AIAction[];
  reasoning: string;
  confidence: number;
}

export interface AIAction {
  type: 'breed' | 'exchange' | 'buy_protection';
  animal?: keyof AnimalCollection;
  count?: number;
  exchange?: ExchangeAction;
  protection?: 'smallDog' | 'bigDog';
}

export type DiceResult = 'rabbit' | 'sheep' | 'pig' | 'cow' | 'horse' | 'fox' | 'wolf';

export type GamePhase = 'preparing' | 'rolling' | 'processing' | 'exchanging' | 'ai_thinking' | 'finished';

export type AnimalType = keyof AnimalCollection;

export type ProtectionType = keyof ProtectionCollection;

// 游戏常量
export const GAME_CONSTANTS = {
  EXCHANGE_RATES: {
    rabbitToSheep: 6,
    sheepToPig: 2,
    pigToCow: 3,
    cowToHorse: 2
  },
  MAX_PROTECTION: {
    smallDog: 2,
    bigDog: 1
  },
  INITIAL_BANK: {
    rabbit: 60,
    sheep: 24,
    pig: 20,
    cow: 12,
    horse: 4,
    smallDog: 4,
    bigDog: 2
  },
  DICE_FACES: [
    'rabbit', 'rabbit', 'rabbit', 'rabbit', // 兔子4面
    'sheep', 'sheep', // 羊2面
    'pig', 'pig', // 猪2面
    'cow', // 牛1面
    'horse', // 马1面
    'fox', // 狐狸1面
    'wolf' // 狼1面
  ] as DiceResult[]
} as const; 