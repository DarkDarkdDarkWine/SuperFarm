import type { Player, AnimalCollection, DiceResult, ExchangeAction } from '@/types/game'
import { GAME_CONSTANTS } from '@/types/game'

/**
 * 游戏规则引擎
 * 包含所有游戏逻辑的纯函数
 */
export class GameRules {
  
  /**
   * 掷骰子 - 生成两个12面骰子的结果
   */
  static rollDice(): DiceResult[] {
    const dice1 = GAME_CONSTANTS.DICE_FACES[Math.floor(Math.random() * 12)]
    const dice2 = GAME_CONSTANTS.DICE_FACES[Math.floor(Math.random() * 12)]
    return [dice1, dice2]
  }

  /**
   * 计算动物繁殖
   * @param currentCount 当前拥有的动物数量
   * @param diceCount 骰子显示的动物数量
   * @returns 可以繁殖出的新动物数量
   */
  static calculateBreeding(currentCount: number, diceCount: number): number {
    const total = currentCount + diceCount
    return Math.floor(total / 2) // 每2个相同动物繁殖1个
  }

  /**
   * 处理狐狸攻击
   * @param player 被攻击的玩家
   * @returns 是否攻击成功（true: 攻击成功, false: 被防护阻挡）
   */
  static processFoxAttack(player: Player): boolean {
    if (player.protection.smallDog > 0) {
      // 有小狗防护，消耗1只小狗
      player.protection.smallDog--
      return false // 攻击被阻挡
    } else {
      // 没有防护，兔子被吃光只剩1只
      player.animals.rabbit = 1
      return true // 攻击成功
    }
  }

  /**
   * 处理狼攻击
   * @param player 被攻击的玩家
   * @returns 是否攻击成功（true: 攻击成功, false: 被防护阻挡）
   */
  static processWolfAttack(player: Player): boolean {
    if (player.protection.bigDog > 0) {
      // 有大狗防护，消耗1只大狗
      player.protection.bigDog--
      return false // 攻击被阻挡
    } else {
      // 没有防护，失去所有兔子和羊
      player.animals.rabbit = 0
      player.animals.sheep = 0
      return true // 攻击成功
    }
  }

  /**
   * 验证交换是否合法
   * @param player 进行交换的玩家
   * @param exchange 交换动作
   * @returns 是否可以进行交换
   */
  static validateExchange(player: Player, exchange: ExchangeAction): boolean {
    const { from, to, fromCount } = exchange
    
    // 检查是否有足够的动物进行交换
    if (player.animals[from] < fromCount) {
      return false
    }

    // 检查交换比例是否正确
    const validExchanges = {
      'rabbit-sheep': fromCount === GAME_CONSTANTS.EXCHANGE_RATES.rabbitToSheep,
      'sheep-pig': fromCount === GAME_CONSTANTS.EXCHANGE_RATES.sheepToPig,
      'pig-cow': fromCount === GAME_CONSTANTS.EXCHANGE_RATES.pigToCow,
      'cow-horse': fromCount === GAME_CONSTANTS.EXCHANGE_RATES.cowToHorse
    }

    const exchangeKey = `${from}-${to}` as keyof typeof validExchanges
    return validExchanges[exchangeKey] || false
  }

  /**
   * 执行动物交换
   * @param player 进行交换的玩家
   * @param exchange 交换动作
   * @returns 是否交换成功
   */
  static executeExchange(player: Player, exchange: ExchangeAction): boolean {
    if (!this.validateExchange(player, exchange)) {
      return false
    }

    const { from, to, fromCount, toCount } = exchange
    player.animals[from] -= fromCount
    player.animals[to] += toCount
    return true
  }

  /**
   * 验证防护购买
   * @param player 购买防护的玩家
   * @param item 防护道具类型
   * @returns 是否可以购买
   */
  static validateProtectionPurchase(player: Player, item: 'smallDog' | 'bigDog'): boolean {
    if (item === 'smallDog') {
      // 需要1只羊，且小狗数量不超过上限
      return player.animals.sheep >= 1 && 
             player.protection.smallDog < GAME_CONSTANTS.MAX_PROTECTION.smallDog
    } else if (item === 'bigDog') {
      // 需要1只猪，且大狗数量不超过上限
      return player.animals.pig >= 1 && 
             player.protection.bigDog < GAME_CONSTANTS.MAX_PROTECTION.bigDog
    }
    return false
  }

