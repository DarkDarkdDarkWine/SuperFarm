const winston = require('winston');
const path = require('path');

// 创建日志目录（如果不存在）
const logDir = path.join(__dirname, '../../logs');

// 日志格式化
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // 如果有额外的元数据，格式化显示
    if (Object.keys(meta).length > 0) {
      msg += '\n' + JSON.stringify(meta, null, 2);
    }
    
    return msg;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'superfarm-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    // AI决策专用日志
    new winston.transports.File({
      filename: path.join(logDir, 'ai-decisions.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, gameId, difficulty, ...meta }) => {
          // 只记录AI相关的日志
          if (message.includes('AI') || gameId || difficulty) {
            return JSON.stringify({
              timestamp,
              level,
              message,
              gameId,
              difficulty,
              ...meta
            });
          }
          return ''; // 不记录非AI相关日志
        })
      )
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 拒绝处理未捕获的Promise
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 开发环境下添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 生产环境下的额外配置
if (process.env.NODE_ENV === 'production') {
  // 可以添加远程日志服务，如Elasticsearch, CloudWatch等
  // logger.add(new winston.transports.Http({
  //   host: 'log-server.com',
  //   port: 80,
  //   path: '/logs'
  // }));
}

// 扩展logger功能
logger.gameEvent = function(event, data) {
  this.info(`游戏事件: ${event}`, {
    event,
    ...data,
    category: 'game'
  });
};

logger.aiDecision = function(gameId, difficulty, decision, meta = {}) {
  this.info('AI决策生成', {
    gameId,
    difficulty,
    decision: {
      analysis: decision.analysis,
      actionsCount: decision.actions?.length || 0,
      confidence: decision.confidence
    },
    ...meta,
    category: 'ai'
  });
};

logger.apiRequest = function(req, responseTime) {
  this.info('API请求', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    responseTime: `${responseTime}ms`,
    category: 'api'
  });
};

logger.performance = function(operation, duration, meta = {}) {
  this.info(`性能监控: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...meta,
    category: 'performance'
  });
};

logger.security = function(event, details) {
  this.warn(`安全事件: ${event}`, {
    event,
    ...details,
    category: 'security'
  });
};

// 创建子logger用于不同模块
logger.createModuleLogger = function(moduleName) {
  return this.child({ module: moduleName });
};

// 日志清理功能
logger.cleanup = function() {
  // 清理30天前的日志文件
  const fs = require('fs');
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      
      files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`清理过期日志文件: ${file}`);
        }
      });
    }
  } catch (error) {
    this.error('日志清理失败:', error);
  }
};

// 错误处理
logger.on('error', (error) => {
  console.error('Logger错误:', error);
});

// 启动时记录日志
logger.info('日志系统初始化完成', {
  logLevel: logger.level,
  environment: process.env.NODE_ENV || 'development',
  logDir
});

module.exports = logger; 