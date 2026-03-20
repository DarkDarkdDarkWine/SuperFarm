import { createServer, type Server as HTTPServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import { GameServer } from '../src/server';
import type {
  AIDecisionResponse,
  FilteredGameState,
  GameState,
  Room,
  RoomConfig,
} from '../../shared/types/game';
import { GameEngine } from '../src/core/GameEngine';

interface CallbackResponse {
  success: boolean;
  error?: string;
  room?: Room;
  gameState?: GameState;
  winner?: string;
}

class FakeAIService {
  filterGameState(gameState: GameState, aiPlayerId: string): FilteredGameState {
    const aiPlayer = gameState.players.find(player => player.id === aiPlayerId);
    if (!aiPlayer) {
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
        id: aiPlayer.id,
        name: aiPlayer.name,
        animals: { ...aiPlayer.animals },
        protection: { ...aiPlayer.protection },
      },
      opponents: gameState.players
        .filter(player => player.id !== aiPlayerId)
        .map(player => ({
          id: player.id,
          name: player.name,
          animals: { ...player.animals },
          protection: { ...player.protection },
        })),
      lastDiceResult: gameState.diceResult.length > 0 ? [...gameState.diceResult] : undefined,
    };
  }

  async getDecision(): Promise<AIDecisionResponse> {
    return {
      playerId: 'ai',
      actions: [],
      reasoning: 'No-op for tests',
      confidence: 1,
      thinkingTime: 0,
    };
  }
}

