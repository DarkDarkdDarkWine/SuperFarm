import { GameRules } from '@/utils/gameRules'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import type { Player, DiceResult, ExchangeAction, AnimalCollection, ProtectionCollection } from '@/types/game'

/**
 * 游戏服务类
 * 整合游戏规则引擎和状态管理，提供高级游戏操作接口
 */
export class GameService {
  private gameStore = useGameStore()
  private playerStore = usePlayerStore()

  /**
   * 初始化游戏
   */
  initGame(): void {
    this.gameStore.initGame()
    this.playerStore.resetPlayers()
    this.gameStore.setGamePhase('preparing')
  }

  /**
   * 掷骰子
   * @returns 骰子结果
   */
  rollDice(): DiceResult[] {
    const result = GameRules.rollDice()
    this.gameStore.setDiceResult(result)
    this.gameStore.setGamePhase('processing')
    return result
  }

  /**
   * 处理骰子结果
   * @param playerId 玩家ID
   * @param diceResult 骰子结果
   */
  processDiceResult(playerId: string, diceResult: DiceResult[]): void {
    const player = this.playerStore.getPlayer(playerId)
    
    // 统计动物骰子
    const animalCounts = {
      rabbit: 0,
      sheep: 0,
      pig: 0,
      cow: 0,
      horse: 0
    }
    
    let attackResults: string[] = []
    
    // 处理每个骰子面
    diceResult.forEach(face => {
      if (face in animalCounts) {
        animalCounts[face as keyof typeof animalCounts]++
      } else if (face === 'fox') {
        const attacked = GameRules.processFoxAttack(player)
        if (attacked) {
          attackResults.push('狐狸攻击成功！兔子只剩1只')
        } else {
          attackResults.push('小狗成功阻挡了狐狸攻击')
        }
      } else if (face === 'wolf') {
        const attacked = GameRules.processWolfAttack(player)
        if (attacked) {
          attackResults.push('狼攻击成功！失去了所有兔子和羊')
        } else {
          attackResults.push('大狗成功阻挡了狼攻击')
        }
      }
    })

    // 处理动物繁殖
    const breedingResults: { animal: string; oldCount: number; newCount: number; bred: number }[] = []
    
    Object.entries(animalCounts).forEach(([animal, diceCount]) => {
      if (diceCount > 0) {
        const currentCount = player.animals[animal as keyof AnimalCollection]
        const breedableCount = GameRules.calculateBreeding(currentCount, diceCount)
        
        if (breedableCount > 0) {
          // 从银行获取动物 (考虑银行库存限制)
          const actualBreedCount = this.gameStore.takeFromBank(
            animal as keyof AnimalCollection, 
            breedableCount
          )
          
          // 更新玩家动物数量
          const newCount = currentCount + actualBreedCount
          this.playerStore.updatePlayerAnimals(playerId, { 
            [animal]: newCount 
          })
          
          breedingResults.push({
            animal,
            oldCount: currentCount,
            newCount,
            bred: actualBreedCount
          })
        }
      }
    })

    // 记录游戏动作
    this.gameStore.addGameAction({
      type: attackResults.length > 0 ? 'attack' : 'breed',
      player: playerId,
      timestamp: Date.now(),
      details: { 
        diceResult, 
        animalCounts, 
        breedingResults,
        attackResults
      }
    })
  }

  /**
   * 执行动物交换
   * @param playerId 玩家ID
   * @param exchange 交换动作
   * @returns 是否交换成功
   */
  exchangeAnimals(playerId: string, exchange: ExchangeAction): boolean {
    const player = this.playerStore.getPlayer(playerId)
    
    // 验证交换是否合法
    if (!GameRules.validateExchange(player, exchange)) {
      return false
    }

    // 执行交换
    const success = GameRules.executeExchange(player, exchange)
    
    if (success) {
      // 记录交换动作
      this.gameStore.addGameAction({
        type: 'exchange',
        player: playerId,
        timestamp: Date.now(),
        details: exchange
      })
    }
    
    return success
  }

  /**
   * 购买防护道具
   * @param playerId 玩家ID
   * @param item 防护道具类型
   * @returns 是否购买成功
   */
  buyProtection(playerId: string, item: 'smallDog' | 'bigDog'): boolean {
    const player = this.playerStore.getPlayer(playerId)
    
    // 验证是否可以购买
    if (!GameRules.validateProtectionPurchase(player, item)) {
      return false
    }

    // 检查银行是否有库存
    const bankAvailable = this.gameStore.takeProtectionFromBank(item, 1)
    if (bankAvailable === 0) {
      return false // 银行没有库存
    }

    // 执行购买
    const success = GameRules.buyProtection(player, item)
    
    if (success) {
      // 记录购买动作
      this.gameStore.addGameAction({
        type: 'buy_protection',
        player: playerId,
        timestamp: Date.now(),
        details: { item }
      })
    } else {
      // 购买失败，归还银行库存
      this.gameStore.updateBank({ [item]: this.gameStore.bank[item] + 1 })
    }
    
    return success
  }

  /**
   * 检查并处理胜利条件
   * @param playerId 玩家ID
   * @returns 是否获胜
   */
  checkWinCondition(playerId: string): boolean {
    const player = this.playerStore.getPlayer(playerId)
    const hasWon = GameRules.checkWinCondition(player)
    
    if (hasWon) {
      this.playerStore.setPlayerWinner(playerId)
      this.gameStore.setWinner(playerId)
    }
    
    return hasWon
  }

  /**
   * 结束当前玩家回合
   */
  endTurn(): void {
    // 检查当前玩家是否获胜
    const currentPlayer = this.gameStore.currentPlayer
    if (this.checkWinCondition(currentPlayer)) {
      return // 游戏结束
    }

    // 切换到下一个玩家
    this.gameStore.switchPlayer()
    this.gameStore.setGamePhase('rolling')
  }

  /**
   * 获取玩家可用的交换选项
   * @param playerId 玩家ID
   * @returns 可用的交换选项
   */
  getAvailableExchanges(playerId: string): ExchangeAction[] {
    const player = this.playerStore.getPlayer(playerId)
    return GameRules.getAvailableExchanges(player)
  }

  /**
   * 获取玩家策略建议
   * @param playerId 玩家ID
   * @returns 策略建议
   */
  getStrategySuggestions(playerId: string): string[] {
    const player = this.playerStore.getPlayer(playerId)
    return GameRules.getStrategySuggestions(player)
  }

  /**
   * 获取游戏状态摘要
   * @returns 游戏状态摘要
   */
  getGameSummary() {
    return {
      gameInfo: this.gameStore.getGameStats(),
      humanPlayer: this.playerStore.getPlayerSummary('human'),
      aiPlayer: this.playerStore.getPlayerSummary('ai'),
      currentPhase: this.gameStore.currentPhaseText,
      lastDiceResult: this.gameStore.diceResult,
      bankStatus: { ...this.gameStore.bank }
    }
  }

  /**
   * 重置游戏
   */
  resetGame(): void {
    this.gameStore.resetGame()
    this.playerStore.resetPlayers()
  }
} 