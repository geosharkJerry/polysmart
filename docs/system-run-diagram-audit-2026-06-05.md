# Polysmart System Run Diagram Audit

Last updated: `2026-06-05`
Workspace: `/Users/mac/Documents/Polysmart`
Reference diagram: `/Users/mac/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_f11qf1phb1ib22_2dcd/temp/RWTemp/2026-06/898bcd2a27d671c1e732a81c351d0880.png`

## Status Legend

- `✅` Completed locally and backed by code path plus local verification.
- `🟡` Partially implemented or needs production-grade external confirmation.
- `🔴` Duplicate, conflicting, or logically unsafe and prepared for removal from the production sync path.

## Stage 1: Cold Boot & Cache Initialization

| Capability | Status | Local implementation | Local verification | Notes |
|---|---|---|---|---|
| Polymarket API source | ✅ | `lib/connectors/live-connectors.ts`, `lib/services/connectors.ts`, `lib/services/events.ts` | `tests/connectors.test.ts`, `tests/production-integrations.test.ts`, `npm run build` | Real Polymarket market and order-book endpoints are now wired with env-driven live mode plus mock-safe fallback. |
| Kalshi API source | ✅ | `lib/connectors/live-connectors.ts`, `lib/services/connectors.ts`, `lib/services/events.ts` | `tests/connectors.test.ts`, `tests/production-integrations.test.ts`, `npm run build` | Real Kalshi market and order-book ingestion is now supported through the official trade API base path. |
| PredictIt API source | ✅ | `lib/connectors/live-connectors.ts`, `lib/services/connectors.ts` | `tests/connectors.test.ts`, `tests/production-integrations.test.ts`, `npm run build` | PredictIt live market ingestion is now supported via official site market-data endpoints with runtime normalization. |
| Gemini batch tagging layer | ✅ | `lib/engine/ai-router.ts`, `app/api/ai/route/route.ts`, `lib/services/cache-matrix.ts` | `tests/ai-router.test.ts`, `tests/production-integrations.test.ts`, `npm run build` | Gemini is now reachable through a real HTTP gateway with mock-safe downgrade when keys are absent or invalid. |
| Claude deep reasoning layer | ✅ | `lib/engine/ai-router.ts`, `app/api/ai/route/route.ts`, `lib/services/cache-matrix.ts` | `tests/ai-router.test.ts`, `tests/production-integrations.test.ts`, `npm run build` | Claude is now reachable through the Anthropic Messages API with controlled fallback behavior. |
| Topology graph store | ✅ | `lib/services/cache-matrix.ts`, `lib/store.ts` | `tests/system-audit.test.ts` | Topology nodes and edges are now warmed into runtime graph state. |
| Probability matrix | ✅ | `lib/services/cache-matrix.ts`, `lib/store.ts` | `tests/system-audit.test.ts` | Event probability rows are materialized and refreshed locally. |
| Feature cache | ✅ | `lib/services/cache-matrix.ts`, `lib/store.ts` | `tests/system-audit.test.ts` | Normalized topic cache and metadata cache are present. |
| Cache warm and model feedback | ✅ | `lib/services/cache-matrix.ts`, `app/api/cache/warm/route.ts` | `tests/system-audit.test.ts`, `npm run build` | Cache warm and provider feedback snapshots now exist locally. |

## Stage 2: Runtime Priority Sieve Bus

| Capability | Status | Local implementation | Local verification | Notes |
|---|---|---|---|---|
| Order book updates stream | ✅ | `lib/services/connectors.ts`, `lib/connectors/live-connectors.ts`, `app/api/connectors/stream/route.ts` | `tests/connectors.test.ts`, `tests/production-integrations.test.ts` | Real order-book polling now feeds the runtime bus and emits Level-2 order-book update events. |
| Trades and fills stream | ✅ | `lib/services/execution.ts` | `tests/execution-service.test.ts` | Fill records, latency, and order status updates are persisted in runtime state. |
| News and events stream | ✅ | `lib/services/events.ts`, `lib/engine/t0-filter.ts` | existing build path, console workspace load | T+0 event normalization and refresh path exist locally. |
| On-chain data stream | ✅ | `lib/services/onchain.ts`, `app/api/onchain/sync/route.ts`, `app/api/accounts/[accountId]/funding/route.ts` | `tests/production-integrations.test.ts`, `npm run build` | Wallet funding sync, ERC-20 balance checks, transfer scans, and on-chain bus events are now implemented. |
| Settlement and funding stream | ✅ | `lib/services/settlement-trap.ts`, `lib/services/risk-pool.ts` | `tests/settlement-trap.test.ts`, `tests/risk-pool.test.ts` | Settlement-liquidity and funding/redemption paths are implemented. |
| Priority queue L1-L4 | ✅ | `lib/services/priority-bus.ts`, `app/api/bus/*` | `tests/priority-bus.test.ts` | SLA-driven L1-L4 queueing and batch processing exist. |
| Impact score | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Probability edge | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Liquidity score | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Time decay | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Risk score | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Execution cost | ✅ | `lib/engine/scoring.ts` | `tests/scoring.test.ts` | Implemented in composite scorer. |
| Composite priority score | ✅ | `lib/engine/scoring.ts`, `lib/services/priority-bus.ts` | `tests/scoring.test.ts`, `tests/priority-bus.test.ts` | Used by queue processing path. |
| Execution feedback loop | ✅ | `lib/services/execution.ts`, `lib/services/priority-bus.ts` | `tests/execution-service.test.ts`, `tests/priority-bus.test.ts` | Fills, latency, breach metrics, and audit logs are recorded locally. |

