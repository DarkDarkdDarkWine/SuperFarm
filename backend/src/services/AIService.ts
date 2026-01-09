/**
 * AI服务 - DeepSeek集成与信息隔离
 */

import type {
  GameState,
  FilteredGameState,
  AIDecisionRequest,
  AIDecisionResponse,
  PlayerAction,
  AIDifficulty,
} from '../../../shared/types/game';

export class AIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 过滤游戏状态，实现信息隔离
   */
  filterGameState(gameState: GameState, aiPlayerId: string): FilteredGameState {
    const aiPlayer = gameState.players.find(p => p.id === aiPlayerId);

    if (!aiPlayer) {
      throw new Error(`AI player ${aiPlayerId} not found`);
    }

    return {
      roomId: gameState.roomId,
      mode: gameState.mode,
      currentRound: gameState.currentRound,
      currentPlayerIndex: gameState.currentPlayerIndex,
      phase: gameState.phase,

      // 银行库存（公开）
      bank: { ...gameState.bank },

      // AI自己的信息（私有）
      myPlayer: {
        id: aiPlayer.id,
        name: aiPlayer.name,
        animals: { ...aiPlayer.animals },
        protection: { ...aiPlayer.protection },
      },

      // 对手的公开信息
      opponents: gameState.players
        .filter(p => p.id !== aiPlayerId)
        .map(p => ({
          id: p.id,
          name: p.name,
          animals: { ...p.animals },
          protection: { ...p.protection },
        })),

      // 最近的骰子结果（如果有）
      lastDiceResult: gameState.diceResult.length > 0 ? gameState.diceResult : undefined,
    };
  }

  /**
   * 获取AI决策
   */
  async getDecision(request: AIDecisionRequest): Promise<AIDecisionResponse> {
    const startTime = Date.now();

    try {
      // 构建提示词
      const prompt = this.buildPrompt(request);

      // 调用DeepSeek API
      const response = await this.callDeepSeekAPI(prompt, request.difficulty);

      // 解析响应
      const actions = this.parseResponse(response);

      const thinkingTime = Date.now() - startTime;

      return {
        playerId: request.playerId,
        actions,
        reasoning: response.reasoning || '根据当前局势做出决策',
        confidence: response.confidence || 0.7,
        thinkingTime,
      };
    } catch (error) {
      console.error('AI decision error:', error);

      // 返回兜底策略：不做任何操作
      return {
        playerId: request.playerId,
        actions: [],
        reasoning: 'AI决策失败，跳过本次操作',
        confidence: 0,
        thinkingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(request: AIDecisionRequest): string {
    const { gameView, difficulty, mode } = request;

    const systemPrompt = this.getSystemPrompt(difficulty);
    const gameStateDesc = this.describeGameState(gameView);

    return `${systemPrompt}

# 当前游戏状态

${gameStateDesc}

# 可执行操作

你现在处于**交换阶段**，可以执行以下操作（可以不执行）：

1. **交换动物**（无次数限制）
   - 6只兔子 ↔ 1只羊
   - 2只羊 ↔ 1只猪
   - 3只猪 ↔ 1只牛
   - 2只牛 ↔ 1只马
   - 支持反向交换（降级）

2. **购买防护**
   - 1只兔子 → 1只小狗（防御狐狸）
   - 1只羊 → 1只大狗（防御狼）

# 策略提示

- **偶数原则**：保持偶数数量的动物，避免繁殖损失
- **先交换后掷骰子**：利用交换调整数量
- **奇数危险**：如果你有奇数动物，繁殖时会损失

# 输出格式

请以JSON格式输出你的决策：

\`\`\`json
{
  "reasoning": "你的决策理由",
  "confidence": 0.8,
  "actions": [
    {
      "type": "exchange",
      "from": "rabbit",
      "to": "sheep",
      "fromCount": 6,
      "toCount": 1
    }
  ]
}
\`\`\`

如果不执行任何操作，返回：

\`\`\`json
{
  "reasoning": "保持当前状态",
  "confidence": 0.7,
  "actions": []
}
\`\`\`

现在请做出决策：`;
  }

  /**
   * 获取系统提示词（根据难度）
   */
  private getSystemPrompt(difficulty: AIDifficulty): string {
    const prompts = {
      easy: `你是"稳重老王"，一个保守稳健的农场主。

性格特点：
- 风险厌恶，优先防御
- 喜欢积累资源，不轻易交换
- 遇到威胁时优先购买防护道具
- 决策谨慎，避免冒险

策略要点：
1. 优先保持偶数数量的动物
2. 兔子数量>10时考虑购买小狗
3. 不要过早交换高级动物
4. 看到对手领先时，才加快节奏`,

      medium: `你是"智慧张三"，一个平衡发展的农场主。

性格特点：
- 攻守兼备，时机把握准确
- 根据局势灵活调整策略
- 计算精准，不浪费资源

策略要点：
1. 保持偶数动物数量
2. 适时交换，快速升级
3. 根据对手进度调整策略
4. 防护和发展并重`,

      hard: `你是"天才李四"，一个激进冒险的农场主。

性格特点：
- 追求效率最大化
- 敢于冒险，主动进攻
- 快速升级动物，直奔目标

策略要点：
1. 快速积累兔子，立即交换高级动物
2. 不购买防护道具（除非必要），全力发展
3. 使用"资源封锁"战术（大量持有某种动物）
4. 计算对手距离胜利的步数，抢先获胜

高级技巧：
- 奇数动物也不怕，可能掷出正好的骰子
- 观察银行库存，垄断关键资源`,
    };

    return prompts[difficulty];
  }

  /**
   * 描述游戏状态
   */
  private describeGameState(gameView: FilteredGameState): string {
    const { myPlayer, opponents, bank, currentRound, mode } = gameView;

    let desc = `## 基本信息
- 游戏模式：${mode}
- 当前回合：${currentRound}

## 你的农场
- 兔子：${myPlayer.animals.rabbit}只
- 羊：${myPlayer.animals.sheep}只
- 猪：${myPlayer.animals.pig}只
- 牛：${myPlayer.animals.cow}只
- 马：${myPlayer.animals.horse}只
- 小狗：${myPlayer.protection.smallDog}只
- 大狗：${myPlayer.protection.bigDog}只

## 银行库存
- 兔子：${bank.rabbit}只
- 羊：${bank.sheep}只
- 猪：${bank.pig}只
- 牛：${bank.cow}只
- 马：${bank.horse}只
- 小狗：${bank.smallDog}只
- 大狗：${bank.bigDog}只

## 对手情况
`;

    opponents.forEach((opp, i) => {
      desc += `
### 对手${i + 1}：${opp.name}
- 兔子：${opp.animals.rabbit}只
- 羊：${opp.animals.sheep}只
- 猪：${opp.animals.pig}只
- 牛：${opp.animals.cow}只
- 马：${opp.animals.horse}只
- 小狗：${opp.protection.smallDog}只
- 大狗：${opp.protection.bigDog}只
`;
    });

    return desc;
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(
    prompt: string,
    difficulty: AIDifficulty
  ): Promise<any> {
    const temperature = this.getTemperature(difficulty);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 尝试解析JSON
    try {
      // 提取JSON代码块
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // 直接解析
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      return {
        reasoning: 'AI响应解析失败',
        confidence: 0,
        actions: [],
      };
    }
  }

  /**
   * 根据难度获取温度参数
   */
  private getTemperature(difficulty: AIDifficulty): number {
    const temperatures = {
      easy: 0.9,
      medium: 0.5,
      hard: 0.2,
    };

    return temperatures[difficulty];
  }

  /**
   * 解析AI响应
   */
  private parseResponse(response: any): PlayerAction[] {
    if (!response.actions || !Array.isArray(response.actions)) {
      return [];
    }

    return response.actions.filter((action: any) => {
      // 基本验证
      if (!action.type) return false;

      if (action.type === 'exchange') {
        return (
          action.from &&
          action.to &&
          typeof action.fromCount === 'number' &&
          typeof action.toCount === 'number'
        );
      }

      if (action.type === 'buy_protection') {
        return action.protection === 'smallDog' || action.protection === 'bigDog';
      }

      return false;
    });
  }
}
