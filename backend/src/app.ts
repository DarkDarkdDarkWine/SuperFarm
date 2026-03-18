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

  // ── 测试 AI API key 连通性，并获取可用模型列表 ───────────────────────────
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
      // 1. 验证 key 是否有效（发送一个最小的请求）
      const testResponse = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
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
      if (testResponse.status === 401) {
        res.json({ success: false, error: 'API Key 无效或已过期' });
        return;
      }
      if (!testResponse.ok && testResponse.status !== 400) {
        res.json({ success: false, error: `${providerConfig.label} 返回错误: ${testResponse.status}` });
        return;
      }

      // 2. 获取可用模型列表
      // DeepSeek 和 Kimi 支持 GET /models（标准 OpenAI 格式）
      // 智谱和 MiniMax 没有此接口，直接使用硬编码列表
      let models: string[] = providerConfig.models;
      const supportsModelsList: AIProvider[] = ['deepseek', 'kimi'];
      if (supportsModelsList.includes(provider)) {
        try {
          const modelsResponse = await fetch(`${providerConfig.baseUrl}/models`, {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json() as { data?: Array<{ id: string; object?: string }> };
            if (Array.isArray(modelsData.data) && modelsData.data.length > 0) {
              const fetched = modelsData.data
                .filter(m => !m.object || m.object === 'model')
                .map(m => m.id)
                .filter(id => !id.includes('embed') && !id.includes('rerank') && !id.includes('audio') && !id.includes('tts') && !id.includes('vision') && !id.includes('image'));
              if (fetched.length > 0) models = fetched;
            }
          }
        } catch {
          // 失败时回退到硬编码列表
        }
      }

      res.json({ success: true, models });
    } catch {
      res.json({ success: false, error: `无法连接到 ${providerConfig.label}，请检查网络` });
    }
  });

  return app;
}
