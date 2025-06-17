# 超级农场主 H5游戏 - 项目结构

```
SuperFarm/
├── frontend/                   # 前端项目
│   ├── public/                # 静态资源
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/           # 游戏资源
│   │       ├── images/       # 动物图片、图标
│   │       ├── sounds/       # 音效文件
│   │       └── animations/   # 动画资源
│   │   ├── src/
│   │   │   ├── components/       # Vue组件
│   │   │   │   ├── GameBoard.vue # 游戏主界面
│   │   │   │   ├── PlayerArea.vue # 玩家区域
│   │   │   │   ├── AnimalCard.vue # 动物卡片
│   │   │   │   ├── DiceRoller.vue # 骰子组件
│   │   │   │   ├── ExchangePanel.vue # 交换面板
│   │   │   │   └── AIThinking.vue # AI思考过程显示
│   │   │   │   ├── stores/           # Pinia状态管理
│   │   │   │   │   ├── gameStore.ts  # 游戏状态
│   │   │   │   │   ├── playerStore.ts # 玩家状态
│   │   │   │   │   └── aiStore.ts    # AI状态
│   │   │   │   ├── services/         # 服务层
│   │   │   │   │   ├── gameService.ts # 游戏逻辑服务
│   │   │   │   │   ├── aiService.ts   # AI接口服务
│   │   │   │   │   └── audioService.ts # 音效服务
│   │   │   │   ├── utils/            # 工具函数
│   │   │   │   │   ├── gameRules.ts  # 游戏规则引擎
│   │   │   │   │   ├── animations.ts # 动画工具
│   │   │   │   │   └── constants.ts  # 游戏常量
│   │   │   │   ├── types/            # TypeScript类型定义
│   │   │   │   │   ├── game.ts       # 游戏相关类型
│   │   │   │   │   ├── player.ts     # 玩家类型
│   │   │   │   │   └── ai.ts         # AI类型
│   │   │   │   ├── App.vue           # 根组件
│   │   │   │   └── main.ts           # 入口文件
│   │   │   ├── package.json
│   │   │   └── vite.config.ts
│   │   └── tsconfig.json
│   ├── backend/                   # 后端API服务
│   │   ├── src/
│   │   │   ├── controllers/      # 控制器
│   │   │   │   └── aiController.js # AI决策控制器
│   │   │   ├── services/         # 服务层
│   │   │   │   ├── deepseekService.js # DeepSeek API服务
│   │   │   │   └── gameValidation.js # 游戏状态验证
│   │   │   ├── middleware/       # 中间件
│   │   │   │   ├── cors.js       # CORS处理
│   │   │   │   └── rateLimiter.js # 频率限制
│   │   │   ├── utils/            # 工具函数
│   │   │   │   └── logger.js     # 日志工具
│   │   │   └── app.js            # Express应用
│   │   ├── package.json
│   │   └── .env                  # 环境变量(DeepSeek API Key)
│   ├── docs/                     # 文档
│   │   ├── game-rules.md         # 游戏规则
│   │   ├── api-docs.md           # API文档
│   │   └── deployment.md         # 部署文档
│   ├── tests/                    # 测试文件
│   │   ├── frontend/
│   │   └── backend/
│   ├── docker-compose.yml        # Docker部署配置
│   └── README.md
└── .gitignore
``` 