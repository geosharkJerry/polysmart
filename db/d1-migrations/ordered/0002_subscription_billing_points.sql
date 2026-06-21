PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS billing_profiles (
  user_id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('SELF_SERVICE', 'MANAGED')),
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('PERFORMANCE', 'SUBSCRIPTION')),
  settlement_frequency TEXT NOT NULL CHECK (settlement_frequency IN ('EVENT_END', 'DAILY', 'WEEKLY')),
  volume_fee_rate REAL NOT NULL DEFAULT 0.015,
  performance_fee_rate REAL NOT NULL DEFAULT 0.2,
  rent_expires_at TEXT,
  total_traded_volume_usd REAL NOT NULL DEFAULT 0,
  points_balance REAL NOT NULL DEFAULT 0,
  psc_balance REAL NOT NULL DEFAULT 0,
  account_status TEXT NOT NULL CHECK (account_status IN ('active', 'quota_exhausted', 'suspended')),
  managed_usdt_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('SELF_SERVICE', 'MANAGED')),
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('PERFORMANCE', 'SUBSCRIPTION')),
  monthly_price_usd REAL NOT NULL,
  included_points INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  billing_cycle_options_json TEXT NOT NULL,
  included_features_json TEXT NOT NULL,
  recommended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
  started_at TEXT NOT NULL,
  next_billing_at TEXT,
  cancel_at TEXT,
  daily_quota INTEGER NOT NULL DEFAULT 0,
  used_today INTEGER NOT NULL DEFAULT 0,
  points_included INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('paid', 'open', 'void')),
  description TEXT NOT NULL,
  period_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  hosted_invoice_url TEXT NOT NULL,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('STRIPE', 'INTERNAL')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

CREATE TABLE IF NOT EXISTS points_packages (
  package_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  amount_usd REAL NOT NULL,
  stripe_price_id TEXT
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  delta_points REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS billing_adjustments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  amount_usd REAL NOT NULL DEFAULT 0,
  points_delta REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
