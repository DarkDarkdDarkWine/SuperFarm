import { useReducer, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  PlayerState,
  AnimalType,
  DiceResult,
  GameMode,
  AIDifficulty,
} from '@shared/types/game';
import type { PlayerConfig } from '../App';
import type { GameEvent, HistoryEntry } from './useDemoGame';

// ── Types ─────────────────────────────────────────────────────────────────

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type LocalPhase = 'connecting' | 'exchange' | 'rolling' | 'event' | 'finished';

// One complete turn's display data: the dice roll + all resulting events
type TurnEntry = {
  dice: DiceResult[];
  playerIndex: number;
  events: GameEvent[];
};

type LocalState = {
  localPhase: LocalPhase;
  serverState: GameState | null;
  pendingDice: DiceResult[] | null;
  currentEvent: GameEvent | null;
  eventQueue: GameEvent[];      // events for the currently-displayed dice roll
  pendingTurns: TurnEntry[];   // future turns buffered while current turn plays out
  displayingPlayerIndex: number; // whose farm to show during rolling/event
  history: HistoryEntry[];
  winner: PlayerState | null;
  errorMsg: string | null;
};

type LocalAction =
  | { type: 'GAME_STARTED'; gameState: GameState }
  | { type: 'DICE_ROLLED'; dice: DiceResult[]; playerIndex: number }
  | { type: 'QUEUE_EVENT'; event: GameEvent }
  | { type: 'SERVER_STATE'; gameState: GameState }
  | { type: 'ANIMATION_DONE' }
  | { type: 'DISMISS_EVENT' }
  | { type: 'GAME_FINISHED'; gameState: GameState }
  | { type: 'HISTORY_ADD'; text: string }
  | { type: 'ERROR'; msg: string };

const INITIAL_STATE: LocalState = {
  localPhase: 'connecting',
  serverState: null,
  pendingDice: null,
  currentEvent: null,
  eventQueue: [],
  pendingTurns: [],
  displayingPlayerIndex: 0,
  history: [],
  winner: null,
  errorMsg: null,
};

function popQueue(state: LocalState): LocalState {
  // Still events to show for the current dice roll
  if (state.eventQueue.length > 0) {
    return {
      ...state,
      localPhase: 'event',
      currentEvent: state.eventQueue[0],
      eventQueue: state.eventQueue.slice(1),
    };
  }
  // Current turn fully done — start next buffered turn if any
  if (state.pendingTurns.length > 0) {
    const [next, ...rest] = state.pendingTurns;
    return {
      ...state,
      localPhase: 'rolling',
      pendingDice: next.dice,
      currentEvent: null,
      eventQueue: next.events,
      pendingTurns: rest,
      displayingPlayerIndex: next.playerIndex,
    };
  }
  // All turns done
  return { ...state, localPhase: 'exchange', currentEvent: null };
}

function reducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case 'GAME_STARTED':
      return {
        ...state,
        localPhase: 'exchange',
        serverState: action.gameState,
        history: [{ text: '🌱 游戏开始！集齐5种动物就能赢！', ts: Date.now() }],
      };

    case 'DICE_ROLLED': {
      if (state.localPhase === 'exchange') {
        // Idle — start this turn immediately
        return {
          ...state,
          localPhase: 'rolling',
          pendingDice: action.dice,
          eventQueue: [],
          pendingTurns: [],
          displayingPlayerIndex: action.playerIndex,
        };
      }
      // Currently busy (rolling/event) — buffer this turn
      return {
        ...state,
        pendingTurns: [
          ...state.pendingTurns,
          { dice: action.dice, playerIndex: action.playerIndex, events: [] },
        ],
      };
    }

    case 'QUEUE_EVENT': {
      if (state.pendingTurns.length > 0) {
        // Append to the most recently buffered turn
        const turns = [...state.pendingTurns];
        turns[turns.length - 1] = {
          ...turns[turns.length - 1],
          events: [...turns[turns.length - 1].events, action.event],
        };
        return { ...state, pendingTurns: turns };
      }
      // Belongs to the current active turn
      return { ...state, eventQueue: [...state.eventQueue, action.event] };
    }

    case 'SERVER_STATE':
      return { ...state, serverState: action.gameState };

    case 'ANIMATION_DONE':
      return popQueue({ ...state, pendingDice: state.pendingDice });

    case 'DISMISS_EVENT':
      return popQueue(state);

    case 'GAME_FINISHED': {
      const winner = action.gameState.players.find(p => p.isWinner) ?? null;
      return {
        ...state,
        localPhase: 'finished',
        serverState: action.gameState,
        currentEvent: null,
        eventQueue: [],
        pendingTurns: [],
        winner,
        history: [
          ...state.history,
          { text: `🎉 ${winner?.name ?? '?'} 集齐了所有动物，赢了！`, ts: Date.now() },
        ],
      };
    }

    case 'HISTORY_ADD':
      return { ...state, history: [...state.history, { text: action.text, ts: Date.now() }] };

    case 'ERROR':
      return { ...state, errorMsg: action.msg };

    default:
      return state;
  }
}

// Exchange rates (same as useDemoGame)
const ALL_RATES = [
  { from: 'rabbit' as AnimalType, to: 'sheep' as AnimalType, fromCount: 6, toCount: 1 },
  { from: 'sheep' as AnimalType, to: 'pig' as AnimalType, fromCount: 2, toCount: 1 },
  { from: 'pig' as AnimalType, to: 'cow' as AnimalType, fromCount: 3, toCount: 1 },
  { from: 'cow' as AnimalType, to: 'horse' as AnimalType, fromCount: 2, toCount: 1 },
  { from: 'sheep' as AnimalType, to: 'rabbit' as AnimalType, fromCount: 1, toCount: 6 },
  { from: 'pig' as AnimalType, to: 'sheep' as AnimalType, fromCount: 1, toCount: 2 },
  { from: 'cow' as AnimalType, to: 'pig' as AnimalType, fromCount: 1, toCount: 3 },
  { from: 'horse' as AnimalType, to: 'cow' as AnimalType, fromCount: 1, toCount: 2 },
];

