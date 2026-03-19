/**
 * 游戏引擎 - 核心游戏逻辑
 */

import type {
  GameState,
  PlayerState,
  AnimalType,
  DiceResult,
  GameMode,
  ExchangeAction,
  BuyProtectionAction,
  ValidationResult,
  Bank,
} from '../../../shared/types/game';
import { GAME_CONSTANTS } from '../../../shared/types/game';

export class GameEngine {
  /**
   * 初始化游戏状态
   */
  static initGame(
    roomId: string,
    players: Array<{ id: string; name: string; type: 'human' | 'ai' }>,
    mode: GameMode = 'classic'
  ): GameState {
    const initialAnimals = GAME_CONSTANTS.INITIAL_ANIMALS[mode];
    const bank: Bank = { ...GAME_CONSTANTS.INITIAL_BANK };

    const playerStates: PlayerState[] = players.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      animals: { ...initialAnimals },
      protection: { smallDog: 0, bigDog: 0 },
      isWinner: false,
    }));

    for (const player of playerStates) {
      bank.rabbit -= player.animals.rabbit;
      bank.sheep -= player.animals.sheep;
      bank.pig -= player.animals.pig;
      bank.cow -= player.animals.cow;
      bank.horse -= player.animals.horse;
    }

    return {
      roomId,
      mode,
      currentRound: 1,
      currentPlayerIndex: 0,
      phase: 'exchange',
      players: playerStates,
      bank,
      diceResult: [],
      history: [],
    };
  }

  /**
   * 掷骰子 - 使用两个不同的骰子 per v2 rules
   * 骰子A: rabbit x6, sheep x2, pig x2, horse x1, fox x1
   * 骰子B: rabbit x6, sheep x3, pig x1, cow x1, wolf x1
   */
  static rollDice(mode: GameMode): DiceResult[] {
    void mode;
    // 骰子A (橙色)
    const diceA = GAME_CONSTANTS.DICE_A[Math.floor(Math.random() * GAME_CONSTANTS.DICE_A.length)];
    // 骰子B (蓝色)
    const diceB = GAME_CONSTANTS.DICE_B[Math.floor(Math.random() * GAME_CONSTANTS.DICE_B.length)];

    return [diceA, diceB];
  }

  /**
   * 计算繁殖获得数量（标准算法）
   * 规则：gain = floor((现有 + 骰子) / 2)
   * 最终数量由调用方计算：currentCount + gain
   * 注意：此方法不处理"无种不繁殖"和银行库存限制，这些由 processBreeding 处理
   */
  static calculateBreeding(currentCount: number, diceCount: number): number {
    return Math.floor((currentCount + diceCount) / 2);
  }

  /**
   * 验证交换动作
   */
  static validateExchange(
    player: PlayerState,
    bank: Bank,
    action: ExchangeAction
  ): ValidationResult {
    const { from, to, fromCount, toCount } = action;

    // 检查玩家是否有足够的动物
    if (player.animals[from] < fromCount) {
      return {
        valid: false,
        reason: `你只有${player.animals[from]}只${from}，不足${fromCount}只`,
      };
    }

    // 检查银行是否有足够的动物
    if (bank[to] < toCount) {
      return {
        valid: false,
        reason: `银行只剩${bank[to]}只${to}，无法交换`,
      };
    }

    // 验证交换比例
    const validExchanges: Record<string, { fromCount: number; toCount: number }> = {
      'rabbit-sheep': { fromCount: 6, toCount: 1 },
      'sheep-pig': { fromCount: 2, toCount: 1 },
      'pig-cow': { fromCount: 3, toCount: 1 },
      'cow-horse': { fromCount: 2, toCount: 1 },
      // 反向交换
      'sheep-rabbit': { fromCount: 1, toCount: 6 },
      'pig-sheep': { fromCount: 1, toCount: 2 },
      'cow-pig': { fromCount: 1, toCount: 3 },
      'horse-cow': { fromCount: 1, toCount: 2 },
    };

    const key = `${from}-${to}`;
    const rule = validExchanges[key];

    if (!rule) {
      return {
        valid: false,
        reason: `不存在从${from}到${to}的交换规则`,
      };
    }

    if (rule.fromCount !== fromCount || rule.toCount !== toCount) {
      return {
        valid: false,
        reason: `交换比例错误，应该是${rule.fromCount}只${from}换${rule.toCount}只${to}`,
      };
    }

    return { valid: true };
  }

  /**
   * 执行交换
   */
  static executeExchange(
    player: PlayerState,
    bank: Bank,
    action: ExchangeAction
  ): void {
    const { from, to, fromCount, toCount } = action;

    // 扣除玩家的动物
    player.animals[from] -= fromCount;

    // 归还银行
    bank[from] += fromCount;

    // 从银行取出
    bank[to] -= toCount;

    // 给玩家
    player.animals[to] += toCount;
  }

  /**
   * 验证购买防护
   * 规则：1只羊 → 1只小狗（防御狐狸），1只牛 → 1只大狗（防御狼）
   */
  static validateBuyProtection(
    player: PlayerState,
    bank: Bank,
    action: BuyProtectionAction
  ): ValidationResult {
    const { protection } = action;

    // 检查银行库存
    if (bank[protection] <= 0) {
      return {
        valid: false,
        reason: `银行没有${protection}了`,
      };
    }

    // 检查购买代价
    if (protection === 'smallDog') {
      if (player.animals.sheep < 1) {
        return {
          valid: false,
          reason: '需要1只羊购买小狗',
        };
      }
    } else if (protection === 'bigDog') {
      if (player.animals.cow < 1) {
        return {
          valid: false,
          reason: '需要1只牛购买大狗',
        };
      }
    }

    return { valid: true };
  }

  /**
   * 执行购买防护
   */
  static executeBuyProtection(
    player: PlayerState,
    bank: Bank,
    action: BuyProtectionAction
  ): void {
    const { protection } = action;

    if (protection === 'smallDog') {
      player.animals.sheep -= 1;
      bank.sheep += 1;
      player.protection.smallDog += 1;
      bank.smallDog -= 1;
    } else if (protection === 'bigDog') {
      player.animals.cow -= 1;
      bank.cow += 1;
      player.protection.bigDog += 1;
      bank.bigDog -= 1;
    }
  }

  /**
   * 处理繁殖阶段
   * 规则v2：
   * 1. "有种才能繁殖" - 玩家必须已有该动物，或骰子投出双同动物
   * 2. 繁殖公式：获得数量 = floor((玩家已有 + 骰子投出) / 2)
   * 3. 受银行库存限制
   */
  static processBreeding(
    gameState: GameState
  ): Record<AnimalType, { old: number; new: number; change: number }> {
    const player = gameState.players[gameState.currentPlayerIndex];
    const diceResult = gameState.diceResult;

    // 统计骰子中的动物
    const diceAnimals: Partial<Record<AnimalType, number>> = {};
    diceResult.forEach(face => {
      if (
        face === 'rabbit' ||
        face === 'sheep' ||
        face === 'pig' ||
        face === 'cow' ||
        face === 'horse'
      ) {
        diceAnimals[face] = (diceAnimals[face] || 0) + 1;
      }
    });

      const results: Record<
      AnimalType,
      { old: number; new: number; change: number }
    > = {} as Record<AnimalType, { old: number; new: number; change: number }>;

    // 处理所有动物类型的繁殖
    const animalTypes: AnimalType[] = ['rabbit', 'sheep', 'pig', 'cow', 'horse'];

    animalTypes.forEach(animal => {
      const currentCount = player.animals[animal];
      const diceCount = diceAnimals[animal] || 0;

      // ⚠️ 关键规则1: 骰子没有掷出该动物，不发生任何变化
      if (diceCount === 0) {
        results[animal] = {
          old: currentCount,
          new: currentCount,
          change: 0,
        };
        return; // 跳过该动物
      }

      // 骰子掷出该动物时先计入数量，再参与繁殖（两个独立步骤）
      // 当玩家一只都没有时，至少得到 1 只（骰子到达）
      let totalGain = GameEngine.calculateBreeding(currentCount, diceCount);
      if (currentCount === 0 && diceCount > 0) {
        totalGain = Math.max(totalGain, 1);
      }

      // 受银行库存限制
      const actualGain = Math.min(totalGain, gameState.bank[animal]);
      const newCount = currentCount + actualGain;
      const change = actualGain;

      // 更新玩家动物数量
      player.animals[animal] = newCount;

      // 从银行取出
      if (change > 0) {
        gameState.bank[animal] -= change;
      }

      results[animal] = {
        old: currentCount,
        new: newCount,
        change,
      };
    });

    return results;
  }

  /**
   * 处理狐狸攻击
   */
  static processFoxAttack(
    attacker: PlayerState,
    victim: PlayerState,
    bank: Bank,
    mode: GameMode
  ): { blocked: boolean; rabbitsLost: number } {
    // 检查是否有小狗防护
    if (victim.protection.smallDog > 0) {
      victim.protection.smallDog -= 1;
      bank.smallDog += 1;
      return { blocked: true, rabbitsLost: 0 };
    }

    // 根据模式处理攻击
    let rabbitsLost: number;

    if (mode === 'classic' || mode === 'hard') {
      // 经典模式：清空所有兔子
      rabbitsLost = victim.animals.rabbit;
      victim.animals.rabbit = 0;
    } else {
      // 休闲模式：减少5只，最少保留1只
      if (victim.animals.rabbit <= 1) {
        rabbitsLost = 0;
      } else {
        rabbitsLost = Math.min(victim.animals.rabbit - 1, 5);
        victim.animals.rabbit = Math.max(1, victim.animals.rabbit - 5);
      }
    }

    // 归还银行
    bank.rabbit += rabbitsLost;

    return { blocked: false, rabbitsLost };
  }

  /**
   * 处理狼攻击（困难模式）
   */
  static processWolfAttack(
    attacker: PlayerState,
    victim: PlayerState,
    bank: Bank
  ): { blocked: boolean; animalsLost: Record<string, number> } {
    // 检查是否有大狗防护
    if (victim.protection.bigDog > 0) {
      victim.protection.bigDog -= 1;
      bank.bigDog += 1;
      return { blocked: true, animalsLost: {} };
    }

    // 失去所有兔子、羊、猪、牛（马和小狗保留）
    const animalsLost = {
      rabbit: victim.animals.rabbit,
      sheep: victim.animals.sheep,
      pig: victim.animals.pig,
      cow: victim.animals.cow,
    };

    bank.rabbit += victim.animals.rabbit;
    bank.sheep += victim.animals.sheep;
    bank.pig += victim.animals.pig;
    bank.cow += victim.animals.cow;

    victim.animals.rabbit = 0;
    victim.animals.sheep = 0;
    victim.animals.pig = 0;
    victim.animals.cow = 0;

    return { blocked: false, animalsLost };
  }

  /**
   * 检查胜利条件
   */
  static checkVictory(player: PlayerState): boolean {
    return (
      player.animals.rabbit >= 1 &&
      player.animals.sheep >= 1 &&
      player.animals.pig >= 1 &&
      player.animals.cow >= 1 &&
      player.animals.horse >= 1
    );
  }

  /**
   * 检查是否超过最大回合数
   */
  static isGameTimeout(gameState: GameState): boolean {
    const maxRounds = GAME_CONSTANTS.MAX_ROUNDS[gameState.mode];
    return gameState.currentRound > maxRounds;
  }

  /**
   * 平局判定
   */
  static resolveTie(
    players: PlayerState[]
  ): PlayerState | null {
    // 1. 比较动物种类数
    const getAnimalTypes = (p: PlayerState) => {
      let count = 0;
      if (p.animals.rabbit > 0) count++;
      if (p.animals.sheep > 0) count++;
      if (p.animals.pig > 0) count++;
      if (p.animals.cow > 0) count++;
      if (p.animals.horse > 0) count++;
      return count;
    };

    let winners = [...players];

    const types = winners.map(getAnimalTypes);
    const maxTypes = Math.max(...types);
    winners = winners.filter((_, i) => types[i] === maxTypes);

    if (winners.length === 1) return winners[0];

    // 2. 比较最高级动物数量
    const animalPriority: AnimalType[] = ['horse', 'cow', 'pig', 'sheep', 'rabbit'];

    for (const animal of animalPriority) {
      const counts = winners.map(p => p.animals[animal]);
      const maxCount = Math.max(...counts);
      winners = winners.filter(p => p.animals[animal] === maxCount);

      if (winners.length === 1) return winners[0];
    }

    // 3. 比较总动物数量
    const getTotalAnimals = (p: PlayerState) =>
      p.animals.rabbit +
      p.animals.sheep +
      p.animals.pig +
      p.animals.cow +
      p.animals.horse;

    const totals = winners.map(getTotalAnimals);
    const maxTotal = Math.max(...totals);
    winners = winners.filter(p => getTotalAnimals(p) === maxTotal);

    if (winners.length === 1) return winners[0];

    // 完全平局
    return null;
  }
}
