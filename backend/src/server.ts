/**
 * WebSocket服务器
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { RoomManager } from './core/RoomManager';
import { GameEngine } from './core/GameEngine';
import { AIService } from './services/AIService';
import type { AIProvider } from './services/AIService';
import type {
  GameState,
  RoomConfig,
  AIDifficulty,
  ExchangeAction,
  BuyProtectionAction,
  FilteredGameState,
  AIDecisionResponse,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/types/game';

interface AIServicePort {
  updateApiKey(key: string): void;
  updateProvider(provider: AIProvider, model: string): void;
  filterGameState(gameState: GameState, aiPlayerId: string): FilteredGameState;
  getDecision(request: {
    playerId: string;
    gameView: FilteredGameState;
    availableActions: string[];
    mode: GameState['mode'];
    difficulty: AIDifficulty;
  }): Promise<AIDecisionResponse>;
}

interface GameServerOptions {
  roomManager?: RoomManager;
  aiService?: AIServicePort;
  cleanupIntervalMs?: number;
  aiTurnDelayMs?: number;
  enableCleanupTask?: boolean;
}

type AckSuccess = { success: true; room?: RoomConfig | GameState | unknown; gameState?: GameState; winner?: string };
type AckFailure = { success: false; error: string };
type AckResponse = AckSuccess | AckFailure;
type AckCallback = (response: AckResponse) => void;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

export class GameServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private roomManager: RoomManager;
  private aiService: AIServicePort;
  private readonly aiTurnDelayMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(httpServer: HTTPServer, aiApiKey: string, options: GameServerOptions = {}) {
    this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.roomManager = options.roomManager ?? new RoomManager();
    this.aiService = options.aiService ?? new AIService(aiApiKey);
    this.aiTurnDelayMs = options.aiTurnDelayMs ?? 1000;

    this.setupSocketHandlers();

    if (options.enableCleanupTask !== false) {
      this.startCleanupTask(options.cleanupIntervalMs);
    }
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
          } catch (error: unknown) {
            callback({ success: false, error: getErrorMessage(error) });
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
            callback({ success: false, error: result.error ?? '加入房间失败' });
          }
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
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
            callback({ success: false, error: result.error ?? '离开房间失败' });
          }
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
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
            callback({ success: false, error: result.error ?? '添加 AI 失败' });
          }
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
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
            callback({ success: false, error: result.error ?? '开始游戏失败' });
          }
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // 交换动物
      socket.on('game:exchange', async (roomId: string, action: ExchangeAction, callback) => {
        try {
          await this.handleExchange(roomId, socket.id, action, callback);
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // 购买防护
      socket.on('game:buy_protection', async (roomId: string, action: BuyProtectionAction, callback) => {
        try {
          await this.handleBuyProtection(roomId, socket.id, action, callback);
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // 掷骰子
      socket.on('game:roll_dice', async (roomId: string, callback) => {
        try {
          await this.handleRollDice(roomId, socket.id, callback);
        } catch (error: unknown) {
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // 断开连接
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const result = this.roomManager.handleDisconnect(socket.id);

        if (result.room) {
          this.io.to(result.room.id).emit('room:updated', result.room);
          if (result.room.gameState) {
            this.io.to(result.room.id).emit('game:state', result.room.gameState);
          }
        }
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
    callback: AckCallback
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
      callback({ success: false, error: validation.reason ?? '交换不合法' });
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
    const animalLabels: Record<string, string> = { rabbit:'兔子', sheep:'绵羊', pig:'猪', cow:'奶牛', horse:'马' };
    this.io.to(roomId).emit('game:log',
      `🔄 ${currentPlayer.name} 交换：${action.fromCount}只${animalLabels[action.from]} → ${action.toCount}只${animalLabels[action.to]}`
    );
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
    callback: AckCallback
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
      callback({ success: false, error: validation.reason ?? '购买防护不合法' });
      return;
    }

    GameEngine.executeBuyProtection(currentPlayer, gameState.bank, action);

    gameState.history.push({
      type: 'buy_protection',
      playerId,
      timestamp: Date.now(),
      details: action,
    });

    const dogLabel = action.protection === 'smallDog' ? '小狗🐕（防狐狸）' : '大狗🦮（防狼）';
    this.io.to(roomId).emit('game:log', `🛡️ ${currentPlayer.name} 购买了${dogLabel}`);

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
    callback: AckCallback
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

    const diceEmoji: Record<string, string> = { rabbit:'🐰', sheep:'🐑', pig:'🐷', cow:'🐄', horse:'🐴', fox:'🦊', wolf:'🐺' };
    this.io.to(roomId).emit('game:dice_rolled', diceResult);
    this.io.to(roomId).emit('game:log', `🎲 ${currentPlayer.name} 掷出：${diceResult.map(d => diceEmoji[d]).join(' ')}`);

    // 阶段3: 先处理繁殖（规则：交换→掷骰子→繁殖→灾难）
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

    const animalLabels: Record<string, string> = { rabbit:'兔子', sheep:'绵羊', pig:'猪', cow:'奶牛', horse:'马' };
    const breedText = Object.entries(breedingResults)
      .filter(([, r]) => r.change > 0)
      .map(([a, r]) => `+${r.change}${animalLabels[a]}(${r.old}→${r.new})`)
      .join('、');
    if (breedText) {
      this.io.to(roomId).emit('game:log', `🌱 ${currentPlayer.name} 繁殖：${breedText}`);
    }

    // 阶段4: 再处理灾难
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
  private async processAttacks(roomId: string, gameState: GameState): Promise<void> {
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
        if (result.blocked) {
          this.io.to(roomId).emit('game:log', `🐕 ${currentPlayer.name} 的小狗赶跑了狐狸！`);
        } else if (result.rabbitsLost > 0) {
          this.io.to(roomId).emit('game:log', `🦊 狐狸偷走了 ${currentPlayer.name} 的 ${result.rabbitsLost} 只兔子`);
        } else {
          this.io.to(roomId).emit('game:log', `🦊 狐狸来了，${currentPlayer.name} 没有兔子可偷`);
        }
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
        if (result.blocked) {
          this.io.to(roomId).emit('game:log', `🦮 ${currentPlayer.name} 的大狗赶跑了狼！`);
        } else {
          const animalLabels: Record<string, string> = { sheep:'绵羊', pig:'猪', cow:'奶牛' };
          const lost = Object.entries(result.animalsLost)
            .filter(([, n]) => (n as number) > 0)
            .map(([a, n]) => `${n}只${animalLabels[a]}`)
            .join('、');
          this.io.to(roomId).emit('game:log',
            lost ? `🐺 狼吃掉了 ${currentPlayer.name} 的 ${lost}` : `🐺 狼来了，${currentPlayer.name} 没有动物可吃`
          );
        }
      }
    }
  }

  /**
   * 执行AI回合
   */
  private async executeAITurn(roomId: string, gameState: GameState): Promise<void> {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const room = this.roomManager.getRoom(roomId);

    if (currentPlayer.type !== 'ai') return;

    const roomPlayer = room?.players.find(player => player.id === currentPlayer.id);
    const difficulty = roomPlayer?.type === 'ai' ? roomPlayer.difficulty || 'medium' : 'medium';

    // 通知AI正在思考
    this.io.to(roomId).emit('ai:thinking', currentPlayer.id);

    const animalLabels: Record<string, string> = { rabbit:'兔子', sheep:'绵羊', pig:'猪', cow:'奶牛', horse:'马' };

    try {
      // 过滤游戏状态
      const filteredState = this.aiService.filterGameState(gameState, currentPlayer.id);

      // 获取AI决策
      const decision = await this.aiService.getDecision({
        playerId: currentPlayer.id,
        gameView: filteredState,
        availableActions: ['exchange', 'buy_protection'],
        mode: gameState.mode,
        difficulty,
      });

      // 若 LLM 无响应，用规则兜底（保证 AI 不会呆站着不动）
      const actionsToRun = decision.actions.length > 0
        ? decision.actions
        : this.getRuleBasedActions(currentPlayer, gameState.bank, difficulty);

      const reasoning = decision.actions.length > 0
        ? decision.reasoning
        : `（规则兜底，${difficulty === 'hard' ? '连锁升级' : difficulty === 'medium' ? '标准阈值' : '2倍阈值'}）`;

      this.io.to(roomId).emit('ai:decision', currentPlayer.id, actionsToRun, reasoning);

      // 执行AI的决策
      let hasAction = false;
      for (const action of actionsToRun) {
        if (action.type === 'exchange') {
          const validation = GameEngine.validateExchange(currentPlayer, gameState.bank, action);
          if (validation.valid) {
            GameEngine.executeExchange(currentPlayer, gameState.bank, action);
            gameState.history.push({ type: 'exchange', playerId: currentPlayer.id, timestamp: Date.now(), details: action });
            this.io.to(roomId).emit('game:log',
              `🔄 ${currentPlayer.name} 交换：${action.fromCount}只${animalLabels[action.from]} → ${action.toCount}只${animalLabels[action.to]}`
            );
            hasAction = true;
          }
        } else if (action.type === 'buy_protection') {
          const validation = GameEngine.validateBuyProtection(currentPlayer, gameState.bank, action);
          if (validation.valid) {
            GameEngine.executeBuyProtection(currentPlayer, gameState.bank, action);
            gameState.history.push({ type: 'buy_protection', playerId: currentPlayer.id, timestamp: Date.now(), details: action });
            const dogLabel = action.protection === 'smallDog' ? '小狗🐕' : '大狗🦮';
            this.io.to(roomId).emit('game:log', `🛡️ ${currentPlayer.name} 购买了${dogLabel}`);
            hasAction = true;
          }
        }
      }

      if (!hasAction) {
        this.io.to(roomId).emit('game:log', `💭 ${currentPlayer.name} 本回合未交换（${reasoning}）`);
      } else if (decision.reasoning && decision.actions.length > 0) {
        this.io.to(roomId).emit('game:log', `💭 ${currentPlayer.name} 的思路：${decision.reasoning}`);
      }

      // 更新状态
      this.roomManager.updateGameState(roomId, gameState);
      this.io.to(roomId).emit('game:state', gameState);

      // AI自动掷骰子
      await new Promise(resolve => setTimeout(resolve, this.aiTurnDelayMs));
      await this.handleRollDice(roomId, currentPlayer.id, () => { });
    } catch (error) {
      console.error('AI turn error:', error);
      // AI出错时也用规则兜底
      const fallbackActions = this.getRuleBasedActions(currentPlayer, gameState.bank, difficulty);
      for (const action of fallbackActions) {
        if (action.type === 'exchange') {
          const v = GameEngine.validateExchange(currentPlayer, gameState.bank, action);
          if (v.valid) {
            GameEngine.executeExchange(currentPlayer, gameState.bank, action);
            this.io.to(roomId).emit('game:log',
              `🔄 ${currentPlayer.name} 交换：${action.fromCount}只${animalLabels[action.from]} → ${action.toCount}只${animalLabels[action.to]}`
            );
          }
        }
      }
      this.roomManager.updateGameState(roomId, gameState);
      this.io.to(roomId).emit('game:state', gameState);
      await this.handleRollDice(roomId, currentPlayer.id, () => { });
    }
  }

  /**
   * 规则兜底：根据难度生成 AI 交换动作
   */
  private getRuleBasedActions(
    player: import('../../../shared/types/game').PlayerState,
    bank: import('../../../shared/types/game').Bank,
    difficulty: import('../../../shared/types/game').AIDifficulty
  ): import('../../../shared/types/game').PlayerAction[] {
    const RATES = [
      { from: 'rabbit' as const, to: 'sheep' as const, fromCount: 6, toCount: 1 },
      { from: 'sheep' as const, to: 'pig' as const, fromCount: 2, toCount: 1 },
      { from: 'pig' as const, to: 'cow' as const, fromCount: 3, toCount: 1 },
      { from: 'cow' as const, to: 'horse' as const, fromCount: 2, toCount: 1 },
    ];
    const actions: import('../../../shared/types/game').PlayerAction[] = [];
    const sim = { ...player.animals };
    const simBank = { ...bank };

    if (difficulty === 'hard') {
      // 连锁升级，直到无法继续
      let changed = true;
      while (changed) {
        changed = false;
        for (const rate of RATES) {
          if (sim[rate.from] >= rate.fromCount && simBank[rate.to] >= rate.toCount) {
            actions.push({ type: 'exchange', ...rate });
            sim[rate.from] -= rate.fromCount;
            sim[rate.to] += rate.toCount;
            simBank[rate.from] += rate.fromCount;
            simBank[rate.to] -= rate.toCount;
            changed = true;
          }
        }
      }
    } else {
      // easy: 2倍阈值；medium: 标准阈值；各做一次
      const multiplier = difficulty === 'easy' ? 2 : 1;
      for (const rate of RATES) {
        if (sim[rate.from] >= rate.fromCount * multiplier && simBank[rate.to] >= rate.toCount) {
          actions.push({ type: 'exchange', ...rate });
          break;
        }
      }
    }
    return actions;
  }

  /**
   * 定期清理房间
   */
  private startCleanupTask(intervalMs: number = 60000): void {
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.roomManager.cleanup();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} rooms`);
      }
    }, intervalMs);
  }

  public updateApiKey(key: string): void {
    this.aiService.updateApiKey(key);
  }

  public updateProvider(provider: AIProvider, model: string): void {
    this.aiService.updateProvider(provider, model);
  }

  public getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }

  public close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.io.close();
  }
}
