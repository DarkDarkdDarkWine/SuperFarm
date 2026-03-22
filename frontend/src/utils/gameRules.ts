/**
 * GameRules - authoritative game logic for Super Farmer
 *
 * Rules reference:
 * - Dice A: rabbit×6, sheep×3, pig×1, cow×1, fox×1
 * - Dice B: rabbit×6, sheep×3, pig×1, horse×1, wolf×1
 * - Breeding: gain = floor((current + diceCount) / 2)
 *   Condition A: dice shows animal AND player has ≥1 → breed normally
 *   Condition B (double-dice): BOTH dice show same animal, even 0 → get exactly 1
 *   Horse/cow cannot trigger double-dice (each only on one die)
 * - Fox attack: rabbit count set to exactly 1; only small dog blocks
 * - Wolf attack: rabbit/sheep/pig/cow all lost (horse preserved); only big dog blocks
 * - Exchange: 6 rabbit=1 sheep, 2 sheep=1 pig, 3 pig=1 cow, 2 cow=1 horse
 *             1 sheep=1 small dog, 1 cow=1 big dog
 * - Win: simultaneously have ≥1 rabbit, ≥1 sheep, ≥1 pig, ≥1 cow, ≥1 horse
 */

import type { Player, AnimalType, ProtectionType, DiceResult, ExchangeAction } from '../types/game.js';

// ── Dice configuration ────────────────────────────────────────────────────

const DICE_A: DiceResult[] = [
  'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', // 6 faces
  'sheep', 'sheep', 'sheep',                                   // 3 faces
  'pig',                                                       // 1 face
  'cow',                                                       // 1 face
  'fox',                                                       // 1 face
];

const DICE_B: DiceResult[] = [
  'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', 'rabbit', // 6 faces
  'sheep', 'sheep', 'sheep',                                   // 3 faces
  'pig',                                                       // 1 face
  'horse',                                                     // 1 face
  'wolf',                                                      // 1 face
];

// ── Exchange rates ────────────────────────────────────────────────────────

