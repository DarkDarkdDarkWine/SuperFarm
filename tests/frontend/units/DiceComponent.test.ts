import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DiceComponent from '@/components/DiceComponent.vue'
import type { DiceResult } from '@/types/game'

describe('DiceComponent', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('渲染测试', () => {
    it('应该正确渲染骰子组件', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: 'rabbit',
          isRolling: false,
          index: 0
        }
      })

      expect(wrapper.find('.dice-wrapper').exists()).toBe(true)
      expect(wrapper.find('.dice').exists()).toBe(true)
    })

    it('应该显示正确的骰子面内容', () => {
      const testCases: { face: DiceResult; expected: string }[] = [
        { face: 'rabbit', expected: '🐰' },
        { face: 'sheep', expected: '🐑' },
        { face: 'pig', expected: '🐷' },
        { face: 'cow', expected: '🐄' },
        { face: 'horse', expected: '🐴' },
        { face: 'fox', expected: '🦊' },
        { face: 'wolf', expected: '🐺' }
      ]

      testCases.forEach(({ face, expected }) => {
        wrapper = mount(DiceComponent, {
          props: {
            face,
            isRolling: false,
            index: 0
          }
        })

        expect(wrapper.find('.dice-face.front').text()).toBe(expected)
        wrapper.unmount()
      })
    })

    it('应该在投掷时显示投掷动画', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: undefined,
          isRolling: true,
          index: 0
        }
      })

      expect(wrapper.find('.dice.rolling').exists()).toBe(true)
      expect(wrapper.find('.dice-result').exists()).toBe(false)
    })

    it('应该在投掷完成后显示结果', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: 'rabbit',
          isRolling: false,
          index: 0
        }
      })

      expect(wrapper.find('.dice.rolling').exists()).toBe(false)
      expect(wrapper.find('.dice.rolled').exists()).toBe(true)
      expect(wrapper.find('.dice-result').exists()).toBe(true)
      expect(wrapper.find('.result-icon').text()).toBe('🐰')
      expect(wrapper.find('.result-text').text()).toBe('兔子')
    })
  })

  describe('CSS类测试', () => {
    it('应该根据face应用正确的CSS类', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: 'rabbit',
          isRolling: false,
          index: 0
        }
      })

      expect(wrapper.find('.dice.face-rabbit').exists()).toBe(true)
    })

    it('应该在投掷时应用rolling类', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: undefined,
          isRolling: true,
          index: 0
        }
      })

      expect(wrapper.find('.dice.rolling').exists()).toBe(true)
    })

    it('应该应用正确的动画延迟', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: 'rabbit',
          isRolling: false,
          index: 2
        }
      })

      const diceElement = wrapper.find('.dice')
      expect(diceElement.attributes('style')).toContain('animation-delay: 0.4s')
    })
  })

  describe('危险骰子面测试', () => {
    it('应该为狐狸和狼显示特殊样式', () => {
      const dangerFaces: DiceResult[] = ['fox', 'wolf']

      dangerFaces.forEach(face => {
        wrapper = mount(DiceComponent, {
          props: {
            face,
            isRolling: false,
            index: 0
          }
        })

        expect(wrapper.find(`.dice.face-${face}`).exists()).toBe(true)
        wrapper.unmount()
      })
    })
  })

  describe('响应式测试', () => {
    it('应该正确响应props变化', async () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: undefined,
          isRolling: true,
          index: 0
        }
      })

      expect(wrapper.find('.dice.rolling').exists()).toBe(true)

      await wrapper.setProps({
        face: 'rabbit',
        isRolling: false
      })

      expect(wrapper.find('.dice.rolling').exists()).toBe(false)
      expect(wrapper.find('.dice.rolled').exists()).toBe(true)
      expect(wrapper.find('.result-text').text()).toBe('兔子')
    })
  })

  describe('边界情况测试', () => {
    it('应该处理未定义的face', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: undefined,
          isRolling: false,
          index: 0
        }
      })

      expect(wrapper.find('.dice-face.front').text()).toBe('?')
      expect(wrapper.find('.dice-result').exists()).toBe(false)
    })

    it('应该处理大索引值', () => {
      wrapper = mount(DiceComponent, {
        props: {
          face: 'rabbit',
          isRolling: false,
          index: 10
        }
      })

      const diceElement = wrapper.find('.dice')
      expect(diceElement.attributes('style')).toContain('animation-delay: 2s')
    })
  })

  describe('文本内容测试', () => {
    it('应该显示正确的中文名称', () => {
      const textCases: { face: DiceResult; expected: string }[] = [
        { face: 'rabbit', expected: '兔子' },
        { face: 'sheep', expected: '羊' },
        { face: 'pig', expected: '猪' },
        { face: 'cow', expected: '牛' },
        { face: 'horse', expected: '马' },
        { face: 'fox', expected: '狐狸' },
        { face: 'wolf', expected: '狼' }
      ]

      textCases.forEach(({ face, expected }) => {
        wrapper = mount(DiceComponent, {
          props: {
            face,
            isRolling: false,
            index: 0
          }
        })

        expect(wrapper.find('.result-text').text()).toBe(expected)
        wrapper.unmount()
      })
    })
  })
}) 