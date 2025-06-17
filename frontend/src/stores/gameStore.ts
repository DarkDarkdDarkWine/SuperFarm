import { defineStore } from 'pinia'
import type { GameState, GameAction, AnimalCollection, ProtectionCollection, GamePhase, DiceResult } from '@/types/game'
import { GAME_CONSTANTS } from '@/types/game'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    gameId: '',
    currentRound: 1,
    currentPlayer: 'human',
    gamePhase: 'preparing',
    winner: null,
    bank: { ...GAME_CONSTANTS.INITIAL_BANK },
    diceResult: [],
    gameHistory: []
  }),

  getters: {
    // 游戏是否进行中
    isGameActive: (state): boolean => state.gamePhase !== 'finished',
    
    // 是否为人类回合
    isHumanTurn: (state): boolean => state.currentPlayer === 'human',
    
    // 是否为AI回合
    isAITurn: (state): boolean => state.currentPlayer === 'ai',
    
    // 当前阶段文本
    currentPhaseText: (state): string => {
      const phaseTexts = {
        preparing: '准备中',
        rolling: '掷骰子',
        processing: '处理结果',
        exchanging: '交换阶段',
        ai_thinking: 'AI思考中',
        finished: '游戏结束'
      }
      return phaseTexts[state.gamePhase]
    },
    
    // 获取最后一次骰子结果的统计
    lastDiceStats: (state) => {
      const stats = {
        rabbit: 0,
        sheep: 0,
        pig: 0,
        cow: 0,
        horse: 0,
        fox: 0,
        wolf: 0
      }
      
      state.diceResult.forEach(face => {
        if (face in stats) {
          stats[face as keyof typeof stats]++
        }
      })
      
      return stats
    },
    
    // 银行是否还有库存
    hasBankStock: (state) => (animal: keyof AnimalCollection): boolean => {
      return state.bank[animal] > 0
    }
  },

  actions: {
    // 初始化游戏
    initGame() {
      this.gameId = `game_${Date.now()}`
      this.currentRound = 1
      this.currentPlayer = 'human'
      this.gamePhase = 'preparing'
      this.winner = null
      this.diceResult = []
      this.gameHistory = []
      // 重置银行库存
      this.bank = { ...GAME_CONSTANTS.INITIAL_BANK }
      
      this.addGameAction({
        type: 'roll',
        player: 'system',
        timestamp: Date.now(),
        details: { action: 'game_started' }
      })
    },

    // 设置游戏阶段
    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase
    },

    // 切换玩家
    switchPlayer() {
      this.currentPlayer = this.currentPlayer === 'human' ? 'ai' : 'human'
      if (this.currentPlayer === 'human') {
        this.currentRound++
      }
    },

    // 设置骰子结果
    setDiceResult(result: DiceResult[]) {
      this.diceResult = [...result]
    },

    // 添加游戏动作记录
    addGameAction(action: GameAction) {
      this.gameHistory.push({
        ...action,
        timestamp: Date.now()
      })
      
      // 限制历史记录长度，避免内存泄漏
      if (this.gameHistory.length > 100) {
        this.gameHistory = this.gameHistory.slice(-50)
      }
    },

    // 设置获胜者
    setWinner(playerId: string) {
      this.winner = playerId
      this.gamePhase = 'finished'
      
      this.addGameAction({
        type: 'roll',
        player: playerId,
        timestamp: Date.now(),
        details: { action: 'game_won', winner: playerId }
      })
    },

    // 更新银行库存
    updateBank(updates: Partial<AnimalCollection & ProtectionCollection>) {
      Object.entries(updates).forEach(([key, value]) => {
        if (key in this.bank && typeof value === 'number') {
          (this.bank as any)[key] = Math.max(0, value)
        }
      })
    },

    // 从银行获取动物（考虑库存限制）
    takeFromBank(animal: keyof AnimalCollection, count: number): number {
      const available = this.bank[animal]
      const actualCount = Math.min(count, available)
      this.bank[animal] -= actualCount
      return actualCount
    },

    // 从银行获取防护道具
    takeProtectionFromBank(protection: keyof ProtectionCollection, count: number = 1): number {
      const available = this.bank[protection]
      const actualCount = Math.min(count, available)
      this.bank[protection] -= actualCount
      return actualCount
    },

    // 重置游戏到初始状态
    resetGame() {
      this.initGame()
    },

    // 获取游戏统计信息
    getGameStats() {
      return {
        totalRounds: this.currentRound,
        totalActions: this.gameHistory.length,
        gameId: this.gameId,
        duration: Date.now() - (this.gameHistory[0]?.timestamp || Date.now())
      }
    }
  }
}) 