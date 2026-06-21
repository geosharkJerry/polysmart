PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE')),
  package_id TEXT NOT NULL,
  points_granted INTEGER NOT NULL,
  amount_usd REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  stripe_session_id TEXT,
  checkout_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES points_packages(package_id)
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE')),
  event_type TEXT NOT NULL,
  payment_session_id TEXT,
  stripe_session_id TEXT,
  processed_at TEXT NOT NULL,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_reconciliation_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE')),
  payment_session_id TEXT,
  external_event_id TEXT,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);
