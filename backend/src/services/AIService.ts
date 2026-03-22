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

export type AIProvider = 'deepseek' | 'minimax' | 'zhipu';

export const PROVIDER_CONFIGS: Record<AIProvider, {
  baseUrl: string;
  testModel: string;
  models: string[];
  label: string;
}> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    testModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    label: 'DeepSeek',
  },
  minimax: {
    baseUrl: 'https://api.minimaxi.com/v1',
    testModel: 'MiniMax-M2.5',
    models: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.1', 'MiniMax-M2'],
    label: 'MiniMax',
  },
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    testModel: 'glm-4-flash-250414',
    models: ['glm-5', 'glm-5-turbo', 'glm-4.7', 'glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4-flash-250414'],
    label: '智谱',
  },
};

export class AIService {
  private apiKey: string;
  private provider: AIProvider = 'deepseek';
  private model: string = 'deepseek-chat';

  constructor(apiKey: string, provider: AIProvider = 'deepseek', model: string = 'deepseek-chat') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model;
  }

  updateApiKey(key: string): void {
    this.apiKey = key;
  }

  updateProvider(provider: AIProvider, model: string): void {
    this.provider = provider;
    this.model = model;
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

      // 调用AI API
      const response = await this.callAIAPI(prompt, request.difficulty);

      // 解析响应
      const actions = this.parseResponse(response);

      const thinkingTime = Date.now() - startTime;

      return {
        playerId: request.playerId,
        actions,
        reasoning: typeof response.reasoning === 'string' ? response.reasoning : '根据当前局势做出决策',
        confidence: typeof response.confidence === 'number' ? response.confidence : 0.7,
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
    const { gameView, difficulty } = request;

    const systemPrompt = this.getSystemPrompt(difficulty);
    const gameStateDesc = this.describeGameState(gameView);

    return `${systemPrompt}

# 当前游戏状态

${gameStateDesc}

# 游戏规则

**胜利条件**：同时拥有兔子、羊、猪、牛、马各至少1只。

**升级交换比例**：6兔→1羊，2羊→1猪，3猪→1牛，2牛→1马
**降级交换比例**：1羊→6兔，1猪→2羊，1牛→3猪，1马→2牛
**购买防护**：1只羊→1只小狗（防狐狸），1只牛→1只大狗（防狼）

# 你现在处于交换阶段

根据你的角色性格和策略，决定本回合执行哪些操作（可以不执行任何操作）。

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
   * 三个难度的核心差异：决策精度（何时交换、是否连锁）
   */
  private getSystemPrompt(difficulty: AIDifficulty): string {
    const prompts = {
      easy: `你是"慢半拍老王"，一个经验不足的新手农场主。

你的决策特点：
- 每次回合只会做一件事（换一次，或买一只狗，或什么都不做）
- 对交换的时机不敏感，通常要等到动物"堆积很多"才意识到可以换
  - 兔子积累到 12 只以上，你才可能想到去换羊
  - 羊积累到 4 只以上，你才可能想到去换猪
  - 其他动物类似，比标准比例多一倍才反应过来
- 偶尔会想到买防护（但花费判断不准确）
- 有时候会选择"什么都不做"，觉得先看看情况

这些特点导致你比最优策略慢很多，但你是真实在玩，不会故意犯错。`,

      medium: `你是"稳健张三"，一个有一定经验的农场主。

你的决策特点：
- 了解基本的升级阈值（6兔换羊、2羊换猪、3猪换牛、2牛换马）
- 手里有足够的动物就会去换，但一次通常只执行一两步
- 偶尔会注意到可以连续升级，但不会每次都完美链式操作
- 对防护的判断比较合理（有需要时才买）
- 不会等到资源大量堆积才行动，反应比较及时`,

      hard: `你是"精算李四"，追求每回合效率最大化的顶级农场主。

你的决策逻辑：
1. 扫描所有可能的升级路径，从低级向高级连锁执行
   - 兔子≥6：执行 6兔→1羊，重复直到不够
   - 羊≥2：执行 2羊→1猪，重复直到不够
   - 猪≥3：执行 3猪→1牛，重复直到不够
   - 牛≥2：执行 2牛→1马，重复直到不够
2. 连锁规则：前一步结束后立即检查下一步，一轮内完成所有可能的升级
3. 防护决策：若当前没有小狗且有羊，考虑买小狗；若没有大狗且有牛，考虑买大狗
4. 银行库存不足时，优先换更高价值的动物

你每回合会给出多个 actions，充分利用交换阶段。`,
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
   * 调用AI API
   */
  private async callAIAPI(
    prompt: string,
    difficulty: AIDifficulty
  ): Promise<Record<string, unknown>> {
    const temperature = this.getTemperature(difficulty);

    if (!this.apiKey) {
      throw new Error('AI API key is not configured');
    }

    const response = await fetch(`${PROVIDER_CONFIGS[this.provider].baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek API returned an empty response');
    }

    // 打印原始响应供调试
    console.log(`[AI raw response] ${content.slice(0, 300)}`);

    // 尝试解析JSON（多种格式兼容）
    try {
      // 提取JSON代码块（允许行尾空白/CRLF/多余内容）
      const jsonMatch = content.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // 尝试提取第一个 {...} 块
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0]);
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
    const actions = response.actions;

    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.filter((action: unknown): action is PlayerAction => {
      if (!action || typeof action !== 'object') return false;

      const candidate = action as Record<string, unknown>;

      // 基本验证
      if (typeof candidate.type !== 'string') return false;

      if (candidate.type === 'exchange') {
        return (
          typeof candidate.from === 'string' &&
          typeof candidate.to === 'string' &&
          typeof candidate.fromCount === 'number' &&
          typeof candidate.toCount === 'number'
        );
      }

      if (candidate.type === 'buy_protection') {
        return candidate.protection === 'smallDog' || candidate.protection === 'bigDog';
      }

      return false;
    });
  }
}
