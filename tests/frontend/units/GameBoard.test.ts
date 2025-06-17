import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GameBoard from '@/components/GameBoard.vue'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'

// Mock子组件
vi.mock('@/components/PlayerBoard.vue', () => ({
  default: {
    name: 'PlayerBoard',
    template: '<div class="player-board-mock">PlayerBoard Mock</div>',
    props: ['player', 'isActive', 'isAI'],
    emits: ['exchange', 'buy-protection']
  }
}))

vi.mock('@/components/DiceComponent.vue', () => ({
  default: {
    name: 'DiceComponent',
    template: '<div class="dice-component-mock">DiceComponent Mock</div>',
    props: ['face', 'isRolling', 'index']
  }
}))

vi.mock('@/components/WinDialog.vue', () => ({
  default: {
    name: 'WinDialog',
    template: '<div class="win-dialog-mock">WinDialog Mock</div>',
    props: ['winner'],
    emits: ['new-game', 'close']
  }
}))

// Mock服务
vi.mock('@/services/gameService', () => ({
  GameService: vi.fn().mockImplementation(() => ({
    rollDice: vi.fn().mockResolvedValue(['rabbit', 'sheep']),
    processDiceResult: vi.fn().mockResolvedValue(true),
    checkWinCondition: vi.fn().mockResolvedValue(false),
    exchangeAnimals: vi.fn().mockResolvedValue(true),
    buyProtection: vi.fn().mockResolvedValue(true),
    endTurn: vi.fn(),
    initGame: vi.fn()
  }))
}))

vi.mock('@/services/aiService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    getAIDecision: vi.fn().mockResolvedValue({
      analysis: 'AI分析',
      actions: [],
      reasoning: 'AI推理',
      confidence: 0.8
    })
  }))
}))

