# 🐰 超级农场主 (Super Farmer)

基于经典1943年波兰桌游的Web多人在线版本，支持2-4人游戏，集成多厂商 LLM AI对手。

## ✨ 特性

- 🎮 **两种模式**：经典（1只兔子起手）/ 欢乐（2只兔子起手，更短局）
- 🤖 **AI对手**：3种难度（稳重/聪明/天才），由 LLM 驱动，决策完全依赖大模型推理，信息严格隔离
- 🔑 **多厂商支持**：内置 DeepSeek / MiniMax / 智谱 三家 API，页面内配置无需重启
- 👥 **多人对战**：支持2-4人，可混搭真人与AI，同设备多人无需切换账号
- ⚡ **实时通信**：Socket.io 全双工，骰子/繁殖/攻击事件队列化串行推送
- 📜 **游戏记录**：右上角📜实时显示每一步操作，AI决策含 LLM 推理过程
- 🚨 **AI报错通知**：LLM 调用失败时页面顶部弹出红色通知，6s自动消失

## 📦 快速开始

### 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 启动服务

```bash
# 终端1：后端
cd backend && npm run dev

# 终端2：前端
cd frontend && npm run dev
```

访问 `http://localhost:3000`，在右上角 ⚙️ 设置弹窗中配置 API Key。Key 保存后会持久化在 localStorage，页面刷新自动恢复到后端（无需重新配置）。

## 🔌 REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/config` | 热更新 API Key（支持 provider + model 切换） |
| POST | `/api/config/test` | 验证 Key 连通性，返回可用模型列表 |

## 🏗 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript · Vite · Framer Motion · Socket.io-client |
| 后端 | Node.js 20 · TypeScript · Express · Socket.io · 多厂商 LLM API |
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
