PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_reconciliation_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE')),
  payment_session_id TEXT,
  external_event_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PENDING', 'MISMATCH', 'ERROR')),
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_logs_created
  ON payment_reconciliation_logs(created_at DESC);