describe('GameBoard', () => {
  let wrapper: any
  let pinia: any
  let gameStore: any
  let playerStore: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    gameStore = useGameStore()
    playerStore = usePlayerStore()
    
    // 初始化store状态
    gameStore.initGame()
    playerStore.resetPlayers()
    
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染游戏主界面', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.game-board').exists()).toBe(true)
      expect(wrapper.find('.game-header').exists()).toBe(true)
      expect(wrapper.find('.game-main').exists()).toBe(true)
      expect(wrapper.find('.game-controls').exists()).toBe(true)
    })

    it('应该显示游戏标题和信息', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.game-title').text()).toContain('超级农场主')
      expect(wrapper.find('.game-info').exists()).toBe(true)
      expect(wrapper.find('.round-info').exists()).toBe(true)
      expect(wrapper.find('.phase-info').exists()).toBe(true)
      expect(wrapper.find('.current-player').exists()).toBe(true)
    })

    it('应该显示正确的轮次信息', () => {
      gameStore.currentRound = 5
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.round-info').text()).toContain('第 5 轮')
    })

    it('应该显示当前玩家信息', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const currentPlayerElement = wrapper.find('.current-player')
      expect(currentPlayerElement.text()).toContain('玩家')
      expect(currentPlayerElement.classes()).toContain('human')
    })
  })

  describe('游戏区域测试', () => {
    it('应该包含三个主要区域', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const mainArea = wrapper.find('.game-main')
      expect(mainArea.findAll('.player-area')).toHaveLength(2) // 人类和AI区域
      expect(mainArea.find('.center-area').exists()).toBe(true)
    })

    it('应该渲染骰子区域', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.dice-section').exists()).toBe(true)
      expect(wrapper.find('.dice-container').exists()).toBe(true)
      expect(wrapper.find('.roll-button').exists()).toBe(true)
    })

    it('应该渲染银行区域', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.bank-section').exists()).toBe(true)
      expect(wrapper.find('.bank-animals').exists()).toBe(true)
    })

    it('应该渲染游戏日志', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.game-log').exists()).toBe(true)
      expect(wrapper.find('.log-entries').exists()).toBe(true)
    })
  })

  describe('骰子功能测试', () => {
    it('应该显示投掷骰子按钮', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const rollButton = wrapper.find('.roll-button')
      expect(rollButton.exists()).toBe(true)
      expect(rollButton.text()).toBe('投掷骰子')
    })

    it('应该在人类回合时启用投掷按钮', () => {
      gameStore.currentPlayer = 'human'
      gameStore.gamePhase = 'preparing'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const rollButton = wrapper.find('.roll-button')
      expect(rollButton.attributes('disabled')).toBeUndefined()
    })

    it('应该在AI回合时禁用投掷按钮', () => {
      gameStore.currentPlayer = 'ai'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const rollButton = wrapper.find('.roll-button')
      expect(rollButton.attributes('disabled')).toBeDefined()
    })

    it('应该在投掷时显示正确的按钮文本', () => {
      gameStore.gamePhase = 'rolling'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const rollButton = wrapper.find('.roll-button')
      expect(rollButton.text()).toBe('投掷中...')
    })
  })

  describe('游戏控制测试', () => {
    it('应该显示游戏控制按钮', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.end-turn-btn').exists()).toBe(true)
      expect(wrapper.find('.new-game-btn').exists()).toBe(true)
    })

    it('应该显示正确的按钮文本', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.end-turn-btn').text()).toBe('结束回合')
      expect(wrapper.find('.new-game-btn').text()).toBe('新游戏')
    })

    it('应该在人类回合时启用结束回合按钮', () => {
      gameStore.currentPlayer = 'human'
      gameStore.gamePhase = 'preparing'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const endTurnButton = wrapper.find('.end-turn-btn')
      expect(endTurnButton.attributes('disabled')).toBeUndefined()
    })

    it('应该在AI回合时禁用结束回合按钮', () => {
      gameStore.currentPlayer = 'ai'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const endTurnButton = wrapper.find('.end-turn-btn')
      expect(endTurnButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('银行显示测试', () => {
    it('应该显示所有动物和防护道具', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const bankItems = wrapper.findAll('.bank-item')
      expect(bankItems.length).toBeGreaterThan(0)
    })

    it('应该显示银行动物图标', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.bank-animals').exists()).toBe(true)
      expect(wrapper.findAll('.animal-icon').length).toBeGreaterThan(0)
    })
  })

  describe('游戏状态测试', () => {
    it('应该显示正确的游戏阶段', () => {
      gameStore.gamePhase = 'preparing'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.phase-info').text()).toBe('准备中')
    })

    it('应该为当前玩家应用正确的CSS类', () => {
      gameStore.currentPlayer = 'human'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const currentPlayerElement = wrapper.find('.current-player')
      expect(currentPlayerElement.classes()).toContain('human')
    })

    it('应该显示游戏进度', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.progress-bar').exists()).toBe(true)
      expect(wrapper.find('.progress-fill').exists()).toBe(true)
      expect(wrapper.find('.stat-value').exists()).toBe(true)
    })
  })

  describe('胜利弹窗测试', () => {
    it('应该在游戏结束时显示胜利弹窗', () => {
      gameStore.gamePhase = 'finished'
      gameStore.winner = 'human'
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.win-dialog-mock').exists()).toBe(true)
    })

    it('应该在游戏进行中隐藏胜利弹窗', () => {
      gameStore.gamePhase = 'preparing'
      gameStore.winner = null
      
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.win-dialog-mock').exists()).toBe(false)
    })
  })

  describe('响应式设计测试', () => {
    it('应该包含响应式CSS类', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.game-board').exists()).toBe(true)
      expect(wrapper.find('.game-main').exists()).toBe(true)
      expect(wrapper.find('.game-controls').exists()).toBe(true)
    })
  })

  describe('事件处理测试', () => {
    it('应该响应新游戏按钮点击', async () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      const newGameButton = wrapper.find('.new-game-btn')
      await newGameButton.trigger('click')

      // 检查游戏是否重新初始化
      expect(gameStore.currentRound).toBe(1)
      expect(gameStore.gamePhase).toBe('preparing')
    })

    it('应该处理组件挂载', () => {
      wrapper = mount(GameBoard, {
        global: {
          plugins: [pinia]
        }
      })

      // 组件应该成功挂载
      expect(wrapper.vm).toBeDefined()
    })
  })
}) 