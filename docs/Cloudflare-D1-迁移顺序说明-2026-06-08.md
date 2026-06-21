# Polysmart Cloudflare D1 编号迁移上线批次

更新时间：2026-06-08  
适用仓库：`/Users/mac/Documents/Polysmart`  
目标 Worker：`polysmart`  
目标 D1：`polysmart-prod`  
D1 binding：`POLYSMART_DB`

## 1. 当前结论

仓库已从早期的日期增量 SQL 整理为可执行的编号迁移批次：

```text
db/d1-migrations/ordered/
  0001_member_identity_auth.sql
  0002_subscription_billing_points.sql
  0003_payment_sessions_stripe_webhooks.sql
  0004_external_accounts_and_credentials.sql
  0005_wallet_funding_and_deposit_tracking.sql
  0006_kelly_execution_runtime.sql
  0007_settlement_commission_and_fill_billing.sql
  0008_admin_system_settings_and_capabilities.sql
  0009_indexes_backfill_seed.sql
```

`wrangler.jsonc` 已配置：

```jsonc
"migrations_dir": "db/d1-migrations/ordered"
```

因此 Cloudflare 标准命令可以直接识别并按编号执行：

```bash
npx wrangler d1 migrations apply polysmart-prod --remote
```

## 2. 与功能说明的逐项对齐

| 编号 | 文件 | 对应功能范围 | 主要表 |
| --- | --- | --- | --- |
| 0001 | `0001_member_identity_auth.sql` | 会员注册、登录会话、邮箱验证、管理员门禁 | `users`, `member_credentials`, `member_sessions`, `member_verifications`, `admins`, `admin_sessions` |
| 0002 | `0002_subscription_billing_points.sql` | 套餐、订阅、积分、发票、账务调整 | `billing_profiles`, `subscription_plans`, `subscriptions`, `invoices`, `points_packages`, `points_ledger`, `billing_adjustments` |
| 0003 | `0003_payment_sessions_stripe_webhooks.sql` | Stripe Checkout 会话与 webhook 最终确认 | `payment_sessions`, `payment_webhook_events`, `payment_reconciliation_logs` |
| 0004 | `0004_external_accounts_and_credentials.sql` | Polymarket/Kalshi/PredictIt 账号绑定、凭据、权限审计 | `accounts`, `account_credentials`, `account_permission_audits`, `account_binding_events` |
| 0005 | `0005_wallet_funding_and_deposit_tracking.sql` | 钱包地址、充值 intent、链上到账、会员余额 | `wallet_funding`, `wallet_addresses`, `deposit_intents`, `deposit_reconciliation_logs`, `member_wallet_balances` |
| 0006 | `0006_kelly_execution_runtime.sql` | T+0 事件、AI/Kelly、执行 intent/order/fill/lock、运行审计 | `t0_events`, `kelly_plans`, `execution_intents`, `execution_orders`, `execution_fills`, `execution_transactions`, `execution_inventory_locks`, `audit_logs`, `ai_decision_logs`, `event_processing_logs` |
| 0007 | `0007_settlement_commission_and_fill_billing.sql` | 成交扣点、托管佣金、分佣结算、资产池 | `settlements`, `commission_settlements`, `trade_volume_charges`, `managed_commission_settlements`, `settlement_payouts`, `execution_halt_logs`, `asset_pool_state`, `pool_members` |
| 0008 | `0008_admin_system_settings_and_capabilities.sql` | 后台系统设置、API/支付能力状态、IP 规则、管理员动作日志 | `platform_config`, `risk_state`, `audit_anchors`, `system_settings_snapshot`, `api_capability_status`, `payment_capability_status`, `ip_rules`, `admin_action_logs` |
| 0009 | `0009_indexes_backfill_seed.sql` | 索引、生产基础 seed、超级管理员 | 核心索引、`admin-root`, 套餐、点数包、默认运行配置 |

## 3. Legacy 文件状态

旧文件仍保留：

```text
db/d1-migrations/2026-06-05-member-auth-persistence.sql
db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql
```

它们现在作为 legacy 参考，不再作为主上线批次。

注意：

- 旧文件包含 `ALTER TABLE ... ADD COLUMN`。
- SQLite/D1 不支持 `ALTER TABLE ADD COLUMN IF NOT EXISTS`。
- 如果同一字段已经存在，重复执行旧文件会失败。
- 新的 `ordered/0001-0009` 批次已将这些字段放入建表定义，适合新库和标准 migration tracker。

