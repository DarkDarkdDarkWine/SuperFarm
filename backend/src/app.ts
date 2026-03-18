/**
 * Express app factory — separated from server entry for testability
 */

import express from 'express';
import cors from 'cors';
import { PROVIDER_CONFIGS } from './services/AIService';
import type { AIProvider } from './services/AIService';

// Minimal interface so tests can pass a simple mock
export interface AppGameServer {
  updateApiKey(key: string): void;
  updateProvider(provider: AIProvider, model: string): void;
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
    const { provider: rawProvider, apiKey, model: rawModel } = req.body as { provider?: unknown; apiKey?: unknown; model?: unknown };
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      res.status(400).json({ success: false, error: 'apiKey is required' });
      return;
    }
    const key = apiKey.trim();
    const provider: AIProvider = (typeof rawProvider === 'string' && rawProvider in PROVIDER_CONFIGS)
      ? rawProvider as AIProvider
      : 'deepseek';
    const model: string = (typeof rawModel === 'string' && rawModel.trim())
      ? rawModel.trim()
      : PROVIDER_CONFIGS[provider].testModel;
    gameServer.updateApiKey(key);
    gameServer.updateProvider(provider, model);
    res.json({ success: true });
  });

  // ── 测试 AI API key 连通性 ────────────────────────────────────────────────
  app.post('/api/config/test', async (req, res) => {
    const { provider: rawProvider, apiKey } = req.body as { provider?: unknown; apiKey?: unknown };
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      res.status(400).json({ success: false, error: 'apiKey is required' });
      return;
    }
    const key = apiKey.trim();
    const provider: AIProvider = (typeof rawProvider === 'string' && rawProvider in PROVIDER_CONFIGS)
      ? rawProvider as AIProvider
      : 'deepseek';
    const providerConfig = PROVIDER_CONFIGS[provider];
    try {
      const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: providerConfig.testModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });
      if (response.status === 401) {
        res.json({ success: false, error: 'API Key 无效或已过期' });
        return;
      }
      if (!response.ok) {
        res.json({ success: false, error: `${providerConfig.label} 返回错误: ${response.status}` });
        return;
      }
      res.json({ success: true, models: providerConfig.models });
    } catch {
      res.json({ success: false, error: `无法连接到 ${providerConfig.label}，请检查网络` });
    }
  });

  return app;
}
