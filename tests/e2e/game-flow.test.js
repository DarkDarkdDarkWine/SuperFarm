const request = require('supertest')
const app = require('../../backend/src/app')

describe('完整游戏流程 E2E 测试', () => {
  let server
  
  beforeAll(async () => {
    // 启动测试服务器
    server = app.listen(0)
  })

  afterAll(async () => {
    // 关闭测试服务器
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  describe('单人游戏流程', () => {
    it('应该完成完整的单人游戏流程', async () => {
      // 1. 获取AI性格列表
      const personalitiesResponse = await request(app)
        .get('/api/ai/personalities')
        .expect(200)

      expect(personalitiesResponse.body.success).toBe(true)
      expect(personalitiesResponse.body.data).toHaveLength(3)

      // 2. 模拟游戏状态
      const gameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map([
          ['human-player', {
            id: 'human-player',
            name: '玩家',
            isAI: false,
            animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
            protectionItems: { smallDog: 0, bigDog: 0 }
          }],
          ['ai-player-1', {
            id: 'ai-player-1',
            name: '稳重老王',
            isAI: true,
            animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
            protectionItems: { smallDog: 0, bigDog: 0 }
          }]
        ]),
        currentDiceValues: ['rabbit', 'rabbit'],
        gamePhase: 'DICE_PHASE',
        turnCount: 1
      }

      // 3. 请求AI决策
      const decisionResponse = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState,
          personality: 'conservative'
        })
        .expect(200)

      expect(decisionResponse.body.success).toBe(true)
      expect(decisionResponse.body.data).toHaveProperty('action')
      expect(decisionResponse.body.data).toHaveProperty('priority')
      expect(decisionResponse.body.data).toHaveProperty('reasoning')

      // 4. 验证AI决策合理性
      const decision = decisionResponse.body.data
      const validActions = ['BREED', 'TRADE', 'PASS']
      expect(validActions).toContain(decision.action)
      expect(decision.priority).toBeGreaterThanOrEqual(0)
      expect(decision.priority).toBeLessThanOrEqual(1)
      expect(decision.reasoning).toBeTruthy()

      // 5. 获取AI统计数据
      const statsResponse = await request(app)
        .get('/api/ai/stats/conservative')
        .expect(200)

      expect(statsResponse.body.success).toBe(true)
      expect(statsResponse.body.data).toHaveProperty('totalDecisions')
      expect(statsResponse.body.data).toHaveProperty('averageResponseTime')
    })

    it('应该处理游戏胜利条件', async () => {
      // 模拟接近胜利的游戏状态
      const winningGameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map([
          ['ai-player-1', {
            id: 'ai-player-1',
            name: '智慧张三',
            isAI: true,
            animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 0 },
            protectionItems: { smallDog: 1, bigDog: 0 }
          }]
        ]),
        currentDiceValues: ['horse', 'horse'],
        gamePhase: 'DICE_PHASE',
        turnCount: 15
      }

      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: winningGameState,
          personality: 'balanced'
        })
        .expect(200)

      const decision = response.body.data
      // AI应该倾向于获取马匹来获胜
      expect(['BREED', 'TRADE']).toContain(decision.action)
      expect(decision.priority).toBeGreaterThan(0.7) // 高优先级决策
    })

    it('应该处理危险情况（狐狸/狼攻击）', async () => {
      const dangerGameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map([
          ['ai-player-1', {
            id: 'ai-player-1',
            name: '天才李四',
            isAI: true,
            animals: { rabbit: 3, sheep: 2, pig: 0, cow: 0, horse: 0 },
            protectionItems: { smallDog: 0, bigDog: 0 }
          }]
        ]),
        currentDiceValues: ['fox', 'wolf'],
        gamePhase: 'DICE_PHASE',
        turnCount: 8
      }

      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: dangerGameState,
          personality: 'aggressive'
        })
        .expect(200)

      const decision = response.body.data
      // 面对危险，AI应该有防御意识
      expect(decision.reasoning).toMatch(/(狐狸|狼|危险|保护|损失)/i)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的游戏状态', async () => {
      const invalidGameState = {
        // 缺少必要字段
        currentPlayerId: null
      }

      await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: invalidGameState,
          personality: 'conservative'
        })
        .expect(400)
    })

    it('应该处理无效的AI性格', async () => {
      const gameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map(),
        currentDiceValues: [],
        gamePhase: 'DICE_PHASE',
        turnCount: 1
      }

      await request(app)
        .post('/api/ai/decision')
        .send({
          gameState,
          personality: 'invalid_personality'
        })
        .expect(400)
    })
  })

  describe('性能测试', () => {
    it('AI决策响应时间应少于5秒', async () => {
      const gameState = {
        currentPlayerId: 'ai-player-1',
        players: new Map([
          ['ai-player-1', {
            id: 'ai-player-1',
            name: 'AI玩家',
            isAI: true,
            animals: { rabbit: 2, sheep: 1, pig: 1, cow: 0, horse: 0 },
            protectionItems: { smallDog: 1, bigDog: 0 }
          }]
        ]),
        currentDiceValues: ['rabbit', 'sheep'],
        gamePhase: 'DICE_PHASE',
        turnCount: 10
      }

      const startTime = Date.now()
      
      await request(app)
        .post('/api/ai/decision')
        .send({
          gameState,
          personality: 'balanced'
        })
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(5000) // 5秒以内
    })
  })
}) 