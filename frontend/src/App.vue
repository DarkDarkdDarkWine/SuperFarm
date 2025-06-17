<template>
  <div id="app" class="app">
    <header class="app-header">
      <h1>🎮 超级农场主</h1>
      <p>与AI农场主一决高下！</p>
    </header>
    
    <main class="app-main">
      <!-- 欢迎界面 -->
      <div v-if="!gameStarted" class="game-container">
        <div class="welcome-card">
          <h2>欢迎来到超级农场主</h2>
          <p>这是一个策略性的农场管理游戏</p>
          <div class="game-rules">
            <h3>游戏目标</h3>
            <p>最先收集齐 🐰兔子、🐑羊、🐷猪、🐄牛、🐴马 各1只获胜！</p>
          </div>
          <div class="game-actions">
            <button class="btn-primary" @click="startGame">开始游戏</button>
            <button class="btn-secondary" @click="showRules">游戏规则</button>
          </div>
        </div>
      </div>

      <!-- 游戏界面 -->
      <GameBoard v-if="gameStarted" @back-to-menu="backToMenu" />
    </main>
    
    <footer class="app-footer">
      <p>基于 Vue.js + DeepSeek AI 构建</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import GameBoard from './components/GameBoard.vue'

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const gameStarted = ref(false)

const startGame = () => {
  gameStore.initGame()
  playerStore.resetPlayers()
  gameStarted.value = true
  console.log('游戏开始！')
}

const backToMenu = () => {
  gameStarted.value = false
}

const showRules = () => {
  alert(`🎲 游戏规则：

1. 目标：收集齐兔子、羊、猪、牛、马各1只
2. 掷2个12面骰子，获得对应动物
3. 每2个相同动物可繁殖1个新动物
4. 可以交换动物：6兔→1羊，2羊→1猪，3猪→1牛，2牛→1马
5. 购买防护：1羊→小狗(防狐狸)，1猪→大狗(防狼)
6. 小心狐狸和狼的攻击！

🤖 选择AI难度开始挑战吧！`)
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.app-header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.app-header p {
  font-size: 1.2rem;
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.game-container {
  max-width: 600px;
  width: 100%;
}

.welcome-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.welcome-card h2 {
  text-align: center;
  margin-top: 0;
  font-size: 2rem;
}

.game-rules {
  margin: 2rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.game-rules h3 {
  margin-top: 0;
  color: #ffd700;
}

.game-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn-primary, .btn-secondary {
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.app-footer {
  text-align: center;
  padding: 1rem;
  opacity: 0.7;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 2rem;
  }
  
  .welcome-card {
    padding: 1.5rem;
  }
  
  .game-actions {
    flex-direction: column;
  }
  
  .btn-primary, .btn-secondary {
    width: 100%;
  }
}
</style> 