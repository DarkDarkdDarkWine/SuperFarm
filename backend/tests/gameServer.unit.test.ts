import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameServer } from '../src/server';
import { RoomManager } from '../src/core/RoomManager';
import { GameEngine } from '../src/core/GameEngine';
import type { AIDecisionResponse, FilteredGameState, GameState, PlayerState } from '../../shared/types/game';

class MockAIService {
  decision: AIDecisionResponse = {
    playerId: 'ai-1',
    actions: [],
    reasoning: 'mock',
    confidence: 1,
    thinkingTime: 0,
  };

  filterGameState(gameState: GameState, aiPlayerId: string): FilteredGameState {
    const player = gameState.players.find(entry => entry.id === aiPlayerId);
    if (!player) {
      throw new Error('AI player not found');
    }

    return {
      roomId: gameState.roomId,
      mode: gameState.mode,
      currentRound: gameState.currentRound,
      currentPlayerIndex: gameState.currentPlayerIndex,
      phase: gameState.phase,
      bank: { ...gameState.bank },
      myPlayer: {
        id: player.id,
        name: player.name,
        animals: { ...player.animals },
        protection: { ...player.protection },
      },
      opponents: [],
    };
  }

  async getDecision(): Promise<AIDecisionResponse> {
    return this.decision;
  }
}

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    name: 'Player 1',
    type: 'human',
    animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
    protection: { smallDog: 0, bigDog: 0 },
    isWinner: false,
    ...overrides,
  };
}

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'room-1',
    mode: 'classic',
    currentRound: 1,
    currentPlayerIndex: 0,
    phase: 'exchange',
    players: [createPlayer(), createPlayer({ id: 'player-2', name: 'Player 2' })],
    bank: { rabbit: 58, sheep: 24, pig: 20, cow: 12, horse: 6, smallDog: 4, bigDog: 2 },
    diceResult: [],
    history: [],
    ...overrides,
  };
}