## Stage 3: Target Locking & Atomic Execution

| Capability | Status | Local implementation | Local verification | Notes |
|---|---|---|---|---|
| Market spreads | ✅ | `lib/services/trading-context.ts` | `tests/system-audit.test.ts` | Trading context now surfaces market spread input. |
| Capital constraints | ✅ | `lib/services/trading-context.ts`, `lib/engine/order-slicer.ts` | `tests/system-audit.test.ts`, `tests/order-slicer.test.ts` | Capacity is derived from user profile and account plan. |
| Liquidity edge | ✅ | `lib/services/trading-context.ts` | `tests/system-audit.test.ts` | Liquidity edge score is exposed in context. |
| Execution plan | ✅ | `lib/services/trading-context.ts`, `lib/engine/order-slicer.ts` | `tests/system-audit.test.ts` | Per-account plan is generated locally. |
| Risk/capital check | ✅ | `lib/services/trading-context.ts`, `lib/services/risk-pool.ts` | `tests/system-audit.test.ts`, `tests/risk-pool.test.ts` | Risk check is merged into context. |
| Compliance check | ✅ | `lib/services/trading-context.ts`, `lib/services/accounts.ts` | `tests/system-audit.test.ts`, `tests/accounts.test.ts` | Context flags incomplete KYC for account matrix members. |
| Multi-venue slippage simulation | ✅ | `lib/engine/pricing.ts`, `lib/services/connectors.ts` | `tests/pricing.test.ts`, `tests/production-integrations.test.ts` | Pricing now estimates effective fill price and slippage from venue depth and execution friction. |
| Global inventory lock | ✅ | `lib/services/inventory-locks.ts`, `lib/services/execution.ts` | `tests/execution-service.test.ts` | Lock acquisition, conflict, and release are verified locally. |
| Atomic basket builder | ✅ | `lib/services/execution.ts` | `tests/execution-service.test.ts` | Intent legs form atomic basket execution input. |
| Current risk check | ✅ | `lib/services/risk-pool.ts`, `lib/engine/risk-controller.ts` | `tests/risk-pool.test.ts`, `tests/self-healing.test.ts` | Runtime risk evaluation is active. |
| Signed intent (ERC-4337 abstraction) | ✅ | `lib/services/slave-router.ts`, `app/api/execution/sign/route.ts` | `tests/system-audit.test.ts` | Local signed-intent abstraction now exists for execution handoff. |
| Atomic execution transaction | ✅ | `lib/services/execution.ts` | `tests/execution-service.test.ts` | Atomic transaction steps and rollback path are implemented. |
| Account abstraction | ✅ | `lib/services/slave-router.ts` | `tests/system-audit.test.ts` | Local account abstraction refs (`aa://...`) are now generated. |
| Slave account matrix | ✅ | `lib/services/accounts.ts`, `lib/store.ts` | `tests/accounts.test.ts`, `tests/commercial-ops.test.ts` | Multi-account matrix and KYC metadata are live locally. |
| Market connectors | ✅ | `lib/services/connectors.ts`, `lib/connectors/mock-connectors.ts` | `tests/connectors.test.ts` | Unified connector abstraction exists for all three venues. |
| Slave chain router | ✅ | `lib/services/slave-router.ts` | `tests/system-audit.test.ts` | On-chain/off-chain route plan is generated locally. |

## Stage 4: Perpetual Circulation & Self-Healing

