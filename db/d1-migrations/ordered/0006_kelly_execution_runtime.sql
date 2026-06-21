PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS t0_events (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('Polymarket', 'Kalshi', 'PredictIt')),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Politics', 'Macro', 'Crypto', 'Regulation')),
  end_time_utc TEXT NOT NULL,
  edge_spread_pct REAL NOT NULL,
  ai_win_probability REAL NOT NULL
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

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_id TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  win_probability REAL,
  confidence REAL,
  status TEXT NOT NULL,
  response_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_processing_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
