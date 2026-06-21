PRAGMA foreign_keys = ON;

INSERT OR REPLACE INTO admins (admin_id, email, auth_subject, auth_provider, password_hash, role, created_at, last_login_at) VALUES
  ('admin-root', 'infor@polysmart.io', NULL, 'INTERNAL', '68db713d012319706c5f506159ba5b02fd11726b7bdbae250b4dac722faa3cdf', 'super_admin', '2026-06-05T00:00:00.000Z', NULL);

DELETE FROM admins WHERE admin_id <> 'admin-root' OR email <> 'infor@polysmart.io';

INSERT OR REPLACE INTO users (
  user_id, full_name, email, auth_subject, auth_provider, country, address, investor_tier, status, referral_code,
  email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at
) VALUES
  ('user-alpha', 'Avery Bennett', 'avery@polysmart.io', NULL, 'INTERNAL', 'Singapore', '88 Market Street, Singapore', 'professional', 'active', 'PSC-ALPHA', '2026-06-05T05:00:00.000Z', '2026-06-05T05:00:00.000Z', '2026-06-us-privacy-v1', '2026-06-05T05:00:00.000Z', '2026-01-26T00:00:00.000Z'),
  ('user-beta', 'Mason Rivera', 'mason@polysmart.io', NULL, 'INTERNAL', 'United States', '250 Hudson Street, New York, NY', 'retail', 'active', NULL, '2026-06-05T04:15:00.000Z', '2026-06-05T04:15:00.000Z', '2026-06-us-privacy-v1', '2026-06-05T04:15:00.000Z', '2026-03-23T00:00:00.000Z');

INSERT OR REPLACE INTO member_credentials (user_id, password_hash, created_at, updated_at) VALUES
  ('user-alpha', '1abf4af36dce5b07e85f938109ba1998ec4f8f33b3352e8127b8cc43e9ef22e9', '2026-06-05T05:00:00.000Z', '2026-06-05T05:00:00.000Z'),
  ('user-beta', '1abf4af36dce5b07e85f938109ba1998ec4f8f33b3352e8127b8cc43e9ef22e9', '2026-06-05T05:00:00.000Z', '2026-06-05T05:00:00.000Z');

INSERT OR REPLACE INTO billing_profiles (
  user_id, service_type, billing_mode, settlement_frequency, volume_fee_rate, performance_fee_rate,
  rent_expires_at, total_traded_volume_usd, points_balance, psc_balance, account_status, managed_usdt_address
) VALUES
  ('user-alpha', 'SELF_SERVICE', 'SUBSCRIPTION', 'DAILY', 0.015, 0.2, '2026-12-31T23:59:59.000Z', 253400, 4860, 4860, 'active', NULL),
  ('user-beta', 'MANAGED', 'PERFORMANCE', 'EVENT_END', 0.015, 0.2, NULL, 92600, 0, 1400, 'active', '0xManagedVaultBetaUsdt');

INSERT OR REPLACE INTO subscription_plans (
  plan_id, name, description, service_type, billing_mode, monthly_price_usd, included_points, stripe_price_id,
  billing_cycle_options_json, included_features_json, recommended
) VALUES
  ('managed-performance', 'Managed Performance', 'No fixed rent. Polysmart settles via profit-sharing at event close.', 'MANAGED', 'PERFORMANCE', 0, 0, NULL, '["MONTHLY","QUARTERLY","ANNUAL"]', '["20% performance sharing","Hands-off execution","Event-end reconciliation"]', 0),
  ('agent-pro', 'Agent Pro', 'Self-directed agent matrix with fixed points credits and self-managed account operations.', 'SELF_SERVICE', 'SUBSCRIPTION', 199, 2000, 'price_points_agent_pro', '["MONTHLY","QUARTERLY","ANNUAL"]', '["Fixed points credits","Stripe recharge","Multi-account binding"]', 1),
  ('institutional', 'Institutional', 'Expanded self-service points package with higher limits and priority support.', 'SELF_SERVICE', 'SUBSCRIPTION', 699, 10000, 'price_points_institutional', '["MONTHLY","QUARTERLY","ANNUAL"]', '["Dedicated buffer allocation","Priority support","Advanced reporting"]', 0);

INSERT OR REPLACE INTO subscriptions (
  user_id, plan_id, status, billing_cycle, started_at, next_billing_at, cancel_at, daily_quota, used_today, points_included, stripe_customer_id
) VALUES
  ('user-alpha', 'agent-pro', 'active', 'MONTHLY', '2026-05-04T00:00:00.000Z', '2026-07-03T00:00:00.000Z', NULL, 120, 24, 2000, 'cus_user_alpha'),
  ('user-beta', 'managed-performance', 'active', 'MONTHLY', '2026-05-18T00:00:00.000Z', NULL, NULL, 20, 3, 0, NULL);

