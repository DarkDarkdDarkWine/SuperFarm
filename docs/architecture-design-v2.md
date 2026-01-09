# 超级农场主 - 架构设计文档 v2.0

> **版本**：2.0
> **更新日期**：2026-01-08
> **设计目标**：支持2-4人Web游戏，DeepSeek AI驱动，严格AI隔离

---

## 📖 目录

1. [需求分析](#需求分析)
2. [整体架构](#整体架构)
3. [技术栈选择](#技术栈选择)
4. [核心模块设计](#核心模块设计)
5. [AI隔离机制](#ai隔离机制)
6. [数据流设计](#数据流设计)
7. [API接口设计](#api接口设计)
8. [安全性设计](#安全性设计)
9. [部署方案](#部署方案)

---

## 🎯 需求分析

### 功能需求

1. **多人游戏**
   - 支持2-4名玩家同时游戏
   - 至少1名人类玩家
   - 支持1-3名AI玩家

2. **游戏模式**
   - 经典模式（硬核原版）
   - 休闲模式（新手友好）
   - 困难模式（启用狼攻击）

3. **AI对战**
   - 使用DeepSeek API驱动AI决策
   - 支持3种AI难度（简单/中等/困难）
   - AI之间严格信息隔离

4. **实时体验**
   - WebSocket实时通信
   - 动画效果流畅
   - 即时反馈

### 非功能需求

1. **性能**
   - 游戏响应时间 < 100ms
   - AI决策时间 < 3s
   - 支持10+并发游戏房间

2. **可靠性**
   - 游戏状态持久化
   - 断线重连机制
   - 错误恢复

3. **安全性**
   - AI决策隔离
   - 防止客户端篡改
   - API密钥保护

---

## 🏗 整体架构

### 架构模式

采用 **Client-Server + Event-Driven** 架构：

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 玩家1 UI │  │ 玩家2 UI │  │ 玩家3 UI │  │ 玩家4 UI │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │ WebSocket
        ┌─────────────┴─────────────────────────────┐
        │          API Gateway / Load Balancer       │
        └─────────────┬─────────────────────────────┘
                      │
        ┌─────────────┴─────────────────────────────┐
        │              游戏服务器                     │
        │  ┌────────────────────────────────────┐   │
        │  │      房间管理器 (Room Manager)      │   │
        │  │  - 创建/加入/退出房间               │   │
        │  │  - 玩家匹配                         │   │
        │  │  - 房间状态管理                     │   │
        │  └────────────┬───────────────────────┘   │
        │               │                            │
        │  ┌────────────┴───────────────────────┐   │
        │  │      游戏引擎 (Game Engine)         │   │
        │  │  ┌──────────────────────────────┐  │   │
        │  │  │  回合控制器 (Turn Controller)│  │   │
        │  │  │  - 回合流程管理               │  │   │
        │  │  │  - 交换阶段                   │  │   │
        │  │  │  - 掷骰子阶段                 │  │   │
        │  │  │  - 繁殖/攻击阶段              │  │   │
        │  │  └──────────────────────────────┘  │   │
        │  │  ┌──────────────────────────────┐  │   │
        │  │  │  状态管理器 (State Manager)  │  │   │
        │  │  │  - 游戏状态                   │  │   │
        │  │  │  - 玩家状态                   │  │   │
        │  │  │  - 银行状态                   │  │   │
        │  │  └──────────────────────────────┘  │   │
        │  │  ┌──────────────────────────────┐  │   │
        │  │  │  规则验证器 (Rule Validator) │  │   │
        │  │  │  - 操作合法性验证             │  │   │
        │  │  │  - 胜利条件检查               │  │   │
        │  │  └──────────────────────────────┘  │   │
        │  └────────────┬───────────────────────┘   │
        │               │                            │
        │  ┌────────────┴───────────────────────┐   │
        │  │      AI服务 (AI Service)            │   │
        │  │  ┌──────────┐  ┌──────────┐        │   │
        │  │  │ AI代理1  │  │ AI代理2  │ ...    │   │
        │  │  │ (隔离)   │  │ (隔离)   │        │   │
        │  │  └────┬─────┘  └────┬─────┘        │   │
        │  │       │              │              │   │
        │  │       └──────┬───────┘              │   │
        │  │              │                      │   │
        │  │     ┌────────┴────────┐            │   │
        │  │     │ DeepSeek API     │            │   │
        │  │     │ - 决策推理       │            │   │
        │  │     │ - 策略生成       │            │   │
        │  │     └──────────────────┘            │   │
        │  └────────────────────────────────────┘   │
        └───────────────┬───────────────────────────┘
                        │
        ┌───────────────┴───────────────────────────┐
        │              存储层                        │
        │  ┌──────────┐  ┌────────────┐            │
        │  │  Redis   │  │  MongoDB   │             │
        │  │(房间状态)│  │(游戏历史)  │             │
        │  └──────────┘  └────────────┘            │
        └───────────────────────────────────────────┘
```

### 设计原则

1. **单一职责**：每个模块负责单一功能
2. **开闭原则**：易于扩展新功能（如新AI难度、新游戏模式）
3. **依赖倒置**：核心逻辑不依赖具体实现
4. **事件驱动**：通过事件解耦模块

---

## 🛠 技术栈选择

### 前端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| **React** | 18.x | UI框架 | 成熟生态、组件化、TypeScript支持好 |
| **TypeScript** | 5.x | 类型系统 | 类型安全、减少运行时错误 |
| **Vite** | 5.x | 构建工具 | 快速HMR、原生ESM |
| **Zustand** | 4.x | 状态管理 | 轻量级、简单易用、无样板代码 |
| **Socket.io-client** | 4.x | WebSocket | 自动重连、房间支持、跨浏览器 |
| **TailwindCSS** | 3.x | CSS框架 | 快速开发、可定制、小体积 |
| **Framer Motion** | 11.x | 动画库 | 流畅动画、手势支持 |
| **React Query** | 5.x | 数据获取 | 缓存、自动重试、乐观更新 |

**推荐UI组件库**（二选一）：
- **shadcn/ui**：基于Radix UI，可定制性高
- **Ant Design**：开箱即用，组件丰富

### 后端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| **Node.js** | 20.x LTS | 运行时 | 与前端统一语言、异步IO |
| **TypeScript** | 5.x | 类型系统 | 全栈类型共享 |
| **Express** | 4.x | Web框架 | 简单、中间件丰富 |
| **Socket.io** | 4.x | WebSocket | 双向通信、房间管理 |
| **DeepSeek SDK** | 最新 | AI集成 | 官方SDK，稳定可靠 |
| **Zod** | 3.x | 数据验证 | TypeScript优先、类型推断 |
| **Winston** | 3.x | 日志 | 多传输、格式化 |

### 存储技术栈（可选）

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| **Redis** | 7.x | 缓存/会话 | 快速、支持数据结构 |
| **MongoDB** | 7.x | 文档数据库 | 灵活Schema、JSON友好 |

### 开发工具

- **pnpm**：包管理器（快速、节省空间）
- **ESLint + Prettier**：代码规范
- **Vitest**：单元测试
- **Playwright**：E2E测试
- **Docker**：容器化部署

---

## 🧩 核心模块设计

### 1. 房间管理器 (Room Manager)

**职责**：
- 创建游戏房间
- 玩家加入/退出房间
- 房间状态管理
- 玩家匹配

**核心数据结构**：

```typescript
interface Room {
  id: string;
  name: string;
  mode: 'classic' | 'casual' | 'hard';
  maxPlayers: 2 | 3 | 4;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  gameState?: GameState;
}

interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  difficulty?: 'easy' | 'medium' | 'hard'; // AI玩家
  socketId?: string; // 人类玩家
  isReady: boolean;
  isConnected: boolean;
}
```

**主要方法**：

```typescript
class RoomManager {
  // 创建房间
  createRoom(config: RoomConfig): Room;

  // 加入房间
  joinRoom(roomId: string, player: Player): boolean;

  // 退出房间
  leaveRoom(roomId: string, playerId: string): void;

  // 添加AI玩家
  addAIPlayer(roomId: string, difficulty: AIDifficulty): void;

  // 开始游戏
  startGame(roomId: string): void;

  // 获取房间列表
  getRooms(filter?: RoomFilter): Room[];
}
```

### 2. 游戏引擎 (Game Engine)

**职责**：
- 执行游戏规则
- 管理游戏状态
- 处理玩家操作
- 触发事件

**核心数据结构**：

```typescript
interface GameState {
  roomId: string;
  mode: GameMode;
  currentRound: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  players: PlayerState[];
  bank: Bank;
  diceResult: DiceResult[];
  history: GameAction[];
  winner?: string;
}

type GamePhase =
  | 'exchange'      // 交换阶段
  | 'rolling'       // 掷骰子
  | 'breeding'      // 繁殖计算
  | 'attacking'     // 攻击结算
  | 'victory_check' // 检查胜利
  | 'finished';     // 游戏结束

interface PlayerState {
  id: string;
  name: string;
  animals: AnimalCollection;
  protection: ProtectionCollection;
  isWinner: boolean;
}

interface Bank {
  rabbit: number;
  sheep: number;
  pig: number;
  cow: number;
  horse: number;
  smallDog: number;
  bigDog: number;
}
```

**主要方法**：

```typescript
class GameEngine {
  // 初始化游戏
  initGame(room: Room): GameState;

  // 执行玩家操作
  executeAction(gameState: GameState, action: PlayerAction): GameState;

  // 验证操作合法性
  validateAction(gameState: GameState, action: PlayerAction): ValidationResult;

  // 掷骰子
  rollDice(gameState: GameState): DiceResult[];

  // 计算繁殖
  calculateBreeding(current: number, dice: number): number;

  // 处理攻击
  processAttack(gameState: GameState, attackType: 'fox' | 'wolf'): void;

  // 检查胜利
  checkVictory(gameState: GameState): string | null;

  // 切换到下一个玩家
  nextTurn(gameState: GameState): void;
}
```

### 3. AI服务 (AI Service)

**职责**：
- 调用DeepSeek API
- 生成AI决策
- 管理AI上下文
- 实现信息隔离

**核心接口**：

```typescript
interface AIDecisionRequest {
  playerId: string;
  gameView: FilteredGameState; // 过滤后的游戏视图
  availableActions: PlayerAction[];
  mode: GameMode;
  difficulty: AIDifficulty;
}

interface AIDecisionResponse {
  playerId: string;
  actions: PlayerAction[];
  reasoning: string;
  confidence: number;
  thinkingTime: number;
}
```

**主要方法**：

```typescript
class AIService {
  // 获取AI决策
  async getDecision(request: AIDecisionRequest): Promise<AIDecisionResponse>;

  // 过滤游戏状态（关键：信息隔离）
  filterGameState(gameState: GameState, playerId: string): FilteredGameState;

  // 构建AI提示词
  buildPrompt(request: AIDecisionRequest): string;

  // 解析AI响应
  parseAIResponse(response: string): PlayerAction[];
}
```

---

## 🔒 AI隔离机制

### 隔离原则

**核心思想**：每个AI玩家只能看到"合法可见"的游戏信息，模拟真实玩家的视角。

### 信息分类

| 信息类型 | 可见性 | 示例 |
|---------|--------|------|
| **公开信息** | ✅ 所有玩家可见 | 当前回合、银行库存、对手动物数量 |
| **私有信息** | ⚠️ 仅自己可见 | 自己的动物、自己的防护道具 |
| **隐藏信息** | ❌ 任何人不可见 | 其他AI的思考过程、未来骰子结果 |

### 实现方式

#### 1. 游戏视图过滤

```typescript
/**
 * 为AI玩家生成过滤后的游戏视图
 */
function filterGameStateForAI(
  gameState: GameState,
  aiPlayerId: string
): FilteredGameState {

  const aiPlayer = gameState.players.find(p => p.id === aiPlayerId)!;

  return {
    // ===== 公开信息 =====
    roomId: gameState.roomId,
    mode: gameState.mode,
    currentRound: gameState.currentRound,
    currentPlayerIndex: gameState.currentPlayerIndex,
    phase: gameState.phase,

    // 银行库存（完全公开）
    bank: { ...gameState.bank },

    // ===== 自己的私有信息 =====
    myPlayer: {
      id: aiPlayer.id,
      name: aiPlayer.name,
      animals: { ...aiPlayer.animals },
      protection: { ...aiPlayer.protection }
    },

    // ===== 对手的公开信息 =====
    opponents: gameState.players
      .filter(p => p.id !== aiPlayerId)
      .map(p => ({
        id: p.id,
        name: p.name,
        animals: { ...p.animals },      // 可见：动物数量
        protection: { ...p.protection }  // 可见：防护道具数量
        // 不可见：对手的策略、思考过程
      })),

    // ===== 历史操作（只包含公开动作）=====
    history: gameState.history
      .filter(action => isPublicAction(action))
      .map(action => sanitizeAction(action)),

    // ===== 绝不包括 =====
    // ❌ 其他AI的决策推理
    // ❌ 其他AI的置信度评分
    // ❌ 未来的骰子结果
    // ❌ 其他玩家的内部状态
  };
}
```

#### 2. 独立API调用

每个AI玩家使用**独立的API会话**：

```typescript
class AIAgent {
  private playerId: string;
  private difficulty: AIDifficulty;
  private apiClient: DeepSeekClient;

  constructor(playerId: string, difficulty: AIDifficulty) {
    this.playerId = playerId;
    this.difficulty = difficulty;

    // 每个AI使用独立的API客户端实例
    this.apiClient = new DeepSeekClient({
      apiKey: process.env.DEEPSEEK_API_KEY,
      // 关键：不共享conversation_id
      conversationId: `game_${playerId}_${Date.now()}`
    });
  }

  async makeDecision(gameView: FilteredGameState): Promise<AIDecisionResponse> {
    // 每次调用都是独立的，不依赖历史对话
    const prompt = this.buildPrompt(gameView);

    const response = await this.apiClient.chat({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.getTemperature(),
      max_tokens: 1000
    });

    return this.parseResponse(response);
  }

  // 根据难度调整温度参数
  private getTemperature(): number {
    switch (this.difficulty) {
      case 'easy': return 0.9;    // 高随机性
      case 'medium': return 0.5;  // 平衡
      case 'hard': return 0.2;    // 低随机性，更确定
    }
  }
}
```

#### 3. 提示词设计（关键）

**简单AI（稳重老王）**：
```typescript
const EASY_AI_SYSTEM_PROMPT = `
你是"稳重老王"，一个保守稳健的农场主。

你的性格特点：
- 风险厌恶，优先防御
- 喜欢积累资源，不轻易交换
- 遇到威胁时优先购买防护道具
- 决策谨慎，避免冒险

策略要点：
1. 优先保持偶数数量的动物（避免繁殖损失）
2. 兔子数量>10时考虑购买小狗
3. 不要过早交换高级动物
4. 看到对手领先时，才加快节奏

你只能看到自己的动物和对手的公开信息，不知道对手的策略。

请根据当前游戏状态，给出你的决策。
`;
```

**困难AI（天才李四）**：
```typescript
const HARD_AI_SYSTEM_PROMPT = `
你是"天才李四"，一个激进冒险的农场主。

你的性格特点：
- 追求效率最大化
- 敢于冒险，主动进攻
- 快速升级动物，直奔目标
- 计算精准，把握时机

策略要点：
1. 快速积累兔子，立即交换高级动物
2. 奇数动物也不怕，因为可能掷出正好的骰子
3. 不购买防护道具（除非必要），全力发展经济
4. 观察对手进度，抢先一步获胜

高级技巧：
- 使用"资源封锁"战术（大量持有某种动物卡住对手）
- 计算对手距离胜利的步数
- 在关键回合全力冲刺

你只能看到自己的动物和对手的公开信息，不知道对手的策略。

请根据当前游戏状态，给出你的决策。
`;
```

#### 4. 响应解析与验证

```typescript
/**
 * 解析AI响应并验证合法性
 */
function parseAIResponse(
  response: string,
  gameState: GameState,
  playerId: string
): PlayerAction[] {

  // 尝试解析JSON
  let actions: PlayerAction[];
  try {
    const parsed = JSON.parse(response);
    actions = parsed.actions || [];
  } catch {
    // 如果不是JSON，使用LLM提取结构化数据
    actions = extractActionsFromText(response);
  }

  // 验证每个动作的合法性
  const validActions: PlayerAction[] = [];

  for (const action of actions) {
    const validation = validateAction(gameState, playerId, action);

    if (validation.valid) {
      validActions.push(action);
    } else {
      console.warn(`AI动作被拒绝: ${validation.reason}`);
      // 记录到日志，但不告诉其他AI
    }
  }

  return validActions;
}
```

### 隔离验证清单

在开发时，确保以下隔离措施：

- [ ] ✅ 每个AI使用独立的DeepSeek API会话
- [ ] ✅ 游戏状态传递前必须过滤
- [ ] ✅ 不在prompt中包含其他AI的思考过程
- [ ] ✅ 不共享AI的决策历史
- [ ] ✅ 每个AI的温度参数独立设置
- [ ] ✅ 响应解析失败时有兜底策略
- [ ] ✅ 日志中不泄露AI的内部推理给其他AI

---

## 🔄 数据流设计

### 游戏流程时序图

```
人类玩家           服务器              AI服务           DeepSeek API
    │                │                  │                    │
    │──创建房间───────>│                  │                    │
    │<─返回房间信息────│                  │                    │
    │                │                  │                    │
    │──添加AI玩家─────>│                  │                    │
    │                │──初始化AI代理────>│                    │
    │<─房间状态更新────│<─────────────────│                    │
    │                │                  │                    │
    │──开始游戏────────>│                  │                    │
    │                │──初始化游戏状态──>│                    │
    │<─游戏开始事件────│                  │                    │
    │                │                  │                    │
    ├─── 交换阶段 ───┤                  │                    │
    │──交换动物────────>│                  │                    │
    │                │──验证操作────────>│                    │
    │                │<─验证通过─────────│                    │
    │                │──更新状态────────>│                    │
    │<─状态更新────────│                  │                    │
    │                │                  │                    │
    │                │──AI回合开始──────>│                    │
    │                │                  │──获取决策────────>│
    │                │                  │  (过滤后的游戏视图)│
    │                │                  │<──返回决策─────────│
    │                │<─AI动作───────────│                    │
    │<─AI操作通知─────│                  │                    │
    │                │                  │                    │
    ├─── 掷骰子阶段 ─┤                  │                    │
    │──掷骰子──────────>│                  │                    │
    │                │──生成随机结果────>│                    │
    │<─骰子结果────────│                  │                    │
    │                │                  │                    │
    ├─── 繁殖阶段 ───┤                  │                    │
    │                │──计算繁殖────────>│                    │
    │<─繁殖结果────────│                  │                    │
    │                │                  │                    │
    ├─── 攻击阶段 ───┤                  │                    │
    │<─攻击事件────────│──处理攻击────────>│                    │
    │                │<─攻击结果─────────│                    │
    │                │                  │                    │
    ├── 检查胜利 ────┤                  │                    │
    │                │──检查胜利条件────>│                    │
    │<─游戏结束────────│<─有玩家获胜──────│                    │
    │                │                  │                    │
```

### WebSocket事件设计

**客户端 → 服务器事件**：

```typescript
// 房间管理
'room:create'        // 创建房间
'room:join'          // 加入房间
'room:leave'         // 离开房间
'room:add_ai'        // 添加AI玩家
'room:start'         // 开始游戏

// 游戏操作
'game:exchange'      // 交换动物
'game:buy_protection'// 购买防护
'game:roll_dice'     // 掷骰子
'game:end_turn'      // 结束回合

// 聊天
'chat:message'       // 发送消息
```

**服务器 → 客户端事件**：

```typescript
// 房间事件
'room:created'       // 房间已创建
'room:joined'        // 玩家加入
'room:left'          // 玩家离开
'room:updated'       // 房间状态更新
'game:started'       // 游戏开始

// 游戏状态
'game:state'         // 游戏状态同步
'game:phase_change'  // 阶段切换
'game:turn_change'   // 回合切换

// 游戏动作
'game:dice_rolled'   // 骰子结果
'game:breeding'      // 繁殖结果
'game:attack'        // 攻击发生
'game:exchange_done' // 交换完成

// 游戏结束
'game:victory'       // 有玩家获胜
'game:finished'      // 游戏结束

// AI事件
'ai:thinking'        // AI正在思考
'ai:decision'        // AI做出决策

// 错误
'error'              // 错误信息
```

---

## 📡 API接口设计

### RESTful API

**基础路径**：`/api/v1`

#### 1. 房间管理

```typescript
// 获取房间列表
GET /rooms
Query: { status?: 'waiting' | 'playing', mode?: GameMode }
Response: { rooms: Room[] }

// 创建房间
POST /rooms
Body: {
  name: string,
  mode: GameMode,
  maxPlayers: number
}
Response: { room: Room }

// 获取房间详情
GET /rooms/:roomId
Response: { room: Room }

// 删除房间
DELETE /rooms/:roomId
Response: { success: boolean }
```

#### 2. 游戏历史

```typescript
// 获取游戏历史
GET /games
Query: {
  playerId?: string,
  limit?: number,
  offset?: number
}
Response: {
  games: Game[],
  total: number
}

// 获取游戏详情
GET /games/:gameId
Response: { game: Game }

// 获取游戏回放数据
GET /games/:gameId/replay
Response: {
  initialState: GameState,
  actions: GameAction[]
}
```

#### 3. 玩家统计

```typescript
// 获取玩家统计
GET /players/:playerId/stats
Response: {
  totalGames: number,
  wins: number,
  winRate: number,
  averageRounds: number,
  favoriteMode: GameMode
}
```

### WebSocket协议

**连接**：`ws://server:port` 或 `wss://server:port`

**认证**（可选）：
```typescript
socket.emit('auth', {
  token: 'jwt_token'
});
```

**加入房间**：
```typescript
socket.emit('room:join', {
  roomId: 'room_123',
  playerName: 'Player1'
});
```

---

## 🔐 安全性设计

### 1. API密钥保护

```typescript
// ❌ 错误：密钥暴露在客户端
const apiKey = 'sk-xxxxx'; // 永远不要这样做

// ✅ 正确：密钥只在服务器端
// .env 文件
DEEPSEEK_API_KEY=sk-xxxxx

// 服务器端
const apiKey = process.env.DEEPSEEK_API_KEY;
```

### 2. 操作验证

```typescript
// 服务器端必须验证所有操作
function handlePlayerAction(
  socket: Socket,
  action: PlayerAction
) {
  // 1. 验证玩家身份
  const playerId = socket.data.playerId;
  if (!playerId) {
    socket.emit('error', { message: '未授权' });
    return;
  }

  // 2. 验证是否该玩家回合
  const gameState = getGameState(socket.data.roomId);
  if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
    socket.emit('error', { message: '不是你的回合' });
    return;
  }

  // 3. 验证操作合法性
  const validation = validateAction(gameState, action);
  if (!validation.valid) {
    socket.emit('error', { message: validation.reason });
    return;
  }

  // 4. 执行操作
  executeAction(gameState, action);
}
```

### 3. 速率限制

```typescript
import rateLimit from 'express-rate-limit';

// API速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', apiLimiter);

// AI调用速率限制（防止滥用）
const aiCallLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次AI调用
  message: 'AI调用次数超限'
});
```

### 4. 输入验证

```typescript
import { z } from 'zod';

// 使用Zod验证所有输入
const ExchangeActionSchema = z.object({
  type: z.literal('exchange'),
  from: z.enum(['rabbit', 'sheep', 'pig', 'cow', 'horse']),
  to: z.enum(['rabbit', 'sheep', 'pig', 'cow', 'horse']),
  fromCount: z.number().int().positive(),
  toCount: z.number().int().positive()
});

function validateExchangeAction(data: unknown) {
  try {
    return ExchangeActionSchema.parse(data);
  } catch (error) {
    throw new Error('Invalid exchange action');
  }
}
```

---

## 🚀 部署方案

### 开发环境

```bash
# 项目结构
SuperFarm/
├── frontend/           # React前端
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/            # Node.js后端
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/             # 共享类型定义
│   └── types/
├── docker-compose.yml  # Docker编排
└── README.md

# 启动开发环境
docker-compose up -d
```

### Docker配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端开发服务器
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3001

  # 后端服务器
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 生产部署

**推荐方案**：

1. **Vercel/Netlify**（前端）
   - 自动CI/CD
   - 全球CDN加速
   - 免费HTTPS

2. **Railway/Render**（后端）
   - 容器化部署
   - 自动扩展
   - WebSocket支持

3. **Upstash Redis**（缓存）
   - 无服务器Redis
   - 按需付费

**环境变量**：
```bash
# .env.production
NODE_ENV=production
PORT=3001
DEEPSEEK_API_KEY=sk-xxxxx
REDIS_URL=redis://...
FRONTEND_URL=https://yourapp.com
CORS_ORIGIN=https://yourapp.com
```

---

## 📊 性能优化

### 1. 前端优化

```typescript
// 代码分割
const GameBoard = lazy(() => import('./components/GameBoard'));

// 虚拟滚动（房间列表）
import { useVirtualizer } from '@tanstack/react-virtual';

// 防抖AI思考动画
const debouncedAIThinking = useMemo(
  () => debounce(showAIThinking, 300),
  []
);
```

### 2. 后端优化

```typescript
// Redis缓存游戏状态
async function getGameState(roomId: string): Promise<GameState> {
  const cached = await redis.get(`game:${roomId}`);
  if (cached) return JSON.parse(cached);

  const state = await db.games.findOne({ roomId });
  await redis.setex(`game:${roomId}`, 3600, JSON.stringify(state));
  return state;
}

// AI调用并发控制
const aiQueue = new PQueue({ concurrency: 3 });

async function getAIDecision(request: AIDecisionRequest) {
  return aiQueue.add(() => callDeepSeekAPI(request));
}
```

### 3. WebSocket优化

```typescript
// 批量发送状态更新
const stateUpdates = new Map();

setInterval(() => {
  for (const [roomId, state] of stateUpdates) {
    io.to(roomId).emit('game:state', state);
  }
  stateUpdates.clear();
}, 50); // 每50ms批量发送
```

---

## 📝 开发路线图

### 第一阶段：核心功能（2-3周）

- [x] 规则文档完善
- [ ] 项目初始化（前后端）
- [ ] 基础UI框架搭建
- [ ] 游戏引擎实现
- [ ] 本地单机模式（1v1）

### 第二阶段：多人联机（2周）

- [ ] WebSocket服务实现
- [ ] 房间管理系统
- [ ] 游戏状态同步
- [ ] 多人对战测试

### 第三阶段：AI集成（2周）

- [ ] DeepSeek API集成
- [ ] AI决策引擎
- [ ] AI隔离机制实现
- [ ] 3种难度AI调试

### 第四阶段：优化与部署（1周）

- [ ] 性能优化
- [ ] 单元测试
- [ ] E2E测试
- [ ] 生产部署

---

## 🎓 技术决策说明

### 为什么选择React而不是Vue？

1. **生态更成熟**：React Router、React Query等工具完善
2. **TypeScript支持更好**：类型推断更准确
3. **游戏相关库更多**：Framer Motion、React Three Fiber等
4. **团队熟悉度**：React社区更大，招人更容易

### 为什么选择Socket.io而不是原生WebSocket？

1. **自动重连**：网络断开自动恢复
2. **房间支持**：天然支持多房间
3. **回退机制**：不支持WebSocket时自动降级到轮询
4. **跨浏览器**：兼容性好

### 为什么使用Zustand而不是Redux？

1. **代码更少**：无需action、reducer等样板代码
2. **性能更好**：基于不可变数据但无需Immer
3. **更简单**：学习曲线平缓
4. **TypeScript友好**：类型推断完美

### 为什么需要Redis？

1. **游戏状态缓存**：减少数据库查询
2. **会话管理**：存储WebSocket连接信息
3. **分布式锁**：防止并发修改游戏状态
4. **实时排行榜**：使用Sorted Set实现

---

**架构设计完成！** 🎉

这份文档涵盖了完整的技术栈选择、模块设计、AI隔离机制、数据流设计等所有关键内容。

是否需要我：
1. 开始实现具体代码？
2. 详细说明某个模块的实现？
3. 创建项目初始化脚本？
