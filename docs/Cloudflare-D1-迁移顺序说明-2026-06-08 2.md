# Polysmart Cloudflare D1 迁移顺序说明

更新时间：2026-06-08  
适用仓库：`/Users/mac/Documents/Polysmart`  
目标环境：Cloudflare Worker `polysmart` + D1 数据库 `polysmart-prod`

## 1. 本次迁移覆盖范围

本次说明对应以下生产闭环改动：

1. Stripe 自助订阅支付改为 webhook 最终确认
2. 钱包充值同步写入真实权限联动与权限审计
3. Kelly plan 成为执行入口唯一仓位来源
4. 执行态写入 D1 持久化

对应代码入口：

1. [lib/services/payments.ts](/Users/mac/Documents/Polysmart/lib/services/payments.ts)
2. [lib/services/onchain.ts](/Users/mac/Documents/Polysmart/lib/services/onchain.ts)
3. [lib/services/kelly-plans.ts](/Users/mac/Documents/Polysmart/lib/services/kelly-plans.ts)
4. [lib/services/execution-history.ts](/Users/mac/Documents/Polysmart/lib/services/execution-history.ts)
5. [db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql](/Users/mac/Documents/Polysmart/db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql)

## 2. 迁移文件顺序

生产库建议按以下顺序执行：

1. `db/d1-migrations/2026-06-05-member-auth-persistence.sql`
2. `db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql`

如果是全新空库：

1. 可直接执行完整建表文件 [db/d1-schema.sql](/Users/mac/Documents/Polysmart/db/d1-schema.sql)
2. 然后按需执行种子文件 [db/d1-seed.sql](/Users/mac/Documents/Polysmart/db/d1-seed.sql)

如果是已有生产库：

1. 不建议直接对老库整库重放 `db/d1-schema.sql`
2. 应按增量 migration 文件顺序执行

## 3. 本次新增或变更的 D1 结构

### 3.1 新增表

1. `payment_webhook_events`
2. `account_permission_audits`
3. `kelly_plans`
4. `execution_intents`
5. `execution_orders`
6. `execution_fills`
7. `execution_transactions`
8. `execution_inventory_locks`

### 3.2 变更字段

1. `wallet_funding.granted_permissions_json`

用途说明：

1. `payment_webhook_events`
   Stripe webhook 幂等确认，避免重复加点
2. `account_permission_audits`
   记录资金同步后 `QUERY / TRADE` 权限变化来源
3. `kelly_plans`
   保存每次执行前的 Kelly 仓位决策证据
4. `execution_*`
   保存 intent、order、fill、atomic transaction、inventory lock 全链路证据
5. `wallet_funding.granted_permissions_json`
   把充值后实际授予的权限落库，避免只在运行内存存在

## 4. 生产执行前检查

执行前先确认：

1. `wrangler.jsonc` 中 D1 绑定正确
2. 目标数据库为 `polysmart-prod`
3. 当前 Worker 已配置以下 Secrets

必须存在的 Secrets：

1. `STRIPE_SECRET_KEY`
2. `STRIPE_WEBHOOK_SECRET`
3. `AI_GATEWAY_API_KEY`
4. `ACCOUNT_CREDENTIAL_ENCRYPTION_KEY`

按当前仓库配置检查：

1. [wrangler.jsonc](/Users/mac/Documents/Polysmart/wrangler.jsonc)

## 5. 推荐执行命令

以下命令在仓库根目录执行：

```bash
cd /Users/mac/Documents/Polysmart
```

### 5.1 先备份生产库

```bash
wrangler d1 export polysmart-prod --remote --output=./outputs/polysmart-prod-backup-$(date +%Y%m%d-%H%M%S).sql
```

### 5.2 执行历史 migration

如果生产库尚未执行过 `2026-06-05`：

```bash
wrangler d1 execute polysmart-prod --remote --file=./db/d1-migrations/2026-06-05-member-auth-persistence.sql
```

执行本次新增 migration：

```bash
wrangler d1 execute polysmart-prod --remote --file=./db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql
```

### 5.3 如果是新库，一次性建表

```bash
wrangler d1 execute polysmart-prod --remote --file=./db/d1-schema.sql
```

如需初始化演示或后台必需数据，再执行：

