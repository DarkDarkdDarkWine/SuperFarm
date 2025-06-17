<template>
  <div class="win-dialog-overlay" @click="$emit('close')">
    <div class="win-dialog" @click.stop>
      <!-- 胜利动画 -->
      <div class="celebration-animation">
        <div class="confetti" v-for="i in 20" :key="i" :style="getConfettiStyle(i)"></div>
      </div>
      
      <!-- 胜利内容 -->
      <div class="win-content">
        <!-- 胜利图标 -->
        <div class="win-icon">
          <div class="trophy-animation">🏆</div>
        </div>
        
        <!-- 胜利标题 -->
        <h1 class="win-title">{{ winTitle }}</h1>
        
        <!-- 胜利者信息 -->
        <div class="winner-info">
          <div class="winner-avatar">
            {{ isAIWin ? '🤖' : '👤' }}
          </div>
          <div class="winner-name">{{ winnerName }}</div>
          <div class="win-subtitle">{{ winSubtitle }}</div>
        </div>
        
        <!-- 游戏统计 -->
        <div class="game-stats">
          <div class="stat-item">
            <span class="stat-icon">🎯</span>
            <span class="stat-label">游戏轮次</span>
            <span class="stat-value">{{ gameStats.rounds }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⏱️</span>
            <span class="stat-label">游戏时长</span>
            <span class="stat-value">{{ gameStats.duration }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🎲</span>
            <span class="stat-label">骰子投掷</span>
            <span class="stat-value">{{ gameStats.diceRolls }}</span>
          </div>
        </div>
        
        <!-- 胜利条件展示 -->
        <div class="win-condition">
          <h3>🎊 胜利条件达成</h3>
          <div class="condition-animals">
            <div 
              v-for="animal in winConditionAnimals" 
              :key="animal"
              class="condition-animal"
              :class="{ achieved: true }"
            >
              <span class="animal-icon">{{ getAnimalIcon(animal) }}</span>
              <span class="animal-name">{{ getAnimalName(animal) }}</span>
              <span class="check-mark">✓</span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="win-actions">
          <button class="action-button primary" @click="$emit('new-game')">
            <span class="button-icon">🎮</span>
            <span>再来一局</span>
          </button>
          <button class="action-button secondary" @click="$emit('close')">
            <span class="button-icon">📊</span>
            <span>查看详情</span>
          </button>
        </div>
        
        <!-- 分享按钮 -->
        <div class="share-section">
          <button class="share-button" @click="shareResult">
            <span class="share-icon">📤</span>
            <span>分享战绩</span>
          </button>
        </div>
      </div>
      
      <!-- 关闭按钮 -->
      <button class="close-button" @click="$emit('close')">
        <span>✕</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AnimalType } from '@/types/game'

interface Props {
  winner: string
  gameStats?: {
    rounds: number
    duration: string
    diceRolls: number
  }
}

interface Emits {
  (e: 'new-game'): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  gameStats: () => ({
    rounds: 0,
    duration: '00:00',
    diceRolls: 0
  })
})

const emit = defineEmits<Emits>()

// 胜利条件动物
const winConditionAnimals: AnimalType[] = ['rabbit', 'sheep', 'pig', 'cow', 'horse']

// 计算属性
const isAIWin = computed(() => props.winner === 'ai')

const winnerName = computed(() => {
  return isAIWin.value ? 'AI农场主' : '恭喜你'
})

const winTitle = computed(() => {
  return isAIWin.value ? '🤖 AI获胜！' : '🎉 胜利！'
})

const winSubtitle = computed(() => {
  return isAIWin.value 
    ? 'AI成功收集了所有动物！下次加油哦！' 
    : '成功收集了所有动物！你是真正的农场主！'
})

// 方法
const getAnimalIcon = (animal: AnimalType): string => {
  const icons = {
    rabbit: '🐰',
    sheep: '🐑',
    pig: '🐷',
    cow: '🐄',
    horse: '🐴'
  }
  return icons[animal]
}

