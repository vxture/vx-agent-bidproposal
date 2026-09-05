# bidproposal 云端能力面（Capability Surface）规格 v0.1

- 日期：2026-09-05
- 地位：**bidproposal 产品的云端服务面**，供本地运行环境 Ruyin 调用；同时是 Runos 的第一个
  消费者（vxture-ruyin ADR-020 §6-4，owner 2026-09-05 定；Runos 侧
  vxture-foundation/vxture-runos#14）。
- 上游权威：vxture-ruyin `docs/30-design/20-runtime-contract.md`（回合协议）、
  ADR-001 / 009（Ruyin 不直连 Atlas 与 Runos）、ADR-011（运行时给事实、产品给措辞）、
  ADR-018 v2.2（技能四层来源）、ADR-020（两个能力提供平台）、接入指南 §5.4。
  Runos：`210-consumption-contract.md`（冻结、只增不改）。
- 实现：`portals/app/app/capability/*`、`portals/app/app/api/products/[product]/*`。

## 1. 它是什么

Ruyin 是零秘密的 public client，换不到 S2S 令牌；持 confidential 凭据、替用户换票、
调 Atlas 与 Runos 的，是本服务。**循环仍在本地**（Ruyin Harness）：本服务每次只答
一个回合，无状态。

```text
Ruyin 守护进程 ──POST /turn（用户 token）──→ bidproposal 能力面 ──OBO 换票 act.sub=bidproposal──→ Atlas /v1/chat
                                               └──────────────────────────→ Runos /v1/mcp
Ruyin ←── GET /skills, /skills/:name（Runos 分发的技能，经本服务转交）───┘
```

## 2. 端点

前缀：`/api/products/{product}`，`{product}` = 契约 `product.id`（`bidproposal`）或
平台产品码（`bidproposal`）。Ruyin 侧配置 `RUYIN_CAPABILITY_BASE=https://bidproposal.vxture.com/api`。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/contract` | 无（契约按设计公开） | `ruyin.product.yaml` 原文，`application/yaml`，带 ETag / `If-None-Match` |
| POST | `/capabilities/{id}/turn` | 用户 bearer | 一个回合：入 `{taskId, projectId?, objective, constraints[], context[], messages[], tools[], skills?[], revision?}`，出 `{kind: tool_calls\|content\|verdict, …}` |
| GET | `/skills?taskId=` | 用户 bearer | Runos 分发给本产品的技能目录：`{status:{configured, reason?}, skills:[{name, description, capabilityId, version}]}` |
| GET | `/skills/{name}?taskId=` | 用户 bearer | 一条技能：`SKILL.md` 全文、`resources[]`（`skill://` uri）、`contentDigest`、`digestSource: runos\|computed` |

错误姿态对齐 Ruyin 客户端：4xx（除 408/425/429）= 会一直拒绝，Ruyin 不重试；
5xx / 429 = 稍后再试，Ruyin 把任务停在原地。所以 Atlas 未配置是 503，body 读不懂是 400。

## 3. 身份

- bearer = 签入用户的**平台 access token**（Ruyin 的 `platform.bearerToken()`）。本服务
  用平台 JWKS 验签、验 issuer，`audience` = `RUYIN_CLIENT_ID`（默认 `ruyin`）。
- 工作区与主体**只从 token 取**：`active_workspace`、`sub`。body 里的 `projectId` 是
  Ruyin 的本地容器 id，只作关联，永不当身份。
- 下游全部 OBO：`subject_token` = 这枚用户 token，`act.sub = bidproposal`。Runos 要求的 `sub`
  只有 OBO 票才有。
- 无 IdP 的本地开发：走 `ws_local_dev` 桩，部署态拒绝（沿用范本的阶段守卫）。

## 4. 与平台的前提（已核实，跟踪于 vxture-platform/vxture-platform#198）

1. **平台 token-exchange 不接受 `aud` 为另一 RP 的 subject_token —— 已读码确认。**
   `bff/auth-bff/src/oidc/token-exchange.service.ts` 的 `resolveOboContext` 在
   `claims.aud !== callerClientId` 时直接 `400 invalid_request`（2026-07-12 review 后加的
   单受众纪律，product_210 §3.1）。bidproposal 的 subject_token 来自 Ruyin 登录，`aud='ruyin'`，
   caller 是 `bidproposal`：**现规则下每次 OBO 都被拒**，与登记无关。两个解法已提给平台线，
   ruyin 侧倾向 ①：① Ruyin 用同一次登录 / 同一枚 refresh_token 按产品申请受众
   （RFC 8707 `resource=bidproposal`），bidproposal 校验的就是自己的 client id，单受众纪律不动；
   ② 平台 `resolveOboContext` 查「client 型产品 → 允许代为 OBO 的产品」登记表放行。
   走 ①，本服务的 `RUYIN_CLIENT_ID` 应设为 `bidproposal`（校验自己的受众），
   `caller.ts` 不必改。**这一条不落地，§2 的三个鉴权端点在生产上就通不了。**
2. Ruyin 的 client id：平台已登记 `ruyin`（product_300 M6，`ruyin.vxture.com`，
   scopes `openid profile email`）。不是暂用名。
3. bidproposal 在平台**尚无任何登记**（seed 无 `bidproposal` 行）。产品码 `bidproposal`、OIDC client `bidproposal`、
   host `bidproposal.vxture.com`、plan `bidproposal-free` 均为暂用名，已在 #198 按暂用名申请；
   `contract.product.id` 固定 `bidproposal`，与平台无关。改名以 #198 为准，两仓一起改。

## 5. 已知缺口（写明，不装作有）

| 缺口 | 现状 | 补法 |
|---|---|---|
| 工具调用 | 范本的 Atlas 客户端只传 user/assistant 文本，**不带工具 schema**，模型无法真的请求工具；本服务把工具写进提示，模型只能用文字「要求」，Ruyin 视为内容 | 给 Atlas 客户端加 `tools[]`（对照 Atlas 接口文档的工具调用字段），把 `tool_calls` 映射到回合协议 |
| `skills[]` 进回合 | Ruyin 侧 `TurnRequest.skills` 尚未实现（ADR-018 §2.4 定了未做）；本服务已按字段接收并写进提示 | Ruyin 实现后自然接上 |
| 验证能力的判定 | 真实 Atlas 路径目前一律回 `content`；mock 路径按能力名猜 verdict | 验证类能力要求 Atlas 输出结构化判定（JSON），映射成 `{kind: verdict}` |
| 技能目录缓存 | 每次 GET 都问 Runos | 按 `contentDigest` 做 ETag；Ruyin 侧已按 digest 缓存 |
| 用量上报 | `/turn` 未记 C3 用量（模型用量由 Atlas 统一记，通则「谁执行谁上报」） | 若产品要按回合计业务指标，在 `/turn` 动作点 `recordUsage` |

## 6. 与 Runos 的对接

- 只用四个固定工具（discover → resolve → invoke → report_outcome），`_meta.vxture.task_id`
  = Ruyin 的 `taskId`，两边审计按它对账。
- 技能：`runos_discover(filter: {primitive_type: skill})` → `runos_invoke(fetch)`，
  返回 `text` 块 + `resource` 块 + `content_digest`（`result_kind: distributed`）。
- 本服务**不执行**任何技能（Runos ADR-006）；执行在 Ruyin。