```bash
wrangler d1 execute polysmart-prod --remote --file=./db/d1-seed.sql
```

生产环境通常不建议直接导入完整 seed，除非你确认需要初始化固定管理员、套餐和测试数据。

## 6. 执行顺序建议

推荐的 Cloudflare 部署顺序：

1. 备份 D1
2. 执行 D1 migration
3. 写入或校验 Secrets
4. 本地执行 `npm run test`
5. 本地执行 `npm run typecheck`
6. 本地执行 `npm run build`
7. 再执行 Worker 部署

部署命令：

```bash
npm run deploy
```

## 7. 迁移后数据库验收 SQL

可用以下命令确认新表是否存在：

```bash
wrangler d1 execute polysmart-prod --remote --command=\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;\"
```

重点检查以下表：

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'payment_webhook_events',
    'account_permission_audits',
    'kelly_plans',
    'execution_intents',
    'execution_orders',
    'execution_fills',
    'execution_transactions',
    'execution_inventory_locks'
  )
ORDER BY name;
```

检查 `wallet_funding` 新字段：

```bash
wrangler d1 execute polysmart-prod --remote --command=\"PRAGMA table_info(wallet_funding);\"
```

确认应包含：

1. `granted_permissions_json`

## 8. 迁移后功能验收建议

### 8.1 Stripe 支付闭环

验收点：

1. 创建 `payment_sessions` 记录
2. webhook 到达后写入 `payment_webhook_events`
3. `billing_profiles.points_balance` 增加
4. `invoices` 新增已支付记录
5. 重复 webhook 不会重复加点

### 8.2 钱包充值与权限联动

验收点：

1. `wallet_funding` 写入链上充值记录
2. `wallet_funding.granted_permissions_json` 有值
3. `accounts.can_query`、`accounts.can_trade` 更新
4. `account_permission_audits` 写入权限变化记录

### 8.3 Kelly 与执行态持久化

验收点：

1. 调用执行上下文后生成 `kelly_plans`
2. 创建 intent 后生成 `execution_intents`
3. 提交成交后写入 `execution_orders`
4. fill 写入 `execution_fills`
5. 原子事务写入 `execution_transactions`
6. 锁写入 `execution_inventory_locks`

## 9. 当前已验证结果

本地已完成以下验证：

1. `npm run test` 通过，`29` 个测试文件、`95` 个测试通过
2. `npm run typecheck` 通过
3. `npm run build` 通过

与本次 D1 迁移直接相关的关键测试：

1. [tests/stripe-webhook.test.ts](/Users/mac/Documents/Polysmart/tests/stripe-webhook.test.ts)
2. [tests/execution-d1-persistence.test.ts](/Users/mac/Documents/Polysmart/tests/execution-d1-persistence.test.ts)
3. [tests/production-integrations.test.ts](/Users/mac/Documents/Polysmart/tests/production-integrations.test.ts)
4. [tests/member-arbitrage-e2e.test.ts](/Users/mac/Documents/Polysmart/tests/member-arbitrage-e2e.test.ts)

## 10. 注意事项

1. `2026-06-08` 这个 migration 包含 `ALTER TABLE wallet_funding ADD COLUMN granted_permissions_json ...`
2. 该 migration 只应对同一生产库执行一次
3. 如果目标库已经手工加过该字段，再重复执行该 SQL 会失败
4. 若不确定目标库现状，先执行：

```bash
wrangler d1 execute polysmart-prod --remote --command=\"PRAGMA table_info(wallet_funding);\"
```

确认没有 `granted_permissions_json` 时再执行本次 migration

## 11. 建议的实际部署口令顺序

```bash
cd /Users/mac/Documents/Polysmart
wrangler d1 export polysmart-prod --remote --output=./outputs/polysmart-prod-backup-$(date +%Y%m%d-%H%M%S).sql
wrangler d1 execute polysmart-prod --remote --file=./db/d1-migrations/2026-06-08-payments-kelly-execution-persistence.sql
npm run test
npm run typecheck
npm run build
npm run deploy
```

如果你要，我下一步可以继续直接补一份“Cloudflare 生产部署执行清单”，把 `D1 + Secrets + Deploy + 回归检查` 串成一次性操作文档。
