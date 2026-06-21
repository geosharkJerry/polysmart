PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_validation_runs (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  probe_network INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('READY', 'OPEN', 'BLOCKED')),
  p0_open INTEGER NOT NULL,
  p1_open INTEGER NOT NULL,
  total_checks INTEGER NOT NULL,
  ready_checks INTEGER NOT NULL,
  summary_json TEXT NOT NULL,
  report_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_validation_runs_generated
  ON production_validation_runs(generated_at DESC);
