/**
 * 超级农场主 - 服务器入口
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameServer } from './server';

// 加载环境变量
dotenv.config();

const app = express();
const httpServer = createServer(app);

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 初始化游戏服务器
const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  console.warn('⚠️  DEEPSEEK_API_KEY not found in environment variables');
  console.warn('⚠️  AI players will not work without API key');
}

const gameServer = new GameServer(httpServer, apiKey || '');

// 启动服务器
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('🎮 SuperFarm Game Server');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✅ AI Service: ${apiKey ? 'Enabled' : 'Disabled (no API key)'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
