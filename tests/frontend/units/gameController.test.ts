import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameController } from '@/services/gameController'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'

// Mock stores
vi.mock('@/stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    gameId: 'test-game',
    currentRound: 1,
    currentPlayer: 'human',
    gamePhase: 'preparing',
    winner: null,
    bank: {
      rabbit: 60, sheep: 24, pig: 20, cow: 12, horse: 4,
      smallDog: 4, bigDog: 2
    },
    diceResult: [],
    gameHistory: [],
    initGame: vi.fn(),
    setGamePhase: vi.fn(),
    switchPlayer: vi.fn(),
    setDiceResult: vi.fn(),
    addGameAction: vi.fn(),
    setWinner: vi.fn(),
    updateBank: vi.fn(),
    takeFromBank: vi.fn(),
    takeProtectionFromBank: vi.fn()
  }))
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(() => ({
    getPlayer: vi.fn((id: string) => ({
      id,
      name: id === 'human' ? '玩家' : 'AI',
      type: id,
      animals: { rabbit: 0, sheep: 0, pig: 0, cow: 0, horse: 0 },
      protection: { smallDog: 0, bigDog: 0 },
      isWinner: false
    })),
    updatePlayerAnimals: vi.fn(),
    setPlayerWinner: vi.fn(),
    resetPlayers: vi.fn()
  }))
}))

// Mock AI服务
vi.mock('@/services/aiService', () => ({
  AIService: class MockAIService {
    async getAIDecision() {
      return {
        analysis: '测试AI分析',
        actions: [
          {
            type: 'exchange',
            exchange: {
              from: 'rabbit',
              to: 'sheep', 
              fromCount: 6,
              toCount: 1
            }
          }
        ],
        reasoning: '测试推理',
        confidence: 0.8
      }
    }
    
    async checkHealth() {
      return { status: 'ok', message: '服务正常' }
    }
    
    getActionDescription(action: any) {
      return `执行${action.type}操作`
    }
  }
}))

// Mock GameService
vi.mock('@/services/gameService', () => ({
  GameService: class MockGameService {
    initGame = vi.fn()
    rollDice = vi.fn(() => ['rabbit', 'sheep'])
    processDiceResult = vi.fn()
    exchangeAnimals = vi.fn(() => true)
    buyProtection = vi.fn(() => true)
    checkWinCondition = vi.fn(() => false)
    endTurn = vi.fn()
  }
}))

