# 🐰 超级农场主 (Super Farmer) - v2.0

基于经典1943年波兰桌游的Web多人在线版本，支持2-4人游戏，集成DeepSeek AI对手。

## ✨ 特性

- 🎮 **三种模式**：经典 / 欢乐（无狐狸） / 挑战（更凶猛的攻击）
- 🤖 **AI对手**：3种难度（稳重/聪明/天才），由 DeepSeek 驱动，信息严格隔离
- 👥 **多人对战**：支持2-4人，可混搭真人与AI，同设备多人无需切换账号
- ⚡ **实时通信**：Socket.io 全双工，骰子/繁殖/攻击事件队列化推送
- 🔑 **热更新 Key**：游戏界面内直接配置并测试 DeepSeek API Key，无需重启服务
- 🎨 **精心设计的 UI**：Framer Motion 动画、繁殖弹窗 3 秒倒计时自动关闭

## 📦 快速开始

### 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
# 也可在游戏准备页面右上角 ⚙️ 设置弹窗中在线配置与测试
```

### 启动服务

```bash
# 终端1：后端
cd backend && npm run dev

# 终端2：前端
cd frontend && npm run dev
```

访问 `http://localhost:3000`

## 🔌 REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/config` | 热更新 DeepSeek API Key |
| POST | `/api/config/test` | 验证 Key 连通性 |

## 🏗 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript · Vite · Framer Motion · Socket.io-client |
| 后端 | Node.js 20 · TypeScript · Express · Socket.io · DeepSeek API |
| 共享 | `shared/types/game.ts` 全栈共用类型 |
| 测试 | Vitest · 62 个用例（引擎/房间/AI/HTTP路由/集成） |

## 🧪 运行测试

```bash
cd backend && npm test
```

## 🎯 游戏规则

详见 [docs/game-rules.md](./docs/game-rules.md)

## 📄 许可证

MIT License
