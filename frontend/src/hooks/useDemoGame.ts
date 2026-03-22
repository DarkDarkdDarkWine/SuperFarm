import { useReducer, useEffect, useRef } from 'react';
import type {
  PlayerState,
  Bank,
  AnimalType,
  DiceResult,
  GameMode,
  BreedingResults,
} from '@shared/types/game';
import type { PlayerConfig } from '../App';

// Inlined from GAME_CONSTANTS to avoid rollup resolution issues with as-const re-exports
const DICE_A: DiceResult[] = [
  'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit',
  'sheep', 'sheep', 'sheep',
  'pig',
  'cow',
  'fox',
];
const DICE_B: DiceResult[] = [
  'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit',
  'sheep', 'sheep', 'sheep',
  'pig',
  'horse',
  'wolf',
];
const INITIAL_ANIMALS: Record<GameMode, Record<AnimalType, number>> = {
  classic: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
  casual:  { rabbit: 2, sheep: 0, pig: 0, cow: 0, horse: 0 },
};
const INITIAL_BANK: Bank = {
  rabbit: 60, sheep: 24, pig: 20, cow: 12, horse: 6, smallDog: 4, bigDog: 2,
};

// ── Types ─────────────────────────────────────────────────────────────────

export type GamePhase = 'exchange' | 'rolling' | 'event' | 'finished';

export type GameEvent =
  | { kind: 'breeding'; diceResult: DiceResult[]; results: BreedingResults }
  | { kind: 'nothing'; diceResult: DiceResult[] }
  | { kind: 'fox'; diceResult: DiceResult[]; blocked: boolean; rabbitsLost: number; breedingBefore?: BreedingResults }
  | { kind: 'wolf'; diceResult: DiceResult[]; blocked: boolean; animalsLost: Partial<Record<AnimalType, number>>; breedingBefore?: BreedingResults };

export type HistoryEntry = { text: string; ts: number };

type State = {
  mode: GameMode;
  players: PlayerState[];
  bank: Bank;
  currentPlayerIndex: number;
  currentRound: number;
  phase: GamePhase;
  pendingDice: DiceResult[] | null;
  currentEvent: GameEvent | null;
  history: HistoryEntry[];
  winner: PlayerState | null;
};

type Action =
  | { type: 'EXCHANGE'; from: AnimalType; to: AnimalType }
  | { type: 'BUY_SMALL_DOG' }
  | { type: 'BUY_BIG_DOG' }
  | { type: 'ROLL'; dice: DiceResult[] }
  | { type: 'PROCESS_DICE' }
  | { type: 'DISMISS_EVENT' }
  | { type: 'AI_PLAY'; dice: DiceResult[] };

// ── Constants ─────────────────────────────────────────────────────────────

export const ANIMAL_LABELS: Record<AnimalType, string> = {
  rabbit: '兔子', sheep: '绵羊', pig: '猪', cow: '奶牛', horse: '马',
};

export const DICE_EMOJI: Record<DiceResult, string> = {
  rabbit: '🐰', sheep: '🐑', pig: '🐷', cow: '🐄', horse: '🐴', fox: '🦊', wolf: '🐺',
};

export const UPGRADE_RATES = [
  { from: 'rabbit' as AnimalType, to: 'sheep' as AnimalType, fromCount: 6, toCount: 1 },
  { from: 'sheep' as AnimalType, to: 'pig' as AnimalType, fromCount: 2, toCount: 1 },
  { from: 'pig' as AnimalType, to: 'cow' as AnimalType, fromCount: 3, toCount: 1 },
  { from: 'cow' as AnimalType, to: 'horse' as AnimalType, fromCount: 2, toCount: 1 },
] as const;

export const DOWNGRADE_RATES = [
  { from: 'sheep' as AnimalType, to: 'rabbit' as AnimalType, fromCount: 1, toCount: 6 },
  { from: 'pig' as AnimalType, to: 'sheep' as AnimalType, fromCount: 1, toCount: 2 },
  { from: 'cow' as AnimalType, to: 'pig' as AnimalType, fromCount: 1, toCount: 3 },
  { from: 'horse' as AnimalType, to: 'cow' as AnimalType, fromCount: 1, toCount: 2 },
] as const;

