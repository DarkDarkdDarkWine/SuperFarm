import { beforeEach, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DEEPSEEK_API_KEY = 'test-api-key';

vi.stubGlobal('fetch', vi.fn());
vi.spyOn(console, 'log').mockImplementation(() => undefined);
vi.spyOn(console, 'error').mockImplementation(() => undefined);

beforeEach(() => {
  vi.clearAllMocks();
});