describe('GameServer internals', () => {
  let httpServer: ReturnType<typeof createServer>;
  let roomManager: RoomManager;
  let aiService: MockAIService;
  let gameServer: GameServer;
  let emitSpy: ReturnType<typeof vi.fn>;
  let toSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    httpServer = createServer();
    roomManager = new RoomManager();
    aiService = new MockAIService();
    gameServer = new GameServer(httpServer, 'test-key', {
      roomManager,
      aiService,
      enableCleanupTask: false,
      aiTurnDelayMs: 0,
    });

    emitSpy = vi.fn();
    toSpy = vi.spyOn(gameServer.getIO(), 'to').mockReturnValue({ emit: emitSpy } as never);
  });

  afterEach(() => {
    toSpy.mockRestore();
    gameServer.close();
    httpServer.close();
    vi.restoreAllMocks();
  });

  it('rejects exchange and protection actions when the game state is missing or invalid', async () => {
    const callback = vi.fn();

    await (gameServer as any).handleExchange('missing-room', 'player-1', {
      type: 'exchange',
      from: 'rabbit',
      to: 'sheep',
      fromCount: 6,
      toCount: 1,
    }, callback);

    await (gameServer as any).handleBuyProtection('missing-room', 'player-1', {
      type: 'buy_protection',
      protection: 'smallDog',
    }, callback);

    await (gameServer as any).handleRollDice('missing-room', 'player-1', callback);

    expect(callback).toHaveBeenNthCalledWith(1, { success: false, error: '游戏状态错误' });
    expect(callback).toHaveBeenNthCalledWith(2, { success: false, error: '游戏状态错误' });
    expect(callback).toHaveBeenNthCalledWith(3, { success: false, error: '游戏状态错误' });
  });

  it('rejects dice rolls from the wrong player and emits fox attacks', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState({ roomId: room.id, diceResult: ['fox'] });
    roomManager.startGame(room.id, gameState);
    const callback = vi.fn();

    await (gameServer as any).handleRollDice(room.id, 'player-2', callback);
    expect(callback).toHaveBeenCalledWith({ success: false, error: '不是你的回合' });

    emitSpy.mockClear();
    await (gameServer as any).processAttacks(room.id, gameState);
    expect(emitSpy).toHaveBeenCalledWith('game:attack', expect.objectContaining({ type: 'fox' }));
  });

  it('rejects invalid exchange phases and can finish the game through exchange', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');

    const callback = vi.fn();
    const gameState = createGameState({ phase: 'rolling' });
    roomManager.startGame(room.id, gameState);

    await (gameServer as any).handleExchange(room.id, 'player-1', {
      type: 'exchange',
      from: 'rabbit',
      to: 'sheep',
      fromCount: 6,
      toCount: 1,
    }, callback);
    expect(callback).toHaveBeenCalledWith({ success: false, error: '当前不是交换阶段' });

    callback.mockReset();
    gameState.phase = 'exchange';
    gameState.players[0].animals = { rabbit: 1, sheep: 1, pig: 4, cow: 0, horse: 1 };
    gameState.bank = { ...gameState.bank, cow: 1 };

    await (gameServer as any).handleExchange(room.id, 'player-1', {
      type: 'exchange',
      from: 'pig',
      to: 'cow',
      fromCount: 3,
      toCount: 1,
    }, callback);

    expect(callback).toHaveBeenCalledWith({ success: true, winner: 'player-1' });
    expect(roomManager.getRoom(room.id)?.status).toBe('finished');
    expect(emitSpy).toHaveBeenCalledWith('game:victory', 'player-1');
    expect(emitSpy).toHaveBeenCalledWith('game:finished', expect.objectContaining({ phase: 'finished' }));
  });

  it('rejects invalid protection purchases from the active player', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState({ roomId: room.id });
    // smallDog now costs 1 sheep; player has sheep:0 → should reject
    gameState.players[0].animals.sheep = 0;
    roomManager.startGame(room.id, gameState);

    const callback = vi.fn();
    await (gameServer as any).handleBuyProtection(room.id, 'player-1', {
      type: 'buy_protection',
      protection: 'smallDog',
    }, callback);

    expect(callback).toHaveBeenCalledWith({ success: false, error: '需要1只羊购买小狗' });
  });

  it('rejects invalid protection buys and accepts valid ones', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState();
    // smallDog costs 1 sheep; give player-1 a sheep so the purchase succeeds
    gameState.players[0].animals.sheep = 1;
    roomManager.startGame(room.id, gameState);
    const callback = vi.fn();

    await (gameServer as any).handleBuyProtection(room.id, 'player-2', {
      type: 'buy_protection',
      protection: 'smallDog',
    }, callback);
    expect(callback).toHaveBeenCalledWith({ success: false, error: '不是你的回合' });

    callback.mockReset();
    await (gameServer as any).handleBuyProtection(room.id, 'player-1', {
      type: 'buy_protection',
      protection: 'smallDog',
    }, callback);
    expect(callback).toHaveBeenCalledWith({ success: true });
    expect(gameState.players[0].protection.smallDog).toBe(1);
    expect(gameState.players[0].animals.sheep).toBe(0); // sheep consumed
    expect(emitSpy).toHaveBeenCalledWith('game:state', gameState);
  });

  it('covers timeout resolution and finished-game flow during dice rolling', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState({ currentRound: 51 });
    roomManager.startGame(room.id, gameState);

    vi.spyOn(GameEngine, 'rollDice').mockReturnValue(['rabbit', 'rabbit']);
    vi.spyOn(GameEngine, 'resolveTie').mockReturnValue(gameState.players[1]);
    const callback = vi.fn();

    await (gameServer as any).handleRollDice(room.id, 'player-1', callback);

    expect(callback).toHaveBeenCalledWith({ success: true, winner: 'player-2' });
    expect(roomManager.getRoom(room.id)?.status).toBe('finished');
    expect(emitSpy).toHaveBeenCalledWith('game:finished', expect.objectContaining({ winner: 'player-2' }));
  });

  it('triggers AI auto-play for the next player and emits wolf attacks', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'human-1', 'Alice');
    roomManager.addAIPlayer(room.id, 'medium');
    const aiId = roomManager.getRoom(room.id)!.players[1].id;
    const gameState = createGameState({
      roomId: room.id,
      players: [
        createPlayer({ id: 'human-1', name: 'Alice', animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 } }),
        createPlayer({
          id: aiId,
          name: 'AI',
          type: 'ai',
          animals: { rabbit: 1, sheep: 2, pig: 1, cow: 1, horse: 0 },
        }),
      ],
      diceResult: ['wolf'],
    });
    roomManager.startGame(room.id, gameState);

    vi.spyOn(GameEngine, 'rollDice').mockReturnValue(['wolf', 'rabbit']);
    const executeAITurnSpy = vi.spyOn(gameServer as any, 'executeAITurn').mockResolvedValue(undefined);
    const callback = vi.fn();

    await (gameServer as any).handleRollDice(room.id, 'human-1', callback);

    expect(callback).toHaveBeenCalledWith({ success: true });
    expect(emitSpy).toHaveBeenCalledWith('game:attack', expect.objectContaining({ type: 'wolf' }));
    expect(executeAITurnSpy).toHaveBeenCalledWith(room.id, expect.objectContaining({ currentPlayerIndex: 1 }));

    executeAITurnSpy.mockRestore();
  });

  it('finishes the game when a dice roll completes the winning set', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState({
      roomId: room.id,
      players: [
        createPlayer({
          id: 'player-1',
          name: 'Alice',
          animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 1 },
          protection: { smallDog: 1, bigDog: 0 },
        }),
        createPlayer({ id: 'player-2', name: 'Bob' }),
      ],
    });
    roomManager.startGame(room.id, gameState);

    vi.spyOn(GameEngine, 'rollDice').mockReturnValue(['rabbit', 'rabbit']);
    const callback = vi.fn();

    await (gameServer as any).handleRollDice(room.id, 'player-1', callback);

    expect(callback).toHaveBeenCalledWith({ success: true, winner: 'player-1' });
    expect(emitSpy).toHaveBeenCalledWith('game:victory', 'player-1');
    expect(emitSpy).toHaveBeenCalledWith('game:finished', expect.objectContaining({ winner: 'player-1' }));
    expect(roomManager.getRoom(room.id)?.status).toBe('finished');
  });

  it('covers AI execution, action application, and fallback roll on AI errors', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'human-1', 'Alice');
    roomManager.addAIPlayer(room.id, 'hard');
    const roomRef = roomManager.getRoom(room.id)!;

    const aiId = roomRef.players[1].id;
    const gameState = createGameState({
      roomId: room.id,
      currentPlayerIndex: 1,
      players: [
        createPlayer({ id: 'human-1', name: 'Alice' }),
        createPlayer({
          id: aiId,
          name: 'AI',
          type: 'ai',
          // bigDog costs 1 cow, give AI a cow so the purchase succeeds
          animals: { rabbit: 6, sheep: 1, pig: 0, cow: 1, horse: 0 },
        }),
      ],
    });
    roomManager.startGame(room.id, gameState);

    aiService.decision = {
      playerId: aiId,
      actions: [
        { type: 'exchange', from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
        { type: 'buy_protection', protection: 'bigDog' },
      ],
      reasoning: 'Act',
      confidence: 1,
      thinkingTime: 0,
    };

    const handleRollDiceSpy = vi.spyOn(gameServer as any, 'handleRollDice').mockResolvedValue(undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await (gameServer as any).executeAITurn(room.id, gameState);

    expect(emitSpy).toHaveBeenCalledWith('ai:thinking', aiId);
    expect(emitSpy).toHaveBeenCalledWith('ai:decision', aiId, aiService.decision.actions);
    expect(gameState.players[1].animals.rabbit).toBe(0);   // 6 rabbits exchanged
    expect(gameState.players[1].animals.sheep).toBe(2);    // 1 original + 1 from exchange
    expect(gameState.players[1].animals.cow).toBe(0);      // 1 cow consumed for bigDog
    expect(gameState.players[1].protection.bigDog).toBe(1);
    expect(handleRollDiceSpy).toHaveBeenCalledWith(room.id, aiId, expect.any(Function));

    handleRollDiceSpy.mockReset();
    vi.spyOn(aiService, 'getDecision').mockRejectedValueOnce(new Error('boom'));
    await (gameServer as any).executeAITurn(room.id, gameState);
    expect(handleRollDiceSpy).toHaveBeenCalledWith(room.id, aiId, expect.any(Function));

    handleRollDiceSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns early for non-AI players and manages cleanup timer lifecycle', async () => {
    const room = roomManager.createRoom({ name: 'Room', mode: 'classic', maxPlayers: 2 }, 'player-1', 'Alice');
    roomManager.joinRoom(room.id, 'player-2', 'Bob');
    const gameState = createGameState({ roomId: room.id, currentPlayerIndex: 0 });
    roomManager.startGame(room.id, gameState);

    const handleRollDiceSpy = vi.spyOn(gameServer as any, 'handleRollDice').mockResolvedValue(undefined);
    await (gameServer as any).executeAITurn(room.id, gameState);
    expect(handleRollDiceSpy).not.toHaveBeenCalled();
    handleRollDiceSpy.mockRestore();

    const timedServer = new GameServer(createServer(), 'test-key', {
      roomManager,
      aiService,
      cleanupIntervalMs: 10,
    });
    const cleanupSpy = vi.spyOn(roomManager, 'cleanup').mockReturnValue(1);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(cleanupSpy).toHaveBeenCalled();
    expect(timedServer.getIO()).toBeDefined();
    timedServer.close();
  });
});
