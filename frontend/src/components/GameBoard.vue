<template>
  <div class="game-board">
    <!-- 游戏标题栏 -->
    <div class="game-header">
      <h1 class="game-title">🎮 超级农场主</h1>
      <div class="game-info">
        <span class="round-info">第 {{ gameStore.currentRound }} 轮</span>
        <span class="phase-info">{{ gameStore.currentPhaseText }}</span>
        <span class="current-player" :class="gameStore.currentPlayer">
          {{ gameStore.currentPlayer === 'human' ? '玩家' : 'AI农场主' }} 的回合
        </span>
      </div>
    </div>

    <!-- 主游戏区域 -->
    <div class="game-main">
      <!-- 人类玩家区域 -->
      <div class="player-area human-player">
        <PlayerBoard 
          :player="gameStore.humanPlayer" 
          :isActive="gameStore.currentPlayer?.type === 'human'"
          @exchange="handleExchange"
          @buy-protection="handleBuyProtection"
        />
      </div>

      <!-- 中央游戏区域 -->
      <div class="center-area">
        <!-- 骰子区域 -->
        <div class="dice-section">
          <h3>🎲 骰子区域</h3>
          <div class="dice-container">
            <DiceComponent 
              v-for="(result, index) in gameStore.diceResults" 
              :key="index"
              :face="result"
              :is-rolling="gameStore.isRolling"
              :index="index"
            />
          </div>
          <div class="dice-controls">
            <button 
              class="roll-button"
              :disabled="!canRollDice"
              @click="rollDice"
            >
              {{ gameStore.isRolling ? '投掷中...' : '投掷骰子' }}
            </button>
          </div>
        </div>

        <!-- 银行区域 -->
        <div class="bank-section">
          <h3>🏦 银行库存</h3>
          <div class="bank-animals">
            <div v-for="(count, animal) in gameStore.gameState?.bank" :key="animal" class="bank-item">
              <span class="animal-icon">{{ getAnimalIcon(animal) }}</span>
              <span class="animal-count">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- 游戏日志 -->
        <div class="game-log">
          <h3>📝 游戏记录</h3>
          <div class="log-entries">
            <div 
              v-for="(action, index) in recentActions" 
              :key="index"
              class="log-entry"
            >
              {{ formatLogEntry(action) }}
            </div>
          </div>
        </div>
      </div>

      <!-- AI玩家区域 -->
      <div class="player-area ai-player">
        <PlayerBoard 
          :player="aiPlayer" 
          :isActive="gameStore.currentPlayer?.type === 'ai'"
          :isAI="true"
        />
        
        <!-- AI思考状态 -->
        <div v-if="gameStore.currentPlayer?.type === 'ai' && gameStore.gameState?.status === 'ai_thinking'" class="ai-thinking">
          <div class="thinking-animation">
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>AI正在思考最佳策略...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏控制栏 -->
    <div class="game-controls">
      <div class="turn-controls">
        <button 
          class="end-turn-btn"
          :disabled="!canEndTurn"
          @click="endTurn"
        >
          结束回合
        </button>
        <button 
          class="new-game-btn"
          @click="newGame"
        >
          新游戏
        </button>
      </div>
      
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">游戏进度:</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${gameProgress}%` }"
            ></div>
          </div>
          <span class="stat-value">{{ gameProgress }}%</span>
        </div>
      </div>
    </div>

    <!-- 胜利弹窗 -->
    <WinDialog 
      v-if="gameStore.gameState?.status === 'finished'"
      :winner="gameStore.gameState.winnerId"
      @new-game="newGame"
      @close="closeWinDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { GameService } from '@/services/gameService'
import { AIService } from '@/services/aiService'
import PlayerBoard from './PlayerBoard.vue'
import DiceComponent from './DiceComponent.vue'
import WinDialog from './WinDialog.vue'

// Store引用
const gameStore = useGameStore()
const playerStore = usePlayerStore()

// 服务实例
const gameService = new GameService()
const aiService = new AIService()

// 响应式数据
const isProcessing = ref(false)

// 计算属性
const currentPhaseText = computed(() => {
  const phaseTexts = {
    preparing: '准备阶段',
    playing: '游戏进行中',
    ai_thinking: 'AI思考中',
    finished: '游戏结束'
  }
  return phaseTexts[gameStore.gameState?.status || 'preparing']
})

const aiPlayer = computed(() => {
  return gameStore.aiPlayers[0] // 获取第一个AI玩家
})

const canRollDice = computed(() => {
  return gameStore.currentPlayer?.type === 'human' && 
         !gameStore.isRolling && 
         !isProcessing.value &&
         gameStore.gameState?.status === 'playing'
})

const canEndTurn = computed(() => {
  return gameStore.currentPlayer?.type === 'human' && 
         !isProcessing.value &&
         gameStore.gameState?.status === 'playing'
})

const gameProgress = computed(() => {
  return Math.round(gameStore.gameProgress * 100)
})

const recentActions = computed(() => {
  return gameStore.gameState?.gameHistory?.slice(-5).reverse() || []
})

// 方法定义
const getAnimalIcon = (animal: string): string => {
  const icons = {
    rabbit: '🐰',
    sheep: '🐑', 
    pig: '🐷',
    cow: '🐄',
    horse: '🐴',
    smallDog: '🐕',
    bigDog: '🐕‍🦺'
  }
  return icons[animal as keyof typeof icons] || '❓'
}

