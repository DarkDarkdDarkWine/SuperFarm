module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/../tests/backend/**/*.test.js',
    '<rootDir>/../tests/e2e/**/*.test.js'
  ],
  
  // 覆盖率收集
  collectCoverage: false, // 默认关闭，可通过命令行开启
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js', // 排除入口文件
    '!src/config/**',
    '!**/node_modules/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 测试设置文件暂时禁用
  // setupFilesAfterEnv: ['<rootDir>/../tests/backend/setup.js'],
  
  // 模拟设置
  clearMocks: true,
  restoreMocks: true,
  
  // 超时设置
  testTimeout: 10000,
  
  // 详细输出
  verbose: true,
  
  // 并行测试
  maxWorkers: '50%',
  
  // 忽略模式
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  
  // 模块路径映射暂时禁用
  // moduleNameMapping: {
  //   '^@/(.*)$': '<rootDir>/src/$1'
  // }
} 