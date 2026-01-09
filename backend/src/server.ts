/**
 * WebSocket服务器
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { RoomManager } from './core/RoomManager';
import { GameEngine } from './core/GameEngine';
import { AIService } from './services/AIService';
import type {
  RoomConfig,
  AIDifficulty,
  ExchangeAction,
  BuyProtectionAction,
} from '../../shared/types/game';

export class GameServer {
  private io: SocketIOServer;
  private roomManager: RoomManager;
  private aiService: AIService;

  constructor(httpServer: HTTPServer, aiApiKey: string) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.roomManager = new RoomManager();
    this.aiService = new AIService(aiApiKey);

    this.setupSocketHandlers();
    this.startCleanupTask();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', socket => {
      console.log(`Client connected: ${socket.id}`);

      // 创建房间
      socket.on(
        'room:create',
        (config: RoomConfig, playerName: string, callback) => {
          try {
            const room = this.roomManager.createRoom(config, socket.id, playerName);
            socket.join(room.id);
            callback({ success: true, room });
            console.log(`Room created: ${room.id} by ${playerName}`);
          } catch (error: any) {
            callback({ success: false, error: error.message });
          }
        }
      );

      // 加入房间
      socket.on('room:join', (roomId: string, playerName: string, callback) => {
        try {
          const result = this.roomManager.joinRoom(roomId, socket.id, playerName);

          if (result.success && result.room) {
            socket.join(roomId);
            this.io.to(roomId).emit('room:updated', result.room);
            callback({ success: true, room: result.room });
            console.log(`${playerName} joined room ${roomId}`);
          } else {
            callback({ success: false, error: result.error });
          }
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 离开房间
      socket.on('room:leave', (roomId: string, callback) => {
        try {
          const result = this.roomManager.leaveRoom(roomId, socket.id);

          if (result.success) {
            socket.leave(roomId);

            if (result.room) {
              this.io.to(roomId).emit('room:updated', result.room);
            }

            callback({ success: true });
          } else {
            callback({ success: false, error: result.error });
          }
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 添加AI玩家
      socket.on('room:add_ai', (roomId: string, difficulty: AIDifficulty, callback) => {
        try {
          const result = this.roomManager.addAIPlayer(roomId, difficulty);

          if (result.success && result.room) {
            this.io.to(roomId).emit('room:updated', result.room);
            callback({ success: true, room: result.room });
          } else {
            callback({ success: false, error: result.error });
          }
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 开始游戏
      socket.on('room:start', async (roomId: string, callback) => {
        try {
          const room = this.roomManager.getRoom(roomId);

          if (!room) {
            callback({ success: false, error: '房间不存在' });
            return;
          }

          // 初始化游戏状态
          const gameState = GameEngine.initGame(
            roomId,
            room.players.map(p => ({ id: p.id, name: p.name, type: p.type })),
            room.mode
          );

          const result = this.roomManager.startGame(roomId, gameState);

          if (result.success) {
            this.io.to(roomId).emit('game:started', gameState);
            callback({ success: true, gameState });

            // 如果第一个玩家是AI，自动执行
            if (gameState.players[0].type === 'ai') {
              await this.executeAITurn(roomId, gameState);
            }
          } else {
            callback({ success: false, error: result.error });
          }
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 交换动物
      socket.on('game:exchange', async (roomId: string, action: ExchangeAction, callback) => {
        try {
          await this.handleExchange(roomId, socket.id, action, callback);
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 购买防护
      socket.on('game:buy_protection', async (roomId: string, action: BuyProtectionAction, callback) => {
        try {
          await this.handleBuyProtection(roomId, socket.id, action, callback);
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 掷骰子
      socket.on('game:roll_dice', async (roomId: string, callback) => {
        try {
          await this.handleRollDice(roomId, socket.id, callback);
        } catch (error: any) {
          callback({ success: false, error: error.message });
        }
      });

      // 断开连接
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // TODO: 处理玩家断线
      });
    });
  }

  /**
   * 处理交换动作
   */
  private async handleExchange(
    roomId: string,
    playerId: string,
    action: ExchangeAction,
    callback: Function
  ): Promise<void> {
    const room = this.roomManager.getRoom(roomId);

    if (!room || !room.gameState) {
      callback({ success: false, error: '游戏状态错误' });
      return;
    }

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // 验证是否是当前玩家
    if (currentPlayer.id !== playerId) {
      callback({ success: false, error: '不是你的回合' });
      return;
    }

    // 验证是否在交换阶段
    if (gameState.phase !== 'exchange') {
      callback({ success: false, error: '当前不是交换阶段' });
      return;
    }

    // 验证交换是否合法
    const validation = GameEngine.validateExchange(
      currentPlayer,
      gameState.bank,
      action
    );

    if (!validation.valid) {
      callback({ success: false, error: validation.reason });
      return;
    }

    // 执行交换
    GameEngine.executeExchange(currentPlayer, gameState.bank, action);

    // 记录历史
    gameState.history.push({
      type: 'exchange',
      playerId,
      timestamp: Date.now(),
      details: action,
    });

    // 检查胜利（交换后可能凑齐所有动物）
    const winner = GameEngine.checkVictory(currentPlayer);
    if (winner) {
      currentPlayer.isWinner = true;
      gameState.winner = currentPlayer.id;
      gameState.phase = 'finished';

      this.roomManager.finishGame(roomId);
      this.io.to(roomId).emit('game:state', gameState);
      this.io.to(roomId).emit('game:victory', currentPlayer.id);
      this.io.to(roomId).emit('game:finished', gameState);

      callback({ success: true, winner: currentPlayer.id });
      return;
    }

    // 更新状态
    this.roomManager.updateGameState(roomId, gameState);
    this.io.to(roomId).emit('game:state', gameState);

    callback({ success: true });
  }

  /**
   * 处理购买防护
   */
  private async handleBuyProtection(
    roomId: string,
    playerId: string,
    action: BuyProtectionAction,
    callback: Function
  ): Promise<void> {
    const room = this.roomManager.getRoom(roomId);

    if (!room || !room.gameState) {
      callback({ success: false, error: '游戏状态错误' });
      return;
    }

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.id !== playerId) {
      callback({ success: false, error: '不是你的回合' });
      return;
    }

    if (gameState.phase !== 'exchange') {
      callback({ success: false, error: '当前不是交换阶段' });
      return;
    }

    const validation = GameEngine.validateBuyProtection(
      currentPlayer,
      gameState.bank,
      action
    );

    if (!validation.valid) {
      callback({ success: false, error: validation.reason });
      return;
    }

    GameEngine.executeBuyProtection(currentPlayer, gameState.bank, action);

    gameState.history.push({
      type: 'buy_protection',
      playerId,
      timestamp: Date.now(),
      details: action,
    });

    this.roomManager.updateGameState(roomId, gameState);
    this.io.to(roomId).emit('game:state', gameState);

    callback({ success: true });
  }

  /**
   * 处理掷骰子
   */
  private async handleRollDice(
    roomId: string,
    playerId: string,
    callback: Function
  ): Promise<void> {
    const room = this.roomManager.getRoom(roomId);

    if (!room || !room.gameState) {
      callback({ success: false, error: '游戏状态错误' });
      return;
    }

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.id !== playerId) {
      callback({ success: false, error: '不是你的回合' });
      return;
    }

    // 交换阶段结束，进入掷骰子阶段
    gameState.phase = 'rolling';

    // 掷骰子
    const diceResult = GameEngine.rollDice(gameState.mode);
    gameState.diceResult = diceResult;

    // 记录掷骰子历史
    gameState.history.push({
      type: 'roll_dice',
      playerId,
      timestamp: Date.now(),
      details: { diceResult },
    });

    this.io.to(roomId).emit('game:dice_rolled', diceResult);

    // 处理繁殖
    gameState.phase = 'breeding';
    const breedingResults = GameEngine.processBreeding(gameState);

    // 记录繁殖历史
    gameState.history.push({
      type: 'breeding',
      playerId,
      timestamp: Date.now(),
      details: { breedingResults },
    });

    this.io.to(roomId).emit('game:breeding', breedingResults);

    // 处理攻击
    gameState.phase = 'attacking';
    await this.processAttacks(roomId, gameState);

    // 检查胜利
    gameState.phase = 'victory_check';
    const winner = GameEngine.checkVictory(currentPlayer);

    if (winner) {
      currentPlayer.isWinner = true;
      gameState.winner = currentPlayer.id;
      gameState.phase = 'finished';

      this.roomManager.finishGame(roomId);
      this.io.to(roomId).emit('game:victory', currentPlayer.id);
      this.io.to(roomId).emit('game:finished', gameState);

      callback({ success: true, winner: currentPlayer.id });
      return;
    }

    // 检查超时
    if (GameEngine.isGameTimeout(gameState)) {
      const tieWinner = GameEngine.resolveTie(gameState.players);

      if (tieWinner) {
        tieWinner.isWinner = true;
        gameState.winner = tieWinner.id;
      }

      gameState.phase = 'finished';
      this.roomManager.finishGame(roomId);
      this.io.to(roomId).emit('game:finished', gameState);

      callback({ success: true, winner: tieWinner?.id });
      return;
    }

    // 下一个玩家
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    if (gameState.currentPlayerIndex === 0) {
      gameState.currentRound++;
    }

    gameState.phase = 'exchange';

    this.roomManager.updateGameState(roomId, gameState);
    this.io.to(roomId).emit('game:turn_change', gameState.currentPlayerIndex);
    this.io.to(roomId).emit('game:state', gameState);

    callback({ success: true });

    // 如果下一个玩家是AI，自动执行
    const nextPlayer = gameState.players[gameState.currentPlayerIndex];
    if (nextPlayer.type === 'ai') {
      await this.executeAITurn(roomId, gameState);
    }
  }

  /**
   * 处理攻击
   */
  private async processAttacks(roomId: string, gameState: any): Promise<void> {
    const currentPlayerIndex = gameState.currentPlayerIndex;
    const currentPlayer = gameState.players[currentPlayerIndex];

    // 检查骰子结果中的攻击 - 攻击当前玩家（掷骰子的人）
    for (const face of gameState.diceResult) {
      if (face === 'fox') {
        // 狐狸攻击当前玩家
        const result = GameEngine.processFoxAttack(
          currentPlayer, // 攻击者也是当前玩家（自己掷出的）
          currentPlayer, // 受害者是当前玩家
          gameState.bank,
          gameState.mode
        );

        // 记录攻击历史
        gameState.history.push({
          type: 'attack',
          playerId: currentPlayer.id,
          timestamp: Date.now(),
          details: {
            attackType: 'fox',
            victimId: currentPlayer.id,
            victimName: currentPlayer.name,
            blocked: result.blocked,
            rabbitsLost: result.rabbitsLost,
          },
        });

        this.io.to(roomId).emit('game:attack', {
          type: 'fox',
          attacker: currentPlayer.id,
          victim: currentPlayer.id,
          blocked: result.blocked,
          rabbitsLost: result.rabbitsLost,
        });
      } else if (face === 'wolf') {
        // 狼攻击当前玩家
        const result = GameEngine.processWolfAttack(
          currentPlayer, // 攻击者也是当前玩家（自己掷出的）
          currentPlayer, // 受害者是当前玩家
          gameState.bank
        );

        // 记录攻击历史
        gameState.history.push({
          type: 'attack',
          playerId: currentPlayer.id,
          timestamp: Date.now(),
          details: {
            attackType: 'wolf',
            victimId: currentPlayer.id,
            victimName: currentPlayer.name,
            blocked: result.blocked,
            animalsLost: result.animalsLost,
          },
        });

        this.io.to(roomId).emit('game:attack', {
          type: 'wolf',
          attacker: currentPlayer.id,
          victim: currentPlayer.id,
          blocked: result.blocked,
          animalsLost: result.animalsLost,
        });
      }
    }
  }

  /**
   * 执行AI回合
   */
  private async executeAITurn(roomId: string, gameState: any): Promise<void> {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.type !== 'ai') return;

    // 通知AI正在思考
    this.io.to(roomId).emit('ai:thinking', currentPlayer.id);

    try {
      // 过滤游戏状态
      const filteredState = this.aiService.filterGameState(gameState, currentPlayer.id);

      // 获取AI决策
      const decision = await this.aiService.getDecision({
        playerId: currentPlayer.id,
        gameView: filteredState,
        availableActions: ['exchange', 'buy_protection'],
        mode: gameState.mode,
        difficulty: currentPlayer.difficulty || 'medium',
      });

      this.io.to(roomId).emit('ai:decision', currentPlayer.id, decision.actions);

      // 执行AI的决策
      for (const action of decision.actions) {
        if (action.type === 'exchange') {
          const validation = GameEngine.validateExchange(
            currentPlayer,
            gameState.bank,
            action
          );

          if (validation.valid) {
            GameEngine.executeExchange(currentPlayer, gameState.bank, action);

            gameState.history.push({
              type: 'exchange',
              playerId: currentPlayer.id,
              timestamp: Date.now(),
              details: action,
            });
          }
        } else if (action.type === 'buy_protection') {
          const validation = GameEngine.validateBuyProtection(
            currentPlayer,
            gameState.bank,
            action
          );

          if (validation.valid) {
            GameEngine.executeBuyProtection(currentPlayer, gameState.bank, action);

            gameState.history.push({
              type: 'buy_protection',
              playerId: currentPlayer.id,
              timestamp: Date.now(),
              details: action,
            });
          }
        }
      }

      // 更新状态
      this.roomManager.updateGameState(roomId, gameState);
      this.io.to(roomId).emit('game:state', gameState);

      // AI自动掷骰子
      await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒

      // 掷骰子并继续游戏流程
      await this.handleRollDice(roomId, currentPlayer.id, () => { });
    } catch (error) {
      console.error('AI turn error:', error);

      // AI出错，直接掷骰子
      await this.handleRollDice(roomId, currentPlayer.id, () => { });
    }
  }

  /**
   * 定期清理房间
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const cleaned = this.roomManager.cleanup();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} rooms`);
      }
    }, 60000); // 每分钟清理一次
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
