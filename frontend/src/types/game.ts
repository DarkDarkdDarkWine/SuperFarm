/**
 * Frontend-local game type definitions
 */

export type AnimalType = 'rabbit' | 'sheep' | 'pig' | 'cow' | 'horse';
export type ProtectionType = 'smallDog' | 'bigDog';
export type DiceResult = AnimalType | 'fox' | 'wolf';
export type PlayerType = 'human' | 'ai';

export interface AnimalCollection {
  rabbit: number;
  sheep: number;
  pig: number;
  cow: number;
  horse: number;
}

export interface ProtectionCollection {
  smallDog: number;
  bigDog: number;
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  animals: AnimalCollection;
  protection: ProtectionCollection;
  isWinner: boolean;
}

export interface ExchangeAction {
  from: AnimalType;
  to: AnimalType;
  fromCount: number;
  toCount: number;
}
