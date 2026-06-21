PRAGMA foreign_keys = ON;

ALTER TABLE payment_webhook_events
  ADD COLUMN livemode INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_webhook_events
  ADD COLUMN payment_status TEXT;

ALTER TABLE payment_webhook_events
  ADD COLUMN amount_total INTEGER;

ALTER TABLE payment_webhook_events
  ADD COLUMN currency TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_livemode_type_processed
  ON payment_webhook_events(livemode, event_type, processed_at DESC);