| Capability | Status | Local implementation | Local verification | Notes |
|---|---|---|---|---|
| P&L aggregation | ✅ | `lib/services/psc-reconciliation.ts`, `lib/services/risk-pool.ts` | `tests/system-audit.test.ts`, `tests/risk-pool.test.ts` | PSC report and pool P&L aggregation are present. |
| PSC fee management | ✅ | `lib/services/billing.ts`, `lib/services/commissions.ts`, `lib/services/payments.ts` | `tests/billing.test.ts`, `tests/commercial-ops.test.ts` | Self-service subscriptions now consume fixed points with Stripe recharge, while managed service commissions remain on locked-USDT settlement. |
| 20% performance fee | ✅ | `lib/services/billing.ts`, `lib/engine/asset-pool.ts` | `tests/billing.test.ts`, `tests/commercial-ops.test.ts` | Performance-share settlement creates revenue and commission records. |
| High watermark model | ✅ | `lib/engine/asset-pool.ts`, `lib/services/billing.ts`, `lib/services/risk-pool.ts` | `tests/risk-pool.test.ts`, `tests/commercial-ops.test.ts` | Pool state and member state now track high-watermark NAV and use it to cap billable performance fees. |
| Daily / periodic settlement | ✅ | `lib/services/billing.ts`, `lib/services/subscriptions.ts` | `tests/commercial-ops.test.ts` | Event-end, daily, and weekly settlement frequency states exist locally. |
| Transparent dashboard | ✅ | `app/console/page.tsx`, `app/admin/page.tsx` | `npm run build` | User console and admin dashboard are unified in the current app. |
| On-chain proof and audit | ✅ | `lib/services/onchain.ts`, `lib/store.ts`, `app/api/onchain/sync/route.ts` | `tests/production-integrations.test.ts`, `npm run build` | Audit snapshots are now hashed, signed, and anchored against live RPC block references with stored proof envelopes. |
| Risk monitoring | ✅ | `lib/engine/risk-controller.ts`, `lib/services/risk-pool.ts` | `tests/risk-pool.test.ts`, `tests/self-healing.test.ts` | Runtime risk metrics and transitions are present. |
| Anomaly detection | ✅ | `lib/engine/risk-controller.ts` | `tests/self-healing.test.ts`, `tests/production-integrations.test.ts` | Risk evaluation now emits anomaly scores and labeled anomaly flags for latency, inventory, slippage, and blocked-account shocks. |
| Stress testing | ✅ | `lib/services/stress-testing.ts`, `app/api/admin/stress/run/route.ts` | `tests/production-integrations.test.ts`, `npm run test` | Dedicated multi-scenario stress execution is now part of the runtime service layer. |
| Emergency actions | ✅ | `lib/engine/self-healing.ts`, `lib/services/risk-pool.ts`, `lib/services/settlement-trap.ts` | `tests/self-healing.test.ts`, `tests/risk-pool.test.ts`, `tests/settlement-trap.test.ts` | Pause, deleverage, rebalance, flash liquidation, and halt signals are implemented locally. |
| Merge and feedback loop | ✅ | `lib/services/feedback-loop.ts`, `lib/services/cache-matrix.ts`, `lib/services/psc-reconciliation.ts`, `lib/services/priority-bus.ts`, `app/api/admin/feedback/merge/route.ts` | `tests/production-integrations.test.ts`, `npm run build` | Cache confidence, bus breach metrics, and reconciliation output now feed a unified adaptive runtime feedback loop. |

## Admin and Operations Plane

| Capability | Status | Local implementation | Local verification | Notes |
|---|---|---|---|---|
| Single super admin instance | ✅ | `lib/store.ts`, `lib/services/admin-auth.ts` | `tests/system-audit.test.ts` | Exactly one seeded super admin is kept locally. |
| Super admin login API | ✅ | `app/api/admin/auth/login/route.ts` | `tests/system-audit.test.ts` | Local login and token issuance are implemented. |
| Super admin session lookup | ✅ | `app/api/admin/auth/me/route.ts` | `tests/system-audit.test.ts` | Token-to-admin resolution exists. |
| Admin list endpoint | ✅ | `app/api/admin/auth/list/route.ts` | local route build verification | Used to confirm only one admin seed is present. |
| Admin UI auth gate | ✅ | `app/admin/page.tsx`, `app/admin/login/page.tsx`, `app/api/admin/auth/*`, `lib/services/admin-auth.ts` | `tests/system-audit.test.ts`, `npm run build` | `/admin` now hard-redirects unauthenticated requests to the dedicated login screen and admin APIs require the seeded super-admin session cookie. |
| Self-service Stripe recharge management | ✅ | `app/console/page.tsx`, `app/admin/page.tsx`, `app/api/payments/stripe/*`, `lib/services/payments.ts` | `tests/commercial-ops.test.ts`, `npm run build` | Stripe checkout sessions and fixed points package management now exist locally with mock-safe confirmation flow. |
| Managed USDT commission lock ledger | ✅ | `lib/services/commissions.ts`, `app/admin/page.tsx`, `app/console/page.tsx` | `tests/commercial-ops.test.ts`, `npm run build` | Managed commissions are locked and released against USDT-specific settlement metadata. |

## Red Removal / Cleanup Candidates

| Item | Status | Reason | Planned action |
|---|---|---|---|
| Legacy `webapp 2/` auth, admin, payment, and user route stack | 🔴 | Duplicates the active Next.js control plane and still contains old sample credentials and divergent business logic. | Moved out of the main repo to `/Users/mac/Documents/Polysmart-legacy-archive/webapp-2-2026-06-05`; do not reintroduce into production source of truth. |
| Legacy `webapp 2` static admin and billing pages | 🔴 | Duplicates the current `/console` and `/admin` surfaces and risks future UI drift. | Archived with the external legacy bundle and removed from the active workspace root. |
| Generated `.open-next/` build output | 🔴 | Generated deployment artifact, not source logic. | Do not treat as feature code during production sync. |

## Local Verification Summary

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `python3 -m py_compile lib/risk/rebalance_sentry.py`

## Seeded Super Admin

- Email: `infor@polysmart.io`
- Password: `Dfmz1979!@#`
- Role: `super_admin`
- Seed path: `lib/store.ts` + `lib/services/admin-auth.ts`
- Storage note: password is stored as a local hash, not plaintext.
