PRAGMA foreign_keys = ON;

ALTER TABLE payment_sessions
  ADD COLUMN livemode INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_sessions
  ADD COLUMN checkout_mode TEXT;

ALTER TABLE payment_sessions
  ADD COLUMN payment_status TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_sessions_livemode_created
  ON payment_sessions(livemode, created_at DESC);