const formatLogEntry = (action: any): string => {
  const playerName = action.playerId === 'human' ? '玩家' : 'AI'
  switch (action.type) {
    case 'roll':
      return `${playerName} 投掷了骰子: ${action.details.diceResult.join(', ')}`
    case 'exchange':
      return `${playerName} 进行了交换: ${action.details.fromCount}个${action.details.from} → ${action.details.toCount}个${action.details.to}`
    case 'buy_protection':
      return `${playerName} 购买了${action.details.protection === 'smallDog' ? '小狗' : '大狗'}`
    case 'attack':
      return `⚠️ ${action.details.attackType}攻击! ${playerName}受到影响`
    default:
      return `${playerName} 执行了操作`
  }
}

// 事件处理
const rollDice = async () => {
  if (!canRollDice.value) return
  
  try {
    isProcessing.value = true
    const result = await gameService.rollDice()
    
    // 处理骰子结果
    await gameService.processDiceResult('human', result)
    
    // 检查胜利条件
    gameService.checkWinCondition('human')
    
  } catch (error) {
    console.error('掷骰子失败:', error)
    // 显示错误提示
  } finally {
    isProcessing.value = false
  }
}

const handleExchange = async (exchange: any) => {
  try {
    isProcessing.value = true
    const success = await gameService.exchangeAnimals('human', exchange)
    
    if (!success) {
      // 显示交换失败提示
      console.warn('交换失败：资源不足或比例错误')
    }
  } catch (error) {
    console.error('交换失败:', error)
  } finally {
    isProcessing.value = false
  }
}

const handleBuyProtection = async (protection: 'smallDog' | 'bigDog') => {
  try {
    isProcessing.value = true
    const success = await gameService.buyProtection('human', protection)
    
    if (!success) {
      // 显示购买失败提示
      console.warn('购买失败：资源不足或数量已达上限')
    }
  } catch (error) {
    console.error('购买防护失败:', error)
  } finally {
    isProcessing.value = false
  }
}

const endTurn = async () => {
  if (!canEndTurn.value) return
  
  try {
    isProcessing.value = true
    
    // 结束人类玩家回合
    gameService.endTurn()
    
    // 开始AI回合
    await processAITurn()
    
  } catch (error) {
    console.error('结束回合失败:', error)
  } finally {
    isProcessing.value = false
  }
}

const processAITurn = async () => {
  if (gameStore.gameState?.status === 'finished') return
  
  try {
    // 设置AI思考状态
    gameStore.setGameStatus('ai_thinking')
    
    // 模拟AI思考时间
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // AI掷骰子
    const diceResult = await gameService.rollDice()
    
    // 处理AI骰子结果
    await gameService.processDiceResult('ai', diceResult)
    
    // 获取AI决策
    const aiDecision = await aiService.getAIDecision(gameStore.gameState!)
    
    // 执行AI动作
    for (const action of aiDecision.actions) {
      await executeAIAction(action)
      // 每个动作之间添加延迟，让玩家看清楚
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 检查AI胜利条件
    gameService.checkWinCondition('ai')
    
    // 如果游戏未结束，切换回人类玩家
    if (gameStore.gameState?.status !== 'finished') {
      gameService.endTurn()
      gameStore.setGameStatus('playing')
    }
    
  } catch (error) {
    console.error('AI回合处理失败:', error)
    // 回退到人类玩家回合
    gameService.endTurn()
    gameStore.setGameStatus('playing')
  }
}

const executeAIAction = async (action: any) => {
  switch (action.type) {
    case 'exchange':
      await gameService.exchangeAnimals('ai', action.exchange)
      break
    case 'buy_protection':
      await gameService.buyProtection('ai', action.protection)
      break
    default:
      console.warn('未知的AI动作类型:', action.type)
  }
}

const newGame = () => {
  gameService.initGame()
  isProcessing.value = false
}

const closeWinDialog = () => {
  // 关闭胜利弹窗的逻辑
}

// 生命周期
onMounted(() => {
  // 初始化游戏
  gameService.initGame()
})
</script>

<style scoped>
.game-board {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Microsoft YaHei', sans-serif;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.game-title {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
  font-size: 1.1rem;
}

.current-player {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
}

.current-player.human {
  background-color: #4CAF50;
}

.current-player.ai {
  background-color: #FF9800;
}

.game-main {
  display: grid;
  grid-template-columns: 1fr 400px 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.player-area {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8.5px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.center-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dice-section {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
  text-align: center;
}

.dice-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.roll-button {
  background: linear-gradient(45deg, #FF6B6B, #FF8E53);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.roll-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.roll-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.bank-section {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
}

.bank-animals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.bank-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 10px;
}

.animal-icon {
  font-size: 1.5rem;
  margin-bottom: 5px;
}

.animal-count {
  font-weight: bold;
  color: #333;
}

.game-log {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.log-entries {
  max-height: 150px;
  overflow-y: auto;
}

.log-entry {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.ai-thinking {
  margin-top: 20px;
  text-align: center;
  padding: 20px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 10px;
}

.thinking-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.thinking-dots {
  display: flex;
  gap: 5px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background-color: #FF9800;
  border-radius: 50%;
  animation: thinking 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.game-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
}

.turn-controls {
  display: flex;
  gap: 15px;
}

.end-turn-btn, .new-game-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.end-turn-btn {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.new-game-btn {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.game-stats {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  transition: width 0.5s ease;
}

.stat-value {
  font-weight: bold;
  color: #333;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .game-main {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .center-area {
    order: -1;
  }
}

@media (max-width: 768px) {
  .game-board {
    padding: 10px;
  }
  
  .game-title {
    font-size: 1.8rem;
  }
  
  .game-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .game-controls {
    flex-direction: column;
    gap: 15px;
  }
  
  .stat-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .progress-bar {
    width: 150px;
  }
}
</style> 