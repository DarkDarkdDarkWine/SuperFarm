import { createServer, type Server as HTTPServer } from 'node:http';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExpressApp, type AppGameServer } from '../src/app';
import { PROVIDER_CONFIGS } from '../src/services/AIService';

// ── Helpers ───────────────────────────────────────────────────────────────

function jsonRequest(
  server: HTTPServer,
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as AddressInfo;
    const data = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        method,
        path,
        host: '127.0.0.1',
        port: addr.port,
        headers: {
          'Content-Type': 'application/json',
          ...(data !== undefined ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
        });
      }
    );
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeMockGameServer(): AppGameServer & {
  updateApiKey: ReturnType<typeof vi.fn>;
  updateProvider: ReturnType<typeof vi.fn>;
} {
  return { updateApiKey: vi.fn(), updateProvider: vi.fn() };
}

function mockFetchOk() {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
}

function mockFetch401() {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
}

function mockFetchError(code: number) {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('Error', { status: code }));
}

function mockFetchNetworkError() {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));
}

/** 模拟 /models 接口返回模型列表 */
function mockFetchModels(ids: string[]) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({ data: ids.map(id => ({ id, object: 'model' })) }),
      { status: 200 }
    )
  );
}

// ── POST /api/config ───────────────────────────────────────────────────────

describe('POST /api/config', () => {
  let httpServer: HTTPServer;
  let mockGameServer: ReturnType<typeof makeMockGameServer>;

  beforeAll(async () => {
    mockGameServer = makeMockGameServer();
    const app = createExpressApp(mockGameServer);
    httpServer = createServer(app);
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  beforeEach(() => {
    mockGameServer.updateApiKey.mockClear();
    mockGameServer.updateProvider.mockClear();
  });

  it('accepts a valid key and calls updateApiKey', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: 'sk-valid-key',
    });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockGameServer.updateApiKey).toHaveBeenCalledOnce();
    expect(mockGameServer.updateApiKey).toHaveBeenCalledWith('sk-valid-key');
  });

  it('trims whitespace from the key before calling updateApiKey', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: '  sk-padded  ',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGameServer.updateApiKey).toHaveBeenCalledWith('sk-padded');
  });

  it('returns 400 when apiKey is missing', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {});

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when apiKey is an empty string', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: '',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when apiKey is whitespace-only', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: '   ',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when apiKey is not a string', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: 12345,
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  // ── provider + model ────────────────────────────────────────────────────

  it.each(['deepseek', 'minimax', 'zhipu'] as const)(
    'calls updateProvider with correct provider "%s" and specified model',
    async (provider) => {
      const model = PROVIDER_CONFIGS[provider].testModel;
      await jsonRequest(httpServer, 'POST', '/api/config', {
        apiKey: 'sk-key',
        provider,
        model,
      });

      expect(mockGameServer.updateProvider).toHaveBeenCalledWith(provider, model);
    }
  );

  it('defaults provider to deepseek when an unknown provider is given', async () => {
    await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: 'sk-key',
      provider: 'unknown-vendor',
    });

    const [calledProvider] = mockGameServer.updateProvider.mock.calls[0] as [string, string];
    expect(calledProvider).toBe('deepseek');
  });

  it('defaults model to the provider testModel when model is omitted', async () => {
    await jsonRequest(httpServer, 'POST', '/api/config', {
      apiKey: 'sk-key',
      provider: 'zhipu',
    });

    const [, calledModel] = mockGameServer.updateProvider.mock.calls[0] as [string, string];
    expect(calledModel).toBe(PROVIDER_CONFIGS.zhipu.testModel);
  });
});

// ── POST /api/config/test ──────────────────────────────────────────────────

