# Polysmart 可执行开发里程碑计划（对照系统运行图，P0 / P1 / P2）

最后更新：`2026-05-30`  
基线代码：`/Users/mac/Documents/Polysmart`  
对照图：`/Users/mac/Downloads/A_professional_high-resolution_system_architecture-1780146892725.png`

---

## 0. 本轮开发进展（已完成）

- 已落地 `P0-2`：`MarketConnector` 抽象 + mock/sandbox 连接器（Polymarket/Kalshi/PredictIt）。
- 已落地 `P0-3`：订单/成交/执行意图/库存台账模型与服务，支持创建意图、提交执行、取消挂单、查看快照。
- 已落地 `P1-1`：运行时事件总线雏形（入队、去重、按优先级处理、指标统计）。
- 已落地 `P1-2`：综合评分引擎（Impact/Edge/Liquidity/Decay/Risk/Cost -> Composite）。
- 已落地 `P1-3`：风控自愈状态机雏形（derive actions + transition）。
- 新增 API：
  - `/api/connectors/health`
  - `/api/execution/intents`, `/api/execution/submit`, `/api/execution/orders`
  - `/api/bus/enqueue`, `/api/bus/process`
  - `/api/strategy/score`
  - `/api/risk/healing`
- 验证结果：`typecheck` 通过、`20` 个测试通过、`next build` 通过。

---

## 1. 对照方法与状态定义

- 对照维度：按系统运行图 `Stage 1 -> Stage 4` 的模块逐项核查。
- 状态定义：
  - `已完成`：本地有可运行实现（含 API/模块），并有测试或页面操作路径。
  - `部分完成`：有雏形实现，但未达到图中生产级闭环。
  - `未实现`：本地缺核心组件。

---

## 2. 按系统运行图的本地完成度核查

## Stage 1：Cold Boot & Cache Initialization

| 运行图模块 | 本地状态 | 证据 | 差异说明 |
|---|---|---|---|
| Data Sources (Polymarket/Kalshi/PredictIt) | 部分完成 | `services/polysmart_scraper.py` | 已接 `Polymarket+Kalshi`，`PredictIt` 未接入实时抓取。 |
| Hybrid AI Topology Analyzer (Gemini/Claude分工) | 部分完成 | `lib/engine/ai-router.ts`, `app/api/ai/route/route.ts` | 仅轻量路由规则，缺“批量打标+深度拓扑推演”双阶段流水线。 |
| RAM Memory Matrix Cache (Topology/Probability/Feature Cache) | 部分完成 | `lib/store.ts` | 当前是内存态对象，缺图谱库/概率矩阵/特征缓存三层结构与持久化。 |
| Cache Warm & Model Feedback | 未实现 | - | 缺模型反馈回写机制与缓存预热任务。 |

**结论（Stage 1）**：具备启动雏形，但距离图中“多层缓存+拓扑推演”仍有明显差距。

---

## Stage 2：Runtime Priority Sieve Bus

| 运行图模块 | 本地状态 | 证据 | 差异说明 |
|---|---|---|---|
| Real-time High-Frequency Data Streams (OrderBook/Trades/News/On-chain/Funding) | 部分完成 | `services/polysmart_scraper.py` | 当前以轮询为主，缺统一高频实时总线。 |
| Priority Queue Bus (L1-L4 + SLA) | 未实现 | - | 未建立 L1-L4 优先级队列与 SLA 约束执行。 |
| Sieve & Scoring Engine (Impact/Probability/Liquidity/Decay/Risk/Cost) | 部分完成 | `lib/engine/pricing.ts` | 仅覆盖部分定价因素，缺完整多维打分引擎。 |
| Execution Feedback (fills/prices/latency) | 部分完成 | `app/api/execution/simulate/route.ts` | 仅仿真输出，缺真实成交反馈闭环。 |

**结论（Stage 2）**：核心差距在“实时事件总线 + 分级优先队列 + 评分总线闭环”。

---

## Stage 3：Target Locking & Atomic Execution

| 运行图模块 | 本地状态 | 证据 | 差异说明 |
|---|---|---|---|
| Trading Context Input | 部分完成 | `app/api/strategy/quote/route.ts` | 有输入参数，但缺统一上下文聚合层。 |
| Distributed Hedge Coordinator | 部分完成 | `lib/engine/execution-state-machine.ts` | 有状态机仿真，缺真实多平台协调器。 |
| Multi-venue Slippage Simulation | 部分完成 | `lib/engine/pricing.ts`, `/api/strategy/quote` | 有简化计算，缺逐档深度仿真。 |
| Global Inventory Lock | 未实现 | - | 无分布式锁/库存锁。 |
| Atomic Basket Builder / Signed Intent / Atomic Execution Tx | 未实现 | - | 缺原子篮子构建与签名意图执行链路。 |
| Multi-account Slave Matrix Execution Layer | 部分完成 | `lib/engine/order-slicer.ts`, `lib/services/accounts.ts` | 已有分单+账户绑定雏形，缺真实执行器与链上/链下路由器。 |

**结论（Stage 3）**：已有“仿真与模型层”，但“原子执行层”基本未落地。

---

## Stage 4：Perpetual Circulation & Self-Healing

| 运行图模块 | 本地状态 | 证据 | 差异说明 |
|---|---|---|---|
| Automated PSC Reconciliation Dividend Center | 部分完成 | `lib/services/billing.ts`, `app/api/pool/settle/route.ts` | 已有 20% 分成/订阅扣费雏形，缺账期模型与审计级对账。 |
| Risk Self-Healing Circuit Breaker | 部分完成 | `lib/engine/risk-controller.ts`, `app/api/risk/circuit/route.ts` | 有熔断判定，缺“撤单/降杠杆/重平衡/停机”动作编排。 |
| Emergency Actions (de-leveraging/rebalance/halt) | 部分完成 | `lib/services/risk-pool.ts` | 已有紧急赎回路径，缺自动降杠杆与全链路紧急动作。 |
| Merge & Feedback Loop | 未实现 | - | 缺 P&L + 风险 + 延迟联合反馈回路。 |

**结论（Stage 4）**：具备基础风险与结算能力，但未形成“自愈闭环”。

---

## 3. 当前“已开发完成”的可确认清单

1. 定价、减频、状态机、分单、风控、资产池、AI 路由等核心模块雏形。
2. 管理台/控制台可操作（账户绑定、扣费、池子与风控基础操作）。
3. API 覆盖策略仿真、账户、风控、资产池、计费。
4. 测试可运行：`9` 文件 `13` 用例通过（最近一次本地验证于 `2026-05-30`）。

---

## 4. 关键冲突与逻辑差异（按修复优先级）

### C1（P0）对冲时延阈值冲突
- 问题：配置 `hedgeTimeoutMs=800`，但熔断判定使用 `>1500ms`。
- 目标：统一为单一阈值源（配置驱动）。
- 验收：边界测试 `799/800/801ms` 行为一致。
- 工时：`6-8h`

### C2（P0）缺 Priority Queue Bus
- 问题：无 L1-L4 优先队列与 SLA 调度。
- 目标：建立优先级总线与抢占策略。
- 验收：L1 延迟显著低于 L3/L4，压测 >=1000 事件。
- 工时：`12-16h`

### C3（P0）缺全局库存锁与原子执行链路
- 问题：缺 Global Inventory Lock、Atomic Builder、Signed Intent、Atomic Tx。
- 目标：落地“锁仓->执行->补偿”原子闭环。
- 验收：并发不重单，不超卖，失败可补偿。
- 工时：`16-24h`

### C4（P0）风控自愈动作未编排
- 问题：只有状态判断，缺撤单/降级/告警动作执行器。
- 目标：实现熔断动作编排与审计。
- 验收：熔断后 1s 内完成动作派发，有可追踪流水。
- 工时：`10-12h`

### C5（P0）凭证安全为开发态
- 问题：硬编码加密 key，不符合生产合规。
- 目标：KMS/ENV 密钥管理 + 版本轮换。
- 验收：无硬编码密钥，旧凭证可平滑迁移。
- 工时：`8-12h`

### C6（P1）AI 双阶段拓扑流水线未实现
- 问题：当前路由不足以支持图中 Batch Tagging + Deep Reasoning。
- 目标：粗筛/深推/快讯三段式流水线。
- 验收：输出 `stage/provider/confidence/rationale`。
- 工时：`12-16h`

### C7（P1）缓存矩阵与反馈闭环未实现
- 问题：缺 topology/probability/feature 三层缓存与模型反馈回写。
- 目标：建立缓存矩阵与反馈更新任务。
- 验收：缓存命中、回写成功率可观测。
- 工时：`14-20h`

---

## 5. 更新后的里程碑（P0 / P1 / P2）

## P0（阻塞上线，先修图中主干链路）

1. 统一风控时延阈值（C1）
- 验收：阈值边界测试+后台可配置。
- 工时：`6-8h`

2. Priority Queue Bus（C2）
- 验收：L1-L4 调度 + SLA 指标。
- 工时：`12-16h`

3. 全局库存锁+原子执行链路（C3）
- 验收：锁仓一致性 + 失败补偿。
- 工时：`16-24h`

4. 风控动作编排（C4）
- 验收：熔断动作可执行、可审计。
- 工时：`10-12h`

5. 生产级凭证安全（C5）
- 验收：密钥轮换演练通过。
- 工时：`8-12h`

**P0 总工时：`52-72h`**

---

## P1（增强图中 Stage 1/4 的智能与商业闭环）

1. AI 三段式拓扑流水线（C6）
- 工时：`12-16h`

2. RAM Memory Matrix Cache 三层实现 + 反馈回写（C7）
- 工时：`14-20h`

3. 双轨计费补全（月费 + AI 用量计费）
- 验收：账期、续费、欠费降级完整。
- 工时：`14-20h`

4. 资产池再平衡与断流治理
- 验收：低水位自动触发再平衡策略。
- 工时：`12-18h`

**P1 总工时：`52-74h`**

---

## P2（质量与规模化）

1. 实时数据全接入（含 PredictIt）与可回放框架
- 验收：关键场景回放（正常/超时/封禁/赎回）。
- 工时：`16-24h`

2. Merge & Feedback Loop（P&L + Inventory + Risk）
- 验收：统一反馈总线驱动参数更新。
- 工时：`12-18h`

3. 指标体系与 SLO（延迟/成功率/熔断率/资金效率）
- 工时：`10-14h`

4. 内存态到持久化迁移（含回滚）
- 工时：`14-20h`

**P2 总工时：`52-76h`**

---

## 6. 执行顺序建议（按周）

1. 第 1-2 周：完成全部 P0，形成“可上线最小闭环”。
2. 第 3-4 周：完成 P1，补齐智能调度与商业计费闭环。
3. 第 5 周+：完成 P2，提升稳定性、可观测性和规模化能力。

---

## 7. DoD（里程碑完成定义）

每个里程碑必须满足：
- 代码通过：`typecheck` + 单元测试 + 本阶段集成测试。
- 功能通过：达到对应验收标准并可复现实操。
- 风控可执行：失败路径存在补偿或熔断动作。
- 审计可追踪：关键动作具备唯一 ID 与日志链路。
- 文档同步：接口、运行手册、变更记录同步更新。
