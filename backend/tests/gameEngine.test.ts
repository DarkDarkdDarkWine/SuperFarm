import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import type { Bank, GameState, PlayerState } from '../../shared/types/game';

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    name: 'Player 1',
    type: 'human',
    animals: {
      rabbit: 0,
      sheep: 0,
      pig: 0,
      cow: 0,
      horse: 0,
    },
    protection: {
      smallDog: 0,
      bigDog: 0,
    },
    isWinner: false,
    ...overrides,
  };
}

function createBank(overrides: Partial<Bank> = {}): Bank {
  return {
    rabbit: 60,
    sheep: 24,
    pig: 20,
    cow: 12,
    horse: 6,
    smallDog: 4,
    bigDog: 2,
    ...overrides,
  };
}

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'room-1',
    mode: 'classic',
    currentRound: 1,
    currentPlayerIndex: 0,
    phase: 'exchange',
    players: [createPlayer()],
    bank: createBank(),
    diceResult: [],
    history: [],
    ...overrides,
  };
}

describe('GameEngine', () => {
  describe('initGame', () => {
    it('deducts each player\'s starting animals from the bank', () => {
      const gameState = GameEngine.initGame(
        'room-1',
        [
          { id: 'p1', name: 'Alice', type: 'human' },
          { id: 'p2', name: 'Bob', type: 'ai' },
        ],
        'classic'
      );

      expect(gameState.players[0].animals.rabbit).toBe(1);
      expect(gameState.players[1].animals.rabbit).toBe(1);
      expect(gameState.bank.rabbit).toBe(58);
      expect(gameState.bank.sheep).toBe(24);
    });
  });

  describe('validateExchange', () => {
    it('accepts valid forward and reverse exchanges', () => {
      const player = createPlayer({
        animals: { rabbit: 6, sheep: 1, pig: 1, cow: 1, horse: 0 },
      });
      const bank = createBank();

      expect(
        GameEngine.validateExchange(player, bank, {
          type: 'exchange',
          from: 'rabbit',
          to: 'sheep',
          fromCount: 6,
          toCount: 1,
        }).valid
      ).toBe(true);

      expect(
        GameEngine.validateExchange(player, bank, {
          type: 'exchange',
          from: 'sheep',
          to: 'rabbit',
          fromCount: 1,
          toCount: 6,
        }).valid
      ).toBe(true);
    });

    it('rejects invalid ratios and insufficient inventory', () => {
      const player = createPlayer({
        animals: { rabbit: 5, sheep: 0, pig: 0, cow: 0, horse: 0 },
      });
      const bank = createBank({ sheep: 0 });

      expect(
        GameEngine.validateExchange(player, createBank(), {
          type: 'exchange',
          from: 'rabbit',
          to: 'sheep',
          fromCount: 5,
          toCount: 1,
        }).valid
      ).toBe(false);

      expect(
        GameEngine.validateExchange(player, createBank(), {
          type: 'exchange',
          from: 'rabbit',
          to: 'sheep',
          fromCount: 6,
          toCount: 1,
        }).valid
      ).toBe(false);

      expect(
        GameEngine.validateExchange(createPlayer({
          animals: { rabbit: 6, sheep: 0, pig: 0, cow: 0, horse: 0 },
        }), bank, {
          type: 'exchange',
          from: 'rabbit',
          to: 'sheep',
          fromCount: 6,
          toCount: 1,
        }).valid
      ).toBe(false);
    });
  });

  describe('rollDice', () => {
    it('uses the configured dice tables', () => {
      const randomSpy = vi.spyOn(Math, 'random');
      randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.9999);

      expect(GameEngine.rollDice('classic')).toEqual(['rabbit', 'wolf']);

      randomSpy.mockRestore();
    });
  });

  describe('calculateBreeding', () => {
    it('returns gain = floor((current + dice) / 2)', () => {
      // (1+1)/2 = 1 → player gains 1, ends with 2
      expect(GameEngine.calculateBreeding(1, 1)).toBe(1);
      // (2+2)/2 = 2 → player gains 2, ends with 4
      expect(GameEngine.calculateBreeding(2, 2)).toBe(2);
      // (3+2)/2 = 2 → player gains 2, ends with 5
      expect(GameEngine.calculateBreeding(3, 2)).toBe(2);
      // (0+1)/2 = 0 → no seed, no gain
      expect(GameEngine.calculateBreeding(0, 1)).toBe(0);
      // (0+2)/2 = 1 → 纯数学结果，但实际游戏中 processBreeding 会因无种跳过
      expect(GameEngine.calculateBreeding(0, 2)).toBe(1);
    });
  });

  describe('executeExchange', () => {
    it('moves animals between the player and bank', () => {
      const player = createPlayer({
        animals: { rabbit: 6, sheep: 0, pig: 0, cow: 0, horse: 0 },
      });
      const bank = createBank();

      GameEngine.executeExchange(player, bank, {
        type: 'exchange',
        from: 'rabbit',
        to: 'sheep',
        fromCount: 6,
        toCount: 1,
      });

      expect(player.animals.rabbit).toBe(0);
      expect(player.animals.sheep).toBe(1);
      expect(bank.rabbit).toBe(66);
      expect(bank.sheep).toBe(23);
    });
  });

  describe('buyProtection', () => {
    it('validates and executes small-dog and big-dog purchases', () => {
      // smallDog costs 1 sheep, bigDog costs 1 cow (per rules)
      const player = createPlayer({
        animals: { rabbit: 0, sheep: 1, pig: 0, cow: 1, horse: 0 },
      });
      const bank = createBank();

      expect(
        GameEngine.validateBuyProtection(player, bank, {
          type: 'buy_protection',
          protection: 'smallDog',
        }).valid
      ).toBe(true);

      GameEngine.executeBuyProtection(player, bank, {
        type: 'buy_protection',
        protection: 'smallDog',
      });

      expect(player.animals.sheep).toBe(0);   // 1 sheep consumed
      expect(player.protection.smallDog).toBe(1);
      expect(bank.sheep).toBe(25);             // sheep returned to bank
      expect(bank.smallDog).toBe(3);

      expect(
        GameEngine.validateBuyProtection(player, bank, {
          type: 'buy_protection',
          protection: 'bigDog',
        }).valid
      ).toBe(true);

      GameEngine.executeBuyProtection(player, bank, {
        type: 'buy_protection',
        protection: 'bigDog',
      });

      expect(player.animals.cow).toBe(0);     // 1 cow consumed
      expect(player.protection.bigDog).toBe(1);
      expect(bank.cow).toBe(13);              // cow returned to bank
      expect(bank.bigDog).toBe(1);
    });

    it('rejects purchases when the player or bank lacks stock', () => {
      expect(
        GameEngine.validateBuyProtection(
          createPlayer(),
          createBank(),
          { type: 'buy_protection', protection: 'smallDog' }
        ).valid
      ).toBe(false);

      expect(
        GameEngine.validateBuyProtection(
          createPlayer({
            animals: { rabbit: 1, sheep: 1, pig: 0, cow: 0, horse: 0 },
          }),
          createBank({ bigDog: 0 }),
          { type: 'buy_protection', protection: 'bigDog' }
        ).valid
      ).toBe(false);
    });
  });

  describe('processBreeding', () => {
    it('does not grant a second copy of a single die result', () => {
      const gameState = createGameState({
        players: [
          createPlayer({
            animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
          }),
        ],
        diceResult: ['rabbit', 'fox'],
      });

      const result = GameEngine.processBreeding(gameState);

      expect(result.rabbit).toEqual({ old: 1, new: 2, change: 1 });
      expect(gameState.players[0].animals.rabbit).toBe(2);
      expect(gameState.bank.rabbit).toBe(59);
    });

    it('grants 1 sheep when player has none but dice shows one sheep (die arrives first)', () => {
      const gameState = createGameState({
        players: [createPlayer()],
        diceResult: ['sheep', 'fox'],
      });

      const result = GameEngine.processBreeding(gameState);

      expect(result.sheep).toEqual({ old: 0, new: 1, change: 1 });
      expect(gameState.players[0].animals.sheep).toBe(1);
      expect(gameState.bank.sheep).toBe(23);
    });

    it('grants 1 sheep when player has none but dice shows two sheep', () => {
      const gameState = createGameState({
        players: [createPlayer()],
        diceResult: ['sheep', 'sheep'],
      });

      const result = GameEngine.processBreeding(gameState);

      // calculateBreeding(0, 2) = floor(2/2) = 1, max(1, 1) = 1
      expect(result.sheep).toEqual({ old: 0, new: 1, change: 1 });
      expect(gameState.players[0].animals.sheep).toBe(1);
      expect(gameState.bank.sheep).toBe(23);
    });

    it('respects bank stock limits', () => {
      const gameState = createGameState({
        players: [
          createPlayer({
            animals: { rabbit: 5, sheep: 0, pig: 0, cow: 0, horse: 0 },
          }),
        ],
        bank: createBank({ rabbit: 1 }),
        diceResult: ['rabbit', 'fox'],
      });

      const result = GameEngine.processBreeding(gameState);

      expect(result.rabbit).toEqual({ old: 5, new: 6, change: 1 });
      expect(gameState.bank.rabbit).toBe(0);
    });
  });

  describe('processFoxAttack', () => {
    it('consumes a small dog before losing rabbits', () => {
      const victim = createPlayer({
        animals: { rabbit: 4, sheep: 0, pig: 0, cow: 0, horse: 0 },
        protection: { smallDog: 1, bigDog: 0 },
      });
      const bank = createBank({ smallDog: 0 });

      const result = GameEngine.processFoxAttack(victim, victim, bank, 'classic');

      expect(result).toEqual({ blocked: true, rabbitsLost: 0 });
      expect(victim.protection.smallDog).toBe(0);
      expect(bank.smallDog).toBe(1);
      expect(victim.animals.rabbit).toBe(4);
    });

    it('does not create rabbits in casual mode when the player has none', () => {
      const victim = createPlayer();
      const bank = createBank();

      const result = GameEngine.processFoxAttack(victim, victim, bank, 'casual');

      expect(result).toEqual({ blocked: false, rabbitsLost: 0 });
      expect(victim.animals.rabbit).toBe(0);
      expect(bank.rabbit).toBe(60);
    });
  });

  describe('processWolfAttack', () => {
    it('consumes a big dog before losing animals', () => {
      const victim = createPlayer({
        animals: { rabbit: 1, sheep: 2, pig: 3, cow: 1, horse: 0 },
        protection: { smallDog: 0, bigDog: 1 },
      });
      const bank = createBank({ bigDog: 0 });

      const result = GameEngine.processWolfAttack(victim, victim, bank);

      expect(result).toEqual({ blocked: true, animalsLost: {} });
      expect(victim.protection.bigDog).toBe(0);
      expect(bank.bigDog).toBe(1);
      expect(victim.animals.sheep).toBe(2);
    });

    it('returns rabbits, sheep, pigs and cows to the bank when unblocked (horse spared)', () => {
      const victim = createPlayer({
        animals: { rabbit: 2, sheep: 2, pig: 1, cow: 1, horse: 1 },
      });
      const bank = createBank({ rabbit: 50, sheep: 10, pig: 10, cow: 10 });

      const result = GameEngine.processWolfAttack(victim, victim, bank);

      expect(result).toEqual({
        blocked: false,
        animalsLost: { rabbit: 2, sheep: 2, pig: 1, cow: 1 },
      });
      expect(victim.animals.rabbit).toBe(0);   // wolf eats rabbits
      expect(victim.animals.sheep).toBe(0);
      expect(victim.animals.pig).toBe(0);
      expect(victim.animals.cow).toBe(0);
      expect(victim.animals.horse).toBe(1);     // horse spared
      expect(bank.rabbit).toBe(52);
      expect(bank.sheep).toBe(12);
      expect(bank.pig).toBe(11);
      expect(bank.cow).toBe(11);
    });
  });

  describe('victory and timeout', () => {
    it('detects wins and game timeout correctly', () => {
      expect(
        GameEngine.checkVictory(
          createPlayer({
            animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 1 },
          })
        )
      ).toBe(true);

      expect(
        GameEngine.checkVictory(
          createPlayer({
            animals: { rabbit: 1, sheep: 1, pig: 0, cow: 1, horse: 1 },
          })
        )
      ).toBe(false);

      expect(
        GameEngine.isGameTimeout(createGameState({ currentRound: 51, mode: 'classic' }))
      ).toBe(true);
      expect(
        GameEngine.isGameTimeout(createGameState({ currentRound: 50, mode: 'classic' }))
      ).toBe(false);
    });
  });

  describe('resolveTie', () => {
    it('uses animal variety first and then higher-tier animals', () => {
      const winner = GameEngine.resolveTie([
        createPlayer({
          id: 'p1',
          animals: { rabbit: 2, sheep: 1, pig: 0, cow: 0, horse: 0 },
        }),
        createPlayer({
          id: 'p2',
          animals: { rabbit: 1, sheep: 1, pig: 1, cow: 0, horse: 0 },
        }),
      ]);

      expect(winner?.id).toBe('p2');
    });

    it('returns null for a complete tie', () => {
      const player = createPlayer({
        animals: { rabbit: 1, sheep: 1, pig: 0, cow: 0, horse: 0 },
      });

      expect(GameEngine.resolveTie([player, { ...player, id: 'p2' }])).toBeNull();
    });
  });
});
