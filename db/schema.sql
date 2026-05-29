CREATE TABLE polysmart_billing_profile (
    user_id VARCHAR(64) PRIMARY KEY,
    billing_mode VARCHAR(20) DEFAULT 'PERFORMANCE',
    settlement_frequency VARCHAR(20) DEFAULT 'EVENT_END',
    volume_fee_rate NUMERIC(5, 4) DEFAULT 0.0150,
    rent_expires_at TIMESTAMP,
    total_traded_volume_usd NUMERIC(16, 2) DEFAULT 0.00
);

CREATE TABLE polysmart_user_balance (
    user_id VARCHAR(64) PRIMARY KEY,
    psc_balance NUMERIC(16, 4) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_balance_user
        FOREIGN KEY(user_id) REFERENCES polysmart_billing_profile(user_id)
);

CREATE TABLE polysmart_account_matrix (
    account_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'approved',
    status VARCHAR(20) DEFAULT 'active',
    margin_balance_usd NUMERIC(16,2) DEFAULT 0,
    proxy_endpoint TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_matrix_user
        FOREIGN KEY(user_id) REFERENCES polysmart_billing_profile(user_id)
);

CREATE TABLE polysmart_settlement_ledger (
    settlement_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    billing_mode VARCHAR(20) NOT NULL,
    traded_volume_usd NUMERIC(16,2) NOT NULL,
    platform_revenue_usd NUMERIC(16,2) NOT NULL,
    settled_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ledger_user
        FOREIGN KEY(user_id) REFERENCES polysmart_billing_profile(user_id)
);

CREATE TABLE polysmart_t0_event_pool (
    event_id VARCHAR(64) PRIMARY KEY,
    source_platform VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    category VARCHAR(32),
    end_time_utc TIMESTAMP NOT NULL,
    ai_win_probability NUMERIC(5,4),
    spread_edge_pct NUMERIC(6,3),
    inserted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE polysmart_account_credentials (
    account_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    key_version VARCHAR(16) NOT NULL,
    proxy_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'healthy',
    last_health_check_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_cred_user
        FOREIGN KEY(user_id) REFERENCES polysmart_billing_profile(user_id)
);

CREATE TABLE polysmart_asset_pool_state (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    total_assets_usd NUMERIC(18,2) NOT NULL,
    liquid_buffer_usd NUMERIC(18,2) NOT NULL,
    total_shares NUMERIC(20,6) NOT NULL,
    nav NUMERIC(20,6) NOT NULL,
    emergency_penalty_rate NUMERIC(6,4) DEFAULT 0.0200,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE polysmart_pool_member (
    user_id VARCHAR(64) PRIMARY KEY,
    shares NUMERIC(20,6) NOT NULL,
    principal_usd NUMERIC(18,2) NOT NULL,
    pnl_usd NUMERIC(18,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_pool_user
        FOREIGN KEY(user_id) REFERENCES polysmart_billing_profile(user_id)
);

CREATE TABLE polysmart_risk_snapshot (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    inventory_deviation_pct NUMERIC(8,6) NOT NULL,
    hedge_latency_ms INTEGER NOT NULL,
    slippage_pct NUMERIC(8,6) NOT NULL,
    blocked_accounts INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);
