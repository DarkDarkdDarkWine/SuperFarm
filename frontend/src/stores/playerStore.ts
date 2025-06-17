import { defineStore } from 'pinia'
import type { Player, AnimalCollection, ProtectionCollection } from '@/types/game'

interface PlayerState {
  human: Player;
  ai: Player;
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    human: {
      id: 'human',
      name: '玩家',
      type: 'human',
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
    },
    
    ai: {
      id: 'ai',
      name: 'AI农场主',
      type: 'ai',
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
    }
  }),

  getters: {
    // 获取指定玩家
    getPlayer: (state) => (playerId: string): Player => {
      return playerId === 'human' ? state.human : state.ai
    },
    
    // 检查玩家是否满足胜利条件
    hasWinCondition: (state) => (playerId: string): boolean => {
      const player = playerId === 'human' ? state.human : state.ai
      return player.animals.rabbit >= 1 &&
             player.animals.sheep >= 1 &&
             player.animals.pig >= 1 &&
             player.animals.cow >= 1 &&
             player.animals.horse >= 1
    },
    
    // 获取玩家动物总数
    getTotalAnimals: (state) => (playerId: string): number => {
      const player = playerId === 'human' ? state.human : state.ai
      return Object.values(player.animals).reduce((sum, count) => sum + count, 0)
    },
    
    // 获取玩家防护总数
    getTotalProtection: (state) => (playerId: string): number => {
      const player = playerId === 'human' ? state.human : state.ai
      return Object.values(player.protection).reduce((sum, count) => sum + count, 0)
    },
    
    // 检查玩家是否可以进行指定交换
    canExchange: (state) => (playerId: string, from: keyof AnimalCollection, requiredCount: number): boolean => {
      const player = playerId === 'human' ? state.human : state.ai
      return player.animals[from] >= requiredCount
    },
    
    // 获取玩家当前缺少的动物类型
    getMissingAnimals: (state) => (playerId: string): (keyof AnimalCollection)[] => {
      const player = playerId === 'human' ? state.human : state.ai
      const missing: (keyof AnimalCollection)[] = []
      
      Object.entries(player.animals).forEach(([animal, count]) => {
        if (count === 0) {
          missing.push(animal as keyof AnimalCollection)
        }
      })
      
      return missing
    }
  },

  actions: {
    // 更新玩家动物数量
    updatePlayerAnimals(playerId: string, animals: Partial<AnimalCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(animals).forEach(([animal, count]) => {
        if (animal in player.animals && typeof count === 'number') {
          (player.animals as any)[animal] = Math.max(0, count)
        }
      })
    },

    // 增加玩家动物数量
    addPlayerAnimals(playerId: string, animals: Partial<AnimalCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(animals).forEach(([animal, count]) => {
        if (animal in player.animals && typeof count === 'number') {
          (player.animals as any)[animal] += count
        }
      })
    },

    // 减少玩家动物数量
    removePlayerAnimals(playerId: string, animals: Partial<AnimalCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(animals).forEach(([animal, count]) => {
        if (animal in player.animals && typeof count === 'number') {
          (player.animals as any)[animal] = Math.max(0, (player.animals as any)[animal] - count)
        }
      })
    },

    // 更新玩家防护数量
    updatePlayerProtection(playerId: string, protection: Partial<ProtectionCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(protection).forEach(([item, count]) => {
        if (item in player.protection && typeof count === 'number') {
          (player.protection as any)[item] = Math.max(0, count)
        }
      })
    },

    // 增加玩家防护
    addPlayerProtection(playerId: string, protection: Partial<ProtectionCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(protection).forEach(([item, count]) => {
        if (item in player.protection && typeof count === 'number') {
          (player.protection as any)[item] += count
        }
      })
    },

    // 减少玩家防护
    removePlayerProtection(playerId: string, protection: Partial<ProtectionCollection>) {
      const player = this.getPlayer(playerId)
      Object.entries(protection).forEach(([item, count]) => {
        if (item in player.protection && typeof count === 'number') {
          (player.protection as any)[item] = Math.max(0, (player.protection as any)[item] - count)
        }
      })
    },

    // 设置玩家为获胜者
    setPlayerWinner(playerId: string) {
      const player = this.getPlayer(playerId)
      player.isWinner = true
    },

    // 重置所有玩家状态
    resetPlayers() {
      // 重置人类玩家
      this.human.animals = { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 }
      this.human.protection = { smallDog: 0, bigDog: 0 }
      this.human.isWinner = false
      
      // 重置AI玩家
      this.ai.animals = { rabbit: 1, sheep: 0, pig: 0, cow: 0, horse: 0 }
      this.ai.protection = { smallDog: 0, bigDog: 0 }
      this.ai.isWinner = false
    },

    // 设置玩家名称
    setPlayerName(playerId: string, name: string) {
      const player = this.getPlayer(playerId)
      player.name = name
    },

    // 获取玩家状态摘要
    getPlayerSummary(playerId: string) {
      const player = this.getPlayer(playerId)
      return {
        id: player.id,
        name: player.name,
        type: player.type,
        totalAnimals: this.getTotalAnimals(playerId),
        totalProtection: this.getTotalProtection(playerId),
        hasWinCondition: this.hasWinCondition(playerId),
        missingAnimals: this.getMissingAnimals(playerId),
        isWinner: player.isWinner
      }
    }
  }
}) 