PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_readiness_snapshots (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  probe_network INTEGER NOT NULL,
  p0_open INTEGER NOT NULL,
  p1_open INTEGER NOT NULL,
  summary_json TEXT NOT NULL,
  report_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_readiness_snapshots_generated
  ON production_readiness_snapshots(generated_at DESC);
