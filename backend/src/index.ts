/**
 * 超级农场主 - 服务器入口
 */

import { createServer } from 'http';
import dotenv from 'dotenv';
import { GameServer } from './server';
import { createExpressApp } from './app';

dotenv.config();

const apiKey = process.env.DEEPSEEK_API_KEY ?? '';

// 先创建裸 HTTP server，让 GameServer 挂载 Socket.io
const httpServer = createServer();
const gameServer = new GameServer(httpServer, apiKey ?? '');

// 再创建 Express app（持有 gameServer 引用），作为 HTTP request 处理器
// 跳过 /socket.io/ 路径——由 Socket.io 自己处理，避免双重响应
const app = createExpressApp(gameServer);
httpServer.on('request', (req, res) => {
  if (req.url?.startsWith('/socket.io')) return;
  app(req as import('express').Request, res as import('express').Response);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('🎮 SuperFarm Game Server');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('✅ AI Service: Ready (API key set via settings page)');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  gameServer.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
