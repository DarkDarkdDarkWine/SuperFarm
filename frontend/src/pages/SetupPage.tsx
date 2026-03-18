import { useState, useRef, useEffect } from 'react';
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

const AI_NAME_POOL = [
  '农夫威廉', '牧场主罗斯', '铁犁汉斯', '麦田守望者',
  '老猎人托比', '森林骑士', '谷仓伯爵', '荒野行者',
];

/** 从名字池中选一个当前未被使用的名字 */
function pickAiName(usedNames: (string | undefined)[]): string {
  const used = new Set(usedNames.filter(Boolean));
  return AI_NAME_POOL.find(n => !used.has(n)) ?? `AI玩家${Math.floor(Math.random() * 99) + 1}`;
}

type PingStatus = 'checking' | 'ok' | 'err';

function StatusDot({ status, label }: { status: PingStatus; label: string }) {
  const color = status === 'ok' ? '#4caf50' : status === 'err' ? '#f44336' : '#9e9e9e';
  const title = status === 'ok' ? `${label}正常` : status === 'err' ? `${label}不可用` : `${label}检测中…`;
  return (
    <div className="status-dot-wrap" title={title}>
      <span className={`status-dot ${status}`} style={{ background: color }} />
      <span className="status-dot-label">{label}</span>
    </div>
  );
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

function useStatusPing() {
  const [backend, setBackend] = useState<PingStatus>('checking');
  const [ai, setAi] = useState<PingStatus>('checking');

  const checkBackend = (silent = false) => {
    if (!silent) setBackend('checking');
    fetch(`${BACKEND_URL}/health`)
      .then(r => setBackend(r.ok ? 'ok' : 'err'))
      .catch(() => setBackend('err'));
  };

  const checkAi = (silent = false) => {
    const key = localStorage.getItem('deepseek_api_key')?.trim();
    if (!key) { setAi('err'); return; }
    if (!silent) setAi('checking');
    fetch(`${BACKEND_URL}/api/config/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepseekApiKey: key }),
    })
      .then(r => r.json())
      .then((d: { success: boolean }) => setAi(d.success ? 'ok' : 'err'))
      .catch(() => setAi('err'));
  };

  useEffect(() => {
    checkBackend();
    checkAi();

    const backendTimer = setInterval(() => checkBackend(true), 15_000);
    const aiTimer = setInterval(() => checkAi(true), 30_000);
    return () => {
      clearInterval(backendTimer);
      clearInterval(aiTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { backend, ai, recheckAi: checkAi };
}

export default function SetupPage({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const { backend, ai, recheckAi } = useStatusPing();
  const [players, setPlayers] = useState<(PlayerConfig | null)[]>([
    { name: '玩家1', type: 'human' },
    { name: pickAiName(['玩家1']), type: 'ai', difficulty: 'easy' },
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
    setPlayers(prev => {
      const usedNames = prev.map(p => p?.name);
      return prev.map((p, i) => i !== index ? p : {
        name: index === 0 ? '玩家1' : index > 0 ? pickAiName(usedNames) : `玩家${index + 1}`,
        type: index > 0 ? 'ai' : 'human',
        difficulty: 'easy' as const,
      });
    });
  };

  const removeSlot = (index: number) => {
    if (index === 0) return;
    setPlayers(prev => prev.map((p, i) => i !== index ? p : null));
  };

  const toggleType = (index: number, player: PlayerConfig) => {
    const usedNames = players.map((p, i) => i === index ? undefined : p?.name);
    updatePlayer(index, {
      type: player.type === 'human' ? 'ai' : 'human',
      name: player.type === 'human' ? pickAiName(usedNames) : `玩家${index + 1}`,
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

      <div className="setup-status-bar">
        <StatusDot status={backend} label="服务器" />
        <StatusDot status={ai} label="AI" />
        <button className="setup-settings-btn" onClick={() => setShowSettings(true)} title="设置">
          ⚙️
        </button>
      </div>

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
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onKeySaved={recheckAi} />}
      </AnimatePresence>
    </div>
  );
}

// ── Settings modal ─────────────────────────────────────────────────────────

type AIProvider = 'deepseek' | 'kimi' | 'minimax' | 'zhipu';

const PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'kimi',     label: 'Kimi',     placeholder: 'sk-...' },
  { id: 'minimax',  label: 'MiniMax',  placeholder: '填入 API Key' },
  { id: 'zhipu',    label: '智谱',     placeholder: '填入 API Key' },
];

function SettingsModal({ onClose, onKeySaved }: { onClose: () => void; onKeySaved: () => void }) {
  const [provider, setProvider] = useState<AIProvider>(() =>
    (localStorage.getItem('ai_provider') as AIProvider) ?? 'deepseek'
  );
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'err'>('idle');
  const [testError, setTestError] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const resetTest = () => {
    setTestStatus('idle');
    setTestError('');
    setModels([]);
    setSelectedModel('');
  };

  const testKey = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setTestStatus('testing');
    setTestError('');
    setModels([]);
    setSelectedModel('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await res.json() as { success: boolean; error?: string; models?: string[] };
      if (data.success) {
        setTestStatus('ok');
        const mList = data.models ?? [];
        setModels(mList);
        setSelectedModel(mList[0] ?? '');
      } else {
        setTestStatus('err');
        setTestError(data.error ?? '未知错误');
      }
    } catch {
      setTestStatus('err');
      setTestError('无法连接到服务器');
    }
  };

  const save = async () => {
    const key = apiKey.trim();
    if (!key || !selectedModel) return;
    try {
      await fetch(`${BACKEND_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key, model: selectedModel }),
      });
      localStorage.setItem('ai_provider', provider);
      localStorage.setItem('ai_api_key', key);
      localStorage.setItem('ai_model', selectedModel);
      // 兼容旧版指示灯检测用的 key
      localStorage.setItem('deepseek_api_key', key);
      onKeySaved();
      setTimeout(onClose, 600);
    } catch {
      setTestError('保存失败，请检查服务器');
    }
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
          <span>⚙️ AI 服务设置</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {/* Provider tabs */}
          <label className="settings-label">选择服务商</label>
          <div className="settings-provider-tabs">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                className={`provider-tab ${provider === p.id ? 'active' : ''}`}
                onClick={() => { setProvider(p.id); resetTest(); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* API Key */}
          <label className="settings-label">API Key</label>
          <div className="settings-key-row">
            <input
              ref={inputRef}
              className="settings-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); resetTest(); }}
              placeholder={PROVIDERS.find(p => p.id === provider)?.placeholder}
              spellCheck={false}
            />
            <button className="settings-eye" onClick={() => setShowKey(v => !v)}>
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Test button */}
          <motion.button
            className={`settings-save ${testStatus === 'ok' ? 'ok' : testStatus === 'err' ? 'err' : ''}`}
            onClick={testKey}
            disabled={testStatus === 'testing' || !apiKey.trim()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {testStatus === 'testing' ? '验证中…' : testStatus === 'ok' ? '✅ 验证通过' : testStatus === 'err' ? '❌ Key 无效' : '验证 Key'}
          </motion.button>

          {testStatus === 'err' && (
            <p className="settings-test-err">❌ {testError}</p>
          )}

          {/* Model selector — shown after test passes */}
          <AnimatePresence>
            {testStatus === 'ok' && models.length > 0 && (
              <motion.div
                className="settings-model-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="settings-label">选择模型</label>
                <select
                  className="settings-model-select"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <motion.button
                  className="settings-save ok"
                  onClick={save}
                  disabled={!selectedModel}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ marginTop: 8 }}
                >
                  保存
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