## 4. 生产执行前检查

先确认当前远端 migration 状态：

```bash
cd /Users/mac/Documents/Polysmart
npx wrangler d1 migrations list polysmart-prod --remote
```

备份生产库：

```bash
mkdir -p outputs
npx wrangler d1 export polysmart-prod --remote --output=./outputs/polysmart-prod-backup-$(date +%Y%m%d-%H%M%S).sql
```

确认 Secrets 已存在：

```bash
npx wrangler secret list
```

关键 Secrets：

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
AI_GATEWAY_API_KEY
ACCOUNT_CREDENTIAL_ENCRYPTION_KEY
EMAIL_API_TOKEN
RPC_URL_POLYGON
TOKEN_USDC_POLYGON
```

## 5. 推荐上线命令

标准编号 migration 执行：

```bash
cd /Users/mac/Documents/Polysmart
npx wrangler d1 migrations apply polysmart-prod --remote
```

本地校验：

```bash
npm run test
npm run typecheck
npm run build
```

部署：

```bash
npm run deploy
```

## 6. 新库初始化验收 SQL

检查核心表是否存在：

```bash
npx wrangler d1 execute polysmart-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

检查超级管理员：

```bash
npx wrangler d1 execute polysmart-prod --remote --command="SELECT email, role FROM admins WHERE email='infor@polysmart.io';"
```

检查套餐与点数包：

```bash
npx wrangler d1 execute polysmart-prod --remote --command="SELECT COUNT(*) AS plan_count FROM subscription_plans;"
npx wrangler d1 execute polysmart-prod --remote --command="SELECT COUNT(*) AS package_count FROM points_packages;"
```

检查运行态表：

```bash
npx wrangler d1 execute polysmart-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name IN ('kelly_plans','execution_intents','execution_orders','execution_fills','account_permission_audits','payment_webhook_events') ORDER BY name;"
```

## 7. 已完成的本地验证

已用空 SQLite 库顺序执行 `0001-0009`：

```text
生成表数量：51
超级管理员：infor@polysmart.io / super_admin
套餐数量：3
点数包数量：2
```

已用 Wrangler 本地 D1 执行：

```bash
npx wrangler d1 migrations apply polysmart-prod --local
```

结果：

```text
0001_member_identity_auth.sql                   ✅
0002_subscription_billing_points.sql            ✅
0003_payment_sessions_stripe_webhooks.sql       ✅
0004_external_accounts_and_credentials.sql      ✅
0005_wallet_funding_and_deposit_tracking.sql    ✅
0006_kelly_execution_runtime.sql                ✅
0007_settlement_commission_and_fill_billing.sql ✅
0008_admin_system_settings_and_capabilities.sql ✅
0009_indexes_backfill_seed.sql                  ✅
```

## 8. 老生产库注意事项

如果远端库已经手工执行过 legacy 日期文件，直接运行 `0001-0009` 通常不会重建已有表，因为主表均使用 `CREATE TABLE IF NOT EXISTS`。

需要特别注意：

- `CREATE TABLE IF NOT EXISTS` 不会给旧表自动补缺失字段。
- 如果旧表缺字段，例如 `wallet_funding.granted_permissions_json`，需要先用 `PRAGMA table_info(wallet_funding);` 核对。
- 对缺字段的老库，继续使用 legacy SQL 前必须确认字段不存在，因为重复 `ALTER TABLE ADD COLUMN` 会失败。

预检命令：

```bash
npx wrangler d1 execute polysmart-prod --remote --command="PRAGMA table_info(wallet_funding);"
```

如果没有 `granted_permissions_json`，再执行一次性 legacy 补丁：

```bash
npx wrangler d1 execute polysmart-prod --remote --file=./db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql
```

如果字段已经存在，不要重复执行 legacy 补丁。

## 9. 最终生产回归清单

1. 会员注册并验证邮箱
2. 会员登录会话重启后仍有效
3. `/admin` 仅超级管理员可进入
4. 会员选择套餐后创建 Stripe Checkout
5. Stripe webhook 成功后点数到账
6. 会员绑定 Polymarket/Kalshi/PredictIt 账号
7. 钱包充值同步后生成 `wallet_funding`
8. 权限变化写入 `account_permission_audits`
9. AI/Kelly 生成 `kelly_plans`
10. 执行链路写入 `execution_intents/orders/fills/transactions/locks`
11. 成交后生成点数扣费或托管佣金结算
12. 会员面板和后台能查询 Kelly plan、执行历史、权限审计
