/**
 * 房间管理器
 */

import { nanoid } from 'nanoid';
import type {
  Room,
  RoomConfig,
  Player,
  AIDifficulty,
  GameState,
} from '../../../shared/types/game';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * 创建房间
   */
  createRoom(config: RoomConfig, creatorId: string, creatorName: string): Room {
    const roomId = nanoid(10);

    const creator: Player = {
      id: creatorId,
      name: creatorName,
      type: 'human',
      socketId: creatorId,
      isReady: false,
      isConnected: true,
    };

    const room: Room = {
      id: roomId,
      name: config.name,
      mode: config.mode,
      maxPlayers: config.maxPlayers,
      players: [creator],
      status: 'waiting',
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);

    return room;
  }

  /**
   * 获取房间
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有房间
   */
  getRooms(filter?: { status?: Room['status'] }): Room[] {
    const rooms = Array.from(this.rooms.values());

    if (filter?.status) {
      return rooms.filter(r => r.status === filter.status);
    }

    return rooms;
  }

  /**
   * 加入房间
   */
  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: '游戏已经开始' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: '房间已满' };
    }

    // 检查是否已经在房间中
    if (room.players.some(p => p.id === playerId)) {
      return { success: false, error: '你已经在房间中' };
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      type: 'human',
      socketId: playerId,
      isReady: false,
      isConnected: true,
    };

    room.players.push(player);

    return { success: true, room };
  }

  /**
   * 离开房间
   */
  leaveRoom(
    roomId: string,
    playerId: string
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    room.players = room.players.filter(p => p.id !== playerId);

    // 如果房间没人了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { success: true };
    }

    return { success: true, room };
  }

  /**
   * 添加AI玩家
   */
  addAIPlayer(
    roomId: string,
    difficulty: AIDifficulty
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: '游戏已经开始' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: '房间已满' };
    }

    const aiId = `ai_${nanoid(8)}`;
    const aiNames = {
      easy: '稳重老王',
      medium: '智慧张三',
      hard: '天才李四',
    };

    const aiPlayer: Player = {
      id: aiId,
      name: aiNames[difficulty],
      type: 'ai',
      difficulty,
      isReady: true, // AI总是准备好
      isConnected: true,
    };

    room.players.push(aiPlayer);

    return { success: true, room };
  }

  /**
   * 设置玩家准备状态
   */
  setPlayerReady(
    roomId: string,
    playerId: string,
    isReady: boolean
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    const player = room.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: '玩家不在房间中' };
    }

    player.isReady = isReady;

    return { success: true, room };
  }

  /**
   * 检查是否所有玩家都准备好
   */
  isAllPlayersReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);

    if (!room) return false;

    return room.players.every(p => p.isReady);
  }

  /**
   * 开始游戏
   */
  startGame(roomId: string, gameState: GameState): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: '游戏已经开始' };
    }

    // 检查至少有一个人类玩家
    const humanPlayers = room.players.filter(p => p.type === 'human');
    if (humanPlayers.length === 0) {
      return { success: false, error: '至少需要一个人类玩家' };
    }

    // 检查玩家数量
    if (room.players.length < 2) {
      return { success: false, error: '至少需要2名玩家' };
    }

    room.status = 'playing';
    room.gameState = gameState;

    return { success: true };
  }

  /**
   * 更新游戏状态
   */
  updateGameState(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
    }
  }

  /**
   * 结束游戏
   */
  finishGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'finished';
    }
  }

  /**
   * 删除房间
   */
  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  /**
   * 清理空房间或超时房间
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      // 删除空房间
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        cleaned++;
        continue;
      }

      // 删除超时的已完成游戏
      if (room.status === 'finished') {
        const age = now - room.createdAt.getTime();
        if (age > maxAge) {
          this.rooms.delete(roomId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}
