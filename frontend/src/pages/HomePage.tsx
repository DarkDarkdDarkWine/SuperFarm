import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Socket } from 'socket.io-client';

interface HomePageProps {
  socket: Socket | null;
}

export default function HomePage({ socket }: HomePageProps) {
  const { currentRoom, gameState, isConnected, setCurrentRoom, setPlayerId, diceAnimation, aiThinking, breedingAnimation, attackAnimation } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');

  // 获取当前玩家状态
  const myPlayer = gameState?.players.find(p => p.id === socket?.id);

  const handleCreateRoom = () => {
    if (!playerName || !roomName) {
      alert('请输入玩家名称和房间名称');
      return;
    }

    if (!socket) {
      alert('Socket连接未建立');
      return;
    }

    socket.emit(
      'room:create',
      {
        name: roomName,
        mode: 'classic',
        maxPlayers: 4,
      },
      playerName,
      (response: any) => {
        if (response.success) {
          console.log('Room created:', response.room);
          setCurrentRoom(response.room);
          setPlayerId(socket.id || '');
        } else {
          console.error('Failed to create room:', response.error);
          alert('创建房间失败: ' + response.error);
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            🐰 超级农场主 🐴
          </h1>
          <p className="text-xl text-gray-600">
            Super Farmer - 经典概率策略游戏
          </p>
          <div className="mt-4">
            <span
              className={`inline-block px-4 py-2 rounded-full ${isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}
            >
              {isConnected ? '🟢 已连接' : '🔴 未连接'}
            </span>
          </div>
        </div>

        {/* 创建/加入房间 */}
        {!currentRoom && !gameState && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              开始游戏
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  玩家名称
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="输入你的名字"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  房间名称
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="输入房间名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!isConnected}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                创建房间
              </button>
            </div>
          </div>
        )}

        {/* 房间信息 */}
        {currentRoom && !gameState && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              房间：{currentRoom.name}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  玩家列表 ({currentRoom.players.length}/{currentRoom.maxPlayers})
                </h3>
                <div className="space-y-2">
                  {currentRoom.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">
                        {player.type === 'ai' ? '🤖' : '👤'} {player.name}
                      </span>
                      <span
                        className={`text-sm ${player.isReady ? 'text-green-600' : 'text-gray-400'
                          }`}
                      >
                        {player.isReady ? '✓ 已准备' : '等待中'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  socket?.emit(
                    'room:add_ai',
                    currentRoom.id,
                    'easy',
                    (response: any) => {
                      if (!response.success) {
                        alert(response.error);
                      }
                    }
                  );
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加AI玩家（简单）
              </button>

              <button
                onClick={() => {
                  socket?.emit('room:start', currentRoom.id, (response: any) => {
                    if (!response.success) {
                      alert(response.error);
                    }
                  });
                }}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                开始游戏
              </button>
            </div>
          </div>
        )}

        {/* 游戏中 - 左中右三列布局 */}
        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 左侧：玩家状态 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-4 sticky top-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">👥 玩家状态</h3>
                <div className="space-y-3">
                  {gameState.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${index === gameState.currentPlayerIndex
                        ? 'bg-green-100 border-2 border-green-400'
                        : 'bg-gray-50'
                        }`}
                    >
                      <div className="font-semibold text-sm mb-1 flex items-center gap-1">
                        {player.type === 'ai' && '🤖'}
                        {player.name}
                        {index === gameState.currentPlayerIndex && <span className="text-green-600 text-xs">(回合中)</span>}
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-xs">
                        <div className="text-center">🐰<br />{player.animals.rabbit}</div>
                        <div className="text-center">🐑<br />{player.animals.sheep}</div>
                        <div className="text-center">🐷<br />{player.animals.pig}</div>
                        <div className="text-center">🐄<br />{player.animals.cow}</div>
                        <div className="text-center">🐎<br />{player.animals.horse}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        🐕{player.protection.smallDog} 🦮{player.protection.bigDog}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 银行库存 */}
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">🏦 银行库存</h4>
                  <div className="grid grid-cols-5 gap-1 text-xs text-center bg-gray-50 p-2 rounded">
                    <div>🐰<br />{gameState.bank.rabbit}</div>
                    <div>🐑<br />{gameState.bank.sheep}</div>
                    <div>🐷<br />{gameState.bank.pig}</div>
                    <div>🐄<br />{gameState.bank.cow}</div>
                    <div>🐎<br />{gameState.bank.horse}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-center mt-1">
                    <div className="bg-yellow-50 p-1 rounded">🐕{gameState.bank.smallDog}</div>
                    <div className="bg-yellow-50 p-1 rounded">🦮{gameState.bank.bigDog}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 中间：主游戏区域 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">🎮 游戏进行中</h2>
                  <div className="text-sm text-gray-600">
                    回合 {gameState.currentRound} | 阶段: {gameState.phase}
                  </div>
                </div>

                <div className="space-y-4">
                  {diceAnimation && diceAnimation.length > 0 && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">🎲 骰子结果</h3>
                      <div className="flex gap-3 text-3xl justify-center">
                        {diceAnimation.map((face, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg shadow">
                            {face === 'rabbit' && '🐰'}
                            {face === 'sheep' && '🐑'}
                            {face === 'pig' && '🐷'}
                            {face === 'cow' && '🐄'}
                            {face === 'horse' && '🐎'}
                            {face === 'fox' && '🦊'}
                            {face === 'wolf' && '🐺'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI思考状态 - 使用固定位置浮动提示 */}
                  {aiThinking && gameState.players[gameState.currentPlayerIndex].type === 'ai' && (
                    <div className="fixed bottom-4 right-4 z-50 p-4 bg-purple-600 text-white rounded-lg shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🤖</span>
                        <span className="font-semibold">
                          {gameState.players.find(p => p.id === aiThinking)?.name || 'AI'} 正在思考...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 繁殖结果显示 */}
                  {breedingAnimation && (
                    <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">🌱 繁殖结果</h3>
                      <div className="grid grid-cols-5 gap-2 text-sm">
                        {Object.entries(breedingAnimation).map(([animal, data]: [string, any]) => (
                          <div key={animal} className={`p-2 rounded ${data.change !== 0 ? (data.change > 0 ? 'bg-green-100' : 'bg-red-100') : 'bg-gray-100'}`}>
                            <div>
                              {animal === 'rabbit' && '🐰'}
                              {animal === 'sheep' && '🐑'}
                              {animal === 'pig' && '🐷'}
                              {animal === 'cow' && '🐄'}
                              {animal === 'horse' && '🐎'}
                            </div>
                            <div className="font-semibold">
                              {data.old} → {data.new}
                              <span className={data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : ''}>
                                {data.change !== 0 && ` (${data.change > 0 ? '+' : ''}${data.change})`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 攻击结果显示 */}
                  {attackAnimation && (
                    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">
                        {attackAnimation.type === 'fox' ? '🦊 狐狸攻击！' : '🐺 狼攻击！'}
                      </h3>
                      {attackAnimation.blocked ? (
                        <p className="text-green-600 font-semibold">✅ 被防护犬抵挡！</p>
                      ) : (
                        <p className="text-red-600 font-semibold">
                          ❌ 攻击成功！
                          {attackAnimation.rabbitsLost && ` 失去 ${attackAnimation.rabbitsLost} 只兔子`}
                          {attackAnimation.animalsLost && Object.entries(attackAnimation.animalsLost).map(([animal, count]) =>
                            count ? ` 失去 ${count} 只${animal}` : ''
                          ).join('')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 游戏操作 */}
                  {currentRoom && gameState.players[gameState.currentPlayerIndex].id === socket?.id && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-3">🎯 你的回合</h3>

                      {gameState.phase === 'exchange' && (
                        <div className="space-y-4">
                          {/* 交换动物 */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">交换动物：</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  socket?.emit('game:exchange', currentRoom.id, { type: 'exchange', from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.rabbit < 6}
                                className="text-xs p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                6🐰 → 1🐑
                              </button>
                              <button
                                onClick={() => {
                                  socket?.emit('game:exchange', currentRoom.id, { type: 'exchange', from: 'sheep', to: 'pig', fromCount: 2, toCount: 1 }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.sheep < 2}
                                className="text-xs p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                2🐑 → 1🐷
                              </button>
                              <button
                                onClick={() => {
                                  socket?.emit('game:exchange', currentRoom.id, { type: 'exchange', from: 'pig', to: 'cow', fromCount: 3, toCount: 1 }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.pig < 3}
                                className="text-xs p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                3🐷 → 1🐄
                              </button>
                              <button
                                onClick={() => {
                                  socket?.emit('game:exchange', currentRoom.id, { type: 'exchange', from: 'cow', to: 'horse', fromCount: 2, toCount: 1 }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.cow < 2}
                                className="text-xs p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                2🐄 → 1🐎
                              </button>
                            </div>
                          </div>

                          {/* 购买防护 */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">购买防护：</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  socket?.emit('game:buy_protection', currentRoom.id, { type: 'buy_protection', protection: 'smallDog' }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.rabbit < 1 || gameState.bank.smallDog < 1}
                                className="text-xs p-2 bg-yellow-100 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                1🐰 → 🐕小狗 (防狐狸)
                              </button>
                              <button
                                onClick={() => {
                                  socket?.emit('game:buy_protection', currentRoom.id, { type: 'buy_protection', protection: 'bigDog' }, (r: any) => {
                                    if (!r.success) alert(r.error);
                                  });
                                }}
                                disabled={!myPlayer || myPlayer.animals.sheep < 1 || gameState.bank.bigDog < 1}
                                className="text-xs p-2 bg-yellow-100 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                1🐑 → 🦮大狗 (防狼)
                              </button>
                            </div>
                          </div>

                          {/* 掷骰子 */}
                          <button
                            onClick={() => {
                              socket?.emit('game:roll_dice', currentRoom.id, (response: any) => {
                                if (!response.success) {
                                  alert('掷骰子失败: ' + response.error);
                                }
                              });
                            }}
                            className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                          >
                            🎲 结束交换，掷骰子
                          </button>
                        </div>
                      )}

                      {gameState.phase !== 'exchange' && (
                        <p className="text-sm text-gray-600">
                          当前阶段: {gameState.phase}，请等待...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：历史记录面板 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 h-full max-h-[800px] flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📜 游戏记录</h3>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {gameState.history.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">暂无记录</p>
                  ) : (
                    gameState.history.slice().reverse().map((entry, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">
                            {gameState.players.find(p => p.id === entry.playerId)?.name}
                          </span>
                          {entry.type === 'exchange' && (
                            <span>
                              {' '}交换了 {(entry.details as any).fromCount}只{(entry.details as any).from} → {(entry.details as any).toCount}只{(entry.details as any).to}
                            </span>
                          )}
                          {entry.type === 'buy_protection' && (
                            <span>
                              {' '}购买了 {(entry.details as any).protection === 'smallDog' ? '🐕小狗' : '🦮大狗'}
                            </span>
                          )}
                          {entry.type === 'roll_dice' && (
                            <span>
                              {' '}掷骰子: {(entry.details as any).diceResult?.map((d: string) =>
                                d === 'rabbit' ? '🐰' : d === 'sheep' ? '🐑' : d === 'pig' ? '🐷' :
                                  d === 'cow' ? '🐄' : d === 'horse' ? '🐎' : d === 'fox' ? '🦊' : d === 'wolf' ? '🐺' : d
                              ).join(' ')}
                            </span>
                          )}
                          {entry.type === 'breeding' && (
                            <span>
                              {' '}繁殖结果: {Object.entries((entry.details as any).breedingResults || {})
                                .filter(([, data]: [string, any]) => data.change > 0)
                                .map(([animal, data]: [string, any]) => {
                                  const emoji = animal === 'rabbit' ? '🐰' : animal === 'sheep' ? '🐑' :
                                    animal === 'pig' ? '🐷' : animal === 'cow' ? '🐄' : animal === 'horse' ? '🐎' : animal;
                                  return `${emoji}+${data.change}`;
                                }).join(' ') || '无变化'}
                            </span>
                          )}
                          {entry.type === 'attack' && (
                            <span>
                              {(entry.details as any).attackType === 'fox' ? ' 🦊狐狸攻击 ' : ' 🐺狼攻击 '}
                              {(entry.details as any).victimName}
                              {(entry.details as any).blocked ? ' ✅被防护犬抵挡！' :
                                (entry.details as any).attackType === 'fox' ?
                                  ` ❌失去${(entry.details as any).rabbitsLost}只兔子` :
                                  ' ❌失去大量动物'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 游戏说明 */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">游戏说明</h2>
          <div className="prose text-gray-600">
            <p>
              <strong>目标：</strong>
              收集齐5种动物（兔子、羊、猪、牛、马）各至少1只
            </p>
            <p>
              <strong>玩法：</strong>
            </p>
            <ul>
              <li>交换阶段：可以交换动物或购买防护</li>
              <li>掷骰子：两个不同骰子，马在A骰、牛在B骰</li>
              <li>繁殖：有种才能繁殖！获得数 = (手牌+骰子)÷2</li>
              <li>攻击：狐狸清空兔子，狼清空羊/猪/牛（有狗可防护）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
