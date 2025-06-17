# 超级农场主游戏 - 技术实现计划

## 阶段一：项目基础搭建 (1-2天)

### 1.1 前端项目初始化
```bash
# 创建Vue.js项目
npm create vue@latest superfarm-frontend
cd superfarm-frontend
npm install

# 安装依赖
npm install pinia @pinia/nuxt
npm install @types/node
npm install sass
npm install animate.css
```

### 1.2 后端项目初始化
```bash
# 创建Node.js项目
mkdir superfarm-backend
cd superfarm-backend
npm init -y

# 安装依赖
npm install express cors dotenv
npm install axios winston
npm install express-rate-limit
npm install helmet
npm install nodemon --save-dev
```

### 1.3 项目配置文件

**前端 vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

**后端 package.json scripts**
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  }
}
```

## 阶段二：核心类型定义 (半天)

### 2.1 TypeScript类型定义

**types/game.ts**
```typescript
export interface Animal {
  type: 'rabbit' | 'sheep' | 'pig' | 'cow' | 'horse';
  count: number;
}

export interface AnimalCollection {
  rabbit: number;
  sheep: number;
  pig: number;
  cow: number;
  horse: number;
}

export interface ProtectionCollection {
  smallDog: number;
  bigDog: number;
}

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  animals: AnimalCollection;
  protection: ProtectionCollection;
  isWinner: boolean;
}

export interface GameState {
  gameId: string;
  currentRound: number;
  currentPlayer: 'human' | 'ai';
  gamePhase: 'preparing' | 'rolling' | 'processing' | 'exchanging' | 'ai_thinking' | 'finished';
  winner: string | null;
  bank: AnimalCollection & ProtectionCollection;
  diceResult: string[];
  gameHistory: GameAction[];
}

export interface GameAction {
  type: 'roll' | 'breed' | 'exchange' | 'buy_protection' | 'attack';
  player: string;
  timestamp: number;
  details: any;
}

export interface ExchangeAction {
  from: keyof AnimalCollection;
  to: keyof AnimalCollection;
  fromCount: number;
  toCount: number;
}

export interface AIDecision {
  analysis: string;
  actions: AIAction[];
  reasoning: string;
  confidence: number;
}

export interface AIAction {
  type: 'breed' | 'exchange' | 'buy_protection';
  animal?: keyof AnimalCollection;
  count?: number;
  exchange?: ExchangeAction;
  protection?: 'smallDog' | 'bigDog';
}

