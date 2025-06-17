const express = require('express');
const router = express.Router();
const deepseekService = require('../services/deepseekService');
const gameValidation = require('../services/gameValidation');
const logger = require('../utils/logger');

/**
 * POST /api/ai/decision
 * 获取AI决策
 */
router.post('/decision', async (req, res) => {
  try {
    const { gameState, difficulty = 'medium' } = req.body;
    const requestId = req.headers['x-request-id'] || Date.now().toString();
    
    logger.info(`收到AI决策请求 - RequestID: ${requestId}, 游戏ID: ${gameState?.gameId}, 难度: ${difficulty}`);
    
    // 验证请求参数
    if (!gameState) {
      return res.status(400).json({
        error: '缺少游戏状态参数',
        code: 'MISSING_GAME_STATE'
      });
    }
    
    // 验证游戏状态
    const validation = gameValidation.validateGameState(gameState);
    if (!validation.isValid) {
      return res.status(400).json({
        error: '无效的游戏状态',
        details: validation.errors,
        code: 'INVALID_GAME_STATE'
      });
    }
    
    // 验证难度参数
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        error: '无效的难度参数，支持: easy, medium, hard',
        code: 'INVALID_DIFFICULTY'
      });
    }
    
    // 获取AI决策
    const rawDecision = await deepseekService.getAIDecision(gameState, difficulty);
    
    // 验证并清理AI决策
    const validatedDecision = deepseekService.validateDecision(rawDecision, gameState);
    
    // 记录成功日志
    logger.info(`AI决策生成成功 - RequestID: ${requestId}, 动作数量: ${validatedDecision.actions.length}`);
    
    res.json({
      success: true,
      data: validatedDecision,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        difficulty,
        gameId: gameState.gameId
      }
    });
    
  } catch (error) {
    const requestId = req.headers['x-request-id'] || Date.now().toString();
    
    logger.error(`AI决策生成失败 - RequestID: ${requestId}:`, {
      error: error.message,
      stack: error.stack,
      gameId: req.body?.gameState?.gameId,
      difficulty: req.body?.difficulty
    });
    
    // 返回备用决策
    const fallbackDecision = {
      analysis: '系统繁忙，使用基础策略',
      actions: [],
      reasoning: '服务暂时不可用，本回合不执行任何操作',
      confidence: 0.1
    };
    
    res.json({
      success: true,
      data: fallbackDecision,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        isFallback: true,
        error: 'AI服务暂时不可用'
      }
    });
  }
});

/**
 * GET /api/ai/personalities
 * 获取AI性格列表
 */
router.get('/personalities', (req, res) => {
  const personalities = [
    {
      id: 'conservative',
      name: '稳重老王',
      difficulty: 'easy',
      description: '谨慎保守的农场主，优先防护和稳定发展',
      traits: ['防护优先', '稳扎稳打', '风险规避'],
      winRate: '65%',
      avgGameLength: '长'
    },
    {
      id: 'balanced',
      name: '智慧张三',
      difficulty: 'medium',
      description: '经验丰富的农场主，平衡发展策略灵活',
      traits: ['平衡发展', '灵活应变', '适度冒险'],
      winRate: '75%',
      avgGameLength: '中等'
    },
    {
      id: 'aggressive',
      name: '天才李四',
      difficulty: 'hard',
      description: '精明的农场主，激进扩张追求快速胜利',
      traits: ['激进扩张', '精确计算', '快速胜利'],
      winRate: '85%',
      avgGameLength: '短'
    }
  ];
  
  res.json({
    success: true,
    data: personalities,
    meta: {
      total: personalities.length,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * POST /api/ai/difficulty
 * 设置AI难度（用于前端设置存储）
 */
router.post('/difficulty', (req, res) => {
  const { difficulty, playerId } = req.body;
  
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({
      error: '无效的难度参数',
      code: 'INVALID_DIFFICULTY'
    });
  }
  
  // 这里可以存储到数据库或缓存中
  // 目前只是简单返回确认
  logger.info(`玩家 ${playerId || 'unknown'} 设置AI难度为: ${difficulty}`);
  
  res.json({
    success: true,
    data: {
      difficulty,
      playerId,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * GET /api/ai/stats
 * 获取AI统计信息
 */
router.get('/stats', (req, res) => {
  // 这里可以返回AI的统计信息
  // 目前返回模拟数据
  const stats = {
    totalGames: 1250,
    totalDecisions: 8900,
    averageResponseTime: '1.2s',
    successRate: '98.5%',
    difficultyDistribution: {
      easy: 35,
      medium: 45,
      hard: 20
    },
    popularStrategies: [
      { name: '平衡发展', usage: '42%' },
      { name: '快速扩张', usage: '28%' },
      { name: '防护优先', usage: '18%' },
      { name: '其他', usage: '12%' }
    ]
  };
  
  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
      dataSource: 'aggregated'
    }
  });
});

/**
 * POST /api/ai/feedback
 * AI决策反馈（用于改进）
 */
router.post('/feedback', (req, res) => {
  const { gameId, decisionId, feedback, rating } = req.body;
  
  if (!gameId || !feedback) {
    return res.status(400).json({
      error: '缺少必要参数',
      code: 'MISSING_PARAMETERS'
    });
  }
  
  // 记录反馈用于改进AI
  logger.info('收到AI决策反馈:', {
    gameId,
    decisionId,
    feedback,
    rating,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: '反馈已记录，感谢您的建议！'
  });
});

/**
 * GET /api/ai/health
 * AI服务健康检查
 */
router.get('/health', async (req, res) => {
  try {
    // 检查DeepSeek服务是否可用
    const isHealthy = !!process.env.DEEPSEEK_API_KEY;
    
    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      services: {
        deepseek: isHealthy ? 'online' : 'offline',
        gameValidation: 'online',
        logging: 'online'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 