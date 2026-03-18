import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AttackResult,
  BreedingResults,
  ClientToServerEvents,
  DiceResult,
  GameState,
  PlayerAction,
  Room,
  ServerToClientEvents,
} from '@shared/types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketHandlers {
  onRoomUpdated?: (room: Room) => void;
  onGameStarted?: (gameState: GameState) => void;
  onGameState?: (gameState: GameState) => void;
  onDiceRolled?: (result: DiceResult[]) => void;
  onBreeding?: (results: BreedingResults) => void;
  onAttack?: (attack: AttackResult) => void;
  onVictory?: (winnerId: string) => void;
  onGameFinished?: (gameState: GameState) => void;
  onAIThinking?: (playerId: string) => void;
  onAIDecision?: (playerId: string, actions: PlayerAction[]) => void;
  onError?: (error: string) => void;
}

export function useSocket(handlers: SocketHandlers = {}) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('room:updated', room => {
      handlersRef.current.onRoomUpdated?.(room);
    });

    newSocket.on('game:started', gameState => {
      handlersRef.current.onGameStarted?.(gameState);
    });

    newSocket.on('game:state', gameState => {
      handlersRef.current.onGameState?.(gameState);
    });

    newSocket.on('game:dice_rolled', result => {
      handlersRef.current.onDiceRolled?.(result);
    });

    newSocket.on('game:breeding', results => {
      handlersRef.current.onBreeding?.(results);
    });

    newSocket.on('game:attack', attack => {
      handlersRef.current.onAttack?.(attack);
    });

    newSocket.on('game:victory', winnerId => {
      handlersRef.current.onVictory?.(winnerId);
    });

    newSocket.on('game:finished', gameState => {
      handlersRef.current.onGameFinished?.(gameState);
    });

    newSocket.on('ai:thinking', playerId => {
      handlersRef.current.onAIThinking?.(playerId);
    });

    newSocket.on('ai:decision', (playerId, actions) => {
      handlersRef.current.onAIDecision?.(playerId, actions);
    });

    newSocket.on('error', error => {
      handlersRef.current.onError?.(error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