INSERT OR REPLACE INTO invoices (
  id, user_id, plan_id, amount_usd, currency, status, description, period_label, created_at, hosted_invoice_url, payment_provider
) VALUES
  ('INV-1201', 'user-alpha', 'agent-pro', 199, 'USD', 'paid', 'Agent Pro monthly subscription', 'May 2026', '2026-05-22T00:00:00.000Z', 'https://billing.polysmart.io/invoices/INV-1201', 'STRIPE'),
  ('INV-1202', 'user-alpha', 'agent-pro', 199, 'USD', 'paid', 'Agent Pro monthly subscription', 'April 2026', '2026-04-22T00:00:00.000Z', 'https://billing.polysmart.io/invoices/INV-1202', 'STRIPE');

INSERT OR REPLACE INTO points_packages (package_id, name, points, amount_usd, stripe_price_id) VALUES
  ('points-500', '500 Points Pack', 500, 49, 'price_points_500'),
  ('points-2500', '2500 Points Pack', 2500, 199, 'price_points_2500');

INSERT OR REPLACE INTO commission_settlements (
  id, user_id, event_id, gross_profit_usd, commission_rate, commission_usd, net_payout_usd,
  settlement_frequency, settlement_asset, locked_usdt_amount, lock_status, status,
  created_at, settled_at, settled_by, managed_wallet_address, release_tx_ref
) VALUES
  ('COMM-3001', 'user-beta', 'EVT-003', 7200, 0.2, 1440, 5760, 'EVENT_END', 'USDT', 1440, 'LOCKED', 'PENDING', '2026-06-04T18:00:00.000Z', NULL, NULL, '0xManagedVaultBetaUsdt', NULL);

INSERT OR REPLACE INTO t0_events (id, platform, title, category, end_time_utc, edge_spread_pct, ai_win_probability) VALUES
  ('EVT-001', 'Polymarket', 'Will U.S. PCE inflation print below 2.8% today?', 'Macro', '2026-06-05T10:00:00.000Z', 3.4, 0.76),
  ('EVT-002', 'Kalshi', 'Will a Fed governor deliver a hawkish speech by market close?', 'Politics', '2026-06-05T12:00:00.000Z', 2.2, 0.68),
  ('EVT-003', 'PredictIt', 'Will the committee advance the bill in today''s hearing?', 'Regulation', '2026-06-05T14:00:00.000Z', 4.1, 0.81);

INSERT OR REPLACE INTO settlements (id, user_id, mode, event_id, traded_volume_usd, platform_revenue_usd, timestamp) VALUES
  ('SET-801', 'user-alpha', 'SUBSCRIPTION', 'EVT-001', 38000, 570, '2026-06-05T04:30:00.000Z'),
  ('SET-802', 'user-beta', 'PERFORMANCE', 'EVT-003', 22000, 1440, '2026-06-05T03:50:00.000Z');

INSERT OR REPLACE INTO accounts (
  account_id, user_id, platform, label, proxy_url, status, kyc_status, external_account_ref,
  wallet_address, wallet_chain, funding_asset, wallet_balance, funding_threshold_usd,
  can_trade, can_query, notes, last_sync_at, last_health_check_at, last_funding_sync_at
) VALUES
  ('acc-poly-1', 'user-alpha', 'polymarket', 'Poly Primary', 'socks5://proxy-a.example', 'healthy', 'verified', 'poly-alpha-main', '0x8ba1f109551bd432803012645ac136ddd64dba72', 'polygon', 'USDC', 2450, 500, 1, 1, 'Primary execution wallet for same-day T+0 events.', '2026-06-05T04:55:00.000Z', '2026-06-05T05:00:00.000Z', '2026-06-05T04:55:00.000Z'),
  ('acc-kalshi-1', 'user-alpha', 'kalshi', 'Kalshi Main', 'socks5://proxy-b.example', 'healthy', 'verified', 'kalshi-alpha-main', '0x9fBf9b4A44d91F0B6f0f3C6A8C95f5B3A52A6231', 'manual', 'USD', 1800, 300, 1, 1, 'Primary regulated venue account.', '2026-06-05T04:49:00.000Z', '2026-06-05T05:00:00.000Z', '2026-06-05T04:49:00.000Z');

INSERT OR REPLACE INTO asset_pool_state (
  pool_key, total_assets_usd, liquid_buffer_usd, total_shares, nav, high_watermark_nav, emergency_penalty_rate, updated_at
) VALUES
  ('primary', 890000, 133500, 810000, 1.0988, 1.0988, 0.02, '2026-06-05T05:00:00.000Z');

INSERT OR REPLACE INTO pool_members (user_id, shares, principal_usd, pnl_usd, high_watermark_nav) VALUES
  ('user-alpha', 124000, 120000, 6240, 1.092),
  ('user-beta', 91000, 85000, 4990, 1.071);

INSERT OR REPLACE INTO platform_config (
  config_key, scrape_frequency_minutes, alpha_floor, hedge_timeout_ms, emergency_buffer_ratio, updated_at
) VALUES
  ('primary', 15, 0.015, 800, 0.15, '2026-06-05T05:00:00.000Z');

INSERT OR REPLACE INTO risk_state (
  snapshot_key, inventory_deviation_pct, hedge_latency_ms, slippage_pct, blocked_accounts, anomaly_score,
  anomaly_flags_json, status, reason, updated_at
) VALUES
  ('current', 0.08, 420, 0.002, 0, 0.04, '[]', 'NORMAL', NULL, '2026-06-05T05:00:00.000Z');
