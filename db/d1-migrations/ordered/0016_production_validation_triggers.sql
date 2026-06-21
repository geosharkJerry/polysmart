PRAGMA foreign_keys = ON;

ALTER TABLE production_validation_runs
  ADD COLUMN trigger_source TEXT NOT NULL DEFAULT 'MANUAL_ADMIN'
  CHECK (trigger_source IN ('MANUAL_ADMIN', 'CRON_HTTP'));

ALTER TABLE production_validation_runs
  ADD COLUMN trigger_ref TEXT;