const getAnimalName = (animal: AnimalType): string => {
  const names = {
    rabbit: '兔子',
    sheep: '羊',
    pig: '猪',
    cow: '牛',
    horse: '马'
  }
  return names[animal]
}

const getConfettiStyle = (index: number) => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']
  const randomColor = colors[index % colors.length]
  const randomDelay = Math.random() * 3
  const randomDuration = 2 + Math.random() * 2
  const randomX = Math.random() * 100
  
  return {
    backgroundColor: randomColor,
    left: `${randomX}%`,
    animationDelay: `${randomDelay}s`,
    animationDuration: `${randomDuration}s`
  }
}

const shareResult = () => {
  const shareText = `我在超级农场主游戏中${isAIWin.value ? '挑战了AI' : '获得了胜利'}！🎮 游戏轮次：${props.gameStats.rounds} 轮，用时：${props.gameStats.duration}。快来挑战吧！`
  
  if (navigator.share) {
    navigator.share({
      title: '超级农场主 - 游戏结果',
      text: shareText,
      url: window.location.href
    }).catch(console.error)
  } else {
    // 复制到剪贴板
    navigator.clipboard.writeText(shareText).then(() => {
      alert('战绩已复制到剪贴板！')
    }).catch(() => {
      console.warn('复制失败，请手动分享')
    })
  }
}

// 生命周期
onMounted(() => {
  // 播放胜利音效 (如果有的话)
  try {
    const audio = new Audio('/sounds/victory.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {
      // 忽略音效播放错误
    })
  } catch (error) {
    // 忽略音效文件不存在的错误
  }
})
</script>

<style scoped>
.win-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.win-dialog {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideIn {
  from { 
    transform: scale(0.8) translateY(-50px);
    opacity: 0;
  }
  to { 
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.celebration-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: 20px;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  animation: confettiFall 4s linear infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

.win-content {
  position: relative;
  text-align: center;
  color: white;
}

.win-icon {
  margin-bottom: 20px;
}

.trophy-animation {
  font-size: 4rem;
  animation: trophyBounce 2s ease-in-out infinite;
}

@keyframes trophyBounce {
  0%, 20%, 60%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  40% {
    transform: translateY(-20px) rotate(5deg);
  }
  80% {
    transform: translateY(-10px) rotate(-5deg);
  }
}

.win-title {
  font-size: 2.5rem;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  animation: titleGlow 2s ease-in-out infinite alternate;
}

@keyframes titleGlow {
  from { text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3); }
  to { text-shadow: 2px 2px 20px rgba(255, 255, 255, 0.5); }
}

.winner-info {
  margin-bottom: 30px;
}

.winner-avatar {
  font-size: 3rem;
  margin-bottom: 10px;
  animation: avatarPulse 1.5s ease-in-out infinite;
}

@keyframes avatarPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.winner-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.win-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.game-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.win-condition {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.win-condition h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
}

.condition-animals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
}

.condition-animal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.condition-animal.achieved {
  background: rgba(76, 175, 80, 0.3);
  animation: achievedPulse 2s ease-in-out infinite;
}

@keyframes achievedPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.animal-icon {
  font-size: 1.5rem;
}

.animal-name {
  font-size: 0.8rem;
  opacity: 0.9;
}

.check-mark {
  color: #4CAF50;
  font-size: 1.2rem;
  font-weight: bold;
}

.win-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  justify-content: center;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.action-button.primary {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.button-icon {
  font-size: 1.1rem;
}

.share-section {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 20px;
}

.share-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 auto;
}

.share-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.share-icon {
  font-size: 1rem;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .win-dialog {
    padding: 25px;
    margin: 10px;
  }
  
  .win-title {
    font-size: 2rem;
  }
  
  .trophy-animation {
    font-size: 3rem;
  }
  
  .game-stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .condition-animals {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .win-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style> 