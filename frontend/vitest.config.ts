import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname),
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      '../tests/frontend/**/*.test.{ts,tsx}',
    ],
    // Exclude tests that depend on Vue/Pinia (incompatible with this React project)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '../tests/frontend/units/DiceComponent.test.ts',
      '../tests/frontend/units/GameBoard.test.ts',
      '../tests/frontend/units/GameControlCenter.test.ts',
      '../tests/frontend/units/PlayerBoard.test.ts',
      '../tests/frontend/units/WinDialog.test.ts',
      '../tests/frontend/units/aiService.test.ts',
      '../tests/frontend/units/gameController.test.ts',
      '../tests/frontend/units/gameStore.test.ts',
    ],
    passWithNoTests: true,
  },
});
