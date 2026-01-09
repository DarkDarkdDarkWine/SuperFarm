# 🐰 超级农场主 (Super Farmer) - v2.0

基于经典1943年波兰桌游的Web多人在线版本，支持2-4人游戏，集成DeepSeek AI对手。

## ✨ 特性

- 🎮 **经典玩法**：还原原版繁殖算法和攻击机制
- 🤖 **AI对手**：3种难度AI（简单/中等/困难），严格信息隔离
- 👥 **多人对战**：支持2-4人，至少1名人类玩家
- ⚡ **实时通信**：基于Socket.io的实时游戏体验
- 🎨 **现代UI**：React + TailwindCSS

## 📦 快速开始

### 安装依赖
```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
```

### 启动服务
```bash
# 终端1：后端
cd backend
npm run dev

# 终端2：前端
cd frontend
npm run dev
```

### 访问游戏
打开浏览器访问 `http://localhost:3000`

## 🎯 游戏规则

详见 [docs/game-rules.md](./docs/game-rules.md)

## 🏗 技术栈

**前端**：React 18 + TypeScript + Zustand + Socket.io-client + TailwindCSS  
**后端**：Node.js 20 + TypeScript + Express + Socket.io + DeepSeek API

## 📄 许可证

MIT License
