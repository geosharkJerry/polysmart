PRAGMA foreign_keys = OFF;

CREATE TABLE admins_new (
  admin_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  auth_subject TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (auth_provider IN ('INTERNAL', 'LOGTO')),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin')),
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

INSERT INTO admins_new (admin_id, email, auth_subject, auth_provider, password_hash, role, created_at, last_login_at)
SELECT admin_id, email, NULL, 'INTERNAL', password_hash, role, created_at, last_login_at
FROM admins;

DROP TABLE admins;
ALTER TABLE admins_new RENAME TO admins;

CREATE TABLE users_new (
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

INSERT INTO users_new (
  user_id, full_name, email, auth_subject, auth_provider, country, address, investor_tier, status,
  referral_code, email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at
)
SELECT
  user_id, full_name, email, NULL, 'INTERNAL', country, address, investor_tier, status,
  referral_code, email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