const ALL_RATES = [
  ...UPGRADE_RATES,
  { from: 'sheep' as AnimalType, to: 'rabbit' as AnimalType, fromCount: 1, toCount: 6 },
  { from: 'pig' as AnimalType, to: 'sheep' as AnimalType, fromCount: 1, toCount: 2 },
  { from: 'cow' as AnimalType, to: 'pig' as AnimalType, fromCount: 1, toCount: 3 },
  { from: 'horse' as AnimalType, to: 'cow' as AnimalType, fromCount: 1, toCount: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function doRollDice(): DiceResult[] {
  return [
    DICE_A[Math.floor(Math.random() * DICE_A.length)],
    DICE_B[Math.floor(Math.random() * DICE_B.length)],
  ];
}

function checkVictory(player: PlayerState): boolean {
  return (['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).every(
    a => player.animals[a] >= 1
  );
}

function advanceTurn(state: State): State {
  const player = state.players[state.currentPlayerIndex];
  if (checkVictory(player)) {
    return {
      ...state,
      phase: 'finished',
      winner: { ...player, isWinner: true },
      players: state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, isWinner: true } : p
      ),
      history: [
        ...state.history,
        { text: `🎉 ${player.name} 集齐了所有动物，赢了！`, ts: Date.now() },
      ],
    };
  }
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    currentRound: nextIndex === 0 ? state.currentRound + 1 : state.currentRound,
    phase: 'exchange',
    pendingDice: null,
    currentEvent: null,
  };
}

