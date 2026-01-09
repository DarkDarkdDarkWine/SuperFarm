/**
 * 游戏状态管理 - Zustand
 */

import { create } from 'zustand';
import type {
  Room,
  GameState,
  Player,
  PlayerState,
  DiceResult,
} from '@shared/types/game';

interface GameStore {
  // 房间状态
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;

  // 游戏状态
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;

  // 当前玩家ID
  playerId: string | null;
  setPlayerId: (id: string | null) => void;

  // UI状态
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  // 动画状态
  diceAnimation: DiceResult[] | null;
  setDiceAnimation: (dice: DiceResult[] | null) => void;

  breedingAnimation: any | null;
  setBreedingAnimation: (animation: any | null) => void;

  attackAnimation: any | null;
  setAttackAnimation: (animation: any | null) => void;

  // AI状态
  aiThinking: string | null;
  setAIThinking: (playerId: string | null) => void;

  // 辅助方法
  getCurrentPlayer: () => PlayerState | null;
  getPlayerById: (id: string) => Player | null;
  isMyTurn: () => boolean;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // 初始状态
  currentRoom: null,
  gameState: null,
  playerId: null,
  isConnected: false,
  isLoading: false,
  error: null,
  diceAnimation: null,
  breedingAnimation: null,
  attackAnimation: null,
  aiThinking: null,

  // Setters
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setGameState: (state) => set({ gameState: state }),
  setPlayerId: (id) => set({ playerId: id }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setDiceAnimation: (dice) => set({ diceAnimation: dice }),
  setBreedingAnimation: (animation) => set({ breedingAnimation: animation }),
  setAttackAnimation: (animation) => set({ attackAnimation: animation }),
  setAIThinking: (playerId) => set({ aiThinking: playerId }),

  // 辅助方法
  getCurrentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  },

  getPlayerById: (id) => {
    const { currentRoom } = get();
    if (!currentRoom) return null;
    return currentRoom.players.find(p => p.id === id) || null;
  },

  isMyTurn: () => {
    const { gameState, playerId } = get();
    if (!gameState || !playerId) return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer.id === playerId;
  },

  reset: () =>
    set({
      currentRoom: null,
      gameState: null,
      error: null,
      diceAnimation: null,
      breedingAnimation: null,
      attackAnimation: null,
      aiThinking: null,
    }),
}));
