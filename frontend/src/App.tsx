import { useState } from 'react';
import SetupPage from './pages/SetupPage';
import GamePage from './pages/GamePage';
import type { GameMode } from '@shared/types/game';

export type PlayerConfig = {
  name: string;
  type: 'human' | 'ai';
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type GameConfig = {
  players: PlayerConfig[];
  mode: GameMode;
};

export default function App() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  if (gameConfig) {
    return <GamePage config={gameConfig} onExit={() => setGameConfig(null)} />;
  }

  return <SetupPage onStart={setGameConfig} />;
}