export type DiceResult = 'rabbit' | 'sheep' | 'pig' | 'cow' | 'horse' | 'fox' | 'wolf';
```

## 阶段三：状态管理实现 (1天)

### 3.1 Pinia Store实现

**stores/gameStore.ts**
```typescript
import { defineStore } from 'pinia'
import type { GameState, Player, AnimalCollection } from '@/types/game'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    gameId: '',
    currentRound: 1,
    currentPlayer: 'human',
    gamePhase: 'preparing',
    winner: null,
    bank: {
      rabbit: 60,
      sheep: 24,
      pig: 20,
      cow: 12,
      horse: 4,
      smallDog: 4,
      bigDog: 2
    },
    diceResult: [],
    gameHistory: []
  }),

  getters: {
    isGameActive: (state) => state.gamePhase !== 'finished',
    isHumanTurn: (state) => state.currentPlayer === 'human',
    isAITurn: (state) => state.currentPlayer === 'ai',
    currentPhaseText: (state) => {
      const phaseTexts = {
        preparing: '准备中',
        rolling: '掷骰子',
        processing: '处理结果',
        exchanging: '交换阶段',
        ai_thinking: 'AI思考中',
        finished: '游戏结束'
      }
      return phaseTexts[state.gamePhase]
    }
  },

  actions: {
    initGame() {
      this.gameId = `game_${Date.now()}`
      this.currentRound = 1
      this.currentPlayer = 'human'
      this.gamePhase = 'preparing'
      this.winner = null
      this.diceResult = []
      this.gameHistory = []
      // 重置银行
      this.bank = {
        rabbit: 60,
        sheep: 24,
        pig: 20,
        cow: 12,
        horse: 4,
        smallDog: 4,
        bigDog: 2
      }
    },

    setGamePhase(phase: GameState['gamePhase']) {
      this.gamePhase = phase
    },

    switchPlayer() {
      this.currentPlayer = this.currentPlayer === 'human' ? 'ai' : 'human'
      if (this.currentPlayer === 'human') {
        this.currentRound++
      }
    },

    setDiceResult(result: string[]) {
      this.diceResult = result
    },

    addGameAction(action: GameAction) {
      this.gameHistory.push(action)
    },

    setWinner(playerId: string) {
      this.winner = playerId
      this.gamePhase = 'finished'
    },

    updateBank(updates: Partial<AnimalCollection & ProtectionCollection>) {
      Object.assign(this.bank, updates)
    }
  }
})
```

**stores/playerStore.ts**
```typescript
import { defineStore } from 'pinia'
import type { Player } from '@/types/game'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    human: {
      id: 'human',
      name: '玩家',
      type: 'human' as const,
      animals: {
        rabbit: 1,
        sheep: 0,
        pig: 0,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 0,
        bigDog: 0
      },
      isWinner: false
    } as Player,
    
    ai: {
      id: 'ai',
      name: 'AI农场主',
      type: 'ai' as const,
      animals: {
        rabbit: 1,
        sheep: 0,
        pig: 0,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 0,
        bigDog: 0
      },
      isWinner: false
    } as Player
  }),

  getters: {
    getPlayer: (state) => (playerId: string) => {
      return playerId === 'human' ? state.human : state.ai
    },
    
    hasWinCondition: (state) => (playerId: string) => {
      const player = playerId === 'human' ? state.human : state.ai
      return player.animals.rabbit >= 1 &&
             player.animals.sheep >= 1 &&
             player.animals.pig >= 1 &&
             player.animals.cow >= 1 &&
             player.animals.horse >= 1
    }
  },

  actions: {
    updatePlayerAnimals(playerId: string, animals: Partial<Player['animals']>) {
      const player = this.getPlayer(playerId)
      Object.assign(player.animals, animals)
    },

    updatePlayerProtection(playerId: string, protection: Partial<Player['protection']>) {
      const player = this.getPlayer(playerId)
      Object.assign(player.protection, protection)
    },

    setPlayerWinner(playerId: string) {
      const player = this.getPlayer(playerId)
      player.isWinner = true
    },

    resetPlayers() {
      this.human.animals = { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 }
      this.human.protection = { smallDog: 0, bigDog: 0 }
      this.human.isWinner = false
      
      this.ai.animals = { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 }
      this.ai.protection = { smallDog: 0, bigDog: 0 }
      this.ai.isWinner = false
    }
  }
})
```

## 阶段四：游戏服务层实现 (2天)

### 4.1 游戏规则引擎

**utils/gameRules.ts**
```typescript
import type { Player, AnimalCollection, DiceResult, ExchangeAction } from '@/types/game'

export class GameRules {
  // 交换比例配置
  static EXCHANGE_RATES = {
    rabbitToSheep: 6,
    sheepToPig: 2,
    pigToCow: 3,
    cowToHorse: 2
  }

  // 骰子配置 (12面骰子)
  static DICE_FACES: DiceResult[] = [
    'rabbit', 'rabbit', 'rabbit', 'rabbit', // 兔子4面
    'sheep', 'sheep', // 羊2面
    'pig', 'pig', // 猪2面
    'cow', // 牛1面
    'horse', // 马1面
    'fox', // 狐狸1面
    'wolf' // 狼1面
  ]

  // 掷骰子
  static rollDice(): DiceResult[] {
    const dice1 = this.DICE_FACES[Math.floor(Math.random() * 12)]
    const dice2 = this.DICE_FACES[Math.floor(Math.random() * 12)]
    return [dice1, dice2]
  }

  // 计算动物繁殖
  static calculateBreeding(currentCount: number, diceCount: number): number {
    const total = currentCount + diceCount
    return Math.floor(total / 2) // 每2个繁殖1个
  }

