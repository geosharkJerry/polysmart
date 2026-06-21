PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS revenue_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'STRIPE_POINTS_TOPUP',
    'SUBSCRIPTION_VOLUME_FEE',
    'MANAGED_COMMISSION_LOCKED',
    'MANAGED_COMMISSION_SETTLED'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN ('PAYMENT_SESSION', 'SETTLEMENT', 'COMMISSION')),
  source_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'USDT', 'POINTS')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RECOGNIZED', 'SETTLED')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(source_type, source_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_user_created
  ON revenue_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_events_type_created
  ON revenue_events(event_type, created_at DESC);
