import type { GameState, Player, AIDecision, AIAction, ExchangeAction } from '@/types/game'

export class AIService {
  private baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api'
  private requestTimeout = 10000 // 10秒超时

  /**
   * 获取AI决策
   * @param gameState 当前游戏状态
   * @param aiPlayer AI玩家信息
   * @param humanPlayer 人类玩家信息
   * @param difficulty 难度等级
   * @returns AI决策结果
   */
  async getAIDecision(
    gameState: GameState, 
    aiPlayer: Player, 
    humanPlayer: Player, 
    difficulty: string = 'medium'
  ): Promise<AIDecision> {
    try {
      console.log('🤖 请求AI决策...', { gameState, difficulty })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout)

      const response = await fetch(`${this.baseURL}/ai/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          gameState,
          aiPlayer,
          humanPlayer,
          difficulty
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`AI服务错误: ${response.status} ${response.statusText}`)
      }

      const decision = await response.json() as AIDecision
      
      console.log('✅ AI决策获取成功:', decision)
      return decision

    } catch (error) {
      console.error('❌ 获取AI决策失败:', error)
      
      // 返回备用决策
      return this.getFallbackDecision(aiPlayer, humanPlayer)
    }
  }

  /**
   * 获取AI人格设定列表
   */
  async getAIPersonalities(): Promise<Array<{id: string, name: string, description: string}>> {
    try {
      const response = await fetch(`${this.baseURL}/ai/personalities`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`获取AI人格失败: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取AI人格失败:', error)
      return [
        { id: 'balanced', name: '平衡型', description: '攻守兼备的策略' },
        { id: 'aggressive', name: '进攻型', description: '积极扩张的策略' },
        { id: 'defensive', name: '防守型', description: '稳重保守的策略' }
      ]
    }
  }

  /**
   * 检查AI服务健康状态
   */
  async checkHealth(): Promise<{status: string, message: string}> {
    try {
      const response = await fetch(`${this.baseURL}/ai/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`健康检查失败: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('AI服务健康检查失败:', error)
      return { status: 'error', message: '服务不可用' }
    }
  }

  /**
   * 备用AI决策（本地简单规则AI）
   */
  private getFallbackDecision(aiPlayer: Player, humanPlayer: Player): AIDecision {
    console.log('🔄 使用备用AI策略...')
    
    const actions: AIAction[] = []
    let analysis = '使用本地备用AI策略。'
    let reasoning = ''

    // 优先级1：检查是否可以购买防护
    if (aiPlayer.animals.sheep >= 1 && aiPlayer.protection.smallDog === 0) {
      actions.push({
        type: 'buy_protection',
        protection: 'smallDog'
      })
      reasoning += '购买小狗防护以对抗狐狸攻击。'
    }

    if (aiPlayer.animals.pig >= 1 && aiPlayer.protection.bigDog === 0) {
      actions.push({
        type: 'buy_protection',
        protection: 'bigDog'
      })
      reasoning += '购买大狗防护以对抗狼攻击。'
    }

    // 优先级2：检查是否可以交换动物
    if (aiPlayer.animals.rabbit >= 6) {
      actions.push({
        type: 'exchange',
        exchange: {
          from: 'rabbit',
          to: 'sheep',
          fromCount: 6,
          toCount: 1
        }
      })
      reasoning += '将6只兔子交换为1只羊。'
    }

    if (aiPlayer.animals.sheep >= 2) {
      actions.push({
        type: 'exchange',
        exchange: {
          from: 'sheep',
          to: 'pig',
          fromCount: 2,
          toCount: 1
        }
      })
      reasoning += '将2只羊交换为1只猪。'
    }

    if (aiPlayer.animals.pig >= 3) {
      actions.push({
        type: 'exchange',
        exchange: {
          from: 'pig',
          to: 'cow',
          fromCount: 3,
          toCount: 1
        }
      })
      reasoning += '将3只猪交换为1只牛。'
    }

    if (aiPlayer.animals.cow >= 2) {
      actions.push({
        type: 'exchange',
        exchange: {
          from: 'cow',
          to: 'horse',
          fromCount: 2,
          toCount: 1
        }
      })
      reasoning += '将2只牛交换为1只马。'
    }

    // 如果没有任何行动，添加基础繁殖行动
    if (actions.length === 0) {
      actions.push({
        type: 'breed',
        animal: 'rabbit',
        count: 1
      })
      reasoning = '执行基础繁殖策略，增加兔子数量。'
    }

    return {
      analysis: `${analysis} 当前AI拥有：兔子${aiPlayer.animals.rabbit}只，羊${aiPlayer.animals.sheep}只，猪${aiPlayer.animals.pig}只，牛${aiPlayer.animals.cow}只，马${aiPlayer.animals.horse}只。`,
      actions,
      reasoning: reasoning || '维持现状，等待更好的机会。',
      confidence: 0.6
    }
  }

  /**
   * 验证AI决策的合法性
   */
  validateAIDecision(decision: AIDecision, aiPlayer: Player): boolean {
    if (!decision || !decision.actions || !Array.isArray(decision.actions)) {
      console.error('AI决策格式无效')
      return false
    }

    for (const action of decision.actions) {
      if (!this.validateAIAction(action, aiPlayer)) {
        console.error('AI行动无效:', action)
        return false
      }
    }

    return true
  }

  /**
   * 验证单个AI行动的合法性
   */
  private validateAIAction(action: AIAction, aiPlayer: Player): boolean {
    switch (action.type) {
      case 'exchange':
        if (!action.exchange) return false
        const { from, to, fromCount } = action.exchange
        return aiPlayer.animals[from] >= fromCount
        
      case 'buy_protection':
        if (!action.protection) return false
        if (action.protection === 'smallDog') {
          return aiPlayer.animals.sheep >= 1 && aiPlayer.protection.smallDog < 2
        } else if (action.protection === 'bigDog') {
          return aiPlayer.animals.pig >= 1 && aiPlayer.protection.bigDog < 1
        }
        return false
        
      case 'breed':
        return true // 繁殖总是合法的
        
      default:
        return false
    }
  }

  /**
   * 执行AI行动延迟，模拟思考时间
   */
  async simulateThinkingTime(complexity: number = 1): Promise<void> {
    const baseDelay = 1000 // 基础1秒
    const maxDelay = 3000 // 最大3秒
    const delay = Math.min(baseDelay + (complexity * 500), maxDelay)
    
    console.log(`🤔 AI正在思考中... (${delay}ms)`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 获取AI行动的描述文本
   */
  getActionDescription(action: AIAction): string {
    switch (action.type) {
      case 'exchange':
        if (!action.exchange) return '无效交换'
        const { from, to, fromCount, toCount } = action.exchange
        const fromName = this.getAnimalName(from)
        const toName = this.getAnimalName(to)
        return `将${fromCount}只${fromName}交换为${toCount}只${toName}`
        
      case 'buy_protection':
        if (!action.protection) return '无效购买'
        return action.protection === 'smallDog' ? '购买小狗防护' : '购买大狗防护'
        
      case 'breed':
        if (!action.animal) return '繁殖动物'
        const animalName = this.getAnimalName(action.animal)
        return `繁殖${animalName}`
        
      default:
        return '未知行动'
    }
  }

  /**
   * 获取动物中文名称
   */
  private getAnimalName(animal: string): string {
    const names = {
      rabbit: '兔子',
      sheep: '羊',
      pig: '猪', 
      cow: '牛',
      horse: '马'
    }
    return names[animal as keyof typeof names] || animal
  }
} 