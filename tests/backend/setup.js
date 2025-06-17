// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.PORT = '0' // 使用随机端口
process.env.DEEPSEEK_API_KEY = 'test-api-key-mock'
process.env.DEEPSEEK_API_URL = 'https://api.deepseek.com/mock'
process.env.LOG_LEVEL = 'error' // 减少测试时的日志输出

// Mock console methods to reduce noise
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // 保留 error 和 warn 用于调试
}

// 全局测试钩子
beforeAll(() => {
  // 全局测试开始前的设置
})

afterAll(() => {
  // 全局测试结束后的清理
})

beforeEach(() => {
  // 每个测试开始前重置所有模拟
  jest.clearAllMocks()
})

afterEach(() => {
  // 每个测试结束后的清理
})

// 全局测试工具函数
global.testUtils = {
  // 创建模拟的游戏状态
  createMockGameState: (overrides = {}) => ({
    players: [
      {
        id: 'player1',
        name: '测试玩家',
        type: 'human',
        animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false
      },
      {
        id: 'ai1',
        name: 'AI玩家1',
        type: 'ai',
        animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false
      }
    ],
    currentPlayerIndex: 0,
    turn: 1,
    status: 'playing',
    ...overrides
  }),

  // 创建模拟的玩家
  createMockPlayer: (overrides = {}) => ({
    id: 'test-player',
    name: '测试玩家',
    type: 'human',
    animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
    protection: { smallDog: 0, bigDog: 0 },
    isWinner: false,
    ...overrides
  }),

  // 等待异步操作完成
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // 生成随机ID
  generateId: () => Math.random().toString(36).substr(2, 9)
}

// Mock axios for API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}))

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
    DailyRotateFile: jest.fn()
  }
}))

// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
}) 