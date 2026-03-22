import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../hooks/useSocketGame';
import { ANIMAL_LABELS, DICE_EMOJI, UPGRADE_RATES, DOWNGRADE_RATES } from '../hooks/useDemoGame';
import type { GameEvent, HistoryEntry } from '../hooks/useDemoGame';
import type { GameConfig } from '../App';
import type { AnimalType } from '@shared/types/game';
import farmGameBg from '../assets/farm-game-bg.jpg';
import foxImg from '../assets/fox.png';
import wolfImg from '../assets/wolf.png';

// ── Visual constants ──────────────────────────────────────────────────────

const ANIMAL_STYLE: Record<AnimalType, { emoji: string; bg: string; border: string; accent: string }> = {
  rabbit: { emoji: '🐰', bg: '#FFF0F5', border: '#F48FB1', accent: '#E91E63' },
  sheep:  { emoji: '🐑', bg: '#EDF7FF', border: '#90CAF9', accent: '#1E88E5' },
  pig:    { emoji: '🐷', bg: '#FFF4EE', border: '#FFAB91', accent: '#F4511E' },
  cow:    { emoji: '🐄', bg: '#FFFDE6', border: '#FFD54F', accent: '#F9A825' },
  horse:  { emoji: '🐴', bg: '#F5F0EB', border: '#BCAAA4', accent: '#795548' },
};

const PLAYER_COLORS  = ['#388E3C', '#E65100', '#1565C0', '#6A1B9A'];
const PLAYER_BGLITE  = ['#E8F5E9', '#FFF3E0', '#E3F2FD', '#F3E5F5'];
const PLAYER_AVATARS = ['🧑‍🌾', '👧', '👦', '🤠'];

// ── Main component ────────────────────────────────────────────────────────

