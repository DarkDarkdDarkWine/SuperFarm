const DeepSeekService = require('../../../backend/src/services/deepseekService');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock logger
jest.mock('../../../backend/src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('DeepSeekService', () => {
  let mockGameState;
  let mockAiPlayer;
  let mockHumanPlayer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGameState = {
      gameId: 'test-game',
      currentRound: 1,
      currentPlayer: 'ai',
      gamePhase: 'preparing',
      winner: null,
      bank: {
        rabbit: 60,
        sheep: 24,
        pig: 20,
        cow: 12,
        horse: 4,
        smallDog: 4,
        bigDog: 2
      },
      diceResult: ['rabbit', 'sheep'],
      gameHistory: []
    };

    mockAiPlayer = {
      id: 'ai',
      name: 'AI农场主',
      type: 'ai',
      animals: {
        rabbit: 5,
        sheep: 1,
        pig: 0,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 0,
        bigDog: 0
      },
      isWinner: false
    };

    mockHumanPlayer = {
      id: 'human',
      name: '玩家',
      type: 'human',
      animals: {
        rabbit: 3,
        sheep: 2,
        pig: 1,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 1,
        bigDog: 0
      },
      isWinner: false
    };

    // 设置环境变量
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
  });

  describe('getAIDecision', () => {
    it('应该成功获取AI决策', async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  analysis: '测试分析',
                  actions: [
                    {
                      type: 'exchange',
                      exchange: {
                        from: 'rabbit',
                        to: 'sheep',
                        fromCount: 6,
                        toCount: 1
                      }
                    }
                  ],
                  reasoning: '测试推理',
                  confidence: 0.8
                })
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockApiResponse);

      const result = await DeepSeekService.getAIDecision(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(result).toEqual({
        analysis: '测试分析',
        actions: [
          {
            type: 'exchange',
            exchange: {
              from: 'rabbit',
              to: 'sheep',
              fromCount: 6,
              toCount: 1
            }
          }
        ],
        reasoning: '测试推理',
        confidence: 0.8
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek-chat',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system'
            }),
            expect.objectContaining({
              role: 'user'
            })
          ]),
          temperature: 0.5,
          max_tokens: 1500,
          stream: false
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        })
      );
    });

    it('应该在API失败时返回备用决策', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API错误'));

      const result = await DeepSeekService.getAIDecision(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(result).toBeDefined();
      expect(result.analysis).toContain('使用本地备用AI策略');
      expect(result.actions).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBe(0.7);
    });

    it('应该在没有API密钥时返回备用决策', async () => {
      delete process.env.DEEPSEEK_API_KEY;

      // 重新创建服务实例（因为密钥在构造函数中检查）
      const DeepSeekServiceNoKey = require('../../../backend/src/services/deepseekService');

      const result = await DeepSeekServiceNoKey.getAIDecision(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(result).toBeDefined();
      expect(result.analysis).toContain('使用本地备用AI策略');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('应该处理无效的AI响应', async () => {
      const mockInvalidResponse = {
        data: {
          choices: [
            {
              message: {
                content: '这不是有效的JSON'
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockInvalidResponse);

      const result = await DeepSeekService.getAIDecision(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(result.analysis).toContain('使用本地备用AI策略');
    });

    it('应该重试API调用', async () => {
      // 前两次失败，第三次成功
      mockedAxios.post
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockResolvedValueOnce({
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    analysis: '重试成功',
                    actions: [],
                    reasoning: '重试后获得结果',
                    confidence: 0.6
                  })
                }
              }
            ]
          }
        });

      const result = await DeepSeekService.getAIDecision(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(result.analysis).toBe('重试成功');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('buildPrompt', () => {
    it('应该构建正确的提示词', () => {
      const prompt = DeepSeekService.buildPrompt(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'medium'
      );

      expect(prompt).toContain('超级农场主游戏');
      expect(prompt).toContain('回合数**: 1');
      expect(prompt).toContain('骰子结果**: ["rabbit","sheep"]');
      expect(prompt).toContain('人类玩家状态');
      expect(prompt).toContain('AI玩家状态 (你)');
      expect(prompt).toContain('银行剩余');
      expect(prompt).toContain('胜利进度: 1/5'); // AI有兔子
      expect(prompt).toContain('胜利进度: 3/5'); // 人类有兔子、羊、猪
      expect(prompt).toContain('medium难度');
    });

    it('应该根据难度调整策略要求', () => {
      const easyPrompt = DeepSeekService.buildPrompt(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'easy'
      );

      const hardPrompt = DeepSeekService.buildPrompt(
        mockGameState,
        mockAiPlayer,
        mockHumanPlayer,
        'hard'
      );

      expect(easyPrompt).toContain('1. 防护安全 2. 稳定发展 3. 避免损失');
      expect(hardPrompt).toContain('1. 最大收益 2. 快速胜利 3. 精确计算');
    });
  });

  describe('getFallbackDecision', () => {
    it('应该为有6只兔子的AI推荐交换羊', () => {
      const aiPlayerWithRabbits = {
        ...mockAiPlayer,
        animals: { ...mockAiPlayer.animals, rabbit: 6 }
      };

      const result = DeepSeekService.getFallbackDecision(
        aiPlayerWithRabbits,
        mockHumanPlayer
      );

      expect(result.actions).toContainEqual({
        type: 'exchange',
        exchange: {
          from: 'rabbit',
          to: 'sheep',
          fromCount: 6,
          toCount: 1
        }
      });
      expect(result.reasoning).toContain('将6只兔子交换为1只羊');
    });

    it('应该为有羊的AI推荐购买小狗防护', () => {
      const aiPlayerWithSheep = {
        ...mockAiPlayer,
        animals: { ...mockAiPlayer.animals, sheep: 2 },
        protection: { smallDog: 0, bigDog: 0 }
      };

      const result = DeepSeekService.getFallbackDecision(
        aiPlayerWithSheep,
        mockHumanPlayer
      );

      expect(result.actions).toContainEqual({
        type: 'buy_protection',
        protection: 'smallDog'
      });
      expect(result.reasoning).toContain('购买小狗防护');
    });

    it('应该为即将胜利的AI调整策略', () => {
      const nearWinAiPlayer = {
        ...mockAiPlayer,
        animals: {
          rabbit: 1,
          sheep: 1,
          pig: 1,
          cow: 1,
          horse: 0
        }
      };

      const result = DeepSeekService.getFallbackDecision(
        nearWinAiPlayer,
        mockHumanPlayer
      );

      expect(result.analysis).toContain('即将胜利');
      expect(result.analysis).toContain('AI胜利进度: 4/5');
    });

    it('应该在没有可行动作时返回等待策略', () => {
      const poorAiPlayer = {
        ...mockAiPlayer,
        animals: {
          rabbit: 1,
          sheep: 0,
          pig: 0,
          cow: 0,
          horse: 0
        },
        protection: { smallDog: 0, bigDog: 0 }
      };

      const result = DeepSeekService.getFallbackDecision(
        poorAiPlayer,
        mockHumanPlayer
      );

      expect(result.actions).toHaveLength(0);
      expect(result.reasoning).toContain('当前资源不足以进行有效操作');
    });
  });

  describe('getWinProgress', () => {
    it('应该正确计算胜利进度', () => {
      const testCases = [
        {
          animals: { rabbit: 0, sheep: 0, pig: 0, cow: 0, horse: 0 },
          expected: 0
        },
        {
          animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
          expected: 1
        },
        {
          animals: { rabbit: 1, sheep: 1, pig: 1, cow: 0, horse: 0 },
          expected: 3
        },
        {
          animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 1 },
          expected: 5
        }
      ];

      testCases.forEach(({ animals, expected }) => {
        const player = { ...mockAiPlayer, animals };
        const progress = DeepSeekService.getWinProgress(player);
        expect(progress).toBe(expected);
      });
    });
  });

  describe('validateExchangeAction', () => {
    it('应该验证合法的交换动作', () => {
      const validExchanges = [
        {
          exchange: { from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
          playerAnimals: { rabbit: 6, sheep: 0, pig: 0, cow: 0, horse: 0 },
          expected: true
        },
        {
          exchange: { from: 'sheep', to: 'pig', fromCount: 2, toCount: 1 },
          playerAnimals: { rabbit: 0, sheep: 2, pig: 0, cow: 0, horse: 0 },
          expected: true
        },
        {
          exchange: { from: 'pig', to: 'cow', fromCount: 3, toCount: 1 },
          playerAnimals: { rabbit: 0, sheep: 0, pig: 3, cow: 0, horse: 0 },
          expected: true
        },
        {
          exchange: { from: 'cow', to: 'horse', fromCount: 2, toCount: 1 },
          playerAnimals: { rabbit: 0, sheep: 0, pig: 0, cow: 2, horse: 0 },
          expected: true
        }
      ];

      validExchanges.forEach(({ exchange, playerAnimals, expected }) => {
        const player = { ...mockAiPlayer, animals: playerAnimals };
        const result = DeepSeekService.validateExchangeAction(exchange, player);
        expect(result).toBe(expected);
      });
    });

    it('应该拒绝无效的交换动作', () => {
      const invalidExchanges = [
        {
          exchange: { from: 'rabbit', to: 'sheep', fromCount: 7, toCount: 1 }, // 错误比例
          playerAnimals: { rabbit: 10, sheep: 0, pig: 0, cow: 0, horse: 0 }
        },
        {
          exchange: { from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
          playerAnimals: { rabbit: 5, sheep: 0, pig: 0, cow: 0, horse: 0 } // 资源不足
        },
        {
          exchange: { from: 'rabbit', to: 'pig', fromCount: 6, toCount: 1 }, // 无效交换路径
          playerAnimals: { rabbit: 10, sheep: 0, pig: 0, cow: 0, horse: 0 }
        }
      ];

      invalidExchanges.forEach(({ exchange, playerAnimals }) => {
        const player = { ...mockAiPlayer, animals: playerAnimals };
        const result = DeepSeekService.validateExchangeAction(exchange, player);
        expect(result).toBe(false);
      });
    });
  });

  describe('validateProtectionAction', () => {
    it('应该验证合法的防护购买', () => {
      const playerWithSheep = {
        ...mockAiPlayer,
        animals: { ...mockAiPlayer.animals, sheep: 1 },
        protection: { smallDog: 0, bigDog: 0 }
      };

      const playerWithPig = {
        ...mockAiPlayer,
        animals: { ...mockAiPlayer.animals, pig: 1 },
        protection: { smallDog: 0, bigDog: 0 }
      };

      const bankWithStock = { smallDog: 2, bigDog: 1 };

      expect(
        DeepSeekService.validateProtectionAction('smallDog', playerWithSheep, bankWithStock)
      ).toBe(true);

      expect(
        DeepSeekService.validateProtectionAction('bigDog', playerWithPig, bankWithStock)
      ).toBe(true);
    });

    it('应该拒绝无效的防护购买', () => {
      const playerWithoutResources = {
        ...mockAiPlayer,
        animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 }
      };

      const emptyBank = { smallDog: 0, bigDog: 0 };

      // 没有羊买小狗
      expect(
        DeepSeekService.validateProtectionAction('smallDog', playerWithoutResources, { smallDog: 1, bigDog: 1 })
      ).toBe(false);

      // 银行没有库存
      expect(
        DeepSeekService.validateProtectionAction('smallDog', mockAiPlayer, emptyBank)
      ).toBe(false);
    });
  });

  describe('温度参数设置', () => {
    it('应该根据难度返回正确的温度', () => {
      expect(DeepSeekService.getTemperature('easy')).toBe(0.3);
      expect(DeepSeekService.getTemperature('medium')).toBe(0.5);
      expect(DeepSeekService.getTemperature('hard')).toBe(0.7);
      expect(DeepSeekService.getTemperature('invalid')).toBe(0.5); // 默认值
    });
  });

  describe('系统提示词', () => {
    it('应该为不同难度返回不同的系统提示词', () => {
      const easyPrompt = DeepSeekService.getSystemPrompt('easy');
      const mediumPrompt = DeepSeekService.getSystemPrompt('medium');
      const hardPrompt = DeepSeekService.getSystemPrompt('hard');

      expect(easyPrompt).toContain('稳重老王');
      expect(easyPrompt).toContain('谨慎保守');
      
      expect(mediumPrompt).toContain('智慧张三');
      expect(mediumPrompt).toContain('经验丰富');
      
      expect(hardPrompt).toContain('天才李四');
      expect(hardPrompt).toContain('精明');
    });
  });
}); 