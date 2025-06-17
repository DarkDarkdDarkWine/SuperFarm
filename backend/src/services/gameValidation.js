/**
 * 游戏状态验证服务
 * 验证从前端传来的游戏状态数据的合法性
 */

class GameValidation {
  
  /**
   * 验证游戏状态
   * @param {Object} gameState 游戏状态
   * @returns {Object} 验证结果
   */
  validateGameState(gameState) {
    const errors = [];
    
    // 基本结构验证
    if (!gameState || typeof gameState !== 'object') {
      return {
        isValid: false,
        errors: ['游戏状态必须是一个对象']
      };
    }
    
    // 验证必要字段
    const requiredFields = ['gameId', 'currentRound', 'currentPlayer', 'gamePhase', 'players', 'bank', 'diceResult'];
    for (const field of requiredFields) {
      if (!(field in gameState)) {
        errors.push(`缺少必要字段: ${field}`);
      }
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    // 验证具体字段
    this.validateGameId(gameState.gameId, errors);
    this.validateCurrentRound(gameState.currentRound, errors);
    this.validateCurrentPlayer(gameState.currentPlayer, errors);
    this.validateGamePhase(gameState.gamePhase, errors);
    this.validatePlayers(gameState.players, errors);
    this.validateBank(gameState.bank, errors);
    this.validateDiceResult(gameState.diceResult, errors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 验证游戏ID
   * @param {string} gameId 游戏ID
   * @param {Array} errors 错误列表
   */
  validateGameId(gameId, errors) {
    if (typeof gameId !== 'string' || gameId.length === 0) {
      errors.push('gameId必须是非空字符串');
    }
  }
  
  /**
   * 验证当前回合
   * @param {number} currentRound 当前回合
   * @param {Array} errors 错误列表
   */
  validateCurrentRound(currentRound, errors) {
    if (!Number.isInteger(currentRound) || currentRound < 1) {
      errors.push('currentRound必须是正整数');
    }
  }
  
  /**
   * 验证当前玩家
   * @param {string} currentPlayer 当前玩家
   * @param {Array} errors 错误列表
   */
  validateCurrentPlayer(currentPlayer, errors) {
    if (!['human', 'ai'].includes(currentPlayer)) {
      errors.push('currentPlayer必须是human或ai');
    }
  }
  
  /**
   * 验证游戏阶段
   * @param {string} gamePhase 游戏阶段
   * @param {Array} errors 错误列表
   */
  validateGamePhase(gamePhase, errors) {
    const validPhases = ['preparing', 'rolling', 'processing', 'exchanging', 'ai_thinking', 'finished'];
    if (!validPhases.includes(gamePhase)) {
      errors.push(`gamePhase必须是以下之一: ${validPhases.join(', ')}`);
    }
  }
  
  /**
   * 验证玩家数据
   * @param {Object} players 玩家数据
   * @param {Array} errors 错误列表
   */
  validatePlayers(players, errors) {
    if (!players || typeof players !== 'object') {
      errors.push('players必须是对象');
      return;
    }
    
    // 验证是否有human和ai玩家
    if (!players.human || !players.ai) {
      errors.push('必须包含human和ai两个玩家');
      return;
    }
    
    // 验证每个玩家
    this.validatePlayer(players.human, 'human', errors);
    this.validatePlayer(players.ai, 'ai', errors);
  }
  
  /**
   * 验证单个玩家
   * @param {Object} player 玩家数据
   * @param {string} playerId 玩家ID
   * @param {Array} errors 错误列表
   */
  validatePlayer(player, playerId, errors) {
    if (!player || typeof player !== 'object') {
      errors.push(`${playerId}玩家数据必须是对象`);
      return;
    }
    
    // 验证玩家基本信息
    const requiredFields = ['id', 'name', 'type', 'animals', 'protection', 'isWinner'];
    for (const field of requiredFields) {
      if (!(field in player)) {
        errors.push(`${playerId}玩家缺少字段: ${field}`);
      }
    }
    
    // 验证动物数量
    this.validateAnimalCollection(player.animals, `${playerId}玩家`, errors);
    
    // 验证防护数量
    this.validateProtectionCollection(player.protection, `${playerId}玩家`, errors);
  }
  
  /**
   * 验证动物集合
   * @param {Object} animals 动物集合
   * @param {string} context 上下文
   * @param {Array} errors 错误列表
   */
  validateAnimalCollection(animals, context, errors) {
    if (!animals || typeof animals !== 'object') {
      errors.push(`${context}的animals必须是对象`);
      return;
    }
    
    const requiredAnimals = ['rabbit', 'sheep', 'pig', 'cow', 'horse'];
    for (const animal of requiredAnimals) {
      if (!(animal in animals)) {
        errors.push(`${context}缺少动物: ${animal}`);
      } else if (!Number.isInteger(animals[animal]) || animals[animal] < 0) {
        errors.push(`${context}的${animal}数量必须是非负整数`);
      }
    }
  }
  
  /**
   * 验证防护集合
   * @param {Object} protection 防护集合
   * @param {string} context 上下文
   * @param {Array} errors 错误列表
   */
  validateProtectionCollection(protection, context, errors) {
    if (!protection || typeof protection !== 'object') {
      errors.push(`${context}的protection必须是对象`);
      return;
    }
    
    const requiredProtection = ['smallDog', 'bigDog'];
    for (const item of requiredProtection) {
      if (!(item in protection)) {
        errors.push(`${context}缺少防护: ${item}`);
      } else if (!Number.isInteger(protection[item]) || protection[item] < 0) {
        errors.push(`${context}的${item}数量必须是非负整数`);
      }
    }
    
    // 验证防护数量上限
    if (protection.smallDog > 2) {
      errors.push(`${context}的smallDog数量不能超过2`);
    }
    if (protection.bigDog > 1) {
      errors.push(`${context}的bigDog数量不能超过1`);
    }
  }
  
  /**
   * 验证银行状态
   * @param {Object} bank 银行状态
   * @param {Array} errors 错误列表
   */
  validateBank(bank, errors) {
    if (!bank || typeof bank !== 'object') {
      errors.push('bank必须是对象');
      return;
    }
    
    // 验证银行动物
    this.validateAnimalCollection(bank, '银行', errors);
    
    // 验证银行防护
    this.validateProtectionCollection(bank, '银行', errors);
    
    // 验证银行库存不超过初始值
    const maxValues = {
      rabbit: 60,
      sheep: 24,
      pig: 20,
      cow: 12,
      horse: 4,
      smallDog: 4,
      bigDog: 2
    };
    
    for (const [item, maxValue] of Object.entries(maxValues)) {
      if (bank[item] > maxValue) {
        errors.push(`银行${item}数量不能超过${maxValue}`);
      }
    }
  }
  
  /**
   * 验证骰子结果
   * @param {Array} diceResult 骰子结果
   * @param {Array} errors 错误列表
   */
  validateDiceResult(diceResult, errors) {
    if (!Array.isArray(diceResult)) {
      errors.push('diceResult必须是数组');
      return;
    }
    
    // 验证骰子数量（应该是2个）
    if (diceResult.length !== 2) {
      errors.push('diceResult必须包含2个骰子结果');
      return;
    }
    
    // 验证每个骰子结果
    const validFaces = ['rabbit', 'sheep', 'pig', 'cow', 'horse', 'fox', 'wolf'];
    for (let i = 0; i < diceResult.length; i++) {
      if (!validFaces.includes(diceResult[i])) {
        errors.push(`骰子${i + 1}的结果无效: ${diceResult[i]}`);
      }
    }
  }
  
  /**
   * 验证AI决策
   * @param {Object} decision AI决策
   * @returns {Object} 验证结果
   */
  validateAIDecision(decision) {
    const errors = [];
    
    if (!decision || typeof decision !== 'object') {
      return {
        isValid: false,
        errors: ['AI决策必须是对象']
      };
    }
    
    // 验证必要字段
    const requiredFields = ['analysis', 'actions', 'reasoning'];
    for (const field of requiredFields) {
      if (!(field in decision)) {
        errors.push(`缺少必要字段: ${field}`);
      }
    }
    
    // 验证actions数组
    if (!Array.isArray(decision.actions)) {
      errors.push('actions必须是数组');
    } else {
      for (let i = 0; i < decision.actions.length; i++) {
        this.validateAIAction(decision.actions[i], i, errors);
      }
    }
    
    // 验证confidence
    if ('confidence' in decision) {
      if (typeof decision.confidence !== 'number' || 
          decision.confidence < 0 || 
          decision.confidence > 1) {
        errors.push('confidence必须是0-1之间的数字');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 验证AI动作
   * @param {Object} action AI动作
   * @param {number} index 动作索引
   * @param {Array} errors 错误列表
   */
  validateAIAction(action, index, errors) {
    if (!action || typeof action !== 'object') {
      errors.push(`动作${index}必须是对象`);
      return;
    }
    
    if (!action.type) {
      errors.push(`动作${index}缺少type字段`);
      return;
    }
    
    switch (action.type) {
      case 'exchange':
        this.validateExchangeAction(action, index, errors);
        break;
      case 'buy_protection':
        this.validateBuyProtectionAction(action, index, errors);
        break;
      default:
        errors.push(`动作${index}的type无效: ${action.type}`);
    }
  }
  
  /**
   * 验证交换动作
   * @param {Object} action 交换动作
   * @param {number} index 动作索引
   * @param {Array} errors 错误列表
   */
  validateExchangeAction(action, index, errors) {
    if (!action.exchange) {
      errors.push(`交换动作${index}缺少exchange字段`);
      return;
    }
    
    const { exchange } = action;
    const requiredFields = ['from', 'to', 'fromCount', 'toCount'];
    
    for (const field of requiredFields) {
      if (!(field in exchange)) {
        errors.push(`交换动作${index}缺少字段: ${field}`);
      }
    }
    
    // 验证动物类型
    const validAnimals = ['rabbit', 'sheep', 'pig', 'cow', 'horse'];
    if (!validAnimals.includes(exchange.from)) {
      errors.push(`交换动作${index}的from无效: ${exchange.from}`);
    }
    if (!validAnimals.includes(exchange.to)) {
      errors.push(`交换动作${index}的to无效: ${exchange.to}`);
    }
    
    // 验证数量
    if (!Number.isInteger(exchange.fromCount) || exchange.fromCount <= 0) {
      errors.push(`交换动作${index}的fromCount必须是正整数`);
    }
    if (!Number.isInteger(exchange.toCount) || exchange.toCount !== 1) {
      errors.push(`交换动作${index}的toCount必须是1`);
    }
  }
  
  /**
   * 验证购买防护动作
   * @param {Object} action 购买防护动作
   * @param {number} index 动作索引
   * @param {Array} errors 错误列表
   */
  validateBuyProtectionAction(action, index, errors) {
    if (!action.protection) {
      errors.push(`购买防护动作${index}缺少protection字段`);
      return;
    }
    
    if (!['smallDog', 'bigDog'].includes(action.protection)) {
      errors.push(`购买防护动作${index}的protection无效: ${action.protection}`);
    }
  }
}

module.exports = new GameValidation(); 