export default function GamePage({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const { state, currentPlayer, farmPlayerIndex, isHumanTurn, canExchange, canBuySmallDog, canBuyBigDog, actions, isConnecting, connectionError } =
    useSocketGame(config.players, config.mode);

  const [showHistory, setShowHistory] = useState(false);

  if (connectionError) {
    return (
      <div className="game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h2 style={{ color: '#c62828' }}>连接失败</h2>
        <p style={{ color: '#555' }}>{connectionError}</p>
        <button className="gp-back-btn" style={{ position: 'static', padding: '10px 24px', fontSize: '1rem' }} onClick={onExit}>返回设置</button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ fontSize: '3rem' }}>🎲</motion.div>
        <h2 style={{ color: '#2e7d32', fontFamily: 'var(--font)' }}>正在连接游戏服务器…</h2>
      </div>
    );
  }

  const ci = state.currentPlayerIndex;
  const otherIndices = state.players.map((_, i) => i).filter(i => i !== ci);
  // Farm display stays on the rolling player during overlays
  const farmPlayer = state.players[farmPlayerIndex] ?? currentPlayer;

  return (
    <div className="game-page">
      {/* ── Header ── */}
      <header className="gp-header">
        <button className="gp-back-btn" onClick={onExit} title="退出游戏">←</button>

        <div className="gp-round-badge">第 {state.currentRound} 回合</div>

        <motion.div
          className="gp-turn-badge"
          style={{ '--pc': PLAYER_COLORS[ci], '--pb': PLAYER_BGLITE[ci] } as React.CSSProperties}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <span>{currentPlayer.type === 'ai' ? '🤖' : PLAYER_AVATARS[ci]}</span>
          <strong>{currentPlayer.name}</strong>
          {currentPlayer.type === 'ai' && state.phase === 'exchange' && (
            <span className="gp-ai-thinking">思考中…</span>
          )}
        </motion.div>

        <button className="gp-hist-btn" onClick={() => setShowHistory(v => !v)} title="游戏记录">
          📜
        </button>
      </header>

      {/* ── Opponents bar ── */}
      {otherIndices.length > 0 && (
        <div className="gp-opponents">
          {otherIndices.map(i => {
            const p = state.players[i];
            const collected = (['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[])
              .filter(a => p.animals[a] > 0).length;
            return (
              <div
                key={p.id}
                className="opp-card"
                style={{ '--pc': PLAYER_COLORS[i] } as React.CSSProperties}
              >
                <span className="opp-avatar">{p.type === 'ai' ? '🤖' : PLAYER_AVATARS[i]}</span>
                <div className="opp-info">
                  <span className="opp-name">{p.name}</span>
                  <div className="opp-animals">
                    {(['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).map(a => (
                      <span
                        key={a}
                        className={`opp-animal ${p.animals[a] > 0 ? 'has' : 'none'}`}
                        title={ANIMAL_LABELS[a]}
                      >
                        {ANIMAL_STYLE[a].emoji}
                        <b>{p.animals[a]}</b>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="opp-progress" title="已集齐">
                  <span className="opp-collected">{collected}/5</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── My farm ── */}
      <div className="gp-farm" style={{ backgroundImage: `url(${farmGameBg})` }}>
        <div className="gp-farm-label">
          <span className="gp-farm-avatar">{farmPlayer.type === 'ai' ? '🤖' : PLAYER_AVATARS[farmPlayerIndex]}</span>
          <span style={{ color: PLAYER_COLORS[farmPlayerIndex] }}>{farmPlayer.name}</span>
          的农场
        </div>

        {/* Victory progress */}
        <div className="gp-victory-track">
          {(['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).map(a => {
            const has = farmPlayer.animals[a] > 0;
            return (
              <motion.div
                key={a}
                className={`vt-slot ${has ? 'got' : 'need'}`}
                animate={has ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
                title={ANIMAL_LABELS[a]}
              >
                {ANIMAL_STYLE[a].emoji}
              </motion.div>
            );
          })}
          <span className="vt-count">
            {(['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[])
              .filter(a => farmPlayer.animals[a] > 0).length}/5
          </span>
        </div>

        {/* Animal cards */}
        <div className="gp-animal-cards">
          {(['rabbit', 'sheep', 'pig', 'cow', 'horse'] as AnimalType[]).map(a => {
            const s = ANIMAL_STYLE[a];
            const count = farmPlayer.animals[a];
            return (
              <div
                key={a}
                className={`animal-card ${count > 0 ? 'has' : 'zero'}`}
                style={{ '--ab': s.bg, '--abr': s.border, '--aa': s.accent } as React.CSSProperties}
              >
                <span className="ac-emoji">{s.emoji}</span>
                <motion.span
                  className="ac-count"
                  key={count}
                  initial={{ scale: 1.5, color: count > 0 ? '#2E7D32' : '#9E9E9E' }}
                  animate={{ scale: 1, color: count > 0 ? '#2C1810' : '#9E9E9E' }}
                  transition={{ duration: 0.35, type: 'spring' }}
                >
                  {count}
                </motion.span>
                <span className="ac-label">{ANIMAL_LABELS[a]}</span>
              </div>
            );
          })}
        </div>

        {/* Dogs */}
        {(farmPlayer.protection.smallDog > 0 || farmPlayer.protection.bigDog > 0) && (
          <div className="gp-dogs">
            {farmPlayer.protection.smallDog > 0 && (
              <motion.span
                className="dog-badge small"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                🐕 ×{farmPlayer.protection.smallDog} 防狐狸
              </motion.span>
            )}
            {farmPlayer.protection.bigDog > 0 && (
              <motion.span
                className="dog-badge big"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                🦮 ×{farmPlayer.protection.bigDog} 防狼
              </motion.span>
            )}
          </div>
        )}
      </div>

      {/* ── Action panel ── */}
      <div className="gp-actions">
        {/* Exchange - upgrade */}
        <div className="action-row exchange-row">
          {UPGRADE_RATES.map(rate => {
            const ok = canExchange(rate.from, rate.to);
            return (
              <button
                key={`${rate.from}-${rate.to}`}
                className={`exch-btn ${ok ? 'ok' : 'off'}`}
                disabled={!ok}
                onClick={() => actions.exchange(rate.from, rate.to)}
              >
                {ANIMAL_STYLE[rate.from].emoji}{rate.fromCount}
                <span className="exch-arrow">→</span>
                {ANIMAL_STYLE[rate.to].emoji}{rate.toCount}
              </button>
            );
          })}
        </div>
        {/* Exchange - downgrade */}
        <div className="action-row exchange-row exchange-row-down">
          {DOWNGRADE_RATES.map(rate => {
            const ok = canExchange(rate.from, rate.to);
            return (
              <button
                key={`${rate.from}-${rate.to}`}
                className={`exch-btn down ${ok ? 'ok' : 'off'}`}
                disabled={!ok}
                onClick={() => actions.exchange(rate.from, rate.to)}
              >
                {ANIMAL_STYLE[rate.from].emoji}{rate.fromCount}
                <span className="exch-arrow">→</span>
                {ANIMAL_STYLE[rate.to].emoji}{rate.toCount}
              </button>
            );
          })}
        </div>

        {/* Guard */}
        <div className="action-row guard-row">
          <button
            className={`guard-btn ${canBuySmallDog ? 'ok' : 'off'}`}
            disabled={!canBuySmallDog}
            onClick={actions.buySmallDog}
          >
            🐕 买小狗
            <span className="guard-cost">花1只绵羊</span>
          </button>
          <button
            className={`guard-btn ${canBuyBigDog ? 'ok' : 'off'}`}
            disabled={!canBuyBigDog}
            onClick={actions.buyBigDog}
          >
            🦮 买大狗
            <span className="guard-cost">花1只牛</span>
          </button>
        </div>

        {/* Roll */}
        <motion.button
          className={`roll-btn ${isHumanTurn ? 'active' : 'inactive'}`}
          disabled={!isHumanTurn}
          onClick={actions.rollDice}
          whileHover={isHumanTurn ? { scale: 1.05, y: -3 } : {}}
          whileTap={isHumanTurn ? { scale: 0.95 } : {}}
        >
          🎲 掷骰子！
        </motion.button>
      </div>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {state.phase === 'rolling' && state.pendingDice && (
          <DiceOverlay key="dice" dice={state.pendingDice} />
        )}
        {state.phase === 'event' && state.currentEvent && (
          <EventOverlay
            key="event"
            event={state.currentEvent}
            onDismiss={actions.dismissEvent}
          />
        )}
        {state.phase === 'finished' && state.winner && (
          <VictoryOverlay
            key="victory"
            winnerName={state.winner.name}
            onPlayAgain={onExit}
          />
        )}
      </AnimatePresence>

      {/* ── History panel ── */}
      <AnimatePresence>
        {showHistory && (
          <HistoryPanel
            key="hist"
            history={state.history}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dice overlay ──────────────────────────────────────────────────────────

function DiceOverlay({ dice }: { dice: import('@shared/types/game').DiceResult[] }) {
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ov-card dice-ov"
        initial={{ scale: 0.7, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 60 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <h2 className="ov-title">🎲 掷骰子！</h2>
        <div className="dice-pair">
          {dice!.map((face, i) => (
            <motion.div
              key={i}
              className={`dice-face ${i === 0 ? 'orange' : 'blue'}`}
              initial={{ rotateY: -180, scale: 0.4, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.25, type: 'spring', stiffness: 220, damping: 18 }}
            >
              <span className="df-emoji">{DICE_EMOJI[face]}</span>
              <span className="df-label">{i === 0 ? '橙骰' : '蓝骰'}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Event overlay ─────────────────────────────────────────────────────────

function EventOverlay({ event, onDismiss }: { event: GameEvent; onDismiss: () => void }) {
  const [countdown, setCountdown] = useState(3);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [event]);

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ov-card event-ov"
        initial={{ scale: 0.75, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.75, y: 50 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        {/* Dice result mini */}
        <div className="ev-dice">
          {event.diceResult.map((face, i) => (
            <span key={i} className="ev-dice-face">{DICE_EMOJI[face]}</span>
          ))}
        </div>

        {/* Content by kind */}
        {event.kind === 'breeding' && (
          <>
            <h2 className="ev-title good">🌱 动物繁殖啦！</h2>
            <div className="breed-list">
              {(Object.entries(event.results) as [AnimalType, { old: number; new: number; change: number }][]).map(([a, r]) => (
                <div key={a} className="breed-row">
                  <span className="br-emoji">{ANIMAL_STYLE[a].emoji}</span>
                  <span className="br-old">{r.old}</span>
                  <span className="br-arrow">→</span>
                  <span className="br-new">{r.new}</span>
                  <span className="br-gain">+{r.change}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {event.kind === 'fox' && (
          <>
            {event.breedingBefore && Object.keys(event.breedingBefore).length > 0 && (
              <div className="breeding-before">
                <p className="ev-sub-title">🌱 先繁殖</p>
                <div className="breed-list">
                  {(Object.entries(event.breedingBefore) as [AnimalType, { old: number; new: number; change: number }][]).map(([a, r]) => (
                    <div key={a} className="breed-row">
                      <span className="br-emoji">{ANIMAL_STYLE[a].emoji}</span>
                      <span className="br-old">{r.old}</span>
                      <span className="br-arrow">→</span>
                      <span className="br-new">{r.new}</span>
                      <span className="br-gain">+{r.change}</span>
                    </div>
                  ))}
                </div>
                <div className="ev-divider">然后——</div>
              </div>
            )}
            {event.blocked ? (
              <>
                <div className="ev-icon">🐕</div>
                <h2 className="ev-title good">小狗赶跑了狐狸！</h2>
                <p className="ev-desc">小狗保护了你的兔子 🎉</p>
              </>
            ) : (
              <>
                <motion.img
                  src={foxImg}
                  alt="狐狸"
                  className="ev-animal-img"
                  initial={{ x: 120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                />
                <h2 className="ev-title danger">狐狸来偷兔子了！</h2>
                {event.rabbitsLost > 0
                  ? <p className="ev-desc danger">偷走了 <strong>{event.rabbitsLost}</strong> 只兔子 😢</p>
                  : <p className="ev-desc">没有兔子可偷，狐狸空手而归！</p>
                }
              </>
            )}
          </>
        )}

        {event.kind === 'wolf' && (
          <>
            {event.breedingBefore && Object.keys(event.breedingBefore).length > 0 && (
              <div className="breeding-before">
                <p className="ev-sub-title">🌱 先繁殖</p>
                <div className="breed-list">
                  {(Object.entries(event.breedingBefore) as [AnimalType, { old: number; new: number; change: number }][]).map(([a, r]) => (
                    <div key={a} className="breed-row">
                      <span className="br-emoji">{ANIMAL_STYLE[a].emoji}</span>
                      <span className="br-old">{r.old}</span>
                      <span className="br-arrow">→</span>
                      <span className="br-new">{r.new}</span>
                      <span className="br-gain">+{r.change}</span>
                    </div>
                  ))}
                </div>
                <div className="ev-divider">然后——</div>
              </div>
            )}
            {event.blocked ? (
              <>
                <div className="ev-icon">🦮</div>
                <h2 className="ev-title good">大狗赶跑了狼！</h2>
                <p className="ev-desc">大狗保护了你的动物 🎉</p>
              </>
            ) : (
              <>
                <motion.img
                  src={wolfImg}
                  alt="狼"
                  className="ev-animal-img"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                />
                <h2 className="ev-title danger">狼来了！</h2>
                {Object.keys(event.animalsLost).length > 0 ? (
                  <div className="lost-row">
                    {(Object.entries(event.animalsLost) as [AnimalType, number][]).map(([a, n]) => (
                      <div key={a} className="lost-item">
                        <span>{ANIMAL_STYLE[a].emoji}</span>
                        <span className="lost-n">-{n}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ev-desc">没有动物可吃，狼空手而归！</p>
                )}
              </>
            )}
          </>
        )}

        {event.kind === 'nothing' && (
          <>
            <div className="ev-icon">😅</div>
            <h2 className="ev-title">没有收获</h2>
            <p className="ev-desc">这次运气不好，等下次！</p>
          </>
        )}

        <button className="ev-continue" onClick={onDismiss}>
          继续 → <span className="ev-countdown">{countdown}</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Victory overlay ───────────────────────────────────────────────────────

function VictoryOverlay({ winnerName, onPlayAgain }: { winnerName: string; onPlayAgain: () => void }) {
  return (
    <motion.div
      className="overlay victory-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="ov-card victory-ov"
        initial={{ scale: 0.4, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <motion.div
          className="vc-trophy"
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          🏆
        </motion.div>
        <h1 className="vc-name">{winnerName}</h1>
        <p className="vc-sub">集齐了所有动物！</p>
        <div className="vc-animals">🐰 🐑 🐷 🐄 🐴</div>
        <motion.button
          className="vc-btn"
          onClick={onPlayAgain}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          再玩一次！
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── History panel ─────────────────────────────────────────────────────────

function HistoryPanel({ history, onClose }: { history: HistoryEntry[]; onClose: () => void }) {
  return (
    <motion.div
      className="hist-panel"
      initial={{ x: '105%' }}
      animate={{ x: 0 }}
      exit={{ x: '105%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="hist-header">
        <span>📜 游戏记录</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="hist-list">
        {[...history].reverse().map((entry, i) => (
          <div key={`${entry.ts}-${i}`} className="hist-item">
            <span className="hist-time">
              {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="hist-text">{entry.text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