function processDice(state: State): State {
  const dice = state.pendingDice!;
  const players = state.players.map(p => ({
    ...p, animals: { ...p.animals }, protection: { ...p.protection },
  }));
  const bank = { ...state.bank };
  const pi = state.currentPlayerIndex;
  const player = players[pi];
  const hasFox = dice.includes('fox');
  const hasWolf = dice.includes('wolf');

  // ── 阶段1：繁殖（规则要求先于灾难执行）──────────────────────────────
  const diceAnimals: Partial<Record<AnimalType, number>> = {};
  dice.forEach(face => {
    if (face in ANIMAL_LABELS) {
      diceAnimals[face as AnimalType] = (diceAnimals[face as AnimalType] ?? 0) + 1;
    }
  });
  const breedingResults: BreedingResults = {};
  (['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).forEach(a => {
    const cur = player.animals[a];
    const dc = diceAnimals[a] ?? 0;
    if (dc === 0 || (cur === 0 && dc < 2)) return;
    const gain = Math.min(Math.floor((cur + dc) / 2), bank[a]);
    if (gain > 0) {
      breedingResults[a] = { old: cur, new: cur + gain, change: gain };
      player.animals[a] = cur + gain;
      bank[a] -= gain;
    }
  });
  const hasBreeding = Object.keys(breedingResults).length > 0;
  const breedingHistoryEntry = hasBreeding ? [{
    text: `🌱 ${player.name} 繁殖了：${Object.entries(breedingResults).map(([a, r]) => `+${r!.change}只${ANIMAL_LABELS[a as AnimalType]}`).join('、')}`,
    ts: Date.now(),
  }] : [];

  // ── 阶段2：灾难（繁殖之后）───────────────────────────────────────────
  if (hasFox) {
    const blocked = player.protection.smallDog > 0;
    let rabbitsLost = 0;
    if (blocked) {
      player.protection.smallDog -= 1;
      bank.smallDog += 1;
    } else {
      rabbitsLost = Math.max(0, player.animals.rabbit - 1);
      player.animals.rabbit = Math.min(player.animals.rabbit, 1);
      bank.rabbit += rabbitsLost;
    }
    return {
      ...state, players, bank, phase: 'event',
      currentEvent: { kind: 'fox', diceResult: dice, blocked, rabbitsLost, breedingBefore: hasBreeding ? breedingResults : undefined },
      history: [...state.history, ...breedingHistoryEntry, {
        text: blocked
          ? `${player.name} 的小狗🐕 赶跑了狐狸！`
          : rabbitsLost > 0
            ? `🦊 狐狸偷走了 ${player.name} 的 ${rabbitsLost} 只兔子！`
            : `🦊 狐狸来了，但没兔子可偷！`,
        ts: Date.now(),
      }],
    };
  }

  if (hasWolf) {
    const blocked = player.protection.bigDog > 0;
    const animalsLost: Partial<Record<AnimalType, number>> = {};
    if (blocked) {
      player.protection.bigDog -= 1;
      bank.bigDog += 1;
    } else {
      (['sheep', 'pig', 'cow'] as AnimalType[]).forEach(a => {
        if (player.animals[a] > 0) {
          animalsLost[a] = player.animals[a];
          bank[a] += player.animals[a];
          player.animals[a] = 0;
        }
      });
    }
    const lostText = Object.entries(animalsLost).map(([a, n]) => `${n}只${ANIMAL_LABELS[a as AnimalType]}`).join('、');
    return {
      ...state, players, bank, phase: 'event',
      currentEvent: { kind: 'wolf', diceResult: dice, blocked, animalsLost, breedingBefore: hasBreeding ? breedingResults : undefined },
      history: [...state.history, ...breedingHistoryEntry, {
        text: blocked
          ? `${player.name} 的大狗🦮 赶跑了狼！`
          : lostText ? `🐺 狼吃掉了 ${player.name} 的 ${lostText}！` : `🐺 狼来了，但没什么可吃的！`,
        ts: Date.now(),
      }],
    };
  }

  // ── 无灾难 ────────────────────────────────────────────────────────────
  if (!hasBreeding) {
    const diceText = dice.map(d => DICE_EMOJI[d]).join(' ');
    return advanceTurn({
      ...state, players, bank,
      pendingDice: dice,
      history: [...state.history, { text: `${player.name} 掷出 ${diceText}，没有收获`, ts: Date.now() }],
    });
  }

  return {
    ...state, players, bank, phase: 'event',
    currentEvent: { kind: 'breeding', diceResult: dice, results: breedingResults },
    history: [...state.history, ...breedingHistoryEntry],
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  const pi = state.currentPlayerIndex;
  const player = state.players[pi];

  switch (action.type) {
    case 'EXCHANGE': {
      if (state.phase !== 'exchange') return state;
      const rate = ALL_RATES.find(r => r.from === action.from && r.to === action.to);
      if (!rate) return state;
      if (player.animals[action.from] < rate.fromCount) return state;
      if (state.bank[action.to] < rate.toCount) return state;
      const players = state.players.map((p, i) => i !== pi ? p : {
        ...p, animals: {
          ...p.animals,
          [action.from]: p.animals[action.from] - rate.fromCount,
          [action.to]: p.animals[action.to] + rate.toCount,
        },
      });
      const bank = {
        ...state.bank,
        [action.from]: state.bank[action.from] + rate.fromCount,
        [action.to]: state.bank[action.to] - rate.toCount,
      };
      return {
        ...state, players, bank,
        history: [...state.history, {
          text: `${player.name} 用 ${rate.fromCount}只${ANIMAL_LABELS[action.from]} 换了 ${rate.toCount}只${ANIMAL_LABELS[action.to]}`,
          ts: Date.now(),
        }],
      };
    }

    case 'BUY_SMALL_DOG': {
      if (state.phase !== 'exchange') return state;
      if (player.animals.sheep < 1 || state.bank.smallDog < 1) return state;
      const players = state.players.map((p, i) => i !== pi ? p : {
        ...p,
        animals: { ...p.animals, sheep: p.animals.sheep - 1 },
        protection: { ...p.protection, smallDog: p.protection.smallDog + 1 },
      });
      return {
        ...state, players,
        bank: { ...state.bank, sheep: state.bank.sheep + 1, smallDog: state.bank.smallDog - 1 },
        history: [...state.history, { text: `${player.name} 买了一只小狗🐕`, ts: Date.now() }],
      };
    }

    case 'BUY_BIG_DOG': {
      if (state.phase !== 'exchange') return state;
      if (player.animals.cow < 1 || state.bank.bigDog < 1) return state;
      const players = state.players.map((p, i) => i !== pi ? p : {
        ...p,
        animals: { ...p.animals, cow: p.animals.cow - 1 },
        protection: { ...p.protection, bigDog: p.protection.bigDog + 1 },
      });
      return {
        ...state, players,
        bank: { ...state.bank, cow: state.bank.cow + 1, bigDog: state.bank.bigDog - 1 },
        history: [...state.history, { text: `${player.name} 买了一只大狗🦮`, ts: Date.now() }],
      };
    }

    case 'ROLL': {
      if (state.phase !== 'exchange') return state;
      return {
        ...state,
        pendingDice: action.dice,
        phase: 'rolling',
        history: [...state.history, {
          text: `${player.name} 掷骰子...`,
          ts: Date.now(),
        }],
      };
    }

    case 'PROCESS_DICE': {
      if (state.phase !== 'rolling' || !state.pendingDice) return state;
      return processDice(state);
    }

    case 'DISMISS_EVENT': {
      if (state.phase !== 'event') return state;
      return advanceTurn(state);
    }

    case 'AI_PLAY': {
      // Try one beneficial upgrade exchange
      let newState = { ...state };
      for (const rate of UPGRADE_RATES) {
        const p = newState.players[pi];
        if (p.animals[rate.from] >= rate.fromCount && newState.bank[rate.to] >= rate.toCount) {
          newState = reducer(newState, { type: 'EXCHANGE', from: rate.from, to: rate.to });
          break;
        }
      }
      // Roll dice
      return {
        ...newState,
        pendingDice: action.dice,
        phase: 'rolling',
        history: [...newState.history, {
          text: `${newState.players[pi].name} 掷骰子...`,
          ts: Date.now(),
        }],
      };
    }

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────────

function buildInitialState(configs: PlayerConfig[], mode: GameMode): State {
  const initialAnimals = { ...INITIAL_ANIMALS[mode] };
  const bank = { ...INITIAL_BANK };
  const players: PlayerState[] = configs.map((c, i) => ({
    id: `p${i}`,
    name: c.name,
    type: c.type,
    animals: { ...initialAnimals },
    protection: { smallDog: 0, bigDog: 0 },
    isWinner: false,
  }));
  players.forEach(p => { bank.rabbit -= p.animals.rabbit; });
  return {
    mode, players, bank,
    currentPlayerIndex: 0,
    currentRound: 1,
    phase: 'exchange',
    pendingDice: null,
    currentEvent: null,
    history: [{ text: '🌱 游戏开始！集齐5种动物就能赢！', ts: Date.now() }],
    winner: null,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useDemoGame(configs: PlayerConfig[], mode: GameMode) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => buildInitialState(configs, mode)
  );

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // After rolling animation, process the dice
  useEffect(() => {
    if (state.phase !== 'rolling') return;
    const timer = setTimeout(() => dispatchRef.current({ type: 'PROCESS_DICE' }), 1900);
    return () => clearTimeout(timer);
  }, [state.phase, state.pendingDice]);

  // AI auto-play
  useEffect(() => {
    if (state.phase !== 'exchange') return;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.type !== 'ai') return;
    const timer = setTimeout(() => {
      dispatchRef.current({ type: 'AI_PLAY', dice: doRollDice() });
    }, 1400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentPlayerIndex]);

  const currentPlayer = state.players[state.currentPlayerIndex];

  const canExchange = (from: AnimalType, to: AnimalType): boolean => {
    if (state.phase !== 'exchange' || currentPlayer.type === 'ai') return false;
    const rate = ALL_RATES.find(r => r.from === from && r.to === to);
    if (!rate) return false;
    return currentPlayer.animals[from] >= rate.fromCount && state.bank[to] >= rate.toCount;
  };

  const isHumanTurn = state.phase === 'exchange' && currentPlayer.type === 'human';

  return {
    state,
    currentPlayer,
    isHumanTurn,
    canExchange,
    canBuySmallDog: isHumanTurn && currentPlayer.animals.sheep >= 1 && state.bank.smallDog > 0,
    canBuyBigDog: isHumanTurn && currentPlayer.animals.cow >= 1 && state.bank.bigDog > 0,
    actions: {
      exchange: (from: AnimalType, to: AnimalType) => dispatch({ type: 'EXCHANGE', from, to }),
      buySmallDog: () => dispatch({ type: 'BUY_SMALL_DOG' }),
      buyBigDog: () => dispatch({ type: 'BUY_BIG_DOG' }),
      rollDice: () => dispatch({ type: 'ROLL', dice: doRollDice() }),
      dismissEvent: () => dispatch({ type: 'DISMISS_EVENT' }),
    },
  };
}
