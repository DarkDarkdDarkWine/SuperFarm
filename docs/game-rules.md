# 超级农场主 - 经典复刻版规则

> **版本**：2.1（基于1943年波兰原版桌游机制重构）
> **更新日期**：2026-01-08
> **设计目标**：还原硬核概率管理与高风险博弈体验

---

## 📖 目录
1. [游戏概述](#游戏概述)
2. [游戏目标](#游戏目标)
3. [游戏设置](#游戏设置)
4. [回合流程](#回合流程)
5. [核心机制详解](#核心机制详解)
6. [攻击与防御](#攻击与防御)
7. [胜利条件](#胜利条件)
8. [游戏模式](#游戏模式)
9. [策略建议](#策略建议)
10. [开发逻辑说明](#开发逻辑说明)

---

## 🎮 游戏概述

**超级农场主**（Super Farmer）是一款由波兰数学家 Karol Borsuk 于1943年设计的经典概率策略游戏。玩家通过掷骰子获取动物，利用繁殖和交换机制发展农场，同时面对狐狸和狼的威胁。

### 游戏特色
- 🎲 **概率管理**：基于数学概率的策略决策
- 🐰 **动物繁殖**：成对动物自动繁殖后代
- 🦊 **高风险博弈**：毁灭性的攻击机制
- 🐕 **防御投资**：用动物换取防护道具
- 🤖 **AI对手**：提供3种难度的AI挑战

---

## 🎯 游戏目标

**收集齐全部5种动物，每种至少1只：**

- 🐰 **兔子** (Rabbit) - 基础动物
- 🐑 **羊** (Sheep) - 初级动物
- 🐷 **猪** (Pig) - 中级动物
- 🐄 **奶牛** (Cow) - 高级动物
- 🐎 **马** (Horse) - 顶级动物（只能通过交换获得）

**注意**：原版游戏只要求每种动物各≥1只，无总数量要求。

---

## 🏗 游戏设置

### 玩家初始状态
每位玩家开局时拥有：
- **动物**：1只兔子
- **防护道具**：无

### 银行初始库存
```
兔子 (Rabbit):   60只
羊 (Sheep):      24只
猪 (Pig):        20只
奶牛 (Cow):      12只
马 (Horse):      6只
小狗 (SmallDog): 4只
大狗 (BigDog):   2只
```

### 骰子配置
**2个12面骰子**（骰子A和骰子B），每次掷一对：

**骰子A（橙色）**：
```
兔子 (Rabbit): 6面  (50%)
羊 (Sheep):    3面  (25%)
猪 (Pig):      1面  (8.3%)
奶牛 (Cow):    1面  (8.3%)
狐狸 (Fox):    1面  (8.3%)
```

**骰子B（蓝色）**：
```
兔子 (Rabbit): 6面  (50%)
羊 (Sheep):    3面  (25%)
猪 (Pig):      1面  (8.3%)
马 (Horse):    1面  (8.3%)
狼 (Wolf):     1面  (8.3%)
```

**重要说明**：
- **马**可以从骰子B掷出，也可以通过交换获得
- **狼**始终在骰子B中，任何模式下都可能触发

---

## 🔄 回合流程（核心重构）

这是与v2.0版本最大的区别：**交换必须发生在掷骰子之前**！

### 阶段1：交换阶段
**玩家在掷骰子前可以与银行交换动物**

- 可以进行多次交换（无次数限制）
- 必须确保银行有足够的库存
- 消耗的低级动物归还银行
- 获得的高级动物从银行取出
- **策略意义**：你必须预判自己需要什么，然后再冒险掷骰子

**交换比例**：

| 消耗 | 获得 | 比例 | 等价值 |
|------|------|------|--------|
| 6只兔子 | 1只羊 | 6:1 | 基准 |
| 2只羊 | 1只猪 | 2:1 | 12兔 = 1猪 |
| 3只猪 | 1只牛 | 3:1 | 36兔 = 1牛 |
| 2只牛 | 1只马 | 2:1 | 72兔 = 1马 |
| **购买防护** |  |  |  |
| 1只羊 | 1只小狗 | 1:1 | 防御狐狸（大狗也能防） |
| 1只牛 | 1只大狗 | 1:1 | 防御狼和狐狸 |

**重要规则**：
- 交换是双向的：你可以用1只羊换回6只兔子（如果银行有库存）
- 所有交换必须完整进行，不允许部分交换
- 银行库存不足时，该交换无法进行

**示例**：
```
你的农场：12只兔子、0只羊
你的决策：
1. 用6只兔子换1只羊 → 6只兔子、1只羊
2. 再用6只兔子换1只羊 → 0只兔子、2只羊
3. 用2只羊换1只猪 → 0只兔子、0只羊、1只猪
4. 结束交换，准备掷骰子
```

### 阶段2：掷骰子
- 玩家同时掷出2个12面骰子
- 骰子结果立即显示
- 记录骰子显示的动物和攻击

### 阶段3：结算攻击

**攻击在繁殖之前执行！**

攻击类型详见 [攻击与防御](#攻击与防御) 章节。

### 阶段4：结算繁殖

**这是原版的核心机制！**

**前提条件（有种才能繁殖）**：
- 骰子必须掷出该动物（diceCount > 0）
- 玩家必须已持有该动物至少1只（currentCount > 0）
- 两个条件缺一不可，否则跳过该动物的繁殖

**繁殖公式**：
```
获得数量 = floor((现有数量 + 骰子数量) / 2)
最终数量 = 现有数量 + 获得数量
```

**重要说明**：
- 繁殖后的数量是**累加**的，不是替换
- 骰子没掷出的动物不会繁殖（即使你有很多）
- 获得数量受银行库存限制

**繁殖示例**：

| 现有数量 | 骰子掷出 | 获得数量 | 最终数量 | 说明 |
|---------|---------|---------|---------|------|
| 0只兔子 | 1只兔子 | 跳过 | **0只** | 有种才能繁殖 |
| 1只兔子 | 0只兔子 | 跳过 | **1只** | 骰子未掷出 |
| 1只兔子 | 1只兔子 | floor(2/2)=1 | **2只** ⬆️ |  |
| 3只兔子 | 1只兔子 | floor(4/2)=2 | **5只** ⬆️ |  |
| 5只兔子 | 1只兔子 | floor(6/2)=3 | **8只** ⬆️ |  |
| 2只羊 | 2只羊 | floor(4/2)=2 | **4只** ⬆️ |  |

**实战示例**：
```
回合开始：你有1只兔子

掷骰子得1只兔子：
→ 有种才能繁殖：currentCount=1 > 0 ✓
→ 获得数量：floor((1+1)/2) = 1
→ 最终：1 + 1 = 2只兔子 ✓

掷骰子得2只羊（你有0只羊）：
→ 有种才能繁殖：currentCount=0 → 跳过
→ 最终：0只羊（无法从无到有）
```

攻击类型详见 [攻击与防御](#攻击与防御) 章节。

### 阶段5：检查胜利

- 检查玩家是否同时拥有5种动物（每种≥1只）
- 若满足，该玩家获胜，游戏结束

### 阶段6：回合结束

- 回合计数器+1
- 切换到对手玩家
- 开始新回合

---

## 🔧 核心机制详解

### 1. 繁殖系统深度解析

#### 繁殖的数学原理

繁殖公式：

```
获得数量 = floor((现有数量 + 骰子数量) / 2)
最终数量 = 现有数量 + 获得数量
```

**前提条件（有种才能繁殖）**：
- 必须骰子掷出该动物（diceCount > 0）
- 必须已持有该动物至少1只（currentCount > 0）

**为什么是除以2？**
- 动物需要**成对繁殖**（公母配对）
- 向下取整意味着奇数合计会少得1只

**策略含义**：
```
✓ 必须先有该动物，才能通过骰子繁殖
✓ 骰子掷出的动物只有在你持有的情况下才能帮助繁殖
✓ 在掷骰子前确保持有想繁殖的动物
```

#### 繁殖最优策略表

| 当前数量 | 骰子掷出 | 获得数量 | 最终 | 备注 |
|---------|---------|---------|------|------|
| 0只 | 1只 | 跳过（有种才能繁殖） | 0只 | 无法繁殖 |
| 0只 | 2只 | 跳过（有种才能繁殖） | 0只 | 无法繁殖 |
| 1只 | 1只 | floor(2/2)=1 | 2只 | 繁殖1只 |
| 2只 | 1只 | floor(3/2)=1 | 3只 | 繁殖1只 |
| 3只 | 1只 | floor(4/2)=2 | 5只 | 繁殖2只 |
| 4只 | 2只 | floor(6/2)=3 | 7只 | 繁殖3只 |

### 2. 银行系统

#### 银行的战略意义

银行不仅是资源池，更是**竞争资源**：

**库存竞争**：
- 如果你大量持有某种动物，银行库存减少
- 对手交换时可能无法获得该动物
- 这形成了**资源封锁战术**

**示例**：
```
你的策略：疯狂积累猪（持有15只猪）
→ 银行猪库存：20 - 15 = 5只
→ 对手想用羊换猪时，银行只剩5只
→ 对手无法大量获取猪
→ 你控制了猪的供应链 ✓
```

#### 银行库存耗尽规则

**当银行某种动物耗尽时**：
1. **繁殖**：如果繁殖计算结果需要从银行取动物，但银行库存为0，繁殖失败
2. **交换**：无法进行需要该动物的交换
3. **战术**：对手被迫改变策略

**示例**：
```
银行状态：马剩余0只
你的操作：用2只牛换1只马
结果：交换失败 ❌

策略调整：
→ 等待对手交换动物，归还马到银行
→ 或改变路线，暂时放弃获取马
```

### 3. 交换的双向性

**原版规则允许反向交换**：

正向交换（升级）：
```
6兔 → 1羊
2羊 → 1猪
3猪 → 1牛
2牛 → 1马
```

反向交换（降级）：
```
1羊 → 6兔（如果银行有6只兔子）
1猪 → 2羊（如果银行有2只羊）
1牛 → 3猪（如果银行有3只猪）
1马 → 2牛（如果银行有2只牛）
```

**何时使用反向交换？**
- 你有1只羊（奇数），繁殖会消失
- 降级成6只兔子（偶数），更安全
- 或用于购买防护道具

---

## 🦊 攻击与防御

### 原版高风险攻击机制

#### 🦊 狐狸攻击

**触发条件**：骰子掷出狐狸

**效果**：
- **目标**：掷出狐狸的玩家自己（攻击自己）
- **惩罚（经典模式）**：失去**所有兔子**
- **惩罚（休闲模式）**：减少5只兔子（最少保留1只）

**防御**：
- 优先使用**小狗**：消耗1只小狗完全抵消攻击
- 没有小狗时使用**大狗**：消耗1只大狗完全抵消攻击
- 两种狗都没有时，兔子受到惩罚

**示例（经典模式）**：
```
你的状态：20只兔子、0只小狗、0只大狗
你掷出：1只狐狸
结果：你的兔子归零 → 0只兔子

---

你的状态：20只兔子、1只小狗
你掷出：1只狐狸
结果：消耗1只小狗 → 20只兔子、0只小狗（兔子不受影响）

---

你的状态：20只兔子、0只小狗、1只大狗
你掷出：1只狐狸
结果：消耗1只大狗 → 20只兔子、0只大狗（兔子不受影响）
```

#### 🐺 狼攻击

**触发条件**：骰子掷出狼

**效果**：
- **目标**：掷出狼的玩家自己（攻击自己）
- **惩罚**：失去**所有兔子、羊、猪、牛**（马保留）

**防御**：
- 如果拥有**大狗**，消耗1只大狗完全抵消攻击
- 没有大狗时，兔子、羊、猪、牛全部归还银行

**示例**：
```
你的状态：10兔、5羊、3猪、1牛、1马、0只大狗
你掷出：1只狼
结果：你变成 → 0兔、0羊、0猪、0牛、1马
（兔、羊、猪、牛全部失去）

---

你的状态：10兔、5羊、3猪、1牛、1马、1只大狗
你掷出：1只狼
结果：消耗1只大狗 → 10兔、5羊、3猪、1牛、1马、0只大狗
（其他动物不受影响）
```

### 多重攻击结算

**当掷出多个攻击时**：

```
示例：你掷出2只狐狸
对手状态：15只兔子、1只小狗

结算过程：
1. 第1只狐狸 → 消耗小狗，兔子保留15只
2. 第2只狐狸 → 没有小狗了，兔子清零
最终：对手剩0只兔子、0只小狗
```

### 防护道具管理

#### 小狗 (SmallDog)
- **购买代价**：1只羊
- **持有上限**：无限制（但银行只有4只）
- **效果**：优先抵御1次狐狸攻击后消失
- **购买时机**：羊数量充足时

#### 大狗 (BigDog)
- **购买代价**：1只牛
- **持有上限**：无限制（但银行只有2只）
- **效果**：抵御1次狼攻击后消失；没有小狗时也可抵御狐狸攻击
- **优先级**：狐狸攻击时优先消耗小狗，没有小狗时才消耗大狗
- **购买时机**：牛数量充足时，可同时应对狐狸和狼

---

## 🏆 胜利条件

### 经典胜利规则

**同时拥有以下5种动物，每种至少1只：**

```
✓ 兔子 ≥ 1只
✓ 羊 ≥ 1只
✓ 猪 ≥ 1只
✓ 牛 ≥ 1只
✓ 马 ≥ 1只
```

**注意**：
- 原版游戏**无总数量要求**
- 只要集齐5个种类即可获胜
- 数量可以是 1-1-1-1-1，也可以是 50-10-5-2-1

### 平局机制

当达到**50回合**仍无人获胜时：

**判定顺序**：
1. 比较**拥有的动物种类数**（5种 > 4种 > 3种...）
2. 若相同，比较**最高级动物数量**（马 > 牛 > 猪 > 羊 > 兔）
3. 若仍相同，比较**总动物数量**
4. 若完全相同，判定为**平局**

---

## 🎮 游戏模式

### 模式1：经典模式（推荐）

**特点**：还原原版桌游体验

**配置**：
```
骰子A：兔6、羊3、猪1、牛1、狐1
骰子B：兔6、羊3、猪1、马1、狼1
攻击：狐狸清空所有兔子；狼清空所有兔子、羊、猪、牛
初始：每人1只兔子
胜利：集齐5种动物
回合上限：50回合
```

**适合**：喜欢硬核策略的玩家

### 模式2：休闲模式

**特点**：降低攻击惩罚，适合新手

**配置**：
```
骰子A：兔6、羊3、猪1、牛1、狐1
骰子B：兔6、羊3、猪1、马1、狼1
攻击：狐狸减少5只兔子（最少保留1只）；狼清空所有兔子、羊、猪、牛
初始：每人2只兔子
胜利：集齐5种动物
回合上限：30回合
```

**攻击差异**：
```
经典模式：狐狸清空所有兔子 → 毁灭性
休闲模式：狐狸减少5只兔子 → 可恢复
```

---

## 💡 策略建议

### 核心策略原则

#### 1. 偶数原则

**始终保持偶数数量的动物**

```
危险状态：7只兔子（奇数）
→ 繁殖后可能变成3只
→ 再繁殖变成1只
→ 最终可能归零

安全状态：8只兔子（偶数）
→ 繁殖后变成4只
→ 再繁殖变成2只
→ 稳定维持
```

#### 2. 先交换后掷骰

**利用交换调整数量，避免繁殖损失**

```
你有13只兔子：
❌ 错误：直接掷骰子
   → floor(13/2) 或 floor(14/2) = 6或7只 → 损失严重

✓ 正确：先交换
   → 12只兔子换2只羊 → 剩1只兔子、2只羊
   → 掷骰子得2只兔子
   → 兔子：floor((1+2)/2) = 1只
   → 羊：floor((2+0)/2) = 1只
   → 保留多样性
```

#### 3. 防护投资时机

**经典模式**：
```
羊数量 < 2只：不买小狗（资源紧张）
羊数量 ≥ 2只：买1只小狗（防御狐狸）
有牛：考虑购买大狗（应对狼攻击，且可兼防狐狸）
```

**注意**：大狗在没有小狗时也能抵御狐狸攻击，是性价比更高的防护选择。

#### 4. 银行库存战术

**控制关键资源**：
```
策略：大量持有猪（10只以上）
效果：银行猪库存减少
结果：对手难以交换获得猪
优势：你垄断了中级动物 → 对手被卡在羊阶段
```

### 阶段性策略

#### 初期（回合1-10）

**目标**：快速积累兔子

```
行动清单：
✓ 不要急于交换，先积累到12只兔子
✓ 保持偶数数量
✓ 如果掷出猪/牛，非常幸运，保留它们
✓ 暂不购买小狗（资源紧张）
```

#### 中期（回合11-25）

**目标**：获得猪和牛

```
行动清单：
✓ 开始交换：兔→羊→猪
✓ 购买1只小狗防御
✓ 保持每种动物都是偶数
✓ 观察银行库存，规划路径
```

#### 后期（回合26-40）

**目标**：冲刺马，达成胜利

```
行动清单：
✓ 全力交换获得牛和马
✓ 确保每种动物至少1只
✓ 购买防护道具保护关键动物
✓ 计算对手距离胜利的步数，决定是否冒险
```

### 高级战术

#### 战术1：资源封锁

```
你拥有：18只猪
银行猪库存：20 - 18 = 2只
对手行动：想用羊换猪
结果：对手最多获得2只猪，无法继续升级到牛
```

#### 战术2：故意降级

```
你有：1只羊（奇数，繁殖会消失）
操作：将1只羊换成6只兔子
效果：6只兔子（偶数，安全繁殖）
结果：保持资源稳定性
```

#### 战术3：赌博式冲刺

```
场景：你有1牛、1马、0猪、0羊、0兔
对手：还差2种动物
决策：不购买防护，全力掷骰子
风险：如果被攻击可能全盘崩溃
收益：如果成功可能率先获胜
```

---

## 🧮 开发逻辑说明

### 繁殖算法实现

```typescript
/**
 * 繁殖算法
 * @param currentCount 玩家当前持有的该动物数量
 * @param diceCount 骰子掷出的该动物数量
 * @returns 获得的数量（gain），调用方需加到 currentCount 上
 * 注意：processBreeding 会额外检查 diceCount>0 且 currentCount>0（有种才能繁殖）
 */
function calculateBreeding(currentCount: number, diceCount: number): number {
  return Math.floor((currentCount + diceCount) / 2);
}

// 使用示例
const currentRabbits = 5;  // 玩家有5只兔子
const diceRabbits = 1;     // 骰子掷出1只兔子

const gain = calculateBreeding(currentRabbits, diceRabbits);
// 计算：floor((5+1)/2) = floor(6/2) = 3
// 获得3只，最终：5 + 3 = 8只

console.log(`繁殖前：${currentRabbits}只 + 骰子${diceRabbits}只`);
console.log(`获得：${gain}只`);
console.log(`繁殖后：${currentRabbits + gain}只`);
```

### 攻击处理逻辑

```typescript
/**
 * 狐狸攻击处理（经典模式）
 * @param player 被攻击的玩家
 * @returns 攻击结果描述
 */
function processFoxAttackClassic(player: Player): AttackResult {
  // 检查是否有小狗防护
  if (player.protection.smallDog > 0) {
    // 消耗1只小狗，兔子不受影响
    player.protection.smallDog -= 1;
    return {
      success: false,
      message: '小狗成功抵御了狐狸攻击！',
      rabbitsLost: 0
    };
  } else {
    // 没有防护，兔子清零
    const rabbitsLost = player.animals.rabbit;
    player.animals.rabbit = 0;

    // 被清空的兔子归还银行
    bank.rabbit += rabbitsLost;

    return {
      success: true,
      message: `狐狸攻击成功！失去了所有${rabbitsLost}只兔子`,
      rabbitsLost: rabbitsLost
    };
  }
}

/**
 * 狐狸攻击处理（休闲模式）
 * @param player 被攻击的玩家
 * @returns 攻击结果描述
 */
function processFoxAttackCasual(player: Player): AttackResult {
  if (player.protection.smallDog > 0) {
    player.protection.smallDog -= 1;
    return {
      success: false,
      message: '小狗成功抵御了狐狸攻击！',
      rabbitsLost: 0
    };
  } else {
    // 减少5只兔子，最少保留1只
    const rabbitsLost = Math.min(player.animals.rabbit - 1, 5);
    player.animals.rabbit = Math.max(1, player.animals.rabbit - 5);

    bank.rabbit += rabbitsLost;

    return {
      success: true,
      message: `狐狸攻击成功！失去了${rabbitsLost}只兔子`,
      rabbitsLost: rabbitsLost
    };
  }
}

/**
 * 狼攻击处理（困难模式）
 * @param player 被攻击的玩家
 * @returns 攻击结果描述
 */
function processWolfAttack(player: Player): AttackResult {
  if (player.protection.bigDog > 0) {
    player.protection.bigDog -= 1;
    return {
      success: false,
      message: '大狗成功抵御了狼攻击！',
      animalsLost: []
    };
  } else {
    // 失去所有羊、猪、牛（马和兔子保留）
    const sheepLost = player.animals.sheep;
    const pigLost = player.animals.pig;
    const cowLost = player.animals.cow;

    player.animals.sheep = 0;
    player.animals.pig = 0;
    player.animals.cow = 0;

    // 归还银行
    bank.sheep += sheepLost;
    bank.pig += pigLost;
    bank.cow += cowLost;

    return {
      success: true,
      message: `狼攻击成功！失去了${sheepLost}羊、${pigLost}猪、${cowLost}牛`,
      animalsLost: [
        { type: 'sheep', count: sheepLost },
        { type: 'pig', count: pigLost },
        { type: 'cow', count: cowLost }
      ]
    };
  }
}
```

### 交换验证逻辑

```typescript
/**
 * 验证交换是否合法
 * @param player 进行交换的玩家
 * @param exchange 交换动作
 * @param bank 银行状态
 * @returns 是否可以进行交换
 */
function validateExchange(
  player: Player,
  exchange: ExchangeAction,
  bank: Bank
): ValidationResult {
  const { from, to, fromCount, toCount } = exchange;

  // 检查玩家是否有足够的低级动物
  if (player.animals[from] < fromCount) {
    return {
      valid: false,
      reason: `你只有${player.animals[from]}只${from}，不足${fromCount}只`
    };
  }

  // 检查银行是否有足够的高级动物
  if (bank[to] < toCount) {
    return {
      valid: false,
      reason: `银行只剩${bank[to]}只${to}，无法交换`
    };
  }

  // 检查交换比例是否正确
  const validExchanges = {
    'rabbit-sheep': { fromCount: 6, toCount: 1 },
    'sheep-pig': { fromCount: 2, toCount: 1 },
    'pig-cow': { fromCount: 3, toCount: 1 },
    'cow-horse': { fromCount: 2, toCount: 1 },
    // 反向交换
    'sheep-rabbit': { fromCount: 1, toCount: 6 },
    'pig-sheep': { fromCount: 1, toCount: 2 },
    'cow-pig': { fromCount: 1, toCount: 3 },
    'horse-cow': { fromCount: 1, toCount: 2 }
  };

  const exchangeKey = `${from}-${to}`;
  const validRule = validExchanges[exchangeKey];

  if (!validRule) {
    return {
      valid: false,
      reason: `不存在${from}到${to}的交换规则`
    };
  }

  if (validRule.fromCount !== fromCount || validRule.toCount !== toCount) {
    return {
      valid: false,
      reason: `交换比例错误，应该是${validRule.fromCount}只${from}换${validRule.toCount}只${to}`
    };
  }

  return {
    valid: true,
    reason: '交换合法'
  };
}

/**
 * 执行交换
 * @param player 玩家
 * @param exchange 交换动作
 * @param bank 银行
 * @returns 是否成功
 */
function executeExchange(
  player: Player,
  exchange: ExchangeAction,
  bank: Bank
): boolean {
  const validation = validateExchange(player, exchange, bank);

  if (!validation.valid) {
    console.log(`交换失败：${validation.reason}`);
    return false;
  }

  const { from, to, fromCount, toCount } = exchange;

  // 扣除玩家的低级动物
  player.animals[from] -= fromCount;

  // 归还银行
  bank[from] += fromCount;

  // 从银行取出高级动物
  bank[to] -= toCount;

  // 给玩家高级动物
  player.animals[to] += toCount;

  console.log(`交换成功：${fromCount}只${from} → ${toCount}只${to}`);
  return true;
}
```

### 回合流程实现

```typescript
/**
 * 执行完整回合
 * @param player 当前玩家
 * @param opponent 对手玩家
 * @param bank 银行状态
 */
async function executeTurn(
  player: Player,
  opponent: Player,
  bank: Bank
): Promise<TurnResult> {

  console.log(`\n======= ${player.name}的回合 =======`);

  // 阶段1：交换阶段
  console.log('\n[阶段1：交换阶段]');
  const exchanges = await player.decideExchanges(bank);
  for (const exchange of exchanges) {
    executeExchange(player, exchange, bank);
  }

  // 阶段2：掷骰子
  console.log('\n[阶段2：掷骰子]');
  const diceResult = rollDice();
  console.log(`骰子结果：${diceResult[0]}, ${diceResult[1]}`);

  // 统计骰子动物和攻击
  const animalCounts = countAnimalsFromDice(diceResult);
  const attacks = countAttacksFromDice(diceResult);

  // 阶段3：结算繁殖
  console.log('\n[阶段3：结算繁殖]');
  for (const [animal, diceCount] of Object.entries(animalCounts)) {
    const currentCount = player.animals[animal];
    const newCount = calculateBreeding(currentCount, diceCount);

    const change = newCount - currentCount;
    console.log(`${animal}: ${currentCount}只 + 骰子${diceCount}只 → ${newCount}只 (${change >= 0 ? '+' : ''}${change})`);

    // 更新动物数量
    player.animals[animal] = newCount;

    // 更新银行库存
    if (change > 0) {
      bank[animal] -= change;  // 从银行取出
    } else if (change < 0) {
      bank[animal] += Math.abs(change);  // 归还银行
    }
  }

  // 阶段4：结算攻击
  console.log('\n[阶段4：结算攻击]');
  if (attacks.fox > 0) {
    for (let i = 0; i < attacks.fox; i++) {
      const result = processFoxAttack(opponent, gameMode);
      console.log(result.message);
    }
  }
  if (attacks.wolf > 0) {
    for (let i = 0; i < attacks.wolf; i++) {
      const result = processWolfAttack(opponent);
      console.log(result.message);
    }
  }

  // 阶段5：检查胜利
  console.log('\n[阶段5：检查胜利]');
  const hasWon = checkWinCondition(player);
  if (hasWon) {
    console.log(`🎉 ${player.name} 获胜！`);
    return {
      winner: player,
      gameOver: true
    };
  }

  // 阶段6：回合结束
  console.log('\n回合结束');
  displayGameState(player, opponent, bank);

  return {
    winner: null,
    gameOver: false
  };
}
```

### 胜利条件检查

```typescript
/**
 * 检查胜利条件
 * @param player 玩家
 * @returns 是否获胜
 */
function checkWinCondition(player: Player): boolean {
  // 检查是否拥有所有5种动物（每种至少1只）
  const hasRabbit = player.animals.rabbit >= 1;
  const hasSheep = player.animals.sheep >= 1;
  const hasPig = player.animals.pig >= 1;
  const hasCow = player.animals.cow >= 1;
  const hasHorse = player.animals.horse >= 1;

  return hasRabbit && hasSheep && hasPig && hasCow && hasHorse;
}

/**
 * 平局判定
 * @param player1 玩家1
 * @param player2 玩家2
 * @returns 获胜玩家或null（平局）
 */
function resolveTie(player1: Player, player2: Player): Player | null {
  // 1. 比较动物种类数
  const types1 = countAnimalTypes(player1);
  const types2 = countAnimalTypes(player2);

  if (types1 > types2) return player1;
  if (types2 > types1) return player2;

  // 2. 比较最高级动物数量
  const animalPriority = ['horse', 'cow', 'pig', 'sheep', 'rabbit'];

  for (const animal of animalPriority) {
    if (player1.animals[animal] > player2.animals[animal]) return player1;
    if (player2.animals[animal] > player1.animals[animal]) return player2;
  }

  // 3. 比较总动物数量
  const total1 = countTotalAnimals(player1);
  const total2 = countTotalAnimals(player2);

  if (total1 > total2) return player1;
  if (total2 > total1) return player2;

  // 完全相同，平局
  return null;
}
```

---

## ❓ 常见问题

### Q1：为什么繁殖后动物数量会减少？
**A**：这是原版的核心机制。繁殖公式 `floor((现有+骰子)/2)` 意味着奇数动物会损失。例如3只兔子繁殖后变成1只（3÷2=1.5，向下取整为1）。

### Q2：我可以在掷骰子后再交换吗？
**A**：不可以。原版规则要求**先交换再掷骰子**，这增加了策略的不确定性。

### Q3：银行动物用完了怎么办？
**A**：无法进行需要该动物的交换和繁殖。这是游戏的资源竞争机制。

### Q4：我能把羊换回兔子吗？
**A**：可以。如果银行有6只兔子，你可以用1只羊换回6只兔子（反向交换）。

### Q5：狐狸攻击自己还是对手？
**A**：攻击**自己**。你掷出狐狸时，你自己的兔子受到惩罚（经典模式清空，休闲模式减少5只）。小狗或大狗可以抵御攻击。

### Q6：防护道具可以重复使用吗？
**A**：不可以。小狗/大狗抵御1次攻击后立即消失。

### Q7：为什么要保持偶数数量的动物？
**A**：因为奇数动物在繁殖时会损失。7只兔子繁殖后可能变成3只，而8只兔子繁殖后稳定变成4只。

### Q8：马为什么不在骰子上？
**A**：马是最高级动物，设计上只能通过交换获得，增加游戏难度。

---

## 📝 规则修订历史

### 版本 2.1（2026-01-08）- 经典复刻版
- 🔄 **还原原版回合顺序**：交换必须在掷骰子之前
- 🔄 **修正繁殖算法**：使用 `floor((现有+骰子)/2)` 公式
- 🔄 **还原高风险攻击**：狐狸清空所有兔子，狼清空羊猪牛
- 🔄 **支持反向交换**：允许高级动物降级为低级动物
- 🔄 **新增游戏模式**：经典/休闲两种模式
- 🔄 **银行系统完善**：所有动物流转都经过银行
- 🔄 **防护购买调整**：1兔换1小狗，1羊换1大狗
- 🔄 **初始状态调整**：每人初始1只兔子

### 版本 2.0（2026-01-08）
- 重构游戏规则，但未遵循原版机制

### 版本 1.0（2025-06-17）
- 初始版本

---

## 📄 附录

### 骰子概率详细分析

#### 单骰子概率

**骰子A（橙色）**：

| 结果 | 面数 | 单骰概率 |
|-----|------|---------|
| 兔子 | 6/12 | 50.0% |
| 羊 | 3/12 | 25.0% |
| 猪 | 1/12 | 8.3% |
| 牛 | 1/12 | 8.3% |
| 狐狸 | 1/12 | 8.3% |

**骰子B（蓝色）**：

| 结果 | 面数 | 单骰概率 |
|-----|------|---------|
| 兔子 | 6/12 | 50.0% |
| 羊 | 3/12 | 25.0% |
| 猪 | 1/12 | 8.3% |
| 马 | 1/12 | 8.3% |
| 狼 | 1/12 | 8.3% |

#### 预期回合数分析

**获得第一只羊的预期回合数**：
```
方法1：直接掷出羊
- 单回合概率：30.6%
- 预期回合数：~3.3回合

方法2：积累6只兔子交换
- 预期回合数：~4-6回合（考虑繁殖）

结论：直接掷羊更快，但交换更稳定
```

### 最优策略路径

**从0到胜利的理论最快路径**：

```
假设运气极佳：

回合1：掷出2兔 → 繁殖 → 1兔
回合2：掷出2兔 → 繁殖 → 1兔
回合3：掷出2兔 → 繁殖 → 1兔
回合4：掷出2兔 → 繁殖 → 1兔
回合5：掷出2兔 → 繁殖 → 1兔
回合6：掷出2兔 → 繁殖 → 1兔
（积累到6兔，交换1羊）

回合7：掷出2羊 → 繁殖 → 1羊 + 1羊（交换的） = 2羊
（交换1猪）

...以此类推

理论最快：约15-20回合获胜
实际情况：30-40回合（考虑攻击和运气波动）
```

---

## 🎓 设计哲学

### 为什么原版规则如此硬核？

1. **概率论教学**：游戏设计者是数学家，游戏本身是概率论的实践教学工具
2. **风险管理**：奇数惩罚机制教导玩家管理资源
3. **先规划后行动**：先交换再掷骰子，培养预判能力
4. **高风险高回报**：攻击机制鼓励大胆策略

### 为什么需要休闲模式？

原版规则对新手过于严苛，休闲模式提供：
- 降低攻击惩罚（减5只而非清零）
- 更多初始资源（2只兔子而非1只）
- 更快的游戏节奏（30回合而非50回合）

**建议**：
- 新手从休闲模式开始
- 熟悉机制后切换到经典模式

---

**祝游戏愉快！🎉**

*这是一款经典的概率策略游戏，享受博弈的乐趣！*
