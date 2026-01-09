import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GameControlCenter from '@/components/GameControlCenter.vue'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'

describe('GameControlCenter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该正确渲染游戏控制中心', () => {
    const wrapper = mount(GameControlCenter)
    
    expect(wrapper.find('.game-control-center').exists()).toBe(true)
    expect(wrapper.find('.back-button').exists()).toBe(true)
  })

  it('应该显示当前游戏状态信息', async () => {
    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    
    // 设置游戏状态
    gameStore.currentPlayerId = 'player-1'
    gameStore.turnCount = 5
    gameStore.gamePhase = 'DICE_PHASE'
    
    // 添加玩家
    playerStore.addPlayer({
      id: 'player-1',
      name: '玩家1',
      isAI: false,
      animals: { rabbit: 2, sheep: 1, pig: 0, cow: 0, horse: 0 },
      protectionItems: { smallDog: 1, bigDog: 0 }
    })

    const wrapper = mount(GameControlCenter)
    
    expect(wrapper.text()).toContain('回合: 5')
    expect(wrapper.text()).toContain('当前玩家: 玩家1')
    expect(wrapper.text()).toContain('阶段: 投掷骰子')
  })

  it('应该显示游戏规则说明', () => {
    const wrapper = mount(GameControlCenter)
    
    const rulesButton = wrapper.find('.rules-button')
    expect(rulesButton.exists()).toBe(true)
    
    // 点击规则按钮
    rulesButton.trigger('click')
    
    expect(wrapper.find('.rules-modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('游戏规则')
  })

  it('应该处理返回主菜单事件', async () => {
    const wrapper = mount(GameControlCenter)
    
    const backButton = wrapper.find('.back-button')
    await backButton.trigger('click')
    
    expect(wrapper.emitted('back-to-menu')).toBeTruthy()
    expect(wrapper.emitted('back-to-menu')).toHaveLength(1)
  })

  it('应该显示游戏进度信息', () => {
    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    
    // 添加多个玩家
    playerStore.addPlayer({
      id: 'player-1',
      name: '玩家1',
      isAI: false,
      animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 0 },
      protectionItems: { smallDog: 0, bigDog: 0 }
    })
    
    playerStore.addPlayer({
      id: 'ai-player',
      name: 'AI玩家',
      isAI: true,
      animals: { rabbit: 2, sheep: 0, pig: 0, cow: 0, horse: 0 },
      protectionItems: { smallDog: 1, bigDog: 0 }
    })

    const wrapper = mount(GameControlCenter)
    
    expect(wrapper.find('.progress-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('游戏进度')
    expect(wrapper.text()).toContain('玩家1')
    expect(wrapper.text()).toContain('AI玩家')
  })

  it('应该显示胜利提示', () => {
    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    
    // 设置胜利状态
    playerStore.addPlayer({
      id: 'winner',
      name: '获胜者',
      isAI: false,
      animals: { rabbit: 1, sheep: 1, pig: 1, cow: 1, horse: 1 },
      protectionItems: { smallDog: 0, bigDog: 0 }
    })
    
    gameStore.currentPlayerId = 'winner'

    const wrapper = mount(GameControlCenter)
    
    // 检查是否显示胜利信息
    expect(wrapper.find('.victory-indicator').exists()).toBe(true)
    expect(wrapper.text()).toContain('获胜者已收集所有动物')
  })

  it('应该响应键盘快捷键', async () => {
    const wrapper = mount(GameControlCenter)
    
    // 模拟按下ESC键返回主菜单
    await wrapper.trigger('keyup.esc')
    
    expect(wrapper.emitted('back-to-menu')).toBeTruthy()
  })

  it('应该正确处理暂停/继续游戏', async () => {
    const gameStore = useGameStore()
    const wrapper = mount(GameControlCenter)
    
    const pauseButton = wrapper.find('.pause-button')
    expect(pauseButton.exists()).toBe(true)
    
    // 暂停游戏
    await pauseButton.trigger('click')
    expect(gameStore.isPaused).toBe(true)
    expect(pauseButton.text()).toContain('继续')
    
    // 继续游戏
    await pauseButton.trigger('click')
    expect(gameStore.isPaused).toBe(false)
    expect(pauseButton.text()).toContain('暂停')
  })

  it('应该显示AI性格信息', () => {
    const playerStore = usePlayerStore()
    
    playerStore.addPlayer({
      id: 'ai-conservative',
      name: '稳重老王',
      isAI: true,
      personality: 'conservative',
      animals: { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 },
      protectionItems: { smallDog: 0, bigDog: 0 }
    })

    const wrapper = mount(GameControlCenter)
    
    expect(wrapper.find('.ai-personality').exists()).toBe(true)
    expect(wrapper.text()).toContain('稳重老王')
    expect(wrapper.text()).toContain('保守策略')
  })
}) 