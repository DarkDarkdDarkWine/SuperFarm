/**
 * Socket.io客户端Hook
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Room,
  GameState,
  DiceResult,
} from '@shared/types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketHandlers {
  onRoomCreated?: (room: Room) => void;
  onRoomJoined?: (room: Room) => void;
  onRoomUpdated?: (room: Room) => void;
  onGameStarted?: (gameState: GameState) => void;
  onGameState?: (gameState: GameState) => void;
  onDiceRolled?: (result: DiceResult[]) => void;
  onBreeding?: (results: any) => void;
  onAttack?: (attack: any) => void;
  onVictory?: (winnerId: string) => void;
  onGameFinished?: (gameState: GameState) => void;
  onAIThinking?: (playerId: string) => void;
  onAIDecision?: (playerId: string, actions: any[]) => void;
  onError?: (error: string) => void;
}

export function useSocket(handlers: SocketHandlers = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // 更新handlers引用
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    console.log('Creating socket connection...');

    // 创建Socket连接
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // 连接事件
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // 房间事件 - 使用最新的handlers
    newSocket.on('room:created', (room: Room) => {
      if (handlersRef.current.onRoomCreated) {
        handlersRef.current.onRoomCreated(room);
      }
    });

    newSocket.on('room:joined', (room: Room) => {
      if (handlersRef.current.onRoomJoined) {
        handlersRef.current.onRoomJoined(room);
      }
    });

    newSocket.on('room:updated', (room: Room) => {
      if (handlersRef.current.onRoomUpdated) {
        handlersRef.current.onRoomUpdated(room);
      }
    });

    // 游戏事件
    newSocket.on('game:started', (gameState: GameState) => {
      if (handlersRef.current.onGameStarted) {
        handlersRef.current.onGameStarted(gameState);
      }
    });

    newSocket.on('game:state', (gameState: GameState) => {
      if (handlersRef.current.onGameState) {
        handlersRef.current.onGameState(gameState);
      }
    });

    newSocket.on('game:dice_rolled', (result: DiceResult[]) => {
      if (handlersRef.current.onDiceRolled) {
        handlersRef.current.onDiceRolled(result);
      }
    });

    newSocket.on('game:breeding', (results: any) => {
      if (handlersRef.current.onBreeding) {
        handlersRef.current.onBreeding(results);
      }
    });

    newSocket.on('game:attack', (attack: any) => {
      if (handlersRef.current.onAttack) {
        handlersRef.current.onAttack(attack);
      }
    });

    newSocket.on('game:victory', (winnerId: string) => {
      if (handlersRef.current.onVictory) {
        handlersRef.current.onVictory(winnerId);
      }
    });

    newSocket.on('game:finished', (gameState: GameState) => {
      if (handlersRef.current.onGameFinished) {
        handlersRef.current.onGameFinished(gameState);
      }
    });

    // AI事件
    newSocket.on('ai:thinking', (playerId: string) => {
      if (handlersRef.current.onAIThinking) {
        handlersRef.current.onAIThinking(playerId);
      }
    });

    newSocket.on('ai:decision', (playerId: string, actions: any[]) => {
      if (handlersRef.current.onAIDecision) {
        handlersRef.current.onAIDecision(playerId, actions);
      }
    });

    // 错误事件
    newSocket.on('error', (error: string) => {
      if (handlersRef.current.onError) {
        handlersRef.current.onError(error);
      }
    });

    setSocket(newSocket);

    // 清理：只在组件卸载时执行
    return () => {
      console.log('Cleaning up socket connection...');
      newSocket.disconnect();
    };
  }, []); // 空依赖数组，只在挂载时运行一次

  return socket;
}
