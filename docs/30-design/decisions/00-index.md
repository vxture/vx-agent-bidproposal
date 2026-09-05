# 架构决策记录（ADR）

| ADR | 标题 | 状态 | 日期 |
|---|---|---|---|
| [ADR-001](ADR-001-capability-surface-first-runos-consumer.md) | 本仓是 bidproposal（标书方案智能体）的云端能力面，并且是 Runos 的第一个消费者 | 已接受 | 2026-09-05 |

## 承自范本（vx-agent-vxtpl@fabef44）的工程决策

保留，因为本仓的底盘就是它们；文中的「bidproposal」是改名脚本替换的结果，写作时说的是范本自己。

| ADR | 标题 | 备注 |
|---|---|---|
| [ADR-002](ADR-002-prod-only-deployment.md) | 只部署生产（无 beta 环境） | 沿用 |
| [ADR-003](ADR-003-s2s-token-exchange.md) | S2S 令牌逐次换取、不配置 | 沿用；能力面的 OBO 也照它 |
| [ADR-004](ADR-004-design-system-adoption.md) | 采用 Vxture 设计系统 | 沿用 |
| [ADR-005](ADR-005-product-front-door.md) | 产品在前门校验访问 | 沿用（范本示例界面用） |

范本的 ADR-001（「是一个已部署的示例产品」）与 ADR-006（「挑战游戏业务域」）说的是范本
自己的产品，对本仓不成立，已删除；本仓的 ADR-001 从能力面起。
