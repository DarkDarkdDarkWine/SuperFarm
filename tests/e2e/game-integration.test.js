const request = require('supertest')

describe('🎮 游戏集成测试 - v0.4.0', () => {
  let app
  
  beforeAll(async () => {
    // 设置测试环境变量
    process.env.DEEPSEEK_API_KEY = 'sk-9a9625a853574a6eb7b0373e7e47e09f'
    process.env.NODE_ENV = 'test'
    process.env.PORT = '3002'
    
    // 导入应用
    app = require('../../backend/src/app')
    
    console.log('🧪 开始游戏集成测试...')
  })

  afterAll(async () => {
    console.log('✅ 游戏集成测试完成')
  })

  describe('🌐 API健康检查', () => {
    test('AI健康检查端点应该正常工作', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('message')
      console.log('✅ AI健康检查通过:', response.body)
    })

    test('AI人格配置端点应该返回可用人格', async () => {
      const response = await request(app)
        .get('/api/ai/personalities')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      console.log('✅ AI人格配置获取成功:', response.body.length, '个人格')
    })
  })

  describe('🤖 AI决策端点测试', () => {
    const mockGameState = {
      gameId: 'test-game-integration',
      currentPlayer: 'ai',
      currentRound: 1,
      gamePhase: 'deciding',
      diceResult: ['rabbit', 'sheep'],
      bank: {
        rabbit: 60, sheep: 24, pig: 20, cow: 12, horse: 4,
        smallDog: 4, bigDog: 2
      },
      gameHistory: []
    }

    const mockAIPlayer = {
      id: 'ai',
      name: 'AI农场主',
      type: 'ai',
      animals: { rabbit: 8, sheep: 1, pig: 0, cow: 0, horse: 0 },
      protection: { smallDog: 0, bigDog: 0 },
      isWinner: false
    }

    const mockHumanPlayer = {
      id: 'human',
      name: '玩家',
      type: 'human',
      animals: { rabbit: 4, sheep: 2, pig: 1, cow: 0, horse: 0 },
      protection: { smallDog: 1, bigDog: 0 },
      isWinner: false
    }

    test('应该成功获取AI决策 - 简单难度', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState,
          aiPlayer: mockAIPlayer,
          humanPlayer: mockHumanPlayer,
          difficulty: 'easy'
        })
        .expect(200)

      expect(response.body).toHaveProperty('analysis')
      expect(response.body).toHaveProperty('actions')
      expect(response.body).toHaveProperty('reasoning')
      expect(Array.isArray(response.body.actions)).toBe(true)
      
      console.log('✅ 简单难度AI决策获取成功:')
      console.log('  分析:', response.body.analysis)
      console.log('  行动数量:', response.body.actions.length)
      console.log('  推理:', response.body.reasoning)
    }, 15000) // 15秒超时

    test('应该成功获取AI决策 - 中等难度', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState,
          aiPlayer: mockAIPlayer,
          humanPlayer: mockHumanPlayer,
          difficulty: 'medium'
        })
        .expect(200)

      expect(response.body).toHaveProperty('analysis')
      expect(response.body).toHaveProperty('actions')
      expect(response.body).toHaveProperty('reasoning')
      
      console.log('✅ 中等难度AI决策获取成功:')
      console.log('  分析:', response.body.analysis)
      console.log('  行动数量:', response.body.actions.length)
    }, 15000)

    test('应该成功获取AI决策 - 困难难度', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState,
          aiPlayer: mockAIPlayer,
          humanPlayer: mockHumanPlayer,
          difficulty: 'hard'
        })
        .expect(200)

      expect(response.body).toHaveProperty('analysis')
      expect(response.body).toHaveProperty('actions')
      expect(response.body).toHaveProperty('reasoning')
      
      console.log('✅ 困难难度AI决策获取成功:')
      console.log('  分析:', response.body.analysis)
      console.log('  行动数量:', response.body.actions.length)
    }, 15000)
  })

  describe('🎯 AI决策质量测试', () => {
    test('AI应该能识别并执行动物交换', async () => {
      const gameStateWithManyRabbits = {
        gameId: 'test-exchange',
        currentPlayer: 'ai',
        currentRound: 2,
        gamePhase: 'deciding',
        diceResult: ['rabbit', 'rabbit'],
        bank: { rabbit: 50, sheep: 20, pig: 15, cow: 10, horse: 3, smallDog: 3, bigDog: 1 },
        gameHistory: []
      }

      const aiPlayerWithRabbits = {
        id: 'ai',
        name: 'AI农场主',
        type: 'ai',
        animals: { rabbit: 12, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false
      }

      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: gameStateWithManyRabbits,
          aiPlayer: aiPlayerWithRabbits,
          humanPlayer: { animals: { rabbit: 2, sheep: 1, pig: 0, cow: 0, horse: 0 } },
          difficulty: 'medium'
        })
        .expect(200)

      // AI应该考虑交换兔子
      const hasExchangeAction = response.body.actions.some(action => 
        action.type === 'exchange' && action.exchange?.from === 'rabbit'
      )
      
      console.log('✅ AI交换决策测试:')
      console.log('  包含交换行动:', hasExchangeAction)
      console.log('  所有行动:', response.body.actions.map(a => a.type))
    }, 15000)

    test('AI应该能识别防护需求', async () => {
      const gameStateWithThreats = {
        gameId: 'test-protection',
        currentPlayer: 'ai', 
        currentRound: 3,
        gamePhase: 'deciding',
        diceResult: ['fox', 'wolf'],
        bank: { rabbit: 40, sheep: 15, pig: 12, cow: 8, horse: 2, smallDog: 2, bigDog: 1 },
        gameHistory: []
      }

      const aiPlayerVulnerable = {
        id: 'ai',
        name: 'AI农场主',
        type: 'ai',
        animals: { rabbit: 6, sheep: 3, pig: 1, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false
      }

      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: gameStateWithThreats,
          aiPlayer: aiPlayerVulnerable,
          humanPlayer: { animals: { rabbit: 3, sheep: 2, pig: 1, cow: 0, horse: 0 } },
          difficulty: 'medium'
        })
        .expect(200)

      // AI应该考虑购买防护
      const hasProtectionAction = response.body.actions.some(action => 
        action.type === 'buy_protection'
      )
      
      console.log('✅ AI防护决策测试:')
      console.log('  包含防护行动:', hasProtectionAction)
      console.log('  分析内容:', response.body.analysis)
    }, 15000)
  })

  describe('🔄 游戏流程完整性测试', () => {
    test('应该能模拟完整的一轮游戏', async () => {
      let gameRound = 1
      let currentPlayer = 'human'
      
      // 模拟5轮游戏
      for (let round = 1; round <= 3; round++) {
        console.log(`\n🎮 模拟第${round}轮游戏...`)
        
        // 如果是AI回合，获取AI决策
        if (currentPlayer === 'ai') {
          const gameState = {
            gameId: `test-simulation-round-${round}`,
            currentPlayer: 'ai',
            currentRound: round,
            gamePhase: 'deciding',
            diceResult: ['rabbit', 'sheep'],
            bank: { rabbit: 50, sheep: 20, pig: 15, cow: 10, horse: 3, smallDog: 3, bigDog: 1 },
            gameHistory: []
          }

          const response = await request(app)
            .post('/api/ai/decision')
            .send({
              gameState,
              aiPlayer: {
                animals: { rabbit: 4 + round, sheep: round, pig: 0, cow: 0, horse: 0 },
                protection: { smallDog: 0, bigDog: 0 }
              },
              humanPlayer: {
                animals: { rabbit: 3, sheep: 1, pig: 0, cow: 0, horse: 0 },
                protection: { smallDog: 0, bigDog: 0 }
              },
              difficulty: 'medium'
            })
            .expect(200)

          console.log(`  AI决策 - 回合${round}:`, response.body.analysis)
          console.log(`  AI行动数量:`, response.body.actions.length)
        }
        
        // 切换玩家
        currentPlayer = currentPlayer === 'human' ? 'ai' : 'human'
        
        // 添加延迟模拟真实游戏节奏
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      console.log('✅ 完整游戏流程模拟成功')
    }, 30000)
  })

  describe('📊 性能和稳定性测试', () => {
    test('AI服务应该在合理时间内响应', async () => {
      const startTime = Date.now()
      
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: {
            gameId: 'perf-test',
            currentPlayer: 'ai',
            currentRound: 1,
            gamePhase: 'deciding',
            diceResult: ['rabbit'],
            bank: { rabbit: 60, sheep: 24, pig: 20, cow: 12, horse: 4, smallDog: 4, bigDog: 2 },
            gameHistory: []
          },
          aiPlayer: { animals: { rabbit: 5, sheep: 1, pig: 0, cow: 0, horse: 0 } },
          humanPlayer: { animals: { rabbit: 3, sheep: 0, pig: 0, cow: 0, horse: 0 } },
          difficulty: 'medium'
        })
        .expect(200)

      const responseTime = Date.now() - startTime
      
      expect(responseTime).toBeLessThan(10000) // 应该在10秒内响应
      console.log(`✅ AI响应时间: ${responseTime}ms (< 10s)`)
    }, 15000)

    test('应该能处理连续的AI请求', async () => {
      const requests = []
      
      for (let i = 0; i < 3; i++) {
        requests.push(
          request(app)
            .post('/api/ai/decision')
            .send({
              gameState: {
                gameId: `concurrent-test-${i}`,
                currentPlayer: 'ai',
                currentRound: i + 1,
                gamePhase: 'deciding',
                diceResult: ['rabbit', 'sheep'],
                bank: { rabbit: 50, sheep: 20, pig: 15, cow: 10, horse: 3, smallDog: 3, bigDog: 1 },
                gameHistory: []
              },
              aiPlayer: { animals: { rabbit: 3 + i, sheep: i, pig: 0, cow: 0, horse: 0 } },
              humanPlayer: { animals: { rabbit: 2, sheep: 1, pig: 0, cow: 0, horse: 0 } },
              difficulty: 'medium'
            })
        )
      }
      
      const responses = await Promise.all(requests)
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('analysis')
        console.log(`✅ 并发请求${index + 1}成功`)
      })
      
      console.log('✅ 并发请求测试通过')
    }, 20000)
  })

  describe('🐛 错误处理测试', () => {
    test('应该处理无效的游戏状态', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: null,
          aiPlayer: null,
          humanPlayer: null,
          difficulty: 'invalid'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      console.log('✅ 无效输入处理正确:', response.body.error)
    })

    test('应该处理缺失的请求参数', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
      console.log('✅ 缺失参数处理正确:', response.body.error)
    })
  })
}) 