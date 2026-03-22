import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import farmStageUrl from '../assets/farm-stage.svg';
import foxRunUrl from '../assets/fox-run.svg';
import sproutBurstUrl from '../assets/sprout-burst.svg';
import type {
  AnimalType,
  AttackResult,
  BreedingResults,
  GameAction,
  GameMode,
  GameState,
  Player,
  PlayerState,
  Room,
} from '@shared/types/game';

const animalMeta: Record<AnimalType, { icon: string; label: string }> = {
  rabbit: { icon: '🐰', label: '兔子' },
  sheep: { icon: '🐑', label: '绵羊' },
  pig: { icon: '🐷', label: '猪' },
  cow: { icon: '🐄', label: '奶牛' },
  horse: { icon: '🐴', label: '马' },
};

const modeCopy: Record<GameMode, { title: string; detail: string }> = {
  classic: { title: '经典农场', detail: '最适合第一次开始玩。' },
  casual: { title: '欢乐丰收', detail: '节奏更轻快，玩起来更放松。' },
};

type DemoStage = 'lobby' | 'room' | 'game';

const demoPlayers: Player[] = [
  { id: 'p1', name: 'Mira', type: 'human', socketId: 'p1', isReady: true, isConnected: true },
  { id: 'p2', name: 'Ash', type: 'human', socketId: 'p2', isReady: true, isConnected: true },
  { id: 'ai-1', name: '天才李四', type: 'ai', difficulty: 'hard', isReady: true, isConnected: true },
];

const demoPlayerStates: PlayerState[] = [
  {
    id: 'p1',
    name: 'Mira',
    type: 'human',
    animals: { rabbit: 12, sheep: 2, pig: 1, cow: 1, horse: 0 },
    protection: { smallDog: 1, bigDog: 0 },
    isWinner: false,
  },
  {
    id: 'p2',
    name: 'Ash',
    type: 'human',
    animals: { rabbit: 8, sheep: 1, pig: 1, cow: 0, horse: 0 },
    protection: { smallDog: 0, bigDog: 0 },
    isWinner: false,
  },
  {
    id: 'ai-1',
    name: '天才李四',
    type: 'ai',
    animals: { rabbit: 6, sheep: 2, pig: 2, cow: 1, horse: 0 },
    protection: { smallDog: 0, bigDog: 1 },
    isWinner: false,
  },
];

