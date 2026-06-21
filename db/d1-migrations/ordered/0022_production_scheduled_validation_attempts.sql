PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_scheduled_validation_attempts (
  id TEXT PRIMARY KEY,
  cron TEXT NOT NULL,
  scheduled_time TEXT,
  trigger_ref TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'ERROR')),
  response_status INTEGER,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_scheduled_validation_attempts_created
  ON production_scheduled_validation_attempts(created_at DESC);
