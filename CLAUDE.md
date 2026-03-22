# SuperFarm 项目说明

## 项目目标

将经典波兰桌游 **Super Farmer（超级农场主）** 做成可在线游玩的 Web 游戏，支持玩家与 AI 对战。

## 游戏规则权威文档

游戏规则以 `docs/game-rules.md` 为准。

## 核心约束

**无论任何功能开发、逻辑修改、AI 策略调整，都不得违反 `docs/game-rules.md` 中的规则设定。**

包括但不限于：

- 回合流程：交换 → 掷骰子 → 繁殖 → 灾难（若有）→ 检查胜利
- 繁殖规则：有种才能繁殖；双同骰子可从零获得1只（牛/马除外）
- 狐狸攻击：兔子减到只剩1只；仅小狗可防御
- 狼攻击：羊/猪/牛清零（兔子和马不受影响）；仅大狗可防御
- 交换比例：6兔=1羊，2羊=1猪，3猪=1牛，2牛=1马，1羊=1小狗，1牛=1大狗
- 胜利条件：同时拥有兔/羊/猪/牛/马各至少1只

## 开发原则

### TDD（测试驱动开发）

**修改任何游戏逻辑之前，必须先更新或新增测试用例。**

具体要求：

1. **规则修正**：先在对应测试文件中写出预期行为的测试，确认测试失败，再修改实现代码
2. **新功能**：先写测试描述目标行为，再写实现
3. **回归保护**：每次提交前运行 `cd backend && npm test`，确保全部通过
4. **测试位置**：
   - 游戏规则逻辑 → `tests/backend/units/gameEngine.test.ts`
   - 房间管理 → `tests/backend/units/roomManager.test.ts`
   - AI服务 → `tests/backend/units/aiService.test.ts`
   - HTTP 路由 → `tests/backend/units/configRoutes.test.ts`
   - 集成测试 → `tests/backend/integration/gameServer.integration.test.ts`

### 规则变更流程

当游戏规则需要修正时，按以下顺序操作：

1. 更新 `docs/game-rules.md`
2. 更新 `CLAUDE.md` 核心约束部分
3. 补充/修改测试用例
4. 修改实现代码（GameEngine / server.ts）
5. 运行测试确认通过
6. 提交

### 调试原则

- 优先读日志再动代码：NAS 后端日志 `docker logs superfarm-backend-1 --tail 50`
- 确认问题根因再修复，不靠猜测反复试错
- 临时调试日志用完即删，不留在最终代码中
