PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_evidence_snapshots (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('d1', 'runtime-memory')),
  p0_passed INTEGER NOT NULL,
  p0_total INTEGER NOT NULL,
  p1_passed INTEGER NOT NULL,
  p1_total INTEGER NOT NULL,
  counters_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_evidence_snapshots_generated
  ON production_evidence_snapshots(generated_at DESC);
