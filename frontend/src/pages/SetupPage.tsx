import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameConfig, PlayerConfig } from '../App';
import type { GameMode } from '@shared/types/game';
import farmSetupBg from '../assets/farm-setup-bg.jpg';

const SLOT_COLORS = ['#4CAF50', '#F57C00', '#1976D2', '#7B1FA2'];
const SLOT_COLORS_LIGHT = ['#F1F8E9', '#FFF3E0', '#E3F2FD', '#F3E5F5'];
const SLOT_AVATARS = ['🧑‍🌾', '👧', '👦', '🤠'];

const MODES: Array<{ id: GameMode; emoji: string; title: string; desc: string; color: string }> = [
  { id: 'classic', emoji: '🐰', title: '经典模式', desc: '从1只兔子开始，还原经典玩法', color: '#E8F5E9' },
  { id: 'casual', emoji: '🌈', title: '欢乐模式', desc: '不会被狐狸偷光，更适合小朋友', color: '#FFF3E0' },
  { id: 'hard', emoji: '⚡', title: '挑战模式', desc: '狐狸狼更凶猛，适合高手', color: '#FCE4EC' },
];

const AI_NAMES = ['稳重老羊', '聪明小猪', '天才马儿', '机器兔兔'];

export default function SetupPage({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const [players, setPlayers] = useState<(PlayerConfig | null)[]>([
    { name: '玩家1', type: 'human' },
    { name: AI_NAMES[0], type: 'ai', difficulty: 'easy' },
    null,
    null,
  ]);
  const [mode, setMode] = useState<GameMode>('classic');

  const activePlayers = players.filter(Boolean) as PlayerConfig[];
  const canStart = activePlayers.length >= 2;

  const updatePlayer = (index: number, update: Partial<PlayerConfig>) => {
    setPlayers(prev => prev.map((p, i) => (i !== index || !p) ? p : { ...p, ...update }));
  };

  const addSlot = (index: number) => {
    setPlayers(prev => prev.map((p, i) => i !== index ? p : {
      name: index === 0 ? '玩家1' : index < 3 ? `玩家${index + 1}` : AI_NAMES[index],
      type: index > 0 ? 'ai' : 'human',
      difficulty: 'easy',
    }));
  };

  const removeSlot = (index: number) => {
    if (index === 0) return;
    setPlayers(prev => prev.map((p, i) => i !== index ? p : null));
  };

  const toggleType = (index: number, player: PlayerConfig) => {
    updatePlayer(index, {
      type: player.type === 'human' ? 'ai' : 'human',
      name: player.type === 'human' ? AI_NAMES[index] : `玩家${index + 1}`,
      difficulty: 'easy',
    });
  };

  return (
    <div className="setup-page">
      <div
        className="setup-hero-bg"
        style={{ backgroundImage: `url(${farmSetupBg})` }}
      />
      <div className="setup-hero-overlay" />

      <button className="setup-settings-btn" onClick={() => setShowSettings(true)} title="设置">
        ⚙️
      </button>

      <motion.div
        className="setup-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Title */}
        <div className="setup-title">
          <motion.div
            className="setup-animals"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6, type: 'spring' }}
          >
            🐰🐑🐷🐄🐴
          </motion.div>
          <h1>超级农场主</h1>
          <p>集齐5种动物，就能赢得游戏！</p>
        </div>

        {/* Players */}
        <section className="setup-card">
          <h2 className="setup-section-title">👥 玩家设置</h2>
          <div className="players-grid">
            {players.map((player, index) => (
              <motion.div
                key={index}
                layout
                className={`player-slot ${player ? 'active' : 'empty'}`}
                style={{
                  '--sc': SLOT_COLORS[index],
                  '--sl': SLOT_COLORS_LIGHT[index],
                } as React.CSSProperties}
              >
                <AnimatePresence mode="wait">
                  {player ? (
                    <motion.div
                      key="filled"
                      className="slot-inner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="slot-avatar">
                        {player.type === 'ai' ? '🤖' : SLOT_AVATARS[index]}
                      </div>
                      <div className="slot-right">
                        {player.type === 'human' ? (
                          <input
                            className="slot-name-input"
                            value={player.name}
                            onChange={e => updatePlayer(index, { name: e.target.value })}
                            placeholder="输入名字"
                            maxLength={8}
                          />
                        ) : (
                          <div className="slot-ai-row">
                            <span className="ai-tag">🤖 AI</span>
                            <select
                              className="ai-diff-select"
                              value={player.difficulty ?? 'easy'}
                              onChange={e => updatePlayer(index, { difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                            >
                              <option value="easy">稳重</option>
                              <option value="medium">聪明</option>
                              <option value="hard">天才</option>
                            </select>
                          </div>
                        )}
                        <div className="slot-controls">
                          <button
                            className="btn-toggle"
                            onClick={() => toggleType(index, player)}
                          >
                            {player.type === 'human' ? '改AI' : '改真人'}
                          </button>
                          {index > 0 && (
                            <button className="btn-remove" onClick={() => removeSlot(index)}>✕</button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="empty"
                      className="slot-add-btn"
                      onClick={() => addSlot(index)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="add-icon">+</span>
                      <span>添加玩家</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mode */}
        <section className="setup-card">
          <h2 className="setup-section-title">🎮 游戏模式</h2>
          <div className="mode-grid">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`mode-card ${mode === m.id ? 'selected' : ''}`}
                style={{ '--mc': m.color } as React.CSSProperties}
                onClick={() => setMode(m.id)}
              >
                <span className="mode-emoji">{m.emoji}</span>
              <span className="mode-card-text">
                <strong>{m.title}</strong>
                <span>{m.desc}</span>
              </span>
              </button>
            ))}
          </div>
        </section>

        {/* Start */}
        <motion.button
          className={`start-btn ${!canStart ? 'disabled' : ''}`}
          onClick={() => canStart && onStart({ players: activePlayers, mode })}
          whileHover={canStart ? { scale: 1.04, y: -2 } : {}}
          whileTap={canStart ? { scale: 0.96 } : {}}
        >
          🎮 开始游戏！
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Settings modal ─────────────────────────────────────────────────────────

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'err'>('idle');
  const [testError, setTestError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deepseekApiKey: key }),
      });
      if (!res.ok) throw new Error('failed');
      localStorage.setItem('deepseek_api_key', key);
      setStatus('ok');
      setTimeout(onClose, 800);
    } catch {
      setStatus('err');
    }
  };

  const testKey = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deepseekApiKey: key }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setTestStatus('ok');
      } else {
        setTestStatus('err');
        setTestError(data.error ?? '未知错误');
      }
    } catch {
      setTestStatus('err');
      setTestError('无法连接到服务器');
    }
  };

  const onKeyChange = (val: string) => {
    setApiKey(val);
    setStatus('idle');
    setTestStatus('idle');
    setTestError('');
  };

  return (
    <motion.div
      className="settings-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="settings-modal"
        initial={{ scale: 0.88, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <div className="settings-header">
          <span>⚙️ 设置</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <label className="settings-label">DeepSeek API Key</label>
          <p className="settings-hint">AI 玩家需要此 Key 才能做出智能决策</p>
          <div className="settings-key-row">
            <input
              ref={inputRef}
              className="settings-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => onKeyChange(e.target.value)}
              placeholder="sk-..."
              spellCheck={false}
            />
            <button className="settings-eye" onClick={() => setShowKey(v => !v)}>
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          {testStatus === 'ok' && (
            <p className="settings-test-ok">✅ Key 有效，连接正常</p>
          )}
          {testStatus === 'err' && (
            <p className="settings-test-err">❌ {testError}</p>
          )}
          {status === 'err' && testStatus === 'idle' && (
            <p className="settings-err">保存失败，请检查服务器是否运行</p>
          )}

          <div className="settings-actions">
            <motion.button
              className={`settings-test ${testStatus === 'ok' ? 'ok' : testStatus === 'err' ? 'err' : ''}`}
              onClick={testKey}
              disabled={testStatus === 'testing' || !apiKey.trim()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {testStatus === 'testing' ? '测试中…' : testStatus === 'ok' ? '✅ 已验证' : testStatus === 'err' ? '❌ 无效' : '测试'}
            </motion.button>

            <motion.button
              className={`settings-save ${status === 'ok' ? 'ok' : ''}`}
              onClick={save}
              disabled={status === 'saving' || !apiKey.trim()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {status === 'saving' ? '保存中…' : status === 'ok' ? '✅ 已保存' : '保存'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
