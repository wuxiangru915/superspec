# Superspec 阶段感知 (Superspec Phase Awareness)

> 此规则每轮注入，防止长上下文时遗忘流程状态。

## 核心指令 (Core Mandate)

为了节省 Token 并保持聚焦，请根据当前 `state.yaml` 中的 `phase` 字段，**仅阅读并遵循**对应的子规则文件：

- `phase: Vision`   → 阅读 `assets/skills/superspec/rules/superspec-phase-Vision.md`
- `phase: Blueprint` → 阅读 `assets/skills/superspec/rules/superspec-phase-blueprint.md`
- `phase: Forge`  → 阅读 `assets/skills/superspec/rules/superspec-phase-Forge.md`
- `phase: Refine` 或 `Deliver` → 阅读 `assets/skills/superspec/rules/superspec-phase-Refine-Deliver.md`

## 通用红线 (Global Red Lines)

1. **状态驱动**: 每次操作前运行 `superspec-state get <name> phase` 确认阶段。
2. **工具优先**: 必须加载指定的 Skill (如 `brainstorming`, `writing-plans`, `systematic-debugging`)，禁止对话替代。
3. **不可跳过**: 必须运行 `superspec-guard --apply` 进行阶段流转，严禁手动修改 `phase`。
4. **决策暂停**: 遇到规则要求的用户决策点必须暂停并使用平台确认工具，禁止代劳。