const demoHistory: GameAction[] = [
  {
    type: 'exchange',
    playerId: 'p1',
    timestamp: Date.now() - 1000 * 60 * 2,
    details: { from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
  },
  {
    type: 'buy_protection',
    playerId: 'ai-1',
    timestamp: Date.now() - 1000 * 60,
    details: { protection: 'bigDog' },
  },
  {
    type: 'roll_dice',
    playerId: 'p2',
    timestamp: Date.now() - 1000 * 22,
    details: { diceResult: ['rabbit', 'fox'] },
  },
];

const demoRoom: Room = {
  id: 'amber-orchard',
  name: 'Amber Orchard',
  mode: 'classic',
  maxPlayers: 4,
  players: demoPlayers,
  status: 'waiting',
  createdAt: new Date(),
};

const demoGameState: GameState = {
  roomId: 'amber-orchard',
  mode: 'classic',
  currentRound: 7,
  currentPlayerIndex: 0,
  phase: 'exchange',
  players: demoPlayerStates,
  bank: { rabbit: 34, sheep: 16, pig: 14, cow: 8, horse: 5, smallDog: 2, bigDog: 1 },
  diceResult: ['rabbit', 'fox'],
  history: demoHistory,
};

const diceShowcase = ['rabbit', 'fox'] as const;
const breedingShowcase: BreedingResults = {
  rabbit: { old: 11, new: 14, change: 3 },
  sheep: { old: 1, new: 2, change: 1 },
};
const attackShowcase: AttackResult = {
  type: 'fox',
  attacker: 'bank',
  victim: 'p2',
  blocked: false,
  rabbitsLost: 7,
};

const avatarMap: Record<string, string> = {
  p1: '🥸',
  p2: '👩‍🌾',
  'ai-1': '🤖',
};

function getPlayerBadge(player: PlayerState) {
  return avatarMap[player.id] ?? '👤';
}

function actionLabel(entry: GameAction, room: Room) {
  const actor = room.players.find(player => player.id === entry.playerId)?.name ?? entry.playerId;

  if (entry.type === 'exchange') {
    const details = entry.details as { from: string; to: string; fromCount: number; toCount: number };
    return `${actor} 用${details.fromCount}${details.from}换${details.toCount}${details.to}`;
  }
  if (entry.type === 'buy_protection') {
    const details = entry.details as { protection: string };
    return `${actor} 买了${details.protection === 'smallDog' ? '小狗' : '大狗'}`;
  }
  if (entry.type === 'roll_dice') {
    return `${actor} 掷骰子`;
  }
  return `${actor} 行动`;
}

function StatusPill() {
  return (
    <div className="status-pill is-online">
      <span className="status-dot" />
      演示版
    </div>
  );
}

function HeroCard({ mode, setMode, onCreate, onJoin }: { mode: GameMode; setMode: (mode: GameMode) => void; onCreate: () => void; onJoin: () => void }) {
  return (
    <section className="hero-shell">
      <div className="hero-copy">
        <div className="eyebrow">欢迎来到</div>
        <h1>超级农场主</h1>
        <p>
          和小伙伴们一起经营农场，收集动物，躲避狐狸和狼的攻击！
        </p>
        <div className="hero-modes">
          {(['classic', 'casual'] as GameMode[]).map(option => (
            <button key={option} type="button" className={`mode-chip ${mode === option ? 'is-selected' : ''}`} onClick={() => setMode(option)}>
              <strong>{modeCopy[option].title}</strong>
              <span>{modeCopy[option].detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hero-panel panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">开始游戏</span>
            <h2>选择场景</h2>
          </div>
          <StatusPill />
        </div>

        <div className="preview-grid single-column">
          <div className="preview-card warm">
            <h3>🏠 欢乐大厅</h3>
            <p>创建或加入游戏房间</p>
          </div>
          <div className="preview-card olive">
            <h3>🎮 游戏桌面</h3>
            <p>查看对局场景演示</p>
          </div>
        </div>

        <div className="cta-row">
          <button type="button" className="primary-cta" onClick={onCreate}>
            看房间场景
          </button>
          <button type="button" className="secondary-cta" onClick={onJoin}>
            看游戏桌面
          </button>
        </div>
      </div>
    </section>
  );
}

function RoomStage({ room, onStart, onBack }: { room: Room; onStart: () => void; onBack: () => void }) {
  return (
    <section className="room-stage">
      <div className="panel room-hero">
        <div className="panel-header">
          <div>
            <span className="eyebrow">准备房间</span>
            <h2>{room.name}</h2>
          </div>
          <div className="room-id-tag">{room.id}</div>
        </div>

        <div className="seat-grid">
          {room.players.map(player => (
            <motion.div key={player.id} layout className={`seat-card ${player.type === 'ai' ? 'is-ai' : ''}`}>
              <div className="seat-avatar">
                {avatarMap[player.id] ?? '👤'}
              </div>
              <div className="seat-info">
                <strong>{player.name}</strong>
                <span>{player.isReady ? '✓ 已准备' : '等待中'}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="cta-row">
          <button type="button" className="ghost-cta" onClick={onBack}>
            ← 返回
          </button>
          <button type="button" className="primary-cta" onClick={onStart}>
            开始游戏 →
          </button>
        </div>
      </div>
    </section>
  );
}

function PlayerBadge({ player, isCurrent, isSelf }: { player: PlayerState; isCurrent: boolean; isSelf: boolean }) {
  return (
    <motion.div 
      layout 
      className={`player-badge ${isCurrent ? 'is-current' : ''} ${isSelf ? 'is-self' : ''}`}
      animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <div className="player-avatar">{getPlayerBadge(player)}</div>
      <div className="player-info">
        <strong>{player.name}</strong>
        <div className="player-animals">
          {Object.entries(animalMeta).slice(0, 3).map(([animal, meta]) => (
            <span key={animal}>{meta.icon}{player.animals[animal as AnimalType]}</span>
          ))}
          {player.protection.smallDog > 0 && <span>🐕{player.protection.smallDog}</span>}
          {player.protection.bigDog > 0 && <span>🦮{player.protection.bigDog}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ children, disabled = false, onClick, variant = 'default' }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; variant?: 'default' | 'guard' | 'primary' }) {
  return (
    <button 
      type="button" 
      className={`game-action-btn ${variant}`} 
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function HistoryModal({ room, gameState, isOpen, onClose }: { room: Room; gameState: GameState; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <motion.div
      className="history-modal"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="history-modal-header">
        <h3>📜 游戏记录</h3>
        <button type="button" className="history-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="history-list">
        {gameState.history.slice().reverse().map((entry, index) => (
          <motion.div
            key={`${entry.timestamp}-${index}`}
            className="history-entry"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="history-time">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="history-text">{actionLabel(entry, room)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function GameStage({ room, gameState, visualState, setVisualState, onBack }: { room: Room; gameState: GameState; visualState: 'idle' | 'dice' | 'breeding' | 'attack'; setVisualState: (value: 'idle' | 'dice' | 'breeding' | 'attack') => void; onBack: () => void }) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const [showHistory, setShowHistory] = useState(false);

  return (
    <section className="game-layout">
      {/* 顶部状态栏 */}
      <header className="game-header">
        <div className="header-left">
          <button type="button" className="back-btn" onClick={onBack}>←</button>
          <div className="room-info">
            <h2>{room.name}</h2>
            <span>第 {gameState.currentRound} 回合</span>
          </div>
        </div>
        <div className="header-center">
          <motion.div 
            className="current-turn-badge"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <span>轮到</span>
            <strong>{currentPlayer.name}</strong>
          </motion.div>
        </div>
        <div className="header-right">
          <button 
            type="button" 
            className="history-toggle-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            📜 记录
          </button>
        </div>
      </header>

      {/* 玩家条 */}
      <div className="players-bar">
        {gameState.players.map((player, index) => (
          <PlayerBadge 
            key={player.id} 
            player={player} 
            isCurrent={index === gameState.currentPlayerIndex}
            isSelf={player.id === 'p1'}
          />
        ))}
      </div>

      {/* 主舞台 */}
      <div className="stage-area">
        <div className="stage-background">
          <img src={farmStageUrl} alt="农场" className="farm-bg" />
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
        </div>

        <AnimatePresence mode="wait">
          {visualState === 'idle' && (
            <motion.div 
              key="idle" 
              className="stage-content"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <div className="idle-hint">
                <h3>🎯 轮到你了！</h3>
                <p>点击下方的按钮交换动物或购买保护</p>
              </div>
            </motion.div>
          )}

          {visualState === 'dice' && (
            <motion.div 
              key="dice" 
              className="stage-content"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h3 className="event-title">🎲 掷骰结果</h3>
              <div className="dice-display">
                {diceShowcase.map((face, index) => (
                  <motion.div
                    key={index}
                    className="dice-face"
                    initial={{ rotateY: -180, scale: 0.5 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ delay: index * 0.15, duration: 0.5, type: 'spring' }}
                  >
                    {animalMeta[face as AnimalType]?.icon || (face === 'fox' ? '🦊' : '🐺')}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {visualState === 'breeding' && (
            <motion.div 
              key="breeding" 
              className="stage-content"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <h3 className="event-title">🌱 动物长大了！</h3>
              <motion.img src={sproutBurstUrl} alt="成长" className="event-illustration" />
              <div className="breeding-result">
                {Object.entries(breedingShowcase).map(([animal, data]) => (
                  <div key={animal} className="breeding-item">
                    <span className="animal-icon">{animalMeta[animal as AnimalType].icon}</span>
                    <span className="breeding-numbers">{data.old} → {data.new}</span>
                    <span className="breeding-change">+{data.change}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {visualState === 'attack' && (
            <motion.div 
              key="attack" 
              className="stage-content"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <h3 className="event-title warning">⚠️ 危险！</h3>
              <motion.img 
                src={foxRunUrl} 
                alt="狐狸" 
                className="event-illustration"
                initial={{ x: 200 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
              <p className="attack-message">狐狸偷走了 {(attackShowcase as Extract<AttackResult, { type: 'fox' }>).rabbitsLost} 只兔子！</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 演示控制 */}
        <div className="demo-bar">
          <span>演示：</span>
          {(['idle', 'dice', 'breeding', 'attack'] as const).map(state => (
            <button
              key={state}
              type="button"
              className={`demo-btn ${visualState === state ? 'active' : ''}`}
              onClick={() => setVisualState(state)}
            >
              {state === 'idle' ? '待机' : state === 'dice' ? '掷骰' : state === 'breeding' ? '繁殖' : '攻击'}
            </button>
          ))}
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="action-dock">
        <div className="exchange-actions">
          <ActionButton>🐰×6 → 🐑×1</ActionButton>
          <ActionButton>🐑×2 → 🐷×1</ActionButton>
          <ActionButton>🐷×3 → 🐄×1</ActionButton>
          <ActionButton>🐄×2 → 🐴×1</ActionButton>
        </div>
        <div className="protection-actions">
          <ActionButton variant="guard">🐕 买小狗</ActionButton>
          <ActionButton variant="guard">🦮 买大狗</ActionButton>
        </div>
        <button type="button" className="roll-dice-btn">
          🎲 掷骰子
        </button>
      </div>

      {/* 历史浮窗 */}
      <AnimatePresence>
        {showHistory && (
          <HistoryModal
            room={room}
            gameState={gameState}
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<GameMode>('classic');
  const [stage, setStage] = useState<DemoStage>('lobby');
  const [visualState, setVisualState] = useState<'idle' | 'dice' | 'breeding' | 'attack'>('idle');

  const room = useMemo<Room>(() => ({ ...demoRoom, mode }), [mode]);
  const gameState = useMemo<GameState>(() => ({ ...demoGameState, mode }), [mode]);

  return (
    <div className="app-shell">
      {stage === 'lobby' && (
        <>
          <HeroCard mode={mode} setMode={setMode} onCreate={() => setStage('room')} onJoin={() => setStage('game')} />
        </>
      )}

      {stage === 'room' && <RoomStage room={room} onStart={() => setStage('game')} onBack={() => setStage('lobby')} />}

      {stage === 'game' && (
        <GameStage room={room} gameState={gameState} visualState={visualState} setVisualState={setVisualState} onBack={() => setStage('room')} />
      )}
    </div>
  );
}