describe('GameServer integration', () => {
  let httpServer: HTTPServer;
  let gameServer: GameServer;
  let port: number;
  let clients: Socket[];

  beforeEach(async () => {
    clients = [];
    httpServer = createServer();
    gameServer = new GameServer(httpServer, 'test-api-key', {
      aiService: new FakeAIService(),
      enableCleanupTask: false,
      aiTurnDelayMs: 0,
    });

    await new Promise<void>(resolve => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine test server port');
    }
    port = address.port;
  });

  afterEach(async () => {
    await Promise.all(clients.map(client => disconnectClient(client)));
    gameServer.close();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
    vi.restoreAllMocks();
  });

  async function connectClient(): Promise<Socket> {
    const client = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    clients.push(client);

    await new Promise<void>((resolve, reject) => {
      client.once('connect', () => resolve());
      client.once('connect_error', reject);
    });

    return client;
  }

  async function disconnectClient(client: Socket): Promise<void> {
    if (!client.connected) {
      client.close();
      return;
    }

    await new Promise<void>(resolve => {
      client.once('disconnect', () => resolve());
      client.disconnect();
    });
  }

  async function emitWithAck<T extends CallbackResponse>(
    client: Socket,
    event: string,
    ...args: unknown[]
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      client.timeout(2000).emit(event, ...args, (err: Error | null, response: T) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response);
      });
    });
  }

  async function onceEvent<T>(client: Socket, event: string): Promise<T> {
    return new Promise<T>(resolve => {
      client.once(event, (payload: T) => resolve(payload));
    });
  }

  it('creates a room, lets another player join, and broadcasts room updates', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    const createResponse = await emitWithAck<CallbackResponse>(
      alice,
      'room:create',
      { name: 'Test Room', mode: 'classic', maxPlayers: 2 } satisfies RoomConfig,
      'Alice'
    );

    expect(createResponse.success).toBe(true);
    expect(createResponse.room?.players).toHaveLength(1);

    const roomUpdated = onceEvent<Room>(alice, 'room:updated');
    const joinResponse = await emitWithAck<CallbackResponse>(
      bob,
      'room:join',
      createResponse.room!.id,
      'Bob'
    );

    expect(joinResponse.success).toBe(true);
    expect(joinResponse.room?.players).toHaveLength(2);
    await expect(roomUpdated).resolves.toMatchObject({ id: createResponse.room!.id });

    const duplicateJoin = await emitWithAck<CallbackResponse>(
      bob,
      'room:join',
      createResponse.room!.id,
      'Bob Again'
    );
    expect(duplicateJoin).toEqual({ success: false, error: '你已经在房间中' });
  });

  it('starts a game and rejects actions from the wrong player', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    const createResponse = await emitWithAck<CallbackResponse>(
      alice,
      'room:create',
      { name: 'Play Room', mode: 'classic', maxPlayers: 2 } satisfies RoomConfig,
      'Alice'
    );
    const roomId = createResponse.room!.id;
    await emitWithAck<CallbackResponse>(bob, 'room:join', roomId, 'Bob');

    const startedEvent = onceEvent<GameState>(alice, 'game:started');
    const startResponse = await emitWithAck<CallbackResponse>(alice, 'room:start', roomId);

    expect(startResponse.success).toBe(true);
    expect(startResponse.gameState?.phase).toBe('exchange');
    await expect(startedEvent).resolves.toMatchObject({ roomId, phase: 'exchange' });

    const wrongTurnExchange = await emitWithAck<CallbackResponse>(bob, 'game:exchange', roomId, {
      type: 'exchange',
      from: 'rabbit',
      to: 'sheep',
      fromCount: 6,
      toCount: 1,
    });
    expect(wrongTurnExchange).toEqual({ success: false, error: '不是你的回合' });
  });

  it('processes a dice roll, advances the turn, and emits state updates', async () => {
    const rollSpy = vi.spyOn(GameEngine, 'rollDice').mockReturnValue(['rabbit', 'fox']);

    const alice = await connectClient();
    const bob = await connectClient();

    const createResponse = await emitWithAck<CallbackResponse>(
      alice,
      'room:create',
      { name: 'Flow Room', mode: 'classic', maxPlayers: 2 } satisfies RoomConfig,
      'Alice'
    );
    const roomId = createResponse.room!.id;
    await emitWithAck<CallbackResponse>(bob, 'room:join', roomId, 'Bob');
    await emitWithAck<CallbackResponse>(alice, 'room:start', roomId);

    const diceRolled = onceEvent<string[]>(alice, 'game:dice_rolled');
    const breeding = onceEvent<Record<string, { old: number; new: number; change: number }>>(alice, 'game:breeding');
    const turnChange = onceEvent<number>(alice, 'game:turn_change');
    const gameState = onceEvent<GameState>(alice, 'game:state');

    const rollResponse = await emitWithAck<CallbackResponse>(alice, 'game:roll_dice', roomId);

    expect(rollResponse).toEqual({ success: true });
    await expect(diceRolled).resolves.toEqual(['rabbit', 'fox']);
    // Alice has 1 rabbit, dice = [rabbit, fox]
    // Attack first: fox attacks Alice (the roller) → no small/big dog → classic mode → loses all 1 rabbit → 0 rabbits
    // Breeding: current=0, dice=1 rabbit → skip (有种才能繁殖) → change=0
    await expect(breeding).resolves.toMatchObject({ rabbit: { change: 0 } });
    await expect(turnChange).resolves.toBe(1);
    await expect(gameState).resolves.toMatchObject({
      currentPlayerIndex: 1,
      phase: 'exchange',
      currentRound: 1,
    });

    expect(rollSpy).toHaveBeenCalledWith('classic');
  });

  it('removes a player from the room when they leave', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    const createResponse = await emitWithAck<CallbackResponse>(
      alice,
      'room:create',
      { name: 'Leave Room', mode: 'classic', maxPlayers: 2 } satisfies RoomConfig,
      'Alice'
    );
    const roomId = createResponse.room!.id;
    await emitWithAck<CallbackResponse>(bob, 'room:join', roomId, 'Bob');

    const roomUpdated = onceEvent<Room>(alice, 'room:updated');
    const leaveResponse = await emitWithAck<CallbackResponse>(bob, 'room:leave', roomId);

    expect(leaveResponse).toEqual({ success: true });
    await expect(roomUpdated).resolves.toMatchObject({
      id: roomId,
      players: [expect.objectContaining({ name: 'Alice' })],
    });
  });

  it('broadcasts room updates when a player disconnects', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    const createResponse = await emitWithAck<CallbackResponse>(
      alice,
      'room:create',
      { name: 'Disconnect Room', mode: 'classic', maxPlayers: 2 } satisfies RoomConfig,
      'Alice'
    );
    const roomId = createResponse.room!.id;
    await emitWithAck<CallbackResponse>(bob, 'room:join', roomId, 'Bob');

    const roomUpdated = onceEvent<Room>(alice, 'room:updated');
    await disconnectClient(bob);

    await expect(roomUpdated).resolves.toMatchObject({
      id: roomId,
      players: [expect.objectContaining({ name: 'Alice' })],
    });
  });
});
