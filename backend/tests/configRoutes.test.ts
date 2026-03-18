import { createServer, type Server as HTTPServer } from 'node:http';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExpressApp, type AppGameServer } from '../src/app';

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

function makeMockGameServer(): AppGameServer & { updateApiKey: ReturnType<typeof vi.fn> } {
  return { updateApiKey: vi.fn() };
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

// ── Test suite ─────────────────────────────────────────────────────────────

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
  });

  it('accepts a valid key and calls updateApiKey', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      deepseekApiKey: 'sk-valid-key',
    });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockGameServer.updateApiKey).toHaveBeenCalledOnce();
    expect(mockGameServer.updateApiKey).toHaveBeenCalledWith('sk-valid-key');
  });

  it('trims whitespace from the key before calling updateApiKey', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      deepseekApiKey: '  sk-padded  ',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGameServer.updateApiKey).toHaveBeenCalledWith('sk-padded');
  });

  it('returns 400 when deepseekApiKey is missing', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {});

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when deepseekApiKey is an empty string', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      deepseekApiKey: '',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when deepseekApiKey is whitespace-only', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      deepseekApiKey: '   ',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });

  it('returns 400 when deepseekApiKey is not a string', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config', {
      deepseekApiKey: 12345,
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockGameServer.updateApiKey).not.toHaveBeenCalled();
  });
});

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

  it('returns success when DeepSeek responds 200', async () => {
    mockFetchOk();

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: 'sk-real-key',
    });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('deepseek.com');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-real-key');
  });

  it('returns failure with message when DeepSeek responds 401', async () => {
    mockFetch401();

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: 'sk-bad-key',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.error as string).toMatch(/无效|过期/);
  });

  it('returns failure with status code when DeepSeek responds non-401 error', async () => {
    mockFetchError(500);

    const { body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: 'sk-key',
    });

    expect(body.success).toBe(false);
    expect((body.error as string)).toContain('500');
  });

  it('returns failure when network throws', async () => {
    mockFetchNetworkError();

    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: 'sk-key',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 when deepseekApiKey is missing', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {});

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 400 when deepseekApiKey is empty', async () => {
    const { status, body } = await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: '  ',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trims the key before sending to DeepSeek', async () => {
    mockFetchOk();

    await jsonRequest(httpServer, 'POST', '/api/config/test', {
      deepseekApiKey: '  sk-trimmed  ',
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-trimmed');
  });
});

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
