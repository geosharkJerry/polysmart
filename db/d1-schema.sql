PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  admin_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  auth_subject TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (auth_provider IN ('INTERNAL', 'LOGTO')),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin')),
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  auth_subject TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (auth_provider IN ('INTERNAL', 'LOGTO')),
  country TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  investor_tier TEXT NOT NULL CHECK (investor_tier IN ('retail', 'professional', 'institutional')),
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_review', 'suspended')),
  referral_code TEXT,
  email_verified_at TEXT,
  privacy_consent_accepted_at TEXT,
  privacy_consent_version TEXT,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_credentials (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_verifications (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  verified_at TEXT,
  delivery_status TEXT,
  delivery_provider TEXT,
  delivery_external_id TEXT,
  delivery_preview_url TEXT,
  delivered_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

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
  livemode INTEGER NOT NULL DEFAULT 0,
  checkout_mode TEXT,
  payment_status TEXT,
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
  livemode INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT,
  amount_total INTEGER,
  currency TEXT,
  processed_at TEXT NOT NULL,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS commission_settlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  gross_profit_usd REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_usd REAL NOT NULL,
  net_payout_usd REAL NOT NULL,
  settlement_frequency TEXT NOT NULL CHECK (settlement_frequency IN ('EVENT_END', 'DAILY', 'WEEKLY')),
  settlement_asset TEXT NOT NULL CHECK (settlement_asset IN ('USDT')),
  locked_usdt_amount REAL NOT NULL,
  lock_status TEXT NOT NULL CHECK (lock_status IN ('LOCKED', 'RELEASED')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SETTLED', 'HELD')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  settled_by TEXT,
  managed_wallet_address TEXT,
  release_tx_ref TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS t0_events (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('Polymarket', 'Kalshi', 'PredictIt')),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Politics', 'Macro', 'Crypto', 'Regulation')),
  end_time_utc TEXT NOT NULL,
  edge_spread_pct REAL NOT NULL,
  ai_win_probability REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('PERFORMANCE', 'SUBSCRIPTION')),
  event_id TEXT NOT NULL,
  traded_volume_usd REAL NOT NULL,
  platform_revenue_usd REAL NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS revenue_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'STRIPE_POINTS_TOPUP',
    'SUBSCRIPTION_VOLUME_FEE',
    'MANAGED_COMMISSION_LOCKED',
    'MANAGED_COMMISSION_SETTLED'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN ('PAYMENT_SESSION', 'SETTLEMENT', 'COMMISSION')),
  source_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'USDT', 'POINTS')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RECOGNIZED', 'SETTLED')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(source_type, source_id, event_type)
);

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  label TEXT NOT NULL,
  proxy_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'disabled')),
  kyc_status TEXT NOT NULL CHECK (kyc_status IN ('verified', 'pending', 'rejected')),
  external_account_ref TEXT,
  wallet_address TEXT,
  wallet_chain TEXT NOT NULL CHECK (wallet_chain IN ('polygon', 'ethereum', 'base', 'manual')),
  funding_asset TEXT NOT NULL CHECK (funding_asset IN ('USDC', 'USDT', 'USD', 'POINTS')),
  wallet_balance REAL NOT NULL DEFAULT 0,
  funding_threshold_usd REAL NOT NULL DEFAULT 0,
  can_trade INTEGER NOT NULL DEFAULT 1,
  can_query INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  last_sync_at TEXT NOT NULL,
  last_health_check_at TEXT NOT NULL,
  last_funding_sync_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_credentials (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  encrypted_payload TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_funding (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  amount_usd REAL NOT NULL,
  from_address TEXT,
  to_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  token_decimals INTEGER,
  detected_source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (detected_source IN ('RPC_SCAN', 'MANUAL')),
  rpc_latest_block INTEGER,
  scan_from_block INTEGER,
  scan_to_block INTEGER,
  detected_at TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  granted_permissions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_funding_probe_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  wallet_address TEXT,
  rpc_configured INTEGER NOT NULL,
  token_configured INTEGER NOT NULL,
  rpc_healthy INTEGER NOT NULL,
  latest_block INTEGER,
  token_decimals INTEGER,
  balance_before REAL NOT NULL,
  balance_after REAL NOT NULL,
  detected_transfer_count INTEGER NOT NULL,
  can_trade INTEGER NOT NULL,
  can_query INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PENDING', 'ERROR')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_permission_audits (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('FUNDING_SYNC', 'ADMIN_OVERRIDE')),
  can_trade INTEGER NOT NULL,
  can_query INTEGER NOT NULL,
  granted_permissions_json TEXT NOT NULL,
  wallet_balance REAL NOT NULL,
  funding_threshold_usd REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connector_probe_logs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  mode TEXT NOT NULL CHECK (mode IN ('mock', 'live')),
  healthy INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  message TEXT NOT NULL,
  credentials_configured INTEGER NOT NULL DEFAULT 0,
  kyc_satisfied INTEGER NOT NULL DEFAULT 0,
  query_permission_ok INTEGER NOT NULL DEFAULT 0,
  trade_permission_ok INTEGER NOT NULL DEFAULT 0,
  rate_limit_ok INTEGER NOT NULL DEFAULT 0,
  rate_limit_window_ms INTEGER NOT NULL DEFAULT 0,
  probe_source TEXT NOT NULL DEFAULT 'MOCK' CHECK (probe_source IN ('LIVE_API', 'MOCK')),
  bound_account_count INTEGER NOT NULL,
  verified_account_count INTEGER NOT NULL,
  query_enabled_count INTEGER NOT NULL,
  trade_enabled_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kelly_plans (
  kelly_plan_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'AUTO_ORCHESTRATOR')),
  mode TEXT CHECK (mode IN ('dry-run', 'live')),
  status TEXT NOT NULL CHECK (status IN ('READY', 'HALTED', 'CONSUMED')),
  recommended_notional_usd REAL NOT NULL,
  ai_json TEXT,
  pricing_json TEXT NOT NULL,
  kelly_input_json TEXT NOT NULL,
  kelly_output_json TEXT NOT NULL,
  order_books_json TEXT NOT NULL,
  execution_plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_intents (
  intent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  kelly_plan_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'LOCKED', 'EXECUTING', 'HEDGED', 'FAILED')),
  legs_json TEXT NOT NULL,
  strategy_context_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (kelly_plan_id) REFERENCES kelly_plans(kelly_plan_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS execution_orders (
  order_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  market_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type TEXT NOT NULL CHECK (order_type IN ('MAKER', 'TAKER')),
  limit_price REAL NOT NULL,
  notional_usd REAL NOT NULL,
  filled_usd REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PARTIAL', 'FILLED', 'CANCELED', 'REJECTED')),
  external_order_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_fills (
  fill_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  filled_usd REAL NOT NULL,
  avg_price REAL NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES execution_orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_transactions (
  tx_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMMITTED', 'ROLLED_BACK', 'FAILED')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  steps_json TEXT NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_inventory_locks (
  lock_id TEXT PRIMARY KEY,
  lock_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'EXPIRED')),
  lease_ms INTEGER NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  released_at TEXT,
  release_reason TEXT,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_anchors (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  merkle_root TEXT NOT NULL,
  payload_uri TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings_snapshot (
  id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS api_capability_status (
  capability_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('configured', 'placeholder', 'missing', 'disabled')),
  source_type TEXT NOT NULL,
  resolved_state TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_capability_status (
  capability_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('configured', 'placeholder', 'missing', 'disabled')),
  source_type TEXT NOT NULL,
  resolved_state TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ip_rules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ALLOW', 'DENY')),
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'member', 'api')),
  enabled INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS production_readiness_snapshots (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  probe_network INTEGER NOT NULL,
  p0_open INTEGER NOT NULL,
  p1_open INTEGER NOT NULL,
  summary_json TEXT NOT NULL,
  report_json TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS production_validation_runs (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  probe_network INTEGER NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'MANUAL_ADMIN' CHECK (trigger_source IN ('MANUAL_ADMIN', 'CRON_HTTP')),
  trigger_ref TEXT,
  status TEXT NOT NULL CHECK (status IN ('READY', 'OPEN', 'BLOCKED')),
  p0_open INTEGER NOT NULL,
  p1_open INTEGER NOT NULL,
  total_checks INTEGER NOT NULL,
  ready_checks INTEGER NOT NULL,
  summary_json TEXT NOT NULL,
  report_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_pool_state (
  pool_key TEXT PRIMARY KEY,
  total_assets_usd REAL NOT NULL,
  liquid_buffer_usd REAL NOT NULL,
  total_shares REAL NOT NULL,
  nav REAL NOT NULL,
  high_watermark_nav REAL NOT NULL,
  emergency_penalty_rate REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pool_members (
  user_id TEXT PRIMARY KEY,
  shares REAL NOT NULL,
  principal_usd REAL NOT NULL,
  pnl_usd REAL NOT NULL,
  high_watermark_nav REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_config (
  config_key TEXT PRIMARY KEY,
  scrape_frequency_minutes INTEGER NOT NULL,
  alpha_floor REAL NOT NULL,
  hedge_timeout_ms INTEGER NOT NULL,
  emergency_buffer_ratio REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_state (
  snapshot_key TEXT PRIMARY KEY,
  inventory_deviation_pct REAL NOT NULL,
  hedge_latency_ms INTEGER NOT NULL,
  slippage_pct REAL NOT NULL,
  blocked_accounts INTEGER NOT NULL,
  anomaly_score REAL NOT NULL,
  anomaly_flags_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NORMAL', 'CIRCUIT_BREAKER')),
  reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_profiles_mode ON billing_profiles(billing_mode);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_accounts_user_platform ON accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_account_synced ON wallet_funding(account_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_probe_logs_account_created ON wallet_funding_probe_logs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_permission_audits_account_created ON account_permission_audits(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_probe_logs_platform_created ON connector_probe_logs(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_probe_logs_live_evidence ON connector_probe_logs(platform, mode, healthy, credentials_configured, kyc_satisfied, query_permission_ok, trade_permission_ok, rate_limit_ok, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_settlements_user_status ON commission_settlements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_user_timestamp ON settlements(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user_created ON revenue_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type_created ON revenue_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_livemode_created ON payment_sessions(livemode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_session_processed ON payment_webhook_events(payment_session_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_livemode_type_processed ON payment_webhook_events(livemode, event_type, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_logs_created ON payment_reconciliation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kelly_plans_user_created ON kelly_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_intents_user_created ON execution_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_orders_intent_created ON execution_orders(intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_fills_intent_created ON execution_fills(intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_transactions_intent_started ON execution_transactions(intent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_inventory_locks_intent_acquired ON execution_inventory_locks(intent_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created ON audit_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_readiness_snapshots_generated ON production_readiness_snapshots(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_validation_runs_generated ON production_validation_runs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_evidence_snapshots_generated ON production_evidence_snapshots(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_scheduled_validation_attempts_created ON production_scheduled_validation_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_created ON admin_action_logs(admin_id, created_at DESC);
