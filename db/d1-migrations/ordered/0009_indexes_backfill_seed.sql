PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_member_sessions_user_expires ON member_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_expires ON admin_sessions(admin_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_member_verifications_user_created ON member_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_mode ON billing_profiles(billing_mode);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_created ON payment_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_session_processed ON payment_webhook_events(payment_session_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user_platform ON accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_account_synced ON wallet_funding(account_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_permission_audits_account_created ON account_permission_audits(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kelly_plans_user_created ON kelly_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_intents_user_created ON execution_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_orders_intent_created ON execution_orders(intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_fills_intent_created ON execution_fills(intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_transactions_intent_started ON execution_transactions(intent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_inventory_locks_intent_acquired ON execution_inventory_locks(intent_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_settlements_user_status ON commission_settlements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_user_timestamp ON settlements(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_volume_charges_user_created ON trade_volume_charges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created ON audit_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON admin_action_logs(created_at DESC);

INSERT OR REPLACE INTO admins (admin_id, email, password_hash, role, created_at, last_login_at) VALUES
  ('admin-root', 'infor@polysmart.io', '68db713d012319706c5f506159ba5b02fd11726b7bdbae250b4dac722faa3cdf', 'super_admin', '2026-06-05T00:00:00.000Z', NULL);

INSERT OR IGNORE INTO subscription_plans (
  plan_id, name, description, service_type, billing_mode, monthly_price_usd, included_points, stripe_price_id,
  billing_cycle_options_json, included_features_json, recommended
) VALUES
  ('managed-performance', 'Managed Performance', 'No fixed rent. Polysmart settles via profit-sharing at event close.', 'MANAGED', 'PERFORMANCE', 0, 0, NULL, '["MONTHLY","QUARTERLY","ANNUAL"]', '["Managed execution","Performance sharing","Event-end reconciliation"]', 0),
  ('agent-pro', 'Agent Pro', 'Self-directed agent matrix with fixed points credits and self-managed account operations.', 'SELF_SERVICE', 'SUBSCRIPTION', 199, 2000, 'price_points_agent_pro', '["MONTHLY","QUARTERLY","ANNUAL"]', '["Fixed points credits","Stripe recharge","Multi-account binding"]', 1),
  ('institutional', 'Institutional', 'Expanded self-service points package with higher limits and priority support.', 'SELF_SERVICE', 'SUBSCRIPTION', 699, 10000, 'price_points_institutional', '["MONTHLY","QUARTERLY","ANNUAL"]', '["Dedicated buffer allocation","Priority support","Advanced reporting"]', 0);

INSERT OR IGNORE INTO points_packages (package_id, name, points, amount_usd, stripe_price_id) VALUES
  ('points-500', '500 Points Pack', 500, 49, 'price_points_500'),
  ('points-2500', '2500 Points Pack', 2500, 199, 'price_points_2500');

INSERT OR IGNORE INTO platform_config (
  config_key, scrape_frequency_minutes, alpha_floor, hedge_timeout_ms, emergency_buffer_ratio, updated_at
) VALUES
  ('primary', 15, 0.015, 800, 0.15, '2026-06-05T00:00:00.000Z');

INSERT OR IGNORE INTO risk_state (
  snapshot_key, inventory_deviation_pct, hedge_latency_ms, slippage_pct, blocked_accounts, anomaly_score,
  anomaly_flags_json, status, reason, updated_at
) VALUES
  ('current', 0, 0, 0, 0, 0, '[]', 'NORMAL', NULL, '2026-06-05T00:00:00.000Z');

INSERT OR IGNORE INTO asset_pool_state (
  pool_key, total_assets_usd, liquid_buffer_usd, total_shares, nav, high_watermark_nav, emergency_penalty_rate, updated_at
) VALUES
  ('primary', 0, 0, 0, 1, 1, 0.02, '2026-06-05T00:00:00.000Z');
