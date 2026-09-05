# ADR-001 本仓是 bidproposal 产品的云端能力面，并且是 Runos 的第一个消费者

- 状态：已接受（owner 2026-09-05；决定记录在 vxture-ruyin ADR-020 §6-4）
- 日期：2026-09-05
- 相关：vxture-ruyin ADR-009（能力面中转）、ADR-018 v2.2（技能四层来源）、ADR-020
  （两个能力提供平台）；Runos ADR-014（baseline-only until first consumer）；
  vxture-foundation/vxture-runos#14；本仓 `docs/20-specs/30-capability-surface.md`

## 背景

Ruyin（桌面本地运行环境）不直连 Atlas、不直连 Runos：它是零秘密的 public client，
换不到 S2S 令牌。每个业务产品必须出一个云端服务替用户换票、调模型与能力面 ——
这是 vxture-ruyin ADR-009 的代价，也是它的解。bidproposal（标书编写）是 Ruyin 的首个产品，
它的云端服务此前不存在。

Runos 按「baseline-only until first consumer」运行，台账近乎空；owner 定 bidproposal 的云端
能力面为第一个消费者，Runos 据 ruyin 梳理的清单（`resources/skill-manifest.json`）
构建预置台账。

## 决策

1. **本仓（`vx-agent-bidproposal`，从 `vx-agent-vxtpl@fabef44` 复制并重命名）承担 bidproposal 的云端
   能力面。** 范本的三通道义务（C1 / C2 / C3）与工程底盘原样保留；能力面是它之上
   新增的四个端点（契约、回合、技能目录、技能全文），见规格 §2。
2. **本仓是 Runos 的第一个消费者。** 消费方式：OBO 换票（`act.sub = bidproposal`）调
   `POST /v1/mcp` 四工具流；`_meta.vxture.task_id` 与 Ruyin 的 `taskId` 同值。
3. **技能只转交、不执行**（Runos ADR-006；Ruyin ADR-020 §3 c）：本服务从 Runos 取
   `SKILL.md` 与资源，交给 Ruyin 进其「产品分发」层。
4. **措辞归本仓。** 回合端点把 Ruyin 送来的事实（objective / constraints / context /
   messages / tools / skills / revision）组成模型看到的提示 —— 这是产品的业务，
   Ruyin 不做（其 ADR-011）。

## 后果

- 平台侧：vxture-platform/vxture-platform#198 —— OBO subject_token 受众（现规则
  `resolveOboContext` 必拒 `aud='ruyin'` 的票，是生产能不能通的前提，规格 §4 第 1 条）
  + bidproposal 按暂用名登记（产品行 / OIDC client / `product_id` 回填 / ruyin↔bidproposal 关系 / plan）。
  平台 seed 里此前没有任何 bidproposal 行；`docs/50-deployment/10-platform-registration-checklist.md`
  已改成真实状态（全部未办）。
- Runos 侧：为主体 `product=bidproposal` 建授权；技能按清单注册（#14）。
- Ruyin 侧：`RUYIN_CAPABILITY_BASE` 指向本服务 `/api`；`TurnRequest.skills` 落地后自然接上。
- 范本里 vxtpl 的联络信件已删（它们是 vxtpl 的历史）；本仓 ADR 从 001 起。