  // 处理狐狸攻击
  static processFoxAttack(player: Player): boolean {
    if (player.protection.smallDog > 0) {
      // 有小狗防护
      player.protection.smallDog--
      return false // 攻击被阻挡
    } else {
      // 没有防护，兔子被吃光只剩1只
      player.animals.rabbit = 1
      return true // 攻击成功
    }
  }

  // 处理狼攻击
  static processWolfAttack(player: Player): boolean {
    if (player.protection.bigDog > 0) {
      // 有大狗防护
      player.protection.bigDog--
      return false // 攻击被阻挡
    } else {
      // 没有防护，失去所有兔子和羊
      player.animals.rabbit = 0
      player.animals.sheep = 0
      return true // 攻击成功
    }
  }

  // 验证交换是否合法
  static validateExchange(player: Player, exchange: ExchangeAction): boolean {
    const { from, to, fromCount } = exchange
    
    // 检查是否有足够的动物进行交换
    if (player.animals[from] < fromCount) {
      return false
    }

    // 检查交换比例是否正确
    const validExchanges = {
      'rabbit-sheep': fromCount === this.EXCHANGE_RATES.rabbitToSheep,
      'sheep-pig': fromCount === this.EXCHANGE_RATES.sheepToPig,
      'pig-cow': fromCount === this.EXCHANGE_RATES.pigToCow,
      'cow-horse': fromCount === this.EXCHANGE_RATES.cowToHorse
    }

    const exchangeKey = `${from}-${to}` as keyof typeof validExchanges
    return validExchanges[exchangeKey] || false
  }

  // 执行动物交换
  static executeExchange(player: Player, exchange: ExchangeAction): boolean {
    if (!this.validateExchange(player, exchange)) {
      return false
    }

    const { from, to, fromCount, toCount } = exchange
    player.animals[from] -= fromCount
    player.animals[to] += toCount
    return true
  }

  // 验证防护购买
  static validateProtectionPurchase(player: Player, item: 'smallDog' | 'bigDog'): boolean {
    if (item === 'smallDog') {
      return player.animals.sheep >= 1 && player.protection.smallDog < 2
    } else if (item === 'bigDog') {
      return player.animals.pig >= 1 && player.protection.bigDog < 1
    }
    return false
  }

  // 购买防护
  static buyProtection(player: Player, item: 'smallDog' | 'bigDog'): boolean {
    if (!this.validateProtectionPurchase(player, item)) {
      return false
    }

    if (item === 'smallDog') {
      player.animals.sheep--
      player.protection.smallDog++
    } else if (item === 'bigDog') {
      player.animals.pig--
      player.protection.bigDog++
    }
    return true
  }

  // 检查胜利条件
  static checkWinCondition(player: Player): boolean {
    return player.animals.rabbit >= 1 &&
           player.animals.sheep >= 1 &&
           player.animals.pig >= 1 &&
           player.animals.cow >= 1 &&
           player.animals.horse >= 1
  }
}
```

### 4.2 游戏服务

**services/gameService.ts**
```typescript
import { GameRules } from '@/utils/gameRules'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import type { Player, DiceResult, ExchangeAction } from '@/types/game'

export class GameService {
  private gameStore = useGameStore()
  private playerStore = usePlayerStore()

  // 初始化游戏
  initGame(): void {
    this.gameStore.initGame()
    this.playerStore.resetPlayers()
  }

  // 掷骰子
  rollDice(): DiceResult[] {
    const result = GameRules.rollDice()
    this.gameStore.setDiceResult(result)
    return result
  }

