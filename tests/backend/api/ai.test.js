const request = require('supertest')
const app = require('../../../backend/app')

describe('AI API', () => {
  describe('POST /api/ai/decision', () => {
    const mockGameState = {
      players: [
        {
          id: 'player1',
          name: '测试玩家',
          type: 'human',
          animals: { rabbit: 3, sheep: 1, pig: 0, cow: 0, horse: 0 },
          protection: { smallDog: 0, bigDog: 0 },
          isWinner: false
        },
        {
          id: 'ai1',
          name: 'AI玩家1',
          type: 'ai',
          animals: { rabbit: 2, sheep: 0, pig: 1, cow: 0, horse: 0 },
          protection: { smallDog: 1, bigDog: 0 },
          isWinner: false
        }
      ],
      currentPlayerIndex: 1,
      turn: 5,
      status: 'playing'
    }

    it('应该为有效的游戏状态返回AI决策', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState,
          playerId: 'ai1',
          diceResult: ['rabbit', 'sheep']
        })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('action')
      expect(response.body.data).toHaveProperty('reasoning')
      expect(['roll', 'exchange', 'buy_protection', 'end_turn']).toContain(response.body.data.action.type)
    })

    it('应该拒绝缺少必要字段的请求', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState
          // 缺少 playerId 和 diceResult
        })
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })

    it('应该拒绝无效的玩家ID', async () => {
      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: mockGameState,
          playerId: 'invalid-player',
          diceResult: ['rabbit', 'sheep']
        })
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })

    it('应该处理AI服务错误', async () => {
      // 发送一个会导致AI服务出错的请求（比如格式错误的游戏状态）
      const invalidGameState = {
        players: [], // 空的玩家数组
        currentPlayerIndex: 0,
        turn: 1,
        status: 'playing'
      }

      const response = await request(app)
        .post('/api/ai/decision')
        .send({
          gameState: invalidGameState,
          playerId: 'ai1',
          diceResult: ['rabbit', 'sheep']
        })
        .expect(500)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })

    it('应该处理不同的骰子结果', async () => {
      const testCases = [
        ['rabbit', 'rabbit'],
        ['fox', 'wolf'],
        ['cow', 'horse'],
        ['sheep', 'pig']
      ]

      for (const diceResult of testCases) {
        const response = await request(app)
          .post('/api/ai/decision')
          .send({
            gameState: mockGameState,
            playerId: 'ai1',
            diceResult
          })
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('action')
      }
    })
  })

  describe('GET /api/ai/personalities', () => {
    it('应该返回可用的AI人格列表', async () => {
      const response = await request(app)
        .get('/api/ai/personalities')
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      
      // 检查人格数据结构
      const personality = response.body.data[0]
      expect(personality).toHaveProperty('id')
      expect(personality).toHaveProperty('name')
      expect(personality).toHaveProperty('description')
      expect(personality).toHaveProperty('traits')
    })
  })

  describe('GET /api/ai/health', () => {
    it('应该返回AI服务健康状态', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('status')
      expect(response.body.data).toHaveProperty('timestamp')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status)
    })
  })

  describe('速率限制', () => {
    it('应该在超过速率限制时返回429错误', async () => {
      // 快速发送多个请求以触发速率限制
      const promises = []
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/ai/decision')
            .send({
              gameState: mockGameState,
              playerId: 'ai1',
              diceResult: ['rabbit', 'sheep']
            })
        )
      }

      const responses = await Promise.all(promises)
      
      // 至少有一个请求应该被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    }, 10000) // 增加超时时间
  })

  describe('错误处理中间件', () => {
    it('应该返回格式化的错误响应', async () => {
      // 发送一个格式错误的请求
      const response = await request(app)
        .post('/api/ai/decision')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('CORS 配置', () => {
    it('应该包含正确的CORS头', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .expect(200)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    it('应该处理OPTIONS预检请求', async () => {
      const response = await request(app)
        .options('/api/ai/decision')
        .expect(204)

      expect(response.headers).toHaveProperty('access-control-allow-methods')
      expect(response.headers).toHaveProperty('access-control-allow-headers')
    })
  })
}) 