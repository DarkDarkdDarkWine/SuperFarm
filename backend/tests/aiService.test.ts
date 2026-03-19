import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIService, PROVIDER_CONFIGS } from '../src/services/AIService';
import type { AIDecisionRequest, GameState } from '../../shared/types/game';

function createGameState(): GameState {
  return {
    roomId: 'room-1',
    mode: 'classic',
    currentRound: 3,
    currentPlayerIndex: 1,
    phase: 'exchange',
    players: [
      {
        id: 'human-1',
        name: 'Alice',
        type: 'human',
        animals: { rabbit: 2, sheep: 1, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 1, bigDog: 0 },
        isWinner: false,
      },
      {
        id: 'ai-1',
        name: 'AI',
        type: 'ai',
        animals: { rabbit: 6, sheep: 1, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 0, bigDog: 0 },
        isWinner: false,
      },
    ],
    bank: { rabbit: 52, sheep: 23, pig: 20, cow: 12, horse: 6, smallDog: 4, bigDog: 2 },
    diceResult: ['rabbit', 'sheep'],
    history: [],
  };
}

function createRequest(): AIDecisionRequest {
  const service = new AIService('test-key');
  const gameState = createGameState();

  return {
    playerId: 'ai-1',
    gameView: service.filterGameState(gameState, 'ai-1'),
    availableActions: ['exchange', 'buy_protection'],
    mode: 'classic',
    difficulty: 'medium',
  };
}

describe('AIService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters game state so the AI sees itself separately from opponents', () => {
    const service = new AIService('test-key');
    const filtered = service.filterGameState(createGameState(), 'ai-1');

    expect(filtered.myPlayer.id).toBe('ai-1');
    expect(filtered.opponents).toHaveLength(1);
    expect(filtered.opponents[0].id).toBe('human-1');
    expect(filtered.lastDiceResult).toEqual(['rabbit', 'sheep']);
  });

  it('parses valid JSON decisions from the DeepSeek response', async () => {
    const service = new AIService('test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: '升级到羊',
                  confidence: 0.9,
                  actions: [
                    {
                      type: 'exchange',
                      from: 'rabbit',
                      to: 'sheep',
                      fromCount: 6,
                      toCount: 1,
                    },
                  ],
                }),
              },
            },
          ],
        }),
      })
    );

    const decision = await service.getDecision(createRequest());

    expect(decision.reasoning).toBe('升级到羊');
    expect(decision.confidence).toBe(0.9);
    expect(decision.actions).toEqual([
      {
        type: 'exchange',
        from: 'rabbit',
        to: 'sheep',
        fromCount: 6,
        toCount: 1,
      },
    ]);
  });

  it('falls back safely when the API returns invalid JSON', async () => {
    const service = new AIService('test-key');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'not-json',
              },
            },
          ],
        }),
      })
    );

    const decision = await service.getDecision(createRequest());

    expect(decision.reasoning).toBe('AI响应解析失败');
    expect(decision.confidence).toBe(0);
    expect(decision.actions).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it.each(['deepseek', 'minimax', 'zhipu'] as const)(
    'calls the correct baseUrl after updateProvider("%s")',
    async (provider) => {
      const service = new AIService('test-key');
      service.updateProvider(provider, PROVIDER_CONFIGS[provider].testModel);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({ reasoning: 'ok', confidence: 0.5, actions: [] }) } }],
          }),
        })
      );

      await service.getDecision(createRequest());

      const [calledUrl] = vi.mocked(fetch).mock.calls[0] as [string];
      expect(calledUrl).toContain(PROVIDER_CONFIGS[provider].baseUrl);
    }
  );

  it('returns the guardrail fallback when the API call fails', async () => {
    const service = new AIService('test-key');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
      })
    );

    const decision = await service.getDecision(createRequest());

    expect(decision.reasoning).toBe('AI决策失败，跳过本次操作');
    expect(decision.confidence).toBe(0);
    expect(decision.actions).toEqual([]);
    consoleErrorSpy.mockRestore();
  });
});