const UPGRADE_EXCHANGE_RATES: ExchangeAction[] = [
  { from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
  { from: 'sheep', to: 'pig', fromCount: 2, toCount: 1 },
  { from: 'pig', to: 'cow', fromCount: 3, toCount: 1 },
  { from: 'cow', to: 'horse', fromCount: 2, toCount: 1 },
];

const ALL_EXCHANGE_RATES: ExchangeAction[] = [
  ...UPGRADE_EXCHANGE_RATES,
  { from: 'sheep', to: 'rabbit', fromCount: 1, toCount: 6 },
  { from: 'pig', to: 'sheep', fromCount: 1, toCount: 2 },
  { from: 'cow', to: 'pig', fromCount: 1, toCount: 3 },
  { from: 'horse', to: 'cow', fromCount: 1, toCount: 2 },
];

// ── Protection purchase requirements ─────────────────────────────────────

const PROTECTION_REQUIREMENTS: Record<ProtectionType, { animal: AnimalType; max: number }> = {
  smallDog: { animal: 'sheep', max: 2 },
  bigDog: { animal: 'cow', max: 1 },
};

// ── GameRules class ───────────────────────────────────────────────────────

export class GameRules {
  /**
   * Roll both dice and return their results.
   */
  static rollDice(): DiceResult[] {
    const a = DICE_A[Math.floor(Math.random() * DICE_A.length)];
    const b = DICE_B[Math.floor(Math.random() * DICE_B.length)];
    return [a, b];
  }

  /**
   * Calculate breeding gain for a given animal.
   * Returns the number of new animals gained (not the new total).
   *
   * gain = floor((current + diceCount) / 2)
   *
   * This returns 0 naturally when current=0 and diceCount=1:
   *   floor((0 + 1) / 2) = 0
   * And returns 1 when current=0 and diceCount=2 (double-dice exception):
   *   floor((0 + 2) / 2) = 1
   */
  static calculateBreeding(current: number, diceCount: number): number {
    return Math.floor((current + diceCount) / 2);
  }

  /**
   * Process a fox attack on the player.
   * - If player has a small dog: consumes 1 small dog, attack blocked, returns false
   * - Otherwise: sets rabbit count to exactly 1, returns true (attack succeeded)
   * - Big dog does NOT defend against fox
   */
  static processFoxAttack(player: Player): boolean {
    if (player.protection.smallDog > 0) {
      player.protection.smallDog -= 1;
      return false; // attack blocked
    }
    // Attack succeeds: reduce rabbits to exactly 1
    player.animals.rabbit = Math.min(player.animals.rabbit, 1);
    return true; // attack succeeded
  }

  /**
   * Process a wolf attack on the player.
   * - If player has a big dog: consumes 1 big dog, attack blocked, returns false
   * - Otherwise: all rabbits, sheep, pigs, cows are lost (horse preserved), returns true
   * - Small dog does NOT defend against wolf
   */
  static processWolfAttack(player: Player): boolean {
    if (player.protection.bigDog > 0) {
      player.protection.bigDog -= 1;
      return false; // attack blocked
    }
    // Attack succeeds: lose rabbit, sheep, pig, cow (horse preserved)
    player.animals.rabbit = 0;
    player.animals.sheep = 0;
    player.animals.pig = 0;
    player.animals.cow = 0;
    return true; // attack succeeded
  }

  /**
   * Validate whether an exchange is legal.
   * Returns true if the exchange rate matches rules and player has enough animals.
   */
  static validateExchange(player: Player, exchange: ExchangeAction): boolean {
    const rate = ALL_EXCHANGE_RATES.find(
      r => r.from === exchange.from && r.to === exchange.to
        && r.fromCount === exchange.fromCount && r.toCount === exchange.toCount
    );
    if (!rate) return false;
    return player.animals[exchange.from] >= exchange.fromCount;
  }

  /**
   * Execute an exchange if valid. Mutates player. Returns true on success.
   */
  static executeExchange(player: Player, exchange: ExchangeAction): boolean {
    if (!GameRules.validateExchange(player, exchange)) return false;
    player.animals[exchange.from] -= exchange.fromCount;
    player.animals[exchange.to] += exchange.toCount;
    return true;
  }

  /**
   * Check if the player has won (≥1 of each: rabbit, sheep, pig, cow, horse).
   */
  static checkWinCondition(player: Player): boolean {
    return (['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).every(
      a => player.animals[a] >= 1
    );
  }

  /**
   * Validate whether a protection purchase is legal.
   * - smallDog: costs 1 sheep, max 2
   * - bigDog: costs 1 cow, max 1
   */
  static validateProtectionPurchase(player: Player, protection: ProtectionType): boolean {
    const req = PROTECTION_REQUIREMENTS[protection];
    if (player.protection[protection] >= req.max) return false;
    return player.animals[req.animal] >= 1;
  }

  /**
   * Execute a protection purchase if valid. Mutates player. Returns true on success.
   */
  static buyProtection(player: Player, protection: ProtectionType): boolean {
    if (!GameRules.validateProtectionPurchase(player, protection)) return false;
    const req = PROTECTION_REQUIREMENTS[protection];
    player.animals[req.animal] -= 1;
    player.protection[protection] += 1;
    return true;
  }

  /**
   * Get all upgrade exchanges the player can currently afford.
   */
  static getAvailableExchanges(player: Player): ExchangeAction[] {
    return UPGRADE_EXCHANGE_RATES.filter(
      rate => player.animals[rate.from] >= rate.fromCount
    );
  }

  /**
   * Calculate game progress as a fraction from 0 to 1.
   * Progress = number of animal types with ≥1 / 5.
   */
  static calculateProgress(player: Player): number {
    const have = (['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).filter(
      a => player.animals[a] >= 1
    ).length;
    return have / 5;
  }
}
