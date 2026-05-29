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
