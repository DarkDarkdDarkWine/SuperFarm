<template>
  <div class="player-board" :class="{ active: isActive, 'ai-player': isAI }">
    <!-- 玩家信息 -->
    <div class="player-header">
      <div class="player-info">
        <h3 class="player-name">
          <span class="player-icon">{{ isAI ? '🤖' : '👤' }}</span>
          {{ player.name }}
        </h3>
        <div v-if="isActive" class="player-status">
          <span class="status-indicator">正在游戏</span>
        </div>
      </div>
      
      <!-- 胜利状态 -->
      <div v-if="player.isWinner" class="winner-badge">
        🏆 胜利者
      </div>
    </div>

    <!-- 动物区域 -->
    <div class="animals-section">
      <h4 class="section-title">🐾 动物农场</h4>
      <div class="animals-grid">
        <div 
          v-for="(count, animal) in player.animals" 
          :key="animal"
          class="animal-item"
          :class="{ 'has-animals': count > 0, 'win-condition': count > 0 && isWinConditionAnimal(animal) }"
        >
          <div class="animal-display">
            <span class="animal-icon">{{ getAnimalIcon(animal) }}</span>
            <span class="animal-count">{{ count }}</span>
          </div>
          <span class="animal-name">{{ getAnimalName(animal) }}</span>
        </div>
      </div>
      
      <!-- 胜利进度 -->
      <div class="win-progress">
        <div class="progress-label">胜利进度:</div>
        <div class="progress-animals">
          <span 
            v-for="animal in winConditionAnimals" 
            :key="animal"
            class="progress-animal"
            :class="{ 'completed': player.animals[animal] > 0 }"
          >
            {{ getAnimalIcon(animal) }}
          </span>
        </div>
        <div class="progress-text">{{ winProgress }}/5</div>
      </div>
    </div>

    <!-- 防护区域 -->
    <div class="protection-section">
      <h4 class="section-title">🛡️ 防护道具</h4>
      <div class="protection-items">
        <div 
          v-for="(count, protection) in player.protection" 
          :key="protection"
          class="protection-item"
          :class="{ 'has-protection': count > 0 }"
        >
          <div class="protection-display">
            <span class="protection-icon">{{ getProtectionIcon(protection) }}</span>
            <span class="protection-count">{{ count }}</span>
          </div>
          <span class="protection-name">{{ getProtectionName(protection) }}</span>
        </div>
      </div>
    </div>

    <!-- 操作区域 (仅人类玩家) -->
    <div v-if="!isAI && isActive" class="actions-section">
      <h4 class="section-title">⚡ 操作面板</h4>
      
      <!-- 交换动物 -->
      <div class="exchange-panel">
        <h5>🔄 动物交换</h5>
        <div class="exchange-options">
          <button 
            v-for="exchange in availableExchanges"
            :key="`${exchange.from}-${exchange.to}`"
            class="exchange-button"
            :disabled="!canAffordExchange(exchange)"
            @click="$emit('exchange', exchange)"
          >
            {{ exchange.fromCount }} {{ getAnimalIcon(exchange.from) }} → {{ exchange.toCount }} {{ getAnimalIcon(exchange.to) }}
          </button>
        </div>
      </div>
      
      <!-- 购买防护 -->
      <div class="protection-panel">
        <h5>🛒 购买防护</h5>
        <div class="buy-options">
          <button 
            class="buy-button small-dog"
            :disabled="!canBuySmallDog"
            @click="$emit('buy-protection', 'smallDog')"
          >
            🐕 小狗 (1只兔子)
          </button>
          <button 
            class="buy-button big-dog"
            :disabled="!canBuyBigDog"
            @click="$emit('buy-protection', 'bigDog')"
          >
            🐕‍🦺 大狗 (1只兔子 + 1只羊)
          </button>
        </div>
      </div>
    </div>

    <!-- AI思考区域 -->
    <div v-if="isAI && isActive" class="ai-section">
      <div class="ai-status">
        <div class="ai-thinking">
          <div class="thinking-indicator"></div>
          <span>AI正在分析最佳策略...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player, AnimalType, ProtectionType, ExchangeAction } from '@/types/game'
import { GAME_CONSTANTS } from '@/types/game'

interface Props {
  player: Player
  isActive: boolean
  isAI?: boolean
}

interface Emits {
  (e: 'exchange', exchange: ExchangeAction): void
  (e: 'buy-protection', protection: ProtectionType): void
}

const props = withDefaults(defineProps<Props>(), {
  isAI: false
})

const emit = defineEmits<Emits>()

// 胜利条件动物
const winConditionAnimals: AnimalType[] = ['rabbit', 'sheep', 'pig', 'cow', 'horse']

// 计算属性
const winProgress = computed(() => {
  return winConditionAnimals.filter(animal => props.player.animals[animal] > 0).length
})

const availableExchanges = computed(() => {
  const exchanges: ExchangeAction[] = [
    { from: 'rabbit', to: 'sheep', fromCount: 6, toCount: 1 },
    { from: 'sheep', to: 'pig', fromCount: 2, toCount: 1 },
    { from: 'pig', to: 'cow', fromCount: 3, toCount: 1 },
    { from: 'cow', to: 'horse', fromCount: 2, toCount: 1 }
  ]
  
  return exchanges.filter(exchange => canAffordExchange(exchange))
})

