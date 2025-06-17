import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WinDialog from '@/components/WinDialog.vue'

describe('WinDialog', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染胜利弹窗', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-dialog-overlay').exists()).toBe(true)
      expect(wrapper.find('.win-dialog').exists()).toBe(true)
      expect(wrapper.find('.win-content').exists()).toBe(true)
    })

    it('应该显示关闭按钮', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.close-button').exists()).toBe(true)
      expect(wrapper.find('.close-button').text()).toBe('✕')
    })

    it('应该显示操作按钮', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-actions').exists()).toBe(true)
      expect(wrapper.findAll('.action-button')).toHaveLength(2)
      
      const buttons = wrapper.findAll('.action-button')
      expect(buttons[0].text()).toContain('再来一局')
      expect(buttons[1].text()).toContain('查看详情')
    })
  })

  describe('人类玩家获胜测试', () => {
    it('应该显示正确的人类获胜信息', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-title').text()).toBe('🎉 胜利！')
      expect(wrapper.find('.winner-name').text()).toBe('恭喜你')
      expect(wrapper.find('.winner-avatar').text()).toBe('👤')
    })

    it('应该显示人类获胜的胜利图标', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-icon').exists()).toBe(true)
      expect(wrapper.find('.trophy-animation').text()).toBe('🏆')
    })
  })

  describe('AI获胜测试', () => {
    it('应该显示正确的AI获胜信息', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'ai'
        }
      })

      expect(wrapper.find('.win-title').text()).toBe('🤖 AI获胜！')
      expect(wrapper.find('.winner-name').text()).toBe('AI农场主')
      expect(wrapper.find('.winner-avatar').text()).toBe('🤖')
    })
  })

  describe('事件处理测试', () => {
    it('应该在点击关闭按钮时发射close事件', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('close')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('应该在点击遮罩层时发射close事件', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const overlay = wrapper.find('.win-dialog-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('close')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('应该在点击新游戏按钮时发射new-game事件', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const newGameButton = wrapper.find('.action-button.primary')
      await newGameButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('new-game')
      expect(wrapper.emitted('new-game')).toHaveLength(1)
    })

    it('应该在点击查看详情按钮时发射close事件', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const detailButton = wrapper.find('.action-button.secondary')
      await detailButton.trigger('click')

      expect(wrapper.emitted()).toHaveProperty('close')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('不应该在点击弹窗内容时发射close事件', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const dialog = wrapper.find('.win-dialog')
      await dialog.trigger('click')

      expect(wrapper.emitted('close') || []).toHaveLength(0)
    })
  })

  describe('CSS类和样式测试', () => {
    it('应该应用正确的CSS类', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-dialog-overlay').exists()).toBe(true)
      expect(wrapper.find('.win-dialog').exists()).toBe(true)
      expect(wrapper.find('.win-content').exists()).toBe(true)
      expect(wrapper.find('.win-icon').exists()).toBe(true)
      expect(wrapper.find('.winner-info').exists()).toBe(true)
      expect(wrapper.find('.win-actions').exists()).toBe(true)
    })

    it('应该为主要按钮应用primary类', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const primaryButton = wrapper.find('.action-button.primary')
      expect(primaryButton.exists()).toBe(true)
      expect(primaryButton.classes()).toContain('primary')
    })

    it('应该为次要按钮应用secondary类', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      const secondaryButton = wrapper.find('.action-button.secondary')
      expect(secondaryButton.exists()).toBe(true)
      expect(secondaryButton.classes()).toContain('secondary')
    })
  })

  describe('动画测试', () => {
    it('应该包含动画元素', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.trophy-animation').exists()).toBe(true)
      expect(wrapper.find('.winner-avatar').exists()).toBe(true)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理无效的winner值', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'invalid'
        }
      })

      // 应该默认处理为非AI
      expect(wrapper.find('.winner-avatar').text()).toBe('👤')
      expect(wrapper.find('.winner-name').text()).toBe('恭喜你')
    })

    it('应该处理空的winner值', () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: ''
        }
      })

      // 应该默认处理为非AI
      expect(wrapper.find('.winner-avatar').text()).toBe('👤')
      expect(wrapper.find('.winner-name').text()).toBe('恭喜你')
    })
  })

  describe('响应式测试', () => {
    it('应该正确响应winner属性变化', async () => {
      wrapper = mount(WinDialog, {
        props: {
          winner: 'human'
        }
      })

      expect(wrapper.find('.win-title').text()).toBe('🎉 胜利！')

      await wrapper.setProps({ winner: 'ai' })

      expect(wrapper.find('.win-title').text()).toBe('🤖 AI获胜！')
      expect(wrapper.find('.winner-name').text()).toBe('AI农场主')
    })
  })
}) 