<template>
  <div class="dice-wrapper">
    <div 
      class="dice" 
      :class="{ 
        'rolling': isRolling,
        'rolled': !isRolling && face,
        [`face-${face}`]: !isRolling && face
      }"
      :style="{ animationDelay: `${index * 0.2}s` }"
    >
      <div class="dice-face front">{{ getFaceDisplay(face) }}</div>
      <div class="dice-face back">{{ getFaceDisplay('rabbit') }}</div>
      <div class="dice-face right">{{ getFaceDisplay('sheep') }}</div>
      <div class="dice-face left">{{ getFaceDisplay('pig') }}</div>
      <div class="dice-face top">{{ getFaceDisplay('cow') }}</div>
      <div class="dice-face bottom">{{ getFaceDisplay('horse') }}</div>
    </div>
    
    <!-- 结果文字 -->
    <div v-if="!isRolling && face" class="dice-result">
      <span class="result-icon">{{ getFaceDisplay(face) }}</span>
      <span class="result-text">{{ getFaceText(face) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiceResult } from '@/types/game'

interface Props {
  face?: DiceResult
  isRolling: boolean
  index: number
}

const props = withDefaults(defineProps<Props>(), {
  face: undefined,
  isRolling: false,
  index: 0
})

// 获取骰子面的显示内容
const getFaceDisplay = (face?: DiceResult): string => {
  if (!face) return '?'
  
  const displays: Record<DiceResult, string> = {
    rabbit: '🐰',
    sheep: '🐑',
    pig: '🐷',
    cow: '🐄',
    horse: '🐴',
    fox: '🦊',
    wolf: '🐺'
  }
  
  return displays[face] || '?'
}

// 获取骰子面的文字描述
const getFaceText = (face?: DiceResult): string => {
  if (!face) return ''
  
  const texts: Record<DiceResult, string> = {
    rabbit: '兔子',
    sheep: '羊',
    pig: '猪',
    cow: '牛',
    horse: '马',
    fox: '狐狸',
    wolf: '狼'
  }
  
  return texts[face] || ''
}
</script>

<style scoped>
.dice-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.dice {
  position: relative;
  width: 60px;
  height: 60px;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
  cursor: pointer;
}

.dice.rolling {
  animation: rollDice 2s ease-in-out;
}

.dice.rolled {
  animation: landDice 0.5s ease-out;
}

.dice-face {
  position: absolute;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.1);
}

.front  { transform: rotateY(0deg) translateZ(30px); }
.back   { transform: rotateY(180deg) translateZ(30px); }
.right  { transform: rotateY(90deg) translateZ(30px); }
.left   { transform: rotateY(-90deg) translateZ(30px); }
.top    { transform: rotateX(90deg) translateZ(30px); }
.bottom { transform: rotateX(-90deg) translateZ(30px); }

/* 根据结果旋转到对应面 */
.face-rabbit { transform: rotateY(0deg) rotateX(0deg); }
.face-sheep { transform: rotateY(-90deg) rotateX(0deg); }
.face-pig { transform: rotateY(90deg) rotateX(0deg); }
.face-cow { transform: rotateY(0deg) rotateX(-90deg); }
.face-horse { transform: rotateY(0deg) rotateX(90deg); }
.face-fox { transform: rotateY(180deg) rotateX(0deg); }
.face-wolf { transform: rotateY(180deg) rotateX(180deg); }

.dice-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}

.result-icon {
  font-size: 1.2rem;
}

.result-text {
  font-size: 0.8rem;
  font-weight: bold;
  color: #666;
}

/* 动画定义 */
@keyframes rollDice {
  0% { 
    transform: rotateX(0deg) rotateY(0deg); 
  }
  25% { 
    transform: rotateX(90deg) rotateY(90deg) scale(1.1); 
  }
  50% { 
    transform: rotateX(180deg) rotateY(180deg) scale(1.2); 
  }
  75% { 
    transform: rotateX(270deg) rotateY(270deg) scale(1.1); 
  }
  100% { 
    transform: rotateX(360deg) rotateY(360deg) scale(1); 
  }
}

@keyframes landDice {
  0% { 
    transform: scale(1.2) translateY(-10px); 
  }
  50% { 
    transform: scale(0.9) translateY(5px); 
  }
  100% { 
    transform: scale(1) translateY(0px); 
  }
}

/* 悬停效果 */
.dice:hover:not(.rolling) {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}

.dice-face:hover {
  background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
}

/* 特殊面的颜色 */
.face-fox .dice-face,
.face-wolf .dice-face {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-color: #f44336;
  color: #d32f2f;
}

.face-fox .dice-face {
  animation: dangerPulse 2s infinite;
}

.face-wolf .dice-face {
  animation: dangerPulse 1.5s infinite;
}

@keyframes dangerPulse {
  0%, 100% { 
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  }
  50% { 
    background: linear-gradient(135deg, #ffcdd2 0%, #ef5350 100%);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dice {
    width: 50px;
    height: 50px;
  }
  
  .dice-face {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  
  .front  { transform: rotateY(0deg) translateZ(25px); }
  .back   { transform: rotateY(180deg) translateZ(25px); }
  .right  { transform: rotateY(90deg) translateZ(25px); }
  .left   { transform: rotateY(-90deg) translateZ(25px); }
  .top    { transform: rotateX(90deg) translateZ(25px); }
  .bottom { transform: rotateX(-90deg) translateZ(25px); }
}
</style> 