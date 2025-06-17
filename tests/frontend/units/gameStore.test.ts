import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../../../frontend/src/stores/gameStore.js'
import type { GameState, Player } from '../../../frontend/src/types/game.js'

describe('Game Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useGameStore()
      
      expect(store.gameState).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('')
    })
  })

  describe('游戏创建', () => {
    it('应该能创建新游戏', () => {
      const store = useGameStore()
      const playerName = '测试玩家'
      
      store.createGame(playerName)
      
      expect(store.gameState).not.toBeNull()
      expect(store.gameState?.players).toHaveLength(4) // 1人类 + 3AI
      expect(store.gameState?.currentPlayerIndex).toBe(0)
      expect(store.gameState?.status).toBe('playing')
      expect(store.gameState?.turn).toBe(1)
    })

    it('应该正确设置人类玩家', () => {
      const store = useGameStore()
      const playerName = '测试玩家'
      
      store.createGame(playerName)
      
      const humanPlayer = store.gameState?.players[0]
      expect(humanPlayer?.name).toBe(playerName)
      expect(humanPlayer?.type).toBe('human')
      expect(humanPlayer?.animals.rabbit).toBe(1)
    })

    it('应该创建AI玩家', () => {
      const store = useGameStore()
      
      store.createGame('测试玩家')
      
      const aiPlayers = store.gameState?.players.slice(1)
      expect(aiPlayers).toHaveLength(3)
      aiPlayers?.forEach(player => {
        expect(player.type).toBe('ai')
        expect(player.animals.rabbit).toBe(1)
      })
    })
  })

  describe('轮次管理', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
      store.createGame('测试玩家')
    })

    it('应该能进入下一轮', () => {
      const initialTurn = store.gameState!.turn
      
      store.nextTurn()
      
      expect(store.gameState!.turn).toBe(initialTurn + 1)
      expect(store.gameState!.currentPlayerIndex).toBe(1) // 轮到AI玩家
    })

    it('应该循环玩家索引', () => {
      // 进行4轮，应该回到第一个玩家
      for (let i = 0; i < 4; i++) {
        store.nextTurn()
      }
      
      expect(store.gameState!.currentPlayerIndex).toBe(0)
    })
  })

  describe('玩家状态更新', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
      store.createGame('测试玩家')
    })

    it('应该能更新玩家动物', () => {
      const playerId = store.gameState!.players[0].id
      const newAnimals = {
        rabbit: 5,
        sheep: 2,
        pig: 1,
        cow: 0,
        horse: 0
      }
      
      store.updatePlayer(playerId, { animals: newAnimals })
      
      const updatedPlayer = store.gameState!.players.find(p => p.id === playerId)
      expect(updatedPlayer?.animals).toEqual(newAnimals)
    })

    it('应该能更新玩家防护', () => {
      const playerId = store.gameState!.players[0].id
      const newProtection = {
        smallDog: 1,
        bigDog: 1
      }
      
      store.updatePlayer(playerId, { protection: newProtection })
      
      const updatedPlayer = store.gameState!.players.find(p => p.id === playerId)
      expect(updatedPlayer?.protection).toEqual(newProtection)
    })
  })

  describe('游戏结束', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
      store.createGame('测试玩家')
    })

    it('应该能结束游戏并设置获胜者', () => {
      const winnerId = store.gameState!.players[0].id
      
      store.endGame(winnerId)
      
      expect(store.gameState!.status).toBe('finished')
      expect(store.gameState!.winnerId).toBe(winnerId)
      
      const winner = store.gameState!.players.find(p => p.id === winnerId)
      expect(winner?.isWinner).toBe(true)
    })
  })

  describe('getters', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
      store.createGame('测试玩家')
    })

    it('currentPlayer 应该返回当前玩家', () => {
      expect(store.currentPlayer).toBe(store.gameState!.players[0])
      
      store.nextTurn()
      expect(store.currentPlayer).toBe(store.gameState!.players[1])
    })

    it('humanPlayer 应该返回人类玩家', () => {
      const humanPlayer = store.humanPlayer
      expect(humanPlayer?.type).toBe('human')
      expect(humanPlayer?.name).toBe('测试玩家')
    })

    it('aiPlayers 应该返回所有AI玩家', () => {
      const aiPlayers = store.aiPlayers
      expect(aiPlayers).toHaveLength(3)
      aiPlayers.forEach(player => {
        expect(player.type).toBe('ai')
      })
    })

    it('isGameActive 应该在游戏进行中返回true', () => {
      expect(store.isGameActive).toBe(true)
      
      store.endGame(store.gameState!.players[0].id)
      expect(store.isGameActive).toBe(false)
    })

    it('gameProgress 应该计算正确的游戏进度', () => {
      // 初始状态每个玩家都有1只兔子 = 20%进度
      expect(store.gameProgress).toBe(0.2)
    })
  })

  describe('错误处理', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
    })

    it('应该能设置和清除错误', () => {
      const errorMessage = '测试错误'
      
      store.setError(errorMessage)
      expect(store.error).toBe(errorMessage)
      
      store.clearError()
      expect(store.error).toBe('')
    })

    it('应该在没有游戏状态时处理nextTurn', () => {
      // 没有创建游戏就调用nextTurn，应该不会出错
      expect(() => store.nextTurn()).not.toThrow()
    })

    it('应该在没有找到玩家时处理updatePlayer', () => {
      store.createGame('测试玩家')
      
      // 使用不存在的玩家ID
      expect(() => store.updatePlayer('non-existent-id', {})).not.toThrow()
    })
  })

  describe('游戏重置', () => {
    let store: ReturnType<typeof useGameStore>

    beforeEach(() => {
      store = useGameStore()
      store.createGame('测试玩家')
      store.setError('测试错误')
    })

    it('应该能重置游戏状态', () => {
      store.resetGame()
      
      expect(store.gameState).toBeNull()
      expect(store.error).toBe('')
      expect(store.isLoading).toBe(false)
    })
  })
}) 