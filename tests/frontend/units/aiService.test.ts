import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiService } from '@/services/aiService'
import type { GameState, AIDecision } from '@/types/game'

// Mock fetch
global.fetch = vi.fn()

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requestAIDecision', () => {
    it('应该成功请求AI决策', async () => {
      const mockResponse: AIDecision = {
        action: 'ROLL_DICE',
        priority: 0.8,
        reasoning: '开始游戏需要投掷骰子'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      } as Response)

      const gameState: GameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map(),
        currentDiceValues: [],
        gamePhase: 'DICE_PHASE',
        turnCount: 1
      }

      const result = await aiService.requestAIDecision(gameState, 'conservative')
      
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('/api/ai/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState,
          personality: 'conservative'
        })
      })
    })

    it('应该处理网络错误', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const gameState: GameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map(),
        currentDiceValues: [],
        gamePhase: 'DICE_PHASE',
        turnCount: 1
      }

      await expect(
        aiService.requestAIDecision(gameState, 'balanced')
      ).rejects.toThrow('AI服务请求失败')
    })

    it('应该处理API错误响应', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const gameState: GameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map(),
        currentDiceValues: [],
        gamePhase: 'DICE_PHASE',
        turnCount: 1
      }

      await expect(
        aiService.requestAIDecision(gameState, 'aggressive')
      ).rejects.toThrow('AI服务响应错误')
    })
  })

  describe('getAIPersonalities', () => {
    it('应该获取AI性格列表', async () => {
      const mockPersonalities = [
        { id: 'conservative', name: '稳重老王', description: '保守策略' },
        { id: 'balanced', name: '智慧张三', description: '平衡策略' },
        { id: 'aggressive', name: '天才李四', description: '激进策略' }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPersonalities })
      } as Response)

      const result = await aiService.getAIPersonalities()
      
      expect(result).toEqual(mockPersonalities)
      expect(fetch).toHaveBeenCalledWith('/api/ai/personalities')
    })
  })

  describe('getAIStats', () => {
    it('应该获取AI统计数据', async () => {
      const mockStats = {
        totalGames: 100,
        winRate: 0.65,
        averageDecisionTime: 2.3
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats })
      } as Response)

      const result = await aiService.getAIStats('conservative')
      
      expect(result).toEqual(mockStats)
      expect(fetch).toHaveBeenCalledWith('/api/ai/stats/conservative')
    })
  })
}) 