describe('POST /api/config/test', () => {
  let httpServer: HTTPServer;
  let mockGameServer: ReturnType<typeof makeMockGameServer>;

  beforeAll(async () => {
    mockGameServer = makeMockGameServer();
    const app = createExpressApp(mockGameServer);
    httpServer = createServer(app);
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  // ── 基本成功/失败 ─────────────────────────────────────────────────────

  it('returns success when provider responds 200 (falls back to hardcoded models if /models fails)', async () => {
    // 第一次: chat/completions OK；第二次: /models 失败 → 回退硬编码
    mockFetchOk();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('no models'));

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: 'sk-real-key',
      provider: 'deepseek',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.models)).toBe(true);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('deepseek.com');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-real-key');
  });

  it('returns failure with message when provider responds 401', async () => {
    mockFetch401();

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: 'sk-bad-key',
      provider: 'deepseek',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.error as string).toMatch(/无效|过期/);
  });

  it('returns failure with status code when provider responds non-401 error', async () => {
    mockFetchError(500);

    const { body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: 'sk-key',
      provider: 'deepseek',
    });

    expect(body.success).toBe(false);
    expect((body.error as string)).toContain('500');
  });

  it('returns failure when network throws', async () => {
    mockFetchNetworkError();

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: 'sk-key',
      provider: 'deepseek',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 when apiKey is missing', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {});

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 400 when apiKey is empty', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: '  ',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trims the key before sending to provider', async () => {
    mockFetchOk();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('no models'));

    await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: '  sk-trimmed  ',
      provider: 'deepseek',
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-trimmed');
  });

  // ── 各厂商 baseUrl 正确 ────────────────────────────────────────────────

  it.each(['deepseek', 'minimax', 'zhipu'] as const)(
    'hits the correct baseUrl for provider "%s"',
    async (provider) => {
      mockFetchOk();
      // minimax 不拉 /models，deepseek/zhipu 需要第二次 mock
      if (provider === 'deepseek' || provider === 'zhipu') {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('no models'));
      }

      await jsonRequest(httpServer, 'POST', '/api/config/test', {
        apiKey: 'sk-key',
        provider,
      });

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain(PROVIDER_CONFIGS[provider].baseUrl);
    }
  );

  // ── deepseek / zhipu 动态拉模型 ────────────────────────────────────────

  it.each(['deepseek', 'zhipu'] as const)(
    '"%s" fetches /models dynamically and returns them',
    async (provider) => {
      const dynamicModels = ['model-a', 'model-b'];
      mockFetchOk();                        // chat/completions
      mockFetchModels(dynamicModels);       // GET /models

      const { body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
        apiKey: 'sk-key',
        provider,
      });

      expect(body.success).toBe(true);
      expect(body.models).toEqual(dynamicModels);

      // 确认第二次请求命中了 /models
      const calls = vi.mocked(fetch).mock.calls;
      expect(calls).toHaveLength(2);
      expect((calls[1] as [string])[0]).toContain('/models');
    }
  );

  it.each(['deepseek', 'zhipu'] as const)(
    '"%s" falls back to hardcoded models when /models returns empty list',
    async (provider) => {
      mockFetchOk();
      // /models 返回空 data
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );

      const { body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
        apiKey: 'sk-key',
        provider,
      });

      expect(body.success).toBe(true);
      expect(body.models).toEqual(PROVIDER_CONFIGS[provider].models);
    }
  );

  // ── minimax / zhipu 使用硬编码列表 ────────────────────────────────────

  it.each(['minimax'] as const)(
    '"%s" uses hardcoded model list and does NOT call /models',
    async (provider) => {
      mockFetchOk(); // 只有 chat/completions 一次请求

      const { body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
        apiKey: 'sk-key',
        provider,
      });

      expect(body.success).toBe(true);
      expect(body.models).toEqual(PROVIDER_CONFIGS[provider].models);

      // 确认只发了一次请求
      expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
    }
  );

  // ── 无效 provider 回退到 deepseek ─────────────────────────────────────

  it('defaults to deepseek baseUrl when provider is unknown', async () => {
    mockFetchOk();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('no models'));

    await jsonRequest(httpServer, 'POST', '/api/config/test', {
      apiKey: 'sk-key',
      provider: 'openai', // 不在支持列表中
    });

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain(PROVIDER_CONFIGS.deepseek.baseUrl);
  });
});

// ── GET /health ────────────────────────────────────────────────────────────

describe('GET /health', () => {
  let httpServer: HTTPServer;

  beforeAll(async () => {
    const app = createExpressApp(makeMockGameServer());
    httpServer = createServer(app);
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('returns status ok', async () => {
    const { status, body } = await jsonRequest(httpServer, 'GET', '/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
