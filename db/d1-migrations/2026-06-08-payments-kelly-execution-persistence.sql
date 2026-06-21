PRAGMA foreign_keys = ON;

ALTER TABLE wallet_funding ADD COLUMN granted_permissions_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE')),
  event_type TEXT NOT NULL,
  payment_session_id TEXT,
  stripe_session_id TEXT,
  processed_at TEXT NOT NULL,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS account_permission_audits (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('FUNDING_SYNC', 'ADMIN_OVERRIDE')),
  can_trade INTEGER NOT NULL,
  can_query INTEGER NOT NULL,
  granted_permissions_json TEXT NOT NULL,
  wallet_balance REAL NOT NULL,
  funding_threshold_usd REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kelly_plans (
  kelly_plan_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'AUTO_ORCHESTRATOR')),
  mode TEXT CHECK (mode IN ('dry-run', 'live')),
  status TEXT NOT NULL CHECK (status IN ('READY', 'HALTED', 'CONSUMED')),
  recommended_notional_usd REAL NOT NULL,
  ai_json TEXT,
  pricing_json TEXT NOT NULL,
  kelly_input_json TEXT NOT NULL,
  kelly_output_json TEXT NOT NULL,
  order_books_json TEXT NOT NULL,
  execution_plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_intents (
  intent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  kelly_plan_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'LOCKED', 'EXECUTING', 'HEDGED', 'FAILED')),
  legs_json TEXT NOT NULL,
  strategy_context_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (kelly_plan_id) REFERENCES kelly_plans(kelly_plan_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS execution_orders (
  order_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  market_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type TEXT NOT NULL CHECK (order_type IN ('MAKER', 'TAKER')),
  limit_price REAL NOT NULL,
  notional_usd REAL NOT NULL,
  filled_usd REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PARTIAL', 'FILLED', 'CANCELED', 'REJECTED')),
  external_order_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_fills (
  fill_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  filled_usd REAL NOT NULL,
  avg_price REAL NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES execution_orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_transactions (
  tx_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMMITTED', 'ROLLED_BACK', 'FAILED')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  steps_json TEXT NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_inventory_locks (
  lock_id TEXT PRIMARY KEY,
  lock_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'EXPIRED')),
  lease_ms INTEGER NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  released_at TEXT,
  release_reason TEXT,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_session_processed
  ON payment_webhook_events(payment_session_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_permission_audits_account_created
  ON account_permission_audits(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kelly_plans_user_created
  ON kelly_plans(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_intents_user_created
  ON execution_intents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_orders_intent_created
  ON execution_orders(intent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_fills_intent_created
  ON execution_fills(intent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_transactions_intent_started
  ON execution_transactions(intent_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_inventory_locks_intent_acquired
  ON execution_inventory_locks(intent_id, acquired_at DESC);
