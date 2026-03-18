/**
 * Express app factory — separated from server entry for testability
 */

import express from 'express';
import cors from 'cors';

// Minimal interface so tests can pass a simple mock
export interface AppGameServer {
  updateApiKey(key: string): void;
}

export function createExpressApp(
  gameServer: AppGameServer,
  options: { corsOrigin?: string } = {}
) {
  const app = express();

  app.use(cors({
    origin: options.corsOrigin ?? process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }));

  app.use(express.json());

  // ── 健康检查 ──────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 更新 AI API key（热更新，无需重启服务）───────────────────────────────
  app.post('/api/config', (req, res) => {
    const { deepseekApiKey } = req.body as { deepseekApiKey?: unknown };
    if (typeof deepseekApiKey !== 'string' || !deepseekApiKey.trim()) {
      res.status(400).json({ success: false, error: 'deepseekApiKey is required' });
      return;
    }
    gameServer.updateApiKey(deepseekApiKey.trim());
    res.json({ success: true });
  });

  // ── 测试 AI API key 连通性 ────────────────────────────────────────────────
  app.post('/api/config/test', async (req, res) => {
    const { deepseekApiKey } = req.body as { deepseekApiKey?: unknown };
    if (typeof deepseekApiKey !== 'string' || !deepseekApiKey.trim()) {
      res.status(400).json({ success: false, error: 'deepseekApiKey is required' });
      return;
    }
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });
      if (response.status === 401) {
        res.json({ success: false, error: 'API Key 无效或已过期' });
        return;
      }
      if (!response.ok) {
        res.json({ success: false, error: `DeepSeek 返回错误: ${response.status}` });
        return;
      }
      res.json({ success: true });
    } catch {
      res.json({ success: false, error: '无法连接到 DeepSeek，请检查网络' });
    }
  });

  return app;
}