  /**
   * 购买防护
   * @param player 购买防护的玩家
   * @param item 防护道具类型
   * @returns 是否购买成功
   */
  static buyProtection(player: Player, item: 'smallDog' | 'bigDog'): boolean {
    if (!this.validateProtectionPurchase(player, item)) {
      return false
    }

    if (item === 'smallDog') {
      player.animals.sheep--
      player.protection.smallDog++
    } else if (item === 'bigDog') {
      player.animals.pig--
      player.protection.bigDog++
    }
    return true
  }

  /**
   * 检查胜利条件
   * @param player 检查的玩家
   * @returns 是否满足胜利条件
   */
  static checkWinCondition(player: Player): boolean {
    return player.animals.rabbit >= 1 &&
           player.animals.sheep >= 1 &&
           player.animals.pig >= 1 &&
           player.animals.cow >= 1 &&
           player.animals.horse >= 1
  }

  /**
   * 获取可用的交换选项
   * @param player 玩家
   * @returns 可用的交换选项列表
   */
  static getAvailableExchanges(player: Player): ExchangeAction[] {
    const exchanges: ExchangeAction[] = []

    // 6兔换1羊
    if (player.animals.rabbit >= GAME_CONSTANTS.EXCHANGE_RATES.rabbitToSheep) {
      exchanges.push({
        from: 'rabbit',
        to: 'sheep',
        fromCount: GAME_CONSTANTS.EXCHANGE_RATES.rabbitToSheep,
        toCount: 1
      })
    }

    // 2羊换1猪
    if (player.animals.sheep >= GAME_CONSTANTS.EXCHANGE_RATES.sheepToPig) {
      exchanges.push({
        from: 'sheep',
        to: 'pig',
        fromCount: GAME_CONSTANTS.EXCHANGE_RATES.sheepToPig,
        toCount: 1
      })
    }

    // 3猪换1牛
    if (player.animals.pig >= GAME_CONSTANTS.EXCHANGE_RATES.pigToCow) {
      exchanges.push({
        from: 'pig',
        to: 'cow',
        fromCount: GAME_CONSTANTS.EXCHANGE_RATES.pigToCow,
        toCount: 1
      })
    }

    // 2牛换1马
    if (player.animals.cow >= GAME_CONSTANTS.EXCHANGE_RATES.cowToHorse) {
      exchanges.push({
        from: 'cow',
        to: 'horse',
        fromCount: GAME_CONSTANTS.EXCHANGE_RATES.cowToHorse,
        toCount: 1
      })
    }

    return exchanges
  }

  /**
   * 计算玩家的游戏进度
   * @param player 玩家
   * @returns 游戏进度（0-1之间）
   */
  static calculateProgress(player: Player): number {
    const animalTypes = ['rabbit', 'sheep', 'pig', 'cow', 'horse'] as const
    let progress = 0
    
    animalTypes.forEach(animal => {
      if (player.animals[animal] > 0) {
        progress += 0.2 // 每种动物占20%进度
      }
    })
    
    return progress
  }

  /**
   * 获取玩家的战略建议
   * @param player 玩家
   * @returns 战略建议数组
   */
  static getStrategySuggestions(player: Player): string[] {
    const suggestions: string[] = []
    const availableExchanges = this.getAvailableExchanges(player)
    
    // 交换建议
    if (availableExchanges.length > 0) {
      suggestions.push(`可以进行${availableExchanges.length}种动物交换`)
    }
    
    // 防护建议
    if (this.validateProtectionPurchase(player, 'smallDog')) {
      suggestions.push('可以购买小狗防护，抵御狐狸攻击')
    }
    if (this.validateProtectionPurchase(player, 'bigDog')) {
      suggestions.push('可以购买大狗防护，抵御狼攻击')
    }
    
    // 胜利条件检查
    const missingAnimals = []
    if (player.animals.rabbit === 0) missingAnimals.push('兔子')
    if (player.animals.sheep === 0) missingAnimals.push('羊')
    if (player.animals.pig === 0) missingAnimals.push('猪')
    if (player.animals.cow === 0) missingAnimals.push('牛')
    if (player.animals.horse === 0) missingAnimals.push('马')
    
    if (missingAnimals.length > 0) {
      suggestions.push(`还需要获得: ${missingAnimals.join('、')}`)
    }
    
    return suggestions
  }
} 