const canBuySmallDog = computed(() => {
  return props.player.animals.rabbit >= 1 && 
         props.player.protection.smallDog < GAME_CONSTANTS.MAX_PROTECTION.smallDog
})

const canBuyBigDog = computed(() => {
  return props.player.animals.rabbit >= 1 && 
         props.player.animals.sheep >= 1 && 
         props.player.protection.bigDog < GAME_CONSTANTS.MAX_PROTECTION.bigDog
})

// 方法
const getAnimalIcon = (animal: string): string => {
  const icons = {
    rabbit: '🐰',
    sheep: '🐑',
    pig: '🐷',
    cow: '🐄',
    horse: '🐴'
  }
  return icons[animal as keyof typeof icons] || '❓'
}

const getAnimalName = (animal: string): string => {
  const names = {
    rabbit: '兔子',
    sheep: '羊',
    pig: '猪',
    cow: '牛',
    horse: '马'
  }
  return names[animal as keyof typeof names] || '未知'
}

const getProtectionIcon = (protection: string): string => {
  const icons = {
    smallDog: '🐕',
    bigDog: '🐕‍🦺'
  }
  return icons[protection as keyof typeof icons] || '❓'
}

const getProtectionName = (protection: string): string => {
  const names = {
    smallDog: '小狗',
    bigDog: '大狗'
  }
  return names[protection as keyof typeof names] || '未知'
}

const isWinConditionAnimal = (animal: string): boolean => {
  return winConditionAnimals.includes(animal as AnimalType)
}

const canAffordExchange = (exchange: ExchangeAction): boolean => {
  return props.player.animals[exchange.from] >= exchange.fromCount
}
</script>

<style scoped>
.player-board {
  background: #ffffff;
  border-radius: 15px;
  padding: 20px;
  border: 3px solid transparent;
  transition: all 0.3s ease;
  height: fit-content;
}

.player-board.active {
  border-color: #4CAF50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.player-board.ai-player.active {
  border-color: #FF9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.3);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.player-icon {
  font-size: 1.5rem;
}

.player-status {
  display: flex;
  align-items: center;
}

.status-indicator {
  background: #4CAF50;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.ai-player .status-indicator {
  background: #FF9800;
}

.winner-badge {
  background: linear-gradient(45deg, #FFD700, #FFA500);
  color: #8B4513;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
  to { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
}

.animals-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.1rem;
  margin: 0 0 15px 0;
  color: #555;
  border-left: 4px solid #4CAF50;
  padding-left: 10px;
}

.animals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.animal-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #f9f9f9;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.animal-item.has-animals {
  background: #e8f5e8;
  border-color: #4CAF50;
}

.animal-item.win-condition {
  background: #fff3e0;
  border-color: #FF9800;
}

.animal-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.animal-icon {
  font-size: 1.8rem;
}

.animal-count {
  font-weight: bold;
  font-size: 1.2rem;
  color: #333;
}

.animal-name {
  font-size: 0.75rem;
  color: #666;
  margin-top: 5px;
}

.win-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #e0e8f0;
}

.progress-label {
  font-size: 0.9rem;
  color: #555;
  font-weight: bold;
}

.progress-animals {
  display: flex;
  gap: 5px;
}

.progress-animal {
  font-size: 1.2rem;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.progress-animal.completed {
  opacity: 1;
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 20%, 60%, 100% { transform: translateY(0); }
  40% { transform: translateY(-5px); }
  80% { transform: translateY(-2px); }
}

.progress-text {
  font-weight: bold;
  color: #4CAF50;
}

.protection-section {
  margin-bottom: 20px;
}

.protection-items {
  display: flex;
  gap: 15px;
}

.protection-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.protection-item.has-protection {
  background: #fff3e0;
  border-color: #FF9800;
}

.protection-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.protection-icon {
  font-size: 1.5rem;
}

.protection-count {
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
}

.protection-name {
  font-size: 0.75rem;
  color: #666;
  margin-top: 5px;
}

.actions-section {
  border-top: 2px solid #f0f0f0;
  padding-top: 20px;
}

.exchange-panel, .protection-panel {
  margin-bottom: 15px;
}

.exchange-panel h5, .protection-panel h5 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #666;
}

.exchange-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exchange-button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.exchange-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(76, 175, 80, 0.4);
}

.exchange-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.buy-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buy-button {
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(45deg, #FF9800, #F57C00);
  color: white;
}

.buy-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.buy-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.ai-section {
  border-top: 2px solid #f0f0f0;
  padding-top: 20px;
}

.ai-thinking {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #fff3e0;
  border-radius: 8px;
  color: #e65100;
}

.thinking-indicator {
  width: 12px;
  height: 12px;
  background: #FF9800;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .player-board {
    padding: 15px;
  }
  
  .animals-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .protection-items {
    flex-direction: column;
    gap: 10px;
  }
  
  .player-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style> 