const EMPTY_PLAYER: PlayerState = {
  id: '', name: '...', type: 'human',
  animals: { rabbit: 0, sheep: 0, pig: 0, cow: 0, horse: 0 },
  protection: { smallDog: 0, bigDog: 0 },
  isWinner: false,
};

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSocketGame(configs: PlayerConfig[], mode: GameMode) {
  const [local, dispatch] = useReducer(reducer, INITIAL_STATE);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // socket.id → Socket, for routing actions to correct socket
  const socketMapRef = useRef<Map<string, TypedSocket>>(new Map());
  const roomIdRef = useRef<string | null>(null);
  const lastDiceRef = useRef<DiceResult[]>([]);
  const serverStateRef = useRef(local.serverState);
  serverStateRef.current = local.serverState;

  // ── Setup sockets & room ─────────────────────────────────────────────
  useEffect(() => {
    const humanConfigs = configs.filter(c => c.type === 'human');
    const aiConfigs = configs.filter(c => c.type === 'ai');

    // One socket per human player
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
    const sockets: TypedSocket[] = humanConfigs.map(() => io(backendUrl) as TypedSocket);

    // Game event listeners on primary socket (all sockets receive room broadcasts,
    // but we only need one set of listeners)
    const primary = sockets[0];

    primary.on('game:started', (gs) => {
      // Build socket ID → socket map now that all sockets are connected
      sockets.forEach(s => { if (s.id) socketMapRef.current.set(s.id, s); });
      dispatchRef.current({ type: 'GAME_STARTED', gameState: gs });
      dispatchRef.current({
        type: 'HISTORY_ADD',
        text: `🎮 房间 ${gs.roomId} 游戏开始！`,
      });
    });

    primary.on('game:dice_rolled', (dice) => {
      lastDiceRef.current = dice;
      const playerIndex = serverStateRef.current?.currentPlayerIndex ?? 0;
      dispatchRef.current({ type: 'DICE_ROLLED', dice, playerIndex });
    });

    primary.on('game:breeding', (results) => {
      // Only queue if breeding actually happened
      if (Object.keys(results).length > 0) {
        dispatchRef.current({
          type: 'QUEUE_EVENT',
          event: { kind: 'breeding', diceResult: lastDiceRef.current, results },
        });
      }
    });

    primary.on('game:attack', (attack) => {
      if (attack.type === 'fox') {
        dispatchRef.current({
          type: 'QUEUE_EVENT',
          event: {
            kind: 'fox',
            diceResult: lastDiceRef.current,
            blocked: attack.blocked,
            rabbitsLost: attack.rabbitsLost,
          },
        });
      } else {
        dispatchRef.current({
          type: 'QUEUE_EVENT',
          event: {
            kind: 'wolf',
            diceResult: lastDiceRef.current,
            blocked: attack.blocked,
            animalsLost: attack.animalsLost,
          },
        });
      }
    });

    primary.on('game:state', (gs) => {
      dispatchRef.current({ type: 'SERVER_STATE', gameState: gs });
    });

    primary.on('game:finished', (gs) => {
      dispatchRef.current({ type: 'GAME_FINISHED', gameState: gs });
    });

    primary.on('game:turn_change', (playerIndex) => {
      // Optionally add history entry — server state update handles actual change
      void playerIndex;
    });

    primary.on('error', (msg) => {
      dispatchRef.current({ type: 'ERROR', msg });
    });

    // ── Room creation sequence (runs after all sockets connect) ──────
    let connectedCount = 0;

    const onAllConnected = () => {
      primary.emit(
        'room:create',
        { name: '超级农场主', mode, maxPlayers: configs.length as 2 | 3 | 4 },
        humanConfigs[0].name,
        (ack) => {
          if (!ack.success) {
            dispatchRef.current({ type: 'ERROR', msg: ack.error });
            return;
          }
          const roomId = (ack as { success: true; room: { id: string } }).room.id;
          roomIdRef.current = roomId;

          // Join room with each additional human socket sequentially
          const joinHuman = (i: number) => {
            if (i >= sockets.length) {
              addAI(0);
              return;
            }
            sockets[i].emit('room:join', roomId, humanConfigs[i].name, (joinAck) => {
              if (!joinAck.success) {
                dispatchRef.current({ type: 'ERROR', msg: joinAck.error });
                return;
              }
              joinHuman(i + 1);
            });
          };

          const addAI = (j: number) => {
            if (j >= aiConfigs.length) {
              startGame();
              return;
            }
            primary.emit(
              'room:add_ai',
              roomId,
              (aiConfigs[j].difficulty ?? 'easy') as AIDifficulty,
              (aiAck) => {
                if (!aiAck.success) {
                  dispatchRef.current({ type: 'ERROR', msg: aiAck.error });
                  return;
                }
                addAI(j + 1);
              }
            );
          };

          const startGame = () => {
            primary.emit('room:start', roomId, (startAck) => {
              if (!startAck.success) {
                dispatchRef.current({ type: 'ERROR', msg: startAck.error });
              }
              // game:started broadcast drives state init
            });
          };

          joinHuman(1);
        }
      );
    };

    sockets.forEach(s => {
      s.on('connect', () => {
        connectedCount++;
        if (connectedCount === sockets.length) onAllConnected();
      });
    });

    return () => {
      sockets.forEach(s => s.disconnect());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dice animation timer ──────────────────────────────────────────────
  useEffect(() => {
    if (local.localPhase !== 'rolling') return;
    const timer = setTimeout(() => {
      dispatchRef.current({ type: 'ANIMATION_DONE' });
    }, 1900);
    return () => clearTimeout(timer);
  }, [local.localPhase, local.pendingDice]);

  // ── Derived values ────────────────────────────────────────────────────
  const ss = local.serverState;
  const currentPlayer = ss?.players[ss.currentPlayerIndex] ?? EMPTY_PLAYER;

  // During rolling/event, show the player who rolled — not the next player
  const farmPlayerIndex =
    (local.localPhase === 'rolling' || local.localPhase === 'event')
      ? local.displayingPlayerIndex
      : (ss?.currentPlayerIndex ?? 0);

  // Find which socket to use: current player's id is their socket.id
  const getCurrentSocket = (): TypedSocket | null =>
    socketMapRef.current.get(currentPlayer.id) ?? null;

  const isHumanTurn =
    local.localPhase === 'exchange' &&
    currentPlayer.type === 'human' &&
    !!getCurrentSocket();

  const canExchange = (from: AnimalType, to: AnimalType): boolean => {
    if (!isHumanTurn || !ss) return false;
    const rate = ALL_RATES.find(r => r.from === from && r.to === to);
    if (!rate) return false;
    return currentPlayer.animals[from] >= rate.fromCount && ss.bank[to] >= rate.toCount;
  };

  const canBuySmallDog =
    isHumanTurn && !!ss && currentPlayer.animals.sheep >= 1 && ss.bank.smallDog > 0;
  const canBuyBigDog =
    isHumanTurn && !!ss && currentPlayer.animals.cow >= 1 && ss.bank.bigDog > 0;

  // Map to the same state shape GamePage expects
  const state = {
    mode,
    players: ss?.players ?? [],
    bank: ss?.bank ?? { rabbit: 0, sheep: 0, pig: 0, cow: 0, horse: 0, smallDog: 0, bigDog: 0 },
    currentPlayerIndex: ss?.currentPlayerIndex ?? 0,
    currentRound: ss?.currentRound ?? 1,
    phase: local.localPhase === 'connecting' ? ('exchange' as const) : local.localPhase,
    pendingDice: local.pendingDice,
    currentEvent: local.currentEvent,
    history: local.history,
    winner: local.winner,
  };

  const actions = {
    exchange: (from: AnimalType, to: AnimalType) => {
      const socket = getCurrentSocket();
      const roomId = roomIdRef.current;
      if (!socket || !roomId) return;
      const rate = ALL_RATES.find(r => r.from === from && r.to === to);
      if (!rate) return;
      socket.emit(
        'game:exchange',
        roomId,
        { type: 'exchange', from, to, fromCount: rate.fromCount, toCount: rate.toCount },
        () => {}
      );
    },
    buySmallDog: () => {
      const socket = getCurrentSocket();
      const roomId = roomIdRef.current;
      if (!socket || !roomId) return;
      socket.emit('game:buy_protection', roomId, { type: 'buy_protection', protection: 'smallDog' }, () => {});
    },
    buyBigDog: () => {
      const socket = getCurrentSocket();
      const roomId = roomIdRef.current;
      if (!socket || !roomId) return;
      socket.emit('game:buy_protection', roomId, { type: 'buy_protection', protection: 'bigDog' }, () => {});
    },
    rollDice: () => {
      const socket = getCurrentSocket();
      const roomId = roomIdRef.current;
      if (!socket || !roomId) return;
      socket.emit('game:roll_dice', roomId, () => {});
    },
    dismissEvent: () => {
      dispatch({ type: 'DISMISS_EVENT' });
    },
  };

  return {
    state,
    currentPlayer,
    farmPlayerIndex,
    isHumanTurn,
    canExchange,
    canBuySmallDog,
    canBuyBigDog,
    actions,
    isConnecting: local.localPhase === 'connecting',
    connectionError: local.errorMsg,
  };
}
