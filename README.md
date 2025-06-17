# 超级农场主 H5游戏

一个基于Vue.js和DeepSeek API的现代化农场策略游戏，支持单人模式对战AI。

## 🎮 游戏介绍

超级农场主是一个策略桌游的数字化版本，玩家需要通过掷骰子、动物繁殖、交换升级来收集齐全部5种动物（兔子、羊、猪、牛、马）获得胜利。

### 游戏特色
- 🎯 **单人模式**: 与AI农场主对战，支持3种难度
- 🎲 **随机性**: 基于12面骰子的随机机制
- 🐕 **防护系统**: 购买小狗/大狗防御狐狸/狼攻击
- 🔄 **动物交换**: 复杂的交换系统，策略性强
- 🤖 **智能AI**: DeepSeek驱动的AI对手，具有不同性格

## 📁 项目结构

```
SuperFarm/
├── frontend/          # Vue.js前端项目
│   ├── public/        # 静态资源
│   ├── src/
│   │   ├── components/    # Vue组件
│   │   ├── stores/        # Pinia状态管理
│   │   ├── services/      # 服务层
│   │   ├── utils/         # 工具函数
│   │   └── types/         # TypeScript类型定义
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/           # Node.js后端API
│   ├── src/
│   │   ├── controllers/   # 路由控制器
│   │   ├── services/      # 业务服务
│   │   ├── middleware/    # 中间件
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── config.env.example
├── docs/              # 文档目录
├── tests/             # 测试文件
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn
- DeepSeek API密钥

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置环境

1. 复制后端环境配置文件
```bash
cd backend
cp config.env.example .env
```

2. 在`.env`文件中设置你的DeepSeek API密钥
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### 运行项目

```bash
# 启动后端服务 (端口: 3001)
cd backend
npm run dev

# 启动前端服务 (端口: 3000)
cd frontend
npm run dev
```

访问 http://localhost:3000 开始游戏！

## 🎲 游戏规则

### 基本规则
1. **目标**: 最先收集齐兔子、羊、猪、牛、马各1只获胜
2. **回合**: 掷2个12面骰子，处理结果，可选交换/购买防护
3. **繁殖**: 每2个相同动物繁殖1个新动物

### 骰子面分布
- 兔子: 4面
- 羊: 2面  
- 猪: 2面
- 牛: 1面
- 马: 1面
- 狐狸: 1面 (攻击兔子)
- 狼: 1面 (攻击兔子和羊)

### 交换系统
- 6只兔子 → 1只羊
- 2只羊 → 1只猪
- 3只猪 → 1只牛
- 2只牛 → 1只马

### 防护系统
- 1只羊 → 1只小狗 (防狐狸，最多2只)
- 1只猪 → 1只大狗 (防狼，最多1只)

## 🤖 AI系统

### AI难度
- **简单** (稳重老王): 保守策略，优先防护
- **中等** (智慧张三): 平衡发展，灵活应变
- **困难** (天才李四): 激进扩张，精确计算

### AI特性
- 基于DeepSeek大语言模型
- 真实的策略思考过程
- 难度自适应的温度参数
- 完整的决策验证机制

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **状态管理**: Pinia
- **HTTP客户端**: Axios
- **样式**: CSS3 + Animate.css

### 后端
- **运行时**: Node.js
- **框架**: Express.js
- **AI服务**: DeepSeek API
- **日志**: Winston
- **安全**: Helmet + CORS + Rate Limiting

## 📊 API接口

### AI决策接口
```http
POST /api/ai/decision
Content-Type: application/json

{
  "gameState": {...},
  "difficulty": "medium"
}
```

### AI性格列表
```http
GET /api/ai/personalities
```

### 健康检查
```http
GET /health
GET /api/ai/health
```

## 🧪 开发指南

### 前端开发
```bash
cd frontend
npm run dev      # 开发服务器
npm run build    # 构建生产版本
npm run lint     # 代码检查
```

### 后端开发
```bash
cd backend
npm run dev      # 开发服务器 (nodemon)
npm start        # 生产服务器
npm test         # 运行测试
```

### 代码结构

#### 前端核心文件
- `src/types/game.ts` - 游戏类型定义
- `src/stores/gameStore.ts` - 游戏状态管理
- `src/stores/playerStore.ts` - 玩家状态管理
- `src/utils/gameRules.ts` - 游戏规则引擎
- `src/services/gameService.ts` - 游戏服务层

#### 后端核心文件
- `src/app.js` - 主应用文件
- `src/controllers/aiController.js` - AI路由控制器
- `src/services/deepseekService.js` - DeepSeek API服务
- `src/services/gameValidation.js` - 游戏状态验证
- `src/utils/logger.js` - 日志工具

## 🔧 配置说明

### 环境变量
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 后端服务端口 | 3001 |
| `NODE_ENV` | 环境类型 | development |
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | 必须设置 |
| `FRONTEND_URL` | 前端地址 | http://localhost:3000 |
| `LOG_LEVEL` | 日志级别 | info |

### AI配置
- 请求超时: 30秒
- 频率限制: 每分钟10次
- 支持降级策略
- 完整的错误处理

## 📈 性能优化

### 前端优化
- Vite构建优化
- 组件懒加载
- Pinia状态持久化
- 资源压缩

### 后端优化
- Express中间件优化
- 日志分级写入
- API响应缓存
- 错误降级处理

## 🛡️ 安全措施

- Helmet安全头
- CORS跨域配置
- API频率限制
- 输入数据验证
- 敏感信息过滤

## 📝 待办事项

- [ ] 游戏音效系统
- [ ] 动画效果优化
- [ ] 多人对战模式
- [ ] 游戏回放功能
- [ ] 数据持久化
- [ ] PWA支持

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 👥 作者

- 游戏设计: 基于经典桌游改编
- 技术实现: AI助手

---

🎮 **开始你的农场主之旅吧！** 🐰🐑🐷🐄🐴 