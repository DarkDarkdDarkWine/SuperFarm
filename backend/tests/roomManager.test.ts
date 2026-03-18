import { describe, expect, it } from 'vitest';
import { RoomManager } from '../src/core/RoomManager';
import type { GameState } from '../../shared/types/game';

function createGameState(): GameState {
  return {
    roomId: 'room-1',
    mode: 'classic',
    currentRound: 1,
    currentPlayerIndex: 0,
    phase: 'exchange',
    players: [
      {
        id: 'player-1',
        name: 'Alice',
        type: 'human',
        animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false,
      },
      {
        id: 'player-2',
        name: 'Bob',
        type: 'human',
        animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false,
      },
    ],
    bank: {
      rabbit: 58,
      sheep: 24,
      pig: 20,
      cow: 12,
      horse: 6,
      smallDog: 4,
      bigDog: 2,
    },
    diceResult: [],
    history: [],
  };
}

describe('RoomManager', () => {
  it('creates a waiting room with the creator attached', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Test Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );

    expect(room.status).toBe('waiting');
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({
      id: 'socket-1',
      name: 'Alice',
      type: 'human',
      socketId: 'socket-1',
    });
  });

  it('prevents duplicate joins and joining a full room', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Small Room', mode: 'classic', maxPlayers: 2 },
      'socket-1',
      'Alice'
    );

    expect(manager.joinRoom(room.id, 'socket-1', 'Alice Again')).toEqual({
      success: false,
      error: '你已经在房间中',
    });

    expect(manager.joinRoom(room.id, 'socket-2', 'Bob').success).toBe(true);
    expect(manager.joinRoom(room.id, 'socket-3', 'Carol')).toEqual({
      success: false,
      error: '房间已满',
    });
  });

  it('lists rooms and supports status filtering', () => {
    const manager = new RoomManager();
    const waitingRoom = manager.createRoom(
      { name: 'Waiting Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );
    const playingRoom = manager.createRoom(
      { name: 'Playing Room', mode: 'classic', maxPlayers: 4 },
      'socket-2',
      'Bob'
    );
    manager.joinRoom(playingRoom.id, 'socket-3', 'Carol');
    manager.startGame(playingRoom.id, createGameState());

    expect(manager.getRooms()).toHaveLength(2);
    expect(manager.getRooms({ status: 'waiting' }).map(room => room.id)).toEqual([waitingRoom.id]);
    expect(manager.getRooms({ status: 'playing' }).map(room => room.id)).toEqual([playingRoom.id]);
  });

  it('supports adding AI players and marking players ready', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );

    const addAiResult = manager.addAIPlayer(room.id, 'hard');
    expect(addAiResult.success).toBe(true);
    expect(addAiResult.room?.players[1]).toMatchObject({
      type: 'ai',
      difficulty: 'hard',
      isReady: true,
    });

    expect(manager.isAllPlayersReady(room.id)).toBe(false);
    expect(manager.setPlayerReady(room.id, 'socket-1', true).success).toBe(true);
    expect(manager.isAllPlayersReady(room.id)).toBe(true);
  });

  it('returns errors for missing rooms or players in room management operations', () => {
    const manager = new RoomManager();

    expect(manager.joinRoom('missing', 'socket-1', 'Alice')).toEqual({
      success: false,
      error: '房间不存在',
    });
    expect(manager.leaveRoom('missing', 'socket-1')).toEqual({
      success: false,
      error: '房间不存在',
    });
    expect(manager.addAIPlayer('missing', 'easy')).toEqual({
      success: false,
      error: '房间不存在',
    });
    expect(manager.setPlayerReady('missing', 'socket-1', true)).toEqual({
      success: false,
      error: '房间不存在',
    });
    expect(manager.startGame('missing', createGameState())).toEqual({
      success: false,
      error: '房间不存在',
    });
  });

  it('requires at least one human player and two total players to start', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );

    expect(manager.startGame(room.id, createGameState())).toEqual({
      success: false,
      error: '至少需要2名玩家',
    });

    room.players = [
      {
        id: 'ai-1',
        name: 'AI 1',
        type: 'ai',
        difficulty: 'easy',
        isReady: true,
        isConnected: true,
      },
      {
        id: 'ai-2',
        name: 'AI 2',
        type: 'ai',
        difficulty: 'easy',
        isReady: true,
        isConnected: true,
      },
    ];

    expect(manager.startGame(room.id, createGameState())).toEqual({
      success: false,
      error: '至少需要一个人类玩家',
    });
  });

  it('starts and finishes a valid game', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );
    manager.joinRoom(room.id, 'socket-2', 'Bob');

    expect(manager.startGame(room.id, createGameState())).toEqual({ success: true });
    expect(manager.getRoom(room.id)?.status).toBe('playing');

    manager.finishGame(room.id);
    expect(manager.getRoom(room.id)?.status).toBe('finished');
  });

  it('updates state, removes players and deletes empty rooms', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );
    manager.joinRoom(room.id, 'socket-2', 'Bob');

    const gameState = createGameState();
    manager.updateGameState(room.id, gameState);
    expect(manager.getRoom(room.id)?.gameState).toBe(gameState);

    expect(manager.leaveRoom(room.id, 'socket-2')).toEqual({
      success: true,
      room: expect.objectContaining({ players: [expect.objectContaining({ id: 'socket-1' })] }),
    });

    expect(manager.leaveRoom(room.id, 'socket-1')).toEqual({ success: true });
    expect(manager.getRoom(room.id)).toBeUndefined();

    const anotherRoom = manager.createRoom(
      { name: 'Another Room', mode: 'classic', maxPlayers: 4 },
      'socket-3',
      'Carol'
    );
    manager.deleteRoom(anotherRoom.id);
    expect(manager.getRoom(anotherRoom.id)).toBeUndefined();
  });

  it('removes finished rooms older than the cleanup threshold', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );
    manager.joinRoom(room.id, 'socket-2', 'Bob');
    manager.startGame(room.id, createGameState());
    manager.finishGame(room.id);

    const storedRoom = manager.getRoom(room.id);
    if (!storedRoom) {
      throw new Error('room should exist before cleanup');
    }
    storedRoom.createdAt = new Date(Date.now() - 5000);

    expect(manager.cleanup(1000)).toBe(1);
    expect(manager.getRoom(room.id)).toBeUndefined();
  });

  it('removes empty rooms during cleanup', () => {
    const manager = new RoomManager();
    const room = manager.createRoom(
      { name: 'Room', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );

    const storedRoom = manager.getRoom(room.id);
    if (!storedRoom) {
      throw new Error('room should exist before cleanup');
    }
    storedRoom.players = [];

    expect(manager.cleanup()).toBe(1);
    expect(manager.getRoom(room.id)).toBeUndefined();
  });

  it('handles disconnects differently for waiting and active rooms', () => {
    const manager = new RoomManager();
    const waitingRoom = manager.createRoom(
      { name: 'Waiting', mode: 'classic', maxPlayers: 4 },
      'socket-1',
      'Alice'
    );
    manager.joinRoom(waitingRoom.id, 'socket-2', 'Bob');

    const waitingDisconnect = manager.handleDisconnect('socket-2');
    expect(waitingDisconnect.room?.players).toHaveLength(1);
    expect(waitingDisconnect.removedPlayerId).toBe('socket-2');

    const activeRoom = manager.createRoom(
      { name: 'Active', mode: 'classic', maxPlayers: 4 },
      'socket-3',
      'Carol'
    );
    manager.joinRoom(activeRoom.id, 'socket-4', 'Dave');
    manager.startGame(activeRoom.id, createGameState());

    const activeDisconnect = manager.handleDisconnect('socket-4');
    expect(activeDisconnect.room?.players.find(player => player.id === 'socket-4')).toMatchObject({
      isConnected: false,
      isReady: false,
    });
    expect(manager.handleDisconnect('missing')).toEqual({});
  });
});