describe('GameController', () => {
  let gameController: GameController

  beforeEach(() => {
    // 清除所有mock
    vi.clearAllMocks()
    
    // 创建新的游戏控制器实例
    gameController = new GameController()
  })

  afterEach(() => {
    // 清理定时器
    vi.clearAllTimers()
  })

  describe('游戏初始化', () => {
    it('应该正确初始化新游戏', async () => {
      await gameController.startNewGame()

      expect(gameController.state.isGameRunning).toBe(true)
      expect(gameController.state.currentPlayerTurn).toBe('human')
      expect(gameController.state.gamePhase).toBe('preparing')
      expect(gameController.state.turnNumber).toBe(1)
      expect(gameController.state.gameMessage).toContain('游戏开始')
    })

    it('应该清空AI决策历史', async () => {
      // 先添加一些历史决策
      gameController.state.aiDecisionHistory = [
        { turn: 1, decision: {} as any, timestamp: Date.now() }
      ]

      await gameController.startNewGame()

      expect(gameController.state.aiDecisionHistory).toHaveLength(0)
    })
  })

  describe('人类玩家回合', () => {
    beforeEach(async () => {
      await gameController.startNewGame()
    })

    it('应该正确处理人类玩家回合', async () => {
      // Mock 延迟函数
      vi.spyOn(gameController as any, 'delay').mockResolvedValue(undefined)

      await gameController.processHumanTurn()

      expect(gameController.state.gamePhase).toBe('deciding')
      expect(gameController.state.gameMessage).toContain('请选择您的行动')
    })

    it('应该拒绝非人类回合的操作', async () => {
      gameController.state.currentPlayerTurn = 'ai'

      await gameController.processHumanTurn()

      // 状态不应该改变
      expect(gameController.state.gamePhase).toBe('preparing')
    })

    it('应该正确执行人类交换操作', async () => {
      gameController.state.currentPlayerTurn = 'human'
      gameController.state.gamePhase = 'deciding'

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 6,
        toCount: 1
      }

      const result = await gameController.executeHumanExchange(exchange)

      expect(result).toBe(true)
      expect(gameController.state.gameMessage).toContain('交换成功')
    })

    it('应该正确执行人类购买防护', async () => {
      gameController.state.currentPlayerTurn = 'human'
      gameController.state.gamePhase = 'deciding'

      const result = await gameController.executeHumanProtection('smallDog')

      expect(result).toBe(true)
      expect(gameController.state.gameMessage).toContain('购买成功')
    })
  })

  describe('AI玩家回合', () => {
    beforeEach(async () => {
      await gameController.startNewGame()
      // Mock 所有异步方法
      vi.spyOn(gameController as any, 'delay').mockResolvedValue(undefined)
      vi.spyOn(gameController as any, 'simulateAIThinking').mockResolvedValue(undefined)
    })

    it('应该正确处理AI回合', async () => {
      gameController.state.currentPlayerTurn = 'ai'
      gameController.state.isGameRunning = true

      await gameController.processAITurn()

      // 应该经历AI思考过程
      expect(gameController.state.aiDecisionHistory).toHaveLength(1)
    })

    it('应该记录AI决策历史', async () => {
      gameController.state.currentPlayerTurn = 'ai'
      gameController.state.isGameRunning = true

      await gameController.processAITurn()

      const lastDecision = gameController.state.aiDecisionHistory[0]
      expect(lastDecision).toBeDefined()
      expect(lastDecision.turn).toBe(1)
      expect(lastDecision.decision).toBeDefined()
      expect(lastDecision.timestamp).toBeTypeOf('number')
    })
  })

  describe('游戏状态管理', () => {
    it('应该正确切换到AI回合', async () => {
      await gameController.startNewGame()
      
      // Mock switchToAITurn 方法
      const switchToAITurnSpy = vi.spyOn(gameController as any, 'switchToAITurn')
      
      gameController.endHumanTurn()

      expect(switchToAITurnSpy).toHaveBeenCalled()
    })

    it('应该正确构建游戏状态', () => {
      const gameState = (gameController as any).buildGameState()

      expect(gameState).toHaveProperty('gameId')
      expect(gameState).toHaveProperty('currentPlayer')
      expect(gameState).toHaveProperty('currentRound')
      expect(gameState).toHaveProperty('gamePhase')
      expect(gameState).toHaveProperty('bank')
    })

    it('应该正确格式化骰子结果', () => {
      const result = ['rabbit', 'rabbit', 'sheep', 'fox']
      const formatted = (gameController as any).formatDiceResult(result)

      expect(formatted).toContain('🐰×2')
      expect(formatted).toContain('🐑×1')
      expect(formatted).toContain('🦊×1')
    })
  })

  describe('游戏结束处理', () => {
    it('应该正确处理人类获胜', () => {
      gameController.state.isGameRunning = true
      
      ;(gameController as any).endGame('human')

      expect(gameController.state.isGameRunning).toBe(false)
      expect(gameController.state.gamePhase).toBe('finished')
      expect(gameController.state.gameMessage).toContain('恭喜您获胜')
    })

    it('应该正确处理AI获胜', () => {
      gameController.state.isGameRunning = true
      
      ;(gameController as any).endGame('ai')

      expect(gameController.state.isGameRunning).toBe(false)
      expect(gameController.state.gamePhase).toBe('finished')
      expect(gameController.state.gameMessage).toContain('AI获胜')
    })
  })

  describe('工具方法', () => {
    it('应该返回正确的动物emoji', () => {
      const getDiceEmoji = (gameController as any).getDiceEmoji
      
      expect(getDiceEmoji('rabbit')).toBe('🐰')
      expect(getDiceEmoji('sheep')).toBe('🐑')
      expect(getDiceEmoji('pig')).toBe('🐷')
      expect(getDiceEmoji('fox')).toBe('🦊')
      expect(getDiceEmoji('wolf')).toBe('🐺')
    })

    it('应该返回正确的动物中文名', () => {
      const getAnimalName = (gameController as any).getAnimalName
      
      expect(getAnimalName('rabbit')).toBe('兔子')
      expect(getAnimalName('sheep')).toBe('羊')
      expect(getAnimalName('pig')).toBe('猪')
      expect(getAnimalName('cow')).toBe('牛')
      expect(getAnimalName('horse')).toBe('马')
    })

    it('应该返回正确的游戏统计信息', () => {
      gameController.state.turnNumber = 5
      gameController.state.aiDecisionHistory = [
        { turn: 1, decision: {} as any, timestamp: Date.now() },
        { turn: 2, decision: {} as any, timestamp: Date.now() }
      ]

      const stats = gameController.getGameStats()

      expect(stats.turnNumber).toBe(5)
      expect(stats.aiDecisions).toBe(2)
      expect(stats.gamePhase).toBe('preparing')
      expect(stats.isGameRunning).toBe(false)
    })
  })

  describe('错误处理', () => {
    it('应该处理AI决策失败', async () => {
      // Mock AI服务抛出错误
      vi.doMock('@/services/aiService', () => ({
        AIService: class MockAIServiceError {
          async getAIDecision() {
            throw new Error('AI服务错误')
          }
          checkHealth() {
            return Promise.resolve({ status: 'error', message: '服务不可用' })
          }
          getActionDescription() {
            return '错误操作'
          }
        }
      }))

      gameController.state.currentPlayerTurn = 'ai'
      gameController.state.isGameRunning = true
      
      // Mock delay方法
      vi.spyOn(gameController as any, 'delay').mockResolvedValue(undefined)
      vi.spyOn(gameController as any, 'simulateAIThinking').mockResolvedValue(undefined)

      await gameController.processAITurn()

      expect(gameController.state.gameMessage).toContain('AI遇到问题')
      expect(gameController.state.isAIThinking).toBe(false)
    })
  })
}) 