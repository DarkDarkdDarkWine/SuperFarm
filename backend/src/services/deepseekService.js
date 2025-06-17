const axios = require('axios');
const logger = require('../utils/logger');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-chat';
    
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
    }
  }

  /**
   * 获取AI决策
   * @param {Object} gameState 游戏状态
   * @param {string} difficulty 难度等级
   * @returns {Promise<Object>} AI决策
   */
  async getAIDecision(gameState, difficulty = 'medium') {
    const prompt = this.buildPrompt(gameState, difficulty);
    
    try {
      logger.info(`开始调用DeepSeek API - 游戏ID: ${gameState.gameId}, 难度: ${difficulty}`);
      
      const response = await axios.post(this.baseURL, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(difficulty)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.getTemperature(difficulty),
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      });

      const aiResponse = response.data.choices[0].message.content;
      const decision = this.parseAIResponse(aiResponse);
      
      logger.info(`DeepSeek API调用成功 - 游戏ID: ${gameState.gameId}`);
      return decision;
      
    } catch (error) {
      logger.error('DeepSeek API调用失败:', {
        error: error.message,
        gameId: gameState.gameId,
        difficulty,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      throw new Error('AI服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 构建AI提示词
   * @param {Object} gameState 游戏状态
   * @param {string} difficulty 难度等级
   * @returns {string} 提示词
   */
  buildPrompt(gameState, difficulty) {
    const { players, bank, diceResult, currentRound } = gameState;
    
    return `你是超级农场主游戏的AI玩家，请分析当前局面并制定策略。

## 当前游戏状态
**回合数**: ${currentRound}
**骰子结果**: ${JSON.stringify(diceResult)}

**人类玩家状态**:
- 动物: ${JSON.stringify(players.human.animals)}
- 防护: ${JSON.stringify(players.human.protection)}

**AI玩家状态 (你)**:
- 动物: ${JSON.stringify(players.ai.animals)}
- 防护: ${JSON.stringify(players.ai.protection)}

**银行剩余**: ${JSON.stringify(bank)}

## 游戏规则提醒
- **胜利条件**: 收集齐兔子、羊、猪、牛、马各1只
- **繁殖规则**: 每2个相同动物繁殖1个新动物
- **交换比例**: 6兔→1羊, 2羊→1猪, 3猪→1牛, 2牛→1马
- **防护购买**: 1羊→1小狗(防狐狸), 1猪→1大狗(防狼)
- **攻击威胁**: 狐狸会吃光兔子只剩1只，狼会吃光兔子和羊

## 策略要求
根据${difficulty}难度制定策略，优先考虑：
${this.getDifficultyStrategy(difficulty)}

请返回JSON格式决策：
{
  "analysis": "你的分析思路（50字以内）",
  "actions": [
    {"type": "exchange", "exchange": {"from": "rabbit", "to": "sheep", "fromCount": 6, "toCount": 1}},
    {"type": "buy_protection", "protection": "smallDog"}
  ],
  "reasoning": "决策理由（100字以内）",
  "confidence": 0.8
}

注意：
1. 只能交换你当前拥有的动物
2. 必须严格按照交换比例
3. 购买防护需要消耗对应动物
4. 每回合可以进行多个操作`;
  }

  /**
   * 获取系统提示词
   * @param {string} difficulty 难度等级
   * @returns {string} 系统提示词
   */
  getSystemPrompt(difficulty) {
    const prompts = {
      easy: `你是一个谨慎保守的农场主，名叫"稳重老王"。你的策略特点：
- 优先购买防护道具，避免被攻击损失
- 保守的资源管理，不轻易进行高风险交换
- 稳扎稳打，虽然速度慢但求稳定发展
- 当有足够资源时才考虑向上交换`,

      medium: `你是一个经验丰富的农场主，名叫"智慧张三"。你的策略特点：
- 根据局面灵活调整策略，平衡风险和收益
- 适度的风险评估，该冒险时果断出手
- 优先发展缺少的动物类型，追求平衡发展
- 在安全和效率之间找到最佳平衡点`,

      hard: `你是一个精明的农场主，名叫"天才李四"。你的策略特点：
- 激进的扩张策略，追求最快胜利
- 精确的数学计算，最大化每回合收益
- 复杂的前瞻性规划，考虑多步后的局面
- 敢于承担风险，但有精确的风险控制`
    };
    
    return prompts[difficulty] || prompts.medium;
  }

  /**
   * 获取难度对应的策略重点
   * @param {string} difficulty 难度等级
   * @returns {string} 策略重点
   */
  getDifficultyStrategy(difficulty) {
    const strategies = {
      easy: '1. 防护安全 2. 稳定发展 3. 避免损失',
      medium: '1. 平衡发展 2. 适度冒险 3. 灵活应变',
      hard: '1. 最大收益 2. 快速胜利 3. 精确计算'
    };
    
    return strategies[difficulty] || strategies.medium;
  }

  /**
   * 获取温度参数
   * @param {string} difficulty 难度等级
   * @returns {number} 温度值
   */
  getTemperature(difficulty) {
    const temperatures = {
      easy: 0.3,    // 更保守，少变化
      medium: 0.5,  // 中等创造性
      hard: 0.7     // 更多创新策略
    };
    return temperatures[difficulty] || 0.5;
  }

  /**
   * 解析AI响应
   * @param {string} aiResponse AI原始响应
   * @returns {Object} 解析后的决策
   */
  parseAIResponse(aiResponse) {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 验证必要字段
        if (!parsed.analysis || !parsed.actions || !Array.isArray(parsed.actions)) {
          throw new Error('AI响应格式不完整');
        }
        
        // 设置默认值
        parsed.reasoning = parsed.reasoning || '无具体说明';
        parsed.confidence = parsed.confidence || 0.5;
        
        return parsed;
      }
      
      throw new Error('无法从响应中找到有效JSON');
    } catch (error) {
      logger.warn('AI响应解析失败，使用默认策略:', error.message);
      
      // 返回安全的默认决策
      return {
        analysis: 'AI响应解析失败，使用保守策略',
        actions: [],
        reasoning: '系统自动生成的保守策略，避免执行可能有问题的操作',
        confidence: 0.2
      };
    }
  }

  /**
   * 验证AI决策的合法性
   * @param {Object} decision AI决策
   * @param {Object} gameState 当前游戏状态
   * @returns {Object} 验证后的决策
   */
  validateDecision(decision, gameState) {
    if (!decision.actions || !Array.isArray(decision.actions)) {
      return { ...decision, actions: [] };
    }

    const validActions = [];
    const aiPlayer = gameState.players.ai;

    for (const action of decision.actions) {
      if (this.isValidAction(action, aiPlayer, gameState.bank)) {
        validActions.push(action);
      } else {
        logger.warn('无效的AI动作被过滤:', action);
      }
    }

    return {
      ...decision,
      actions: validActions
    };
  }

  /**
   * 验证单个动作是否合法
   * @param {Object} action 动作
   * @param {Object} player 玩家
   * @param {Object} bank 银行状态
   * @returns {boolean} 是否合法
   */
  isValidAction(action, player, bank) {
    switch (action.type) {
      case 'exchange':
        return this.validateExchangeAction(action.exchange, player);
      case 'buy_protection':
        return this.validateProtectionAction(action.protection, player, bank);
      default:
        return false;
    }
  }

  /**
   * 验证交换动作
   * @param {Object} exchange 交换信息
   * @param {Object} player 玩家
   * @returns {boolean} 是否合法
   */
  validateExchangeAction(exchange, player) {
    if (!exchange || !exchange.from || !exchange.to || !exchange.fromCount) {
      return false;
    }

    const { from, to, fromCount } = exchange;
    
    // 检查是否有足够的动物
    if (player.animals[from] < fromCount) {
      return false;
    }

    // 检查交换比例
    const validExchanges = {
      'rabbit-sheep': fromCount === 6,
      'sheep-pig': fromCount === 2,
      'pig-cow': fromCount === 3,
      'cow-horse': fromCount === 2
    };

    return validExchanges[`${from}-${to}`] || false;
  }

  /**
   * 验证防护购买动作
   * @param {string} protection 防护类型
   * @param {Object} player 玩家
   * @param {Object} bank 银行状态
   * @returns {boolean} 是否合法
   */
  validateProtectionAction(protection, player, bank) {
    if (protection === 'smallDog') {
      return player.animals.sheep >= 1 && 
             player.protection.smallDog < 2 && 
             bank.smallDog > 0;
    } else if (protection === 'bigDog') {
      return player.animals.pig >= 1 && 
             player.protection.bigDog < 1 && 
             bank.bigDog > 0;
    }
    return false;
  }
}

module.exports = new DeepSeekService(); 