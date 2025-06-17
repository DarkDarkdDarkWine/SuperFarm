import { describe, it, expect, beforeEach } from 'vitest'
import { GameRules } from '../../../frontend/src/utils/gameRules.js'
import type { Player } from '../../../frontend/src/types/game.js'

describe('GameRules', () => {
  let mockPlayer: Player
  
  beforeEach(() => {
    mockPlayer = {
      id: 'test-player',
      name: '测试玩家',
      type: 'human',
      animals: {
        rabbit: 2,
        sheep: 1,
        pig: 0,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 0,
        bigDog: 0
      },
      isWinner: false
    }
  })

  describe('rollDice', () => {
    it('应该返回两个骰子结果', () => {
      const result = GameRules.rollDice()
      expect(result).toHaveLength(2)
      expect(Array.isArray(result)).toBe(true)
    })

    it('骰子结果应该都是有效的面', () => {
      const validFaces = ['rabbit', 'sheep', 'pig', 'cow', 'horse', 'fox', 'wolf']
      const result = GameRules.rollDice()
      
      result.forEach(face => {
        expect(validFaces).toContain(face)
      })
    })
  })

  describe('calculateBreeding', () => {
    it('应该正确计算繁殖数量', () => {
      expect(GameRules.calculateBreeding(2, 1)).toBe(1) // (2+1)/2 = 1
      expect(GameRules.calculateBreeding(3, 2)).toBe(2) // (3+2)/2 = 2
      expect(GameRules.calculateBreeding(1, 1)).toBe(1) // (1+1)/2 = 1
      expect(GameRules.calculateBreeding(0, 1)).toBe(0) // (0+1)/2 = 0
    })

    it('应该向下取整', () => {
      expect(GameRules.calculateBreeding(2, 2)).toBe(2) // (2+2)/2 = 2
      expect(GameRules.calculateBreeding(1, 2)).toBe(1) // (1+2)/2 = 1 (向下取整)
    })
  })

  describe('processFoxAttack', () => {
    it('有小狗防护时应该消耗1只小狗并返回false', () => {
      mockPlayer.protection.smallDog = 1
      mockPlayer.animals.rabbit = 5

      const result = GameRules.processFoxAttack(mockPlayer)

      expect(result).toBe(false) // 攻击被阻挡
      expect(mockPlayer.protection.smallDog).toBe(0) // 消耗了1只小狗
      expect(mockPlayer.animals.rabbit).toBe(5) // 兔子数量未变
    })

    it('没有小狗防护时应该将兔子数量减至1并返回true', () => {
      mockPlayer.protection.smallDog = 0
      mockPlayer.animals.rabbit = 5

      const result = GameRules.processFoxAttack(mockPlayer)

      expect(result).toBe(true) // 攻击成功
      expect(mockPlayer.animals.rabbit).toBe(1) // 兔子只剩1只
      expect(mockPlayer.protection.smallDog).toBe(0) // 小狗数量未变
    })
  })

  describe('processWolfAttack', () => {
    it('有大狗防护时应该消耗1只大狗并返回false', () => {
      mockPlayer.protection.bigDog = 1
      mockPlayer.animals.rabbit = 3
      mockPlayer.animals.sheep = 2

      const result = GameRules.processWolfAttack(mockPlayer)

      expect(result).toBe(false) // 攻击被阻挡
      expect(mockPlayer.protection.bigDog).toBe(0) // 消耗了1只大狗
      expect(mockPlayer.animals.rabbit).toBe(3) // 兔子数量未变
      expect(mockPlayer.animals.sheep).toBe(2) // 羊数量未变
    })

    it('没有大狗防护时应该清零兔子和羊并返回true', () => {
      mockPlayer.protection.bigDog = 0
      mockPlayer.animals.rabbit = 3
      mockPlayer.animals.sheep = 2

      const result = GameRules.processWolfAttack(mockPlayer)

      expect(result).toBe(true) // 攻击成功
      expect(mockPlayer.animals.rabbit).toBe(0) // 兔子被吃光
      expect(mockPlayer.animals.sheep).toBe(0) // 羊被吃光
      expect(mockPlayer.protection.bigDog).toBe(0) // 大狗数量未变
    })
  })

  describe('validateExchange', () => {
    it('应该验证有效的兔子换羊交换', () => {
      mockPlayer.animals.rabbit = 6

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 6,
        toCount: 1
      }

      expect(GameRules.validateExchange(mockPlayer, exchange)).toBe(true)
    })

    it('应该拒绝动物数量不足的交换', () => {
      mockPlayer.animals.rabbit = 3 // 不足6只

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 6,
        toCount: 1
      }

      expect(GameRules.validateExchange(mockPlayer, exchange)).toBe(false)
    })

    it('应该拒绝错误的交换比例', () => {
      mockPlayer.animals.rabbit = 10

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 5, // 错误的比例，应该是6
        toCount: 1
      }

      expect(GameRules.validateExchange(mockPlayer, exchange)).toBe(false)
    })
  })

  describe('executeExchange', () => {
    it('应该正确执行有效的交换', () => {
      mockPlayer.animals.rabbit = 6
      mockPlayer.animals.sheep = 1

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 6,
        toCount: 1
      }

      const result = GameRules.executeExchange(mockPlayer, exchange)

      expect(result).toBe(true)
      expect(mockPlayer.animals.rabbit).toBe(0) // 6-6=0
      expect(mockPlayer.animals.sheep).toBe(2) // 1+1=2
    })

    it('应该拒绝执行无效的交换', () => {
      mockPlayer.animals.rabbit = 3 // 不足6只
      const originalRabbit = mockPlayer.animals.rabbit
      const originalSheep = mockPlayer.animals.sheep

      const exchange = {
        from: 'rabbit' as const,
        to: 'sheep' as const,
        fromCount: 6,
        toCount: 1
      }

      const result = GameRules.executeExchange(mockPlayer, exchange)

      expect(result).toBe(false)
      expect(mockPlayer.animals.rabbit).toBe(originalRabbit) // 数量未变
      expect(mockPlayer.animals.sheep).toBe(originalSheep) // 数量未变
    })
  })

  describe('checkWinCondition', () => {
    it('应该在拥有所有动物时返回true', () => {
      mockPlayer.animals = {
        rabbit: 1,
        sheep: 1,
        pig: 1,
        cow: 1,
        horse: 1
      }

      expect(GameRules.checkWinCondition(mockPlayer)).toBe(true)
    })

    it('应该在缺少任何动物时返回false', () => {
      mockPlayer.animals = {
        rabbit: 1,
        sheep: 1,
        pig: 1,
        cow: 1,
        horse: 0 // 缺少马
      }

      expect(GameRules.checkWinCondition(mockPlayer)).toBe(false)
    })

    it('应该在动物数量大于1时也返回true', () => {
      mockPlayer.animals = {
        rabbit: 5,
        sheep: 3,
        pig: 2,
        cow: 1,
        horse: 1
      }

      expect(GameRules.checkWinCondition(mockPlayer)).toBe(true)
    })
  })

  describe('validateProtectionPurchase', () => {
    it('应该允许购买小狗当有足够的羊', () => {
      mockPlayer.animals.sheep = 1
      mockPlayer.protection.smallDog = 0

      expect(GameRules.validateProtectionPurchase(mockPlayer, 'smallDog')).toBe(true)
    })

    it('应该拒绝购买小狗当羊不足', () => {
      mockPlayer.animals.sheep = 0
      mockPlayer.protection.smallDog = 0

      expect(GameRules.validateProtectionPurchase(mockPlayer, 'smallDog')).toBe(false)
    })

    it('应该拒绝购买小狗当已达到上限', () => {
      mockPlayer.animals.sheep = 1
      mockPlayer.protection.smallDog = 2 // 已达到上限

      expect(GameRules.validateProtectionPurchase(mockPlayer, 'smallDog')).toBe(false)
    })

    it('应该允许购买大狗当有足够的猪', () => {
      mockPlayer.animals.pig = 1
      mockPlayer.protection.bigDog = 0

      expect(GameRules.validateProtectionPurchase(mockPlayer, 'bigDog')).toBe(true)
    })

    it('应该拒绝购买大狗当已达到上限', () => {
      mockPlayer.animals.pig = 1
      mockPlayer.protection.bigDog = 1 // 已达到上限

      expect(GameRules.validateProtectionPurchase(mockPlayer, 'bigDog')).toBe(false)
    })
  })

  describe('buyProtection', () => {
    it('应该正确购买小狗', () => {
      mockPlayer.animals.sheep = 2
      mockPlayer.protection.smallDog = 0

      const result = GameRules.buyProtection(mockPlayer, 'smallDog')

      expect(result).toBe(true)
      expect(mockPlayer.animals.sheep).toBe(1) // 消耗了1只羊
      expect(mockPlayer.protection.smallDog).toBe(1) // 获得了1只小狗
    })

    it('应该正确购买大狗', () => {
      mockPlayer.animals.pig = 2
      mockPlayer.protection.bigDog = 0

      const result = GameRules.buyProtection(mockPlayer, 'bigDog')

      expect(result).toBe(true)
      expect(mockPlayer.animals.pig).toBe(1) // 消耗了1只猪
      expect(mockPlayer.protection.bigDog).toBe(1) // 获得了1只大狗
    })

    it('应该拒绝无效的购买', () => {
      mockPlayer.animals.sheep = 0 // 没有羊
      const originalSheep = mockPlayer.animals.sheep
      const originalSmallDog = mockPlayer.protection.smallDog

      const result = GameRules.buyProtection(mockPlayer, 'smallDog')

      expect(result).toBe(false)
      expect(mockPlayer.animals.sheep).toBe(originalSheep) // 数量未变
      expect(mockPlayer.protection.smallDog).toBe(originalSmallDog) // 数量未变
    })
  })

  describe('getAvailableExchanges', () => {
    it('应该返回所有可用的交换选项', () => {
      mockPlayer.animals = {
        rabbit: 12, // 可以换2次羊
        sheep: 4,   // 可以换2次猪
        pig: 3,     // 可以换1次牛
        cow: 2,     // 可以换1次马
        horse: 0
      }

      const exchanges = GameRules.getAvailableExchanges(mockPlayer)

      expect(exchanges).toHaveLength(4)
      expect(exchanges.some(e => e.from === 'rabbit' && e.to === 'sheep')).toBe(true)
      expect(exchanges.some(e => e.from === 'sheep' && e.to === 'pig')).toBe(true)
      expect(exchanges.some(e => e.from === 'pig' && e.to === 'cow')).toBe(true)
      expect(exchanges.some(e => e.from === 'cow' && e.to === 'horse')).toBe(true)
    })

    it('应该只返回可负担的交换选项', () => {
      mockPlayer.animals = {
        rabbit: 3, // 不足6只，不能换羊
        sheep: 1,  // 不足2只，不能换猪
        pig: 3,    // 可以换1次牛
        cow: 0,    // 不足2只，不能换马
        horse: 0
      }

      const exchanges = GameRules.getAvailableExchanges(mockPlayer)

      expect(exchanges).toHaveLength(1)
      expect(exchanges[0].from).toBe('pig')
      expect(exchanges[0].to).toBe('cow')
    })
  })

  describe('calculateProgress', () => {
    it('应该正确计算游戏进度', () => {
      // 拥有3种动物：60%进度
      mockPlayer.animals = {
        rabbit: 1,
        sheep: 1,
        pig: 1,
        cow: 0,
        horse: 0
      }

      expect(GameRules.calculateProgress(mockPlayer)).toBe(0.6)
    })

    it('应该计算完整进度为1.0', () => {
      mockPlayer.animals = {
        rabbit: 1,
        sheep: 1,
        pig: 1,
        cow: 1,
        horse: 1
      }

      expect(GameRules.calculateProgress(mockPlayer)).toBe(1.0)
    })

    it('应该计算空进度为0', () => {
      mockPlayer.animals = {
        rabbit: 0,
        sheep: 0,
        pig: 0,
        cow: 0,
        horse: 0
      }

      expect(GameRules.calculateProgress(mockPlayer)).toBe(0)
    })
  })
}) 