  // 处理骰子结果
  processDiceResult(playerId: string, diceResult: DiceResult[]): void {
    const player = this.playerStore.getPlayer(playerId)
    
    // 统计骰子结果
    const animalCounts = {
      rabbit: 0,
      sheep: 0,
      pig: 0,
      cow: 0,
      horse: 0
    }
    
    let hasAttack = false
    
    diceResult.forEach(face => {
      if (face in animalCounts) {
        animalCounts[face as keyof typeof animalCounts]++
      } else if (face === 'fox') {
        const attacked = GameRules.processFoxAttack(player)
        if (attacked) hasAttack = true
      } else if (face === 'wolf') {
        const attacked = GameRules.processWolfAttack(player)
        if (attacked) hasAttack = true
      }
    })

    // 处理动物繁殖
    Object.entries(animalCounts).forEach(([animal, diceCount]) => {
      if (diceCount > 0) {
        const currentCount = player.animals[animal as keyof typeof animalCounts]
        const newAnimals = GameRules.calculateBreeding(currentCount, diceCount)
        
        // 从银行获取动物 (考虑银行库存限制)
        const bankAnimal = animal as keyof typeof animalCounts
        const availableInBank = this.gameStore.bank[bankAnimal]
        const actualNewAnimals = Math.min(newAnimals, availableInBank)
        
        // 更新玩家动物数量
        const updates = { [animal]: currentCount + actualNewAnimals }
        this.playerStore.updatePlayerAnimals(playerId, updates)
        
        // 更新银行库存
        const bankUpdates = { [animal]: availableInBank - actualNewAnimals }
        this.gameStore.updateBank(bankUpdates)
      }
    })

    // 记录游戏动作
    this.gameStore.addGameAction({
      type: hasAttack ? 'attack' : 'breed',
      player: playerId,
      timestamp: Date.now(),
      details: { diceResult, animalCounts, hasAttack }
    })
  }

  // 动物交换
  exchangeAnimals(playerId: string, exchange: ExchangeAction): boolean {
    const player = this.playerStore.getPlayer(playerId)
    const success = GameRules.executeExchange(player, exchange)
    
    if (success) {
      this.gameStore.addGameAction({
        type: 'exchange',
        player: playerId,
        timestamp: Date.now(),
        details: exchange
      })
    }
    
    return success
  }

  // 购买防护
  buyProtection(playerId: string, item: 'smallDog' | 'bigDog'): boolean {
    const player = this.playerStore.getPlayer(playerId)
    const success = GameRules.buyProtection(player, item)
    
    if (success) {
      // 更新银行库存
      const bankUpdates = { [item]: this.gameStore.bank[item] - 1 }
      this.gameStore.updateBank(bankUpdates)
      
      this.gameStore.addGameAction({
        type: 'buy_protection',
        player: playerId,
        timestamp: Date.now(),
        details: { item }
      })
    }
    
    return success
  }

  // 检查胜利条件
  checkWinCondition(playerId: string): boolean {
    const player = this.playerStore.getPlayer(playerId)
    const hasWon = GameRules.checkWinCondition(player)
    
    if (hasWon) {
      this.playerStore.setPlayerWinner(playerId)
      this.gameStore.setWinner(playerId)
    }
    
    return hasWon
  }

  // 结束回合
  endTurn(): void {
    this.gameStore.switchPlayer()
  }
}
```

## 阶段五：AI集成实现 (2天)

### 5.1 前端AI服务

**services/aiService.ts**
```typescript
import type { GameState, AIDecision } from '@/types/game'

export class AIService {
  private baseURL = '/api'

  async getAIDecision(gameState: GameState, difficulty: string = 'medium'): Promise<AIDecision> {
    try {
      const response = await fetch(`${this.baseURL}/ai/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameState,
          difficulty
        })
      })

      if (!response.ok) {
        throw new Error(`AI服务错误: ${response.status}`)
      }

      const decision = await response.json()
      return decision
    } catch (error) {
      console.error('获取AI决策失败:', error)
      // 返回备用决策
      return this.getFallbackDecision(gameState)
    }
  }

  // 备用AI决策 (简单规则AI)
  private getFallbackDecision(gameState: GameState): AIDecision {
    return {
      analysis: '使用备用AI策略',
      actions: [
        {
          type: 'breed',
          animal: 'rabbit',
          count: 1
        }
      ],
      reasoning: 'API服务不可用，执行基础繁殖策略',
      confidence: 0.5
    }
  }
}
```

这个实现计划分为5个阶段，循序渐进：

1. **基础搭建** - 建立项目结构和配置
2. **类型定义** - 确保类型安全
3. **状态管理** - 实现响应式状态管理
4. **游戏逻辑** - 核心规则引擎和服务
5. **AI集成** - DeepSeek API集成

每个阶段都有明确的时间预估和具体实现代码。您希望我继续详细实现后端API部分，还是先从某个特定阶段开始？ 