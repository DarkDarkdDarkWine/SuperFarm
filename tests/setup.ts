import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// 全局测试配置
config.global.stubs = {
  // 如果有需要mock的组件可以在这里添加
}

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
})

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // 保留 error 和 warn 用于调试
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
} 