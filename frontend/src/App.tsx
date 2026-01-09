import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import HomePage from './pages/HomePage';

function App() {
  const { setCurrentRoom, setGameState, setIsConnected, setError, setDiceAnimation, setAIThinking, setBreedingAnimation, setAttackAnimation } = useGameStore();

  const socket = useSocket({
    onRoomCreated: (room) => {
      console.log('Room created:', room);
      setCurrentRoom(room);
    },
    onRoomJoined: (room) => {
      console.log('Room joined:', room);
      setCurrentRoom(room);
    },
    onRoomUpdated: (room) => {
      console.log('Room updated:', room);
      setCurrentRoom(room);
    },
    onGameStarted: (gameState) => {
      console.log('Game started:', gameState);
      setGameState(gameState);
    },
    onGameState: (gameState) => {
      console.log('Game state updated:', gameState);
      setGameState(gameState);
    },
    onDiceRolled: (result) => {
      console.log('Dice rolled:', result);
      setDiceAnimation(result);
      setTimeout(() => setDiceAnimation(null), 3000);
    },
    onBreeding: (results) => {
      console.log('Breeding results:', results);
      setBreedingAnimation(results);
      setTimeout(() => setBreedingAnimation(null), 4000);
    },
    onAttack: (attack) => {
      console.log('Attack:', attack);
      setAttackAnimation(attack);
      setTimeout(() => setAttackAnimation(null), 4000);
    },
    onVictory: (winnerId) => {
      console.log('Victory:', winnerId);
      alert(`🎉 玩家 ${winnerId} 获胜！`);
    },
    onGameFinished: (gameState) => {
      console.log('Game finished:', gameState);
      setGameState(gameState);
    },
    onAIThinking: (playerId) => {
      console.log('AI thinking:', playerId);
      setAIThinking(playerId);
    },
    onAIDecision: (playerId, actions) => {
      console.log('AI decision:', playerId, actions);
      setAIThinking(null);
    },
    onError: (error) => {
      console.error('Socket error:', error);
      setError(error);
    },
  });

  useEffect(() => {
    if (!socket) return;

    // 连接事件处理
    const handleConnect = () => {
      console.log('[App] Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('[App] Socket disconnected');
      setIsConnected(false);
    };

    // 检查当前连接状态
    if (socket.connected) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }

    // 注册事件监听器
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // 清理
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, setIsConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <HomePage socket={socket} />
    </div>
  );
}

export default App;
