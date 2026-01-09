/**
 * 超级农场主 - 共享类型定义
 * 用于前后端类型共享
 */

// ==================== 基础类型 ====================

export type AnimalType = 'rabbit' | 'sheep' | 'pig' | 'cow' | 'horse';
export type ProtectionType = 'smallDog' | 'bigDog';
export type DiceResult = AnimalType | 'fox' | 'wolf';
export type GameMode = 'classic' | 'casual' | 'hard';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerType = 'human' | 'ai';

export type GamePhase =
  | 'waiting'       // 等待玩家准备
  | 'exchange'      // 交换阶段
  | 'rolling'       // 掷骰子
  | 'breeding'      // 繁殖计算
  | 'attacking'     // 攻击结算
  | 'victory_check' // 检查胜利
  | 'finished';     // 游戏结束

// ==================== 动物和防护 ====================

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

export interface Bank extends AnimalCollection, ProtectionCollection { }

// ==================== 玩家 ====================

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  difficulty?: AIDifficulty; // AI玩家专属
  socketId?: string;         // 人类玩家专属
  isReady: boolean;
  isConnected: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  type: PlayerType;
  animals: AnimalCollection;
  protection: ProtectionCollection;
  isWinner: boolean;
}

// ==================== 房间 ====================

export interface Room {
  id: string;
  name: string;
  mode: GameMode;
  maxPlayers: 2 | 3 | 4;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  gameState?: GameState;
}

export interface RoomConfig {
  name: string;
  mode: GameMode;
  maxPlayers: 2 | 3 | 4;
}

// ==================== 游戏状态 ====================

export interface GameState {
  roomId: string;
  mode: GameMode;
  currentRound: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  players: PlayerState[];
  bank: Bank;
  diceResult: DiceResult[];
  history: GameAction[];
  winner?: string;
}

// ==================== 游戏动作 ====================

export type GameActionType =
  | 'exchange'
  | 'buy_protection'
  | 'roll_dice'
  | 'breeding'
  | 'attack'
  | 'turn_end';

export interface GameAction {
  type: GameActionType;
  playerId: string;
  timestamp: number;
  details: any;
}

export interface ExchangeAction {
  type: 'exchange';
  from: AnimalType;
  to: AnimalType;
  fromCount: number;
  toCount: number;
}

export interface BuyProtectionAction {
  type: 'buy_protection';
  protection: ProtectionType;
}

export interface RollDiceAction {
  type: 'roll_dice';
}

export type PlayerAction = ExchangeAction | BuyProtectionAction | RollDiceAction;

// ==================== AI相关 ====================

export interface FilteredGameState {
  roomId: string;
  mode: GameMode;
  currentRound: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  bank: Bank;
  myPlayer: {
    id: string;
    name: string;
    animals: AnimalCollection;
    protection: ProtectionCollection;
  };
  opponents: Array<{
    id: string;
    name: string;
    animals: AnimalCollection;
    protection: ProtectionCollection;
  }>;
  lastDiceResult?: DiceResult[];
}

export interface AIDecisionRequest {
  playerId: string;
  gameView: FilteredGameState;
  availableActions: string[]; // 可执行的动作类型
  mode: GameMode;
  difficulty: AIDifficulty;
}

export interface AIDecisionResponse {
  playerId: string;
  actions: PlayerAction[];
  reasoning: string;
  confidence: number;
  thinkingTime: number;
}

// ==================== 验证结果 ====================

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ==================== 游戏常量 ====================

export const GAME_CONSTANTS = {
  // 交换比例
  EXCHANGE_RATES: {
    rabbitToSheep: 6,
    sheepToPig: 2,
    pigToCow: 3,
    cowToHorse: 2,
  },

  // 初始银行库存
  INITIAL_BANK: {
    rabbit: 60,
    sheep: 24,
    pig: 20,
    cow: 12,
    horse: 6,
    smallDog: 4,
    bigDog: 2,
  },

  // 骰子A配置（橙色骰）- per v2 rules
  DICE_A: [
    'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', // 6面
    'sheep', 'sheep',                                             // 2面
    'pig', 'pig',                                                 // 2面
    'horse',                                                      // 1面
    'fox',                                                        // 1面
  ] as DiceResult[],

  // 骰子B配置（蓝色骰）- per v2 rules
  DICE_B: [
    'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', // 6面
    'sheep', 'sheep', 'sheep',                                   // 3面
    'pig',                                                       // 1面
    'cow',                                                       // 1面
    'wolf',                                                      // 1面
  ] as DiceResult[],

  // 最大回合数
  MAX_ROUNDS: {
    classic: 50,
    casual: 30,
    hard: 60,
  },

  // 初始动物
  INITIAL_ANIMALS: {
    classic: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
    casual: { rabbit: 2, sheep: 0, pig: 0, cow: 0, horse: 0 },
    hard: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
  },
} as const;

// ==================== WebSocket事件 ====================

export interface SocketEvents {
  // 客户端 → 服务器
  'room:create': (config: RoomConfig) => void;
  'room:join': (roomId: string, playerName: string) => void;
  'room:leave': (roomId: string) => void;
  'room:add_ai': (roomId: string, difficulty: AIDifficulty) => void;
  'room:start': (roomId: string) => void;

  'game:exchange': (roomId: string, action: ExchangeAction) => void;
  'game:buy_protection': (roomId: string, action: BuyProtectionAction) => void;
  'game:roll_dice': (roomId: string) => void;
  'game:end_turn': (roomId: string) => void;

  // 服务器 → 客户端
  'room:created': (room: Room) => void;
  'room:joined': (room: Room) => void;
  'room:left': (room: Room) => void;
  'room:updated': (room: Room) => void;
  'game:started': (gameState: GameState) => void;

  'game:state': (gameState: GameState) => void;
  'game:phase_change': (phase: GamePhase) => void;
  'game:turn_change': (playerIndex: number) => void;

  'game:dice_rolled': (result: DiceResult[]) => void;
  'game:breeding': (results: any) => void;
  'game:attack': (results: any) => void;

  'game:victory': (winnerId: string) => void;
  'game:finished': (gameState: GameState) => void;

  'ai:thinking': (playerId: string) => void;
  'ai:decision': (playerId: string, actions: PlayerAction[]) => void;

  'error': (message: string) => void;
}
