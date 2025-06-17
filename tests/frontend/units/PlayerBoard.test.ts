import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerBoard from '@/components/PlayerBoard.vue'
import type { Player } from '@/types/game'

describe('PlayerBoard', () => {
  let wrapper: any
  let mockPlayer: Player

  beforeEach(() => {
    mockPlayer = {
      id: 'test-player',
      name: '测试玩家',
      type: 'human',
      animals: {
        rabbit: 5,
        sheep: 2,
        pig: 1,
        cow: 0,
        horse: 0
      },
      protection: {
        smallDog: 1,
        bigDog: 0
      },
      isWinner: false
    }
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染玩家面板', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      expect(wrapper.find('.player-board').exists()).toBe(true)
      expect(wrapper.find('.player-name').text()).toContain('测试玩家')
    })

    it('应该显示正确的玩家图标', () => {
      // 人类玩家
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      expect(wrapper.find('.player-icon').text()).toBe('👤')

      wrapper.unmount()

      // AI玩家
      const aiPlayer: Player = { ...mockPlayer, type: 'ai', name: 'AI玩家' }
      wrapper = mount(PlayerBoard, {
        props: {
          player: aiPlayer,
          isActive: false,
          isAI: true
        }
      })

      expect(wrapper.find('.player-icon').text()).toBe('🤖')
    })

    it('应该在激活时显示状态指示器', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      expect(wrapper.find('.status-indicator').exists()).toBe(true)
      expect(wrapper.find('.status-indicator').text()).toBe('正在游戏')
    })

    it('应该在获胜时显示胜利徽章', () => {
      const winnerPlayer: Player = { ...mockPlayer, isWinner: true }
      wrapper = mount(PlayerBoard, {
        props: {
          player: winnerPlayer,
          isActive: false
        }
      })

      expect(wrapper.find('.winner-badge').exists()).toBe(true)
      expect(wrapper.find('.winner-badge').text()).toContain('胜利者')
    })
  })

  describe('动物展示测试', () => {
    it('应该正确显示动物数量', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      const animalItems = wrapper.findAll('.animal-item')
      expect(animalItems).toHaveLength(5) // 5种动物

      // 检查兔子数量
      const rabbitItem = animalItems.find((item: any) => 
        item.find('.animal-icon').text() === '🐰'
      )
      expect(rabbitItem.find('.animal-count').text()).toBe('5')
    })

    it('应该为有动物的项目添加正确的CSS类', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      const animalItems = wrapper.findAll('.animal-item')
      
      // 兔子应该有has-animals类
      const rabbitItem = animalItems.find((item: any) => 
        item.find('.animal-icon').text() === '🐰'
      )
      expect(rabbitItem.classes()).toContain('has-animals')

      // 马应该没有has-animals类（数量为0）
      const horseItem = animalItems.find((item: any) => 
        item.find('.animal-icon').text() === '🐴'
      )
      expect(horseItem.classes()).not.toContain('has-animals')
    })

    it('应该正确显示胜利进度', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      expect(wrapper.find('.progress-text').text()).toBe('3/5') // 有兔子、羊、猪
    })
  })

  describe('防护道具测试', () => {
    it('应该正确显示防护道具', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      const protectionItems = wrapper.findAll('.protection-item')
      expect(protectionItems).toHaveLength(2) // 小狗和大狗

      // 检查小狗数量
      const smallDogItem = protectionItems.find((item: any) => 
        item.find('.protection-icon').text() === '🐕'
      )
      expect(smallDogItem.find('.protection-count').text()).toBe('1')
    })

    it('应该为有防护的项目添加正确的CSS类', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      const protectionItems = wrapper.findAll('.protection-item')
      
      // 小狗应该有has-protection类
      const smallDogItem = protectionItems.find((item: any) => 
        item.find('.protection-icon').text() === '🐕'
      )
      expect(smallDogItem.classes()).toContain('has-protection')

      // 大狗应该没有has-protection类
      const bigDogItem = protectionItems.find((item: any) => 
        item.find('.protection-icon').text() === '🐕‍🦺'
      )
      expect(bigDogItem.classes()).not.toContain('has-protection')
    })
  })

  describe('操作按钮测试', () => {
    it('应该为人类玩家显示操作面板', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      expect(wrapper.find('.actions-section').exists()).toBe(true)
      expect(wrapper.find('.exchange-panel').exists()).toBe(true)
      expect(wrapper.find('.protection-panel').exists()).toBe(true)
    })

    it('应该不为AI玩家显示操作面板', () => {
      const aiPlayer: Player = { ...mockPlayer, type: 'ai' }
      wrapper = mount(PlayerBoard, {
        props: {
          player: aiPlayer,
          isActive: true,
          isAI: true
        }
      })

      expect(wrapper.find('.actions-section').exists()).toBe(false)
    })

    it('应该不为非激活玩家显示操作面板', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: false
        }
      })

      expect(wrapper.find('.actions-section').exists()).toBe(false)
    })

    it('应该显示可用的交换选项', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      const exchangeButtons = wrapper.findAll('.exchange-button')
      expect(exchangeButtons.length).toBeGreaterThan(0)

      // 应该有兔子换羊的选项（因为有5只兔子）
      const rabbitToSheepButton = exchangeButtons.find((btn: any) => 
        btn.text().includes('🐰') && btn.text().includes('🐑')
      )
      expect(rabbitToSheepButton.exists()).toBe(true)
      expect(rabbitToSheepButton.attributes('disabled')).toBeUndefined()
    })

    it('应该禁用不可负担的交换选项', () => {
      const poorPlayer: Player = {
        ...mockPlayer,
        animals: { rabbit: 3, sheep: 0, pig: 0, cow: 0, horse: 0 } // 只有3只兔子，不够换羊
      }

      wrapper = mount(PlayerBoard, {
        props: {
          player: poorPlayer,
          isActive: true
        }
      })

      const exchangeButtons = wrapper.findAll('.exchange-button')
      const rabbitToSheepButton = exchangeButtons.find((btn: any) => 
        btn.text().includes('🐰') && btn.text().includes('🐑')
      )
      expect(rabbitToSheepButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('事件发射测试', () => {
    it('应该在点击交换按钮时发射exchange事件', async () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      const exchangeButton = wrapper.find('.exchange-button')
      await exchangeButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('exchange')
      expect(wrapper.emitted('exchange')).toHaveLength(1)
    })

    it('应该在点击购买按钮时发射buy-protection事件', async () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      const buyButton = wrapper.find('.buy-button')
      await buyButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('buy-protection')
      expect(wrapper.emitted('buy-protection')).toHaveLength(1)
    })
  })

  describe('AI状态测试', () => {
    it('应该为激活的AI玩家显示思考状态', () => {
      const aiPlayer: Player = { ...mockPlayer, type: 'ai' }
      wrapper = mount(PlayerBoard, {
        props: {
          player: aiPlayer,
          isActive: true,
          isAI: true
        }
      })

      expect(wrapper.find('.ai-section').exists()).toBe(true)
      expect(wrapper.find('.ai-thinking').exists()).toBe(true)
      expect(wrapper.find('.thinking-indicator').exists()).toBe(true)
    })

    it('应该不为非激活的AI玩家显示思考状态', () => {
      const aiPlayer: Player = { ...mockPlayer, type: 'ai' }
      wrapper = mount(PlayerBoard, {
        props: {
          player: aiPlayer,
          isActive: false,
          isAI: true
        }
      })

      expect(wrapper.find('.ai-section').exists()).toBe(false)
    })
  })

  describe('样式类测试', () => {
    it('应该为激活的玩家添加active类', () => {
      wrapper = mount(PlayerBoard, {
        props: {
          player: mockPlayer,
          isActive: true
        }
      })

      expect(wrapper.find('.player-board').classes()).toContain('active')
    })

    it('应该为AI玩家添加ai-player类', () => {
      const aiPlayer: Player = { ...mockPlayer, type: 'ai' }
      wrapper = mount(PlayerBoard, {
        props: {
          player: aiPlayer,
          isActive: false,
          isAI: true
        }
      })

      expect(wrapper.find('.player-board').classes()).toContain('ai-player')
    })
  })
}) 