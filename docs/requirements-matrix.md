# Polysmart Requirement Consolidation Matrix

This matrix deduplicates all root-level `.md` requirement files and maps each item to one runtime module.

## Completed Consolidation

1. Pricing + inventory skew + quote safety floor:
- Source docs: `AI Agent 核心算法...`, `减频挂单算法.md`, `有限到期时间...`
- Unified module: `lib/engine/pricing.ts`
- Conflict removed: repeated spread formulas with inconsistent friction handling.

2. Rate limiter and amend-threshold logic:
- Source docs: `减频挂单算法.md`, `分布式高频流动性清洗网络.md`
- Unified module: `lib/engine/rate-reducer.ts`
- Conflict removed: static threshold vs dynamic threshold duplication.

3. Execution hedge state machine:
- Source docs: `AI Agent 核心算法...`, `全栈功能开发与实现过程.md`
- Unified module: `lib/engine/execution-state-machine.ts`
- Conflict removed: duplicated timeout constants by centralizing to runtime config.

4. Matrix account orchestration and credential vault:
- Source docs: `异构账户 API 绑定与存活校验系统.md`, `分布式高频流动性清洗网络.md`
- Unified module: `lib/services/accounts.ts`
- Conflict removed: duplicated credential schema and health-check entrypoints.

5. Asset pool, NAV, and dual billing settlement:
- Source docs: `多用户合伙型资产池...`, `核心业务设计.md`
- Unified modules: `lib/engine/asset-pool.ts`, `lib/services/billing.ts`, `lib/services/risk-pool.ts`
- Conflict removed: fee logic divergence between performance and subscription flows.

6. Circuit breaker and emergency withdrawal:
- Source docs: `动态流动性缓冲区.md`, `核心业务设计.md`
- Unified module: `lib/engine/risk-controller.ts`
- Conflict removed: multiple red-line definitions now mapped to one evaluator.

7. AI routing and strategy simulation:
- Source docs: `核心业务设计.md`, `多用户合伙型资产池...`
- Unified module: `lib/engine/ai-router.ts`

8. Privacy relay planning:
- Source docs: `链上隐私混淆层设计...`
- Unified module: `lib/engine/privacy-relay.ts`
- Note: implementation is compliance-safe planning only; no evasive behavior tooling is included.

## API Coverage

- `/api/strategy/quote`: pricing + reducer + order slicing simulation
- `/api/execution/simulate`: hedge state machine simulation
- `/api/accounts`: matrix account binding and health state
- `/api/risk/status`, `/api/risk/circuit`: circuit breaker metrics
- `/api/pool/nav`, `/api/pool/deposit`, `/api/pool/settle`: NAV, emergency withdrawal, event settlement
- `/api/ai/route`: AI provider routing
- `/api/trades/charge`, `/api/billing/profile/:userId`, `/api/admin/*`: billing and admin operations
