# 超级农场主 - 测试文档

## 📋 测试概述

本项目采用全面的测试策略，确保代码质量和功能正确性：

### 🎯 测试类型

1. **单元测试 (Unit Tests)** - 测试单个函数/组件
2. **集成测试 (Integration Tests)** - 测试模块间交互
3. **API测试 (API Tests)** - 测试后端接口
4. **端到端测试 (E2E Tests)** - 测试完整用户流程

## 🏗️ 测试架构

```
tests/
├── frontend/           # 前端测试
│   ├── units/         # 单元测试
│   │   ├── gameRules.test.ts
│   │   └── gameStore.test.ts
│   ├── components/    # 组件测试
│   └── integration/   # 前端集成测试
├── backend/           # 后端测试
│   ├── api/          # API测试
│   │   └── ai.test.js
│   ├── units/        # 单元测试
│   └── integration/  # 后端集成测试
├── e2e/              # 端到端测试
│   └── game-flow.test.js
├── setup.ts          # 前端测试设置
└── README.md         # 本文档
```

## 🚀 运行测试

### 前端测试

```bash
# 进入前端目录
cd frontend

# 安装测试依赖
npm install

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试UI界面
npm run test:ui
```

### 后端测试

```bash
# 进入后端目录
cd backend

# 安装测试依赖
npm install

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 只运行单元测试
npm run test:unit

# 只运行集成测试
npm run test:integration
```

### 端到端测试

```bash
# 在项目根目录
npm run test:e2e

# 或者手动运行
cd backend
npm run test -- tests/e2e
```

## 📊 测试覆盖率

### 覆盖率目标

- **分支覆盖率**: ≥80%
- **函数覆盖率**: ≥80%
- **行覆盖率**: ≥80%
- **语句覆盖率**: ≥80%

### 查看覆盖率报告

```bash
# 前端覆盖率
cd frontend && npm run test:coverage
# 报告位置: frontend/coverage/index.html

# 后端覆盖率
cd backend && npm run test:coverage
# 报告位置: backend/coverage/index.html
```

## 🎮 游戏逻辑测试

### 核心功能测试

1. **骰子系统**
   - 骰子面的随机性
   - 有效性验证
   - 结果处理

2. **动物繁殖**
   - 繁殖数量计算
   - 同类动物配对
   - 最大数量限制

3. **危险攻击**
   - 狐狸攻击兔子
   - 狼攻击兔子和羊
   - 防护道具效果

4. **交换系统**
   - 交换比例验证
   - 动物数量检查
   - 交换执行逻辑

5. **获胜条件**
   - 五种动物收集
   - 游戏结束判定

### AI行为测试

1. **决策合理性**
   - 策略选择逻辑
   - 风险评估
   - 资源优化

2. **性能测试**
   - 响应时间 ≤5秒
   - 并发处理能力
   - 错误恢复机制

## 🔧 测试工具和配置

### 前端测试栈

- **测试框架**: Vitest
- **组件测试**: @vue/test-utils
- **断言库**: Vitest内置
- **覆盖率**: @vitest/coverage-v8
- **环境**: jsdom

### 后端测试栈

- **测试框架**: Jest
- **HTTP测试**: Supertest
- **模拟**: Jest内置mocks
- **覆盖率**: Jest内置
- **环境**: Node.js

## 📝 编写测试的最佳实践

### 1. 测试命名

```javascript
// ✅ 好的命名
describe('GameRules', () => {
  describe('rollDice', () => {
    it('应该返回两个有效的骰子面', () => {
      // 测试代码
    })
  })
})

// ❌ 不好的命名
describe('test1', () => {
  it('test', () => {
    // 测试代码
  })
})
```

### 2. AAA模式

```javascript
it('应该正确计算繁殖数量', () => {
  // Arrange - 准备
  const currentCount = 2
  const diceCount = 1
  
  // Act - 执行
  const result = GameRules.calculateBreeding(currentCount, diceCount)
  
  // Assert - 断言
  expect(result).toBe(1)
})
```

### 3. 测试覆盖边界情况

```javascript
describe('计算繁殖数量', () => {
  it('应该处理正常情况', () => {
    expect(GameRules.calculateBreeding(2, 1)).toBe(1)
  })
  
  it('应该处理零值', () => {
    expect(GameRules.calculateBreeding(0, 1)).toBe(0)
  })
  
  it('应该向下取整', () => {
    expect(GameRules.calculateBreeding(1, 2)).toBe(1)
  })
})
```

### 4. 模拟外部依赖

```javascript
// 模拟API调用
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

it('应该处理API错误', async () => {
  mockedAxios.post.mockRejectedValue(new Error('Network error'))
  
  const result = await aiService.getDecision(gameState)
  
  expect(result.success).toBe(false)
})
```

## 🚨 持续集成 (CI/CD)

### GitHub Actions配置

```yaml
name: 测试
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # 前端测试
      - name: 前端测试
        run: |
          cd frontend
          npm ci
          npm run test:coverage
      
      # 后端测试
      - name: 后端测试
        run: |
          cd backend
          npm ci
          npm run test:coverage
      
      # 上传覆盖率报告
      - name: 上传覆盖率到Codecov
        uses: codecov/codecov-action@v3
```

## 🔍 调试测试

### 前端调试

```bash
# 使用调试模式
npm run test -- --reporter=verbose

# 单独运行某个测试文件
npm run test -- gameRules.test.ts

# 使用监听模式调试
npm run test:watch
```

### 后端调试

```bash
# 使用Node调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# 运行特定测试
npm run test -- --testNamePattern="应该返回AI决策"

# 详细输出
npm run test -- --verbose
```

## 📈 测试报告

### 自动生成报告

测试运行后会自动生成以下报告：

1. **覆盖率报告** - `coverage/index.html`
2. **测试结果** - 控制台输出
3. **性能报告** - 响应时间统计
4. **错误日志** - 失败测试详情

### 查看报告

```bash
# 打开覆盖率报告
open coverage/index.html

# 或在Windows中
start coverage/index.html
```

## 🎯 测试策略

### 测试金字塔

```
    /\
   /  \  E2E Tests (少量)
  /____\
 /      \ Integration Tests (适量)
/__________\ Unit Tests (大量)
```

- **70%** 单元测试 - 快速、独立、细粒度
- **20%** 集成测试 - 模块交互、API测试
- **10%** E2E测试 - 用户流程、关键路径

### 何时运行测试

1. **开发时** - 使用监听模式 (`npm run test:watch`)
2. **提交前** - 运行所有测试 (`npm run test`)
3. **部署前** - 运行完整测试套件包括E2E
4. **定期** - 夜间构建运行性能和压力测试

## 🛠️ 故障排除

### 常见问题

1. **测试超时**
   ```bash
   # 增加超时时间
   jest.setTimeout(10000)
   ```

2. **模拟不工作**
   ```javascript
   // 确保模拟在正确位置
   jest.mock('./module', () => ({
     default: jest.fn()
   }))
   ```

3. **异步测试失败**
   ```javascript
   // 使用async/await
   it('应该处理异步操作', async () => {
     const result = await asyncFunction()
     expect(result).toBeDefined()
   })
   ```

### 获取帮助

1. 查看测试日志输出
2. 检查模拟配置
3. 验证测试环境设置
4. 参考现有测试用例

---

## 📚 相关文档

- [Vue Test Utils文档](https://test-utils.vuejs.org/)
- [Vitest文档](https://vitest.dev/)
- [Jest文档](https://jestjs.io/)
- [Supertest文档](https://github.com/visionmedia/supertest) 