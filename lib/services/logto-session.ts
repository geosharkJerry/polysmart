import { d1Batch, d1First, getOptionalD1 } from "@/lib/db/d1";
import { MEMBER_REGISTRATION_DISCLOSURE_VERSION } from "@/lib/legal/member-registration-disclosure";
import { BillingCycle, SubscriptionPlanId } from "@/lib/types";

export const LOGTO_MEMBER_SESSION_COOKIE = "polysmart_member_session";
export const LOGTO_ADMIN_SESSION_COOKIE = "polysmart_admin_session";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function expiryIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function nextUserId() {
  return `user-${Math.floor(Math.random() * 900000 + 100000)}`;
}

function cycleDays(cycle: BillingCycle) {
  if (cycle === "QUARTERLY") {
    return 90;
  }
  if (cycle === "ANNUAL") {
    return 365;
  }
  return 30;
}

function quotaForPlan(planId: SubscriptionPlanId) {
  if (planId === "institutional") {
    return 500;
  }
  if (planId === "agent-pro") {
    return 120;
  }
  return 20;
}

function sanitizePlan(value?: string | null): SubscriptionPlanId {
  if (value === "managed-performance" || value === "institutional" || value === "agent-pro") {
    return value;
  }
  return "agent-pro";
}

function sanitizeCycle(value?: string | null): BillingCycle {
  if (value === "QUARTERLY" || value === "ANNUAL" || value === "MONTHLY") {
    return value;
  }
  return "MONTHLY";
}

async function findPlan(planId: SubscriptionPlanId) {
  const db = await getOptionalD1();
  if (db) {
    const row = await d1First<Record<string, unknown>>(
      `SELECT plan_id, service_type, billing_mode, included_points FROM subscription_plans WHERE plan_id = ? LIMIT 1`,
      [planId]
    );
    if (row) {
      return {
        planId,
        serviceType: String(row.service_type) as "SELF_SERVICE" | "MANAGED",
        billingMode: String(row.billing_mode) as "PERFORMANCE" | "SUBSCRIPTION",
        includedPoints: Number(row.included_points ?? 0)
      };
    }
  }

  const fallback = {
    "managed-performance": { serviceType: "MANAGED", billingMode: "PERFORMANCE", includedPoints: 0 },
    "agent-pro": { serviceType: "SELF_SERVICE", billingMode: "SUBSCRIPTION", includedPoints: 2000 },
    institutional: { serviceType: "SELF_SERVICE", billingMode: "SUBSCRIPTION", includedPoints: 10000 }
  } as const;
  const plan = fallback[planId] ?? fallback["agent-pro"];
  return { planId, ...plan };
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createLocalLogtoSession(args: {
  surface: "member" | "admin";
  subject: string;
  provider: "LOGTO";
  email?: string | null;
  emailVerified?: boolean | null;
  userId?: string | null;
  adminId?: string | null;
  planId?: string | null;
  billingCycle?: string | null;
}) {
  const db = await getOptionalD1();
  const token = randomToken();
  const expiresAt = expiryIso(args.surface === "admin" ? 8 : 168);
  const createdAt = new Date().toISOString();

  if (!db) {
    return { token, expiresAt };
  }

  if (args.surface === "member") {
    const selectedPlanId = sanitizePlan(args.planId);
    const selectedCycle = sanitizeCycle(args.billingCycle);
    const selectedPlan = await findPlan(selectedPlanId);
    const nextBillingAt = selectedPlan.billingMode === "SUBSCRIPTION"
      ? new Date(Date.now() + cycleDays(selectedCycle) * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const existing = await d1First<Record<string, unknown>>(
      `SELECT user_id, email, full_name, email_verified_at FROM users WHERE auth_subject = ? OR email = ? LIMIT 1`,
      [args.subject, args.email || ""]
    );
    const userId = args.userId || String(existing?.user_id || nextUserId());
    const email = args.email || String(existing?.email || "");
    const fullName = String(existing?.full_name || email.split("@")[0] || "Polysmart Member");
    const emailVerifiedAt = args.emailVerified ? createdAt : (existing?.email_verified_at ? String(existing.email_verified_at) : null);

    await d1Batch([
      db.prepare(
        `INSERT INTO users (user_id, full_name, email, auth_subject, auth_provider, country, address, investor_tier, status, referral_code, email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at)
         VALUES (?, ?, ?, ?, 'LOGTO', 'Unknown', '', 'retail', 'active', NULL, ?, NULL, NULL, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           full_name = excluded.full_name,
           email = excluded.email,
           auth_subject = excluded.auth_subject,
           auth_provider = excluded.auth_provider,
           email_verified_at = COALESCE(users.email_verified_at, excluded.email_verified_at),
           last_active_at = excluded.last_active_at`
      ).bind(userId, fullName, email, args.subject, emailVerifiedAt, createdAt, createdAt),
      db.prepare(
        `INSERT INTO member_sessions (token, user_id, issued_at, expires_at)
         VALUES (?, ?, ?, ?)`
      ).bind(token, userId, createdAt, expiresAt),
      db.prepare(
        `INSERT OR IGNORE INTO billing_profiles (
          user_id, service_type, billing_mode, settlement_frequency, volume_fee_rate, performance_fee_rate,
          rent_expires_at, total_traded_volume_usd, points_balance, psc_balance, account_status, managed_usdt_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'active', NULL)`
      ).bind(
        userId,
        selectedPlan.serviceType,
        selectedPlan.billingMode,
        selectedPlan.billingMode === "PERFORMANCE" ? "EVENT_END" : "DAILY",
        0.015,
        0.2,
        nextBillingAt
      ),
      db.prepare(
        `INSERT OR IGNORE INTO subscriptions (
          user_id, plan_id, status, billing_cycle, started_at, next_billing_at, cancel_at,
          daily_quota, used_today, points_included, stripe_customer_id
        ) VALUES (?, ?, 'trialing', ?, ?, ?, NULL, ?, 0, ?, NULL)`
      ).bind(userId, selectedPlan.planId, selectedCycle, createdAt, nextBillingAt, quotaForPlan(selectedPlan.planId), selectedPlan.includedPoints)
    ]);
  } else {
    const existing = await d1First<Record<string, unknown>>(
      `SELECT admin_id, email, full_name FROM admins WHERE auth_subject = ? OR email = ? LIMIT 1`,
      [args.subject, args.email || ""]
    );
    const adminId = args.adminId || String(existing?.admin_id || crypto.randomUUID());
    const email = args.email || String(existing?.email || "");
    const fullName = String(existing?.full_name || email.split("@")[0] || "Polysmart Super Admin");

    await d1Batch([
      db.prepare(
        `INSERT INTO admins (admin_id, email, full_name, password_hash, auth_subject, auth_provider, role, status, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, 'LOGTO', 'super_admin', 'active', ?, ?)
         ON CONFLICT(admin_id) DO UPDATE SET
           email = excluded.email,
           full_name = excluded.full_name,
           auth_subject = excluded.auth_subject,
           auth_provider = excluded.auth_provider,
           last_login_at = excluded.last_login_at`
      ).bind(adminId, email, fullName, await sha256Hex(`${args.subject}:admin`), args.subject, createdAt, createdAt),
      db.prepare(
        `INSERT INTO admin_sessions (token, admin_id, issued_at, expires_at)
         VALUES (?, ?, ?, ?)`
      ).bind(token, adminId, createdAt, expiresAt)
    ]);
  }

  return { token, expiresAt };
}

export async function getMemberByLogtoSessionToken(token: string) {
  const db = await getOptionalD1();
  if (!db || !token || token.length < 20) {
    return null;
  }

  const row = await d1First<Record<string, unknown>>(
    `SELECT s.token, s.user_id, s.issued_at, s.expires_at,
            u.full_name, u.email, u.auth_subject, u.auth_provider, u.country, u.address, u.investor_tier,
            u.status, u.referral_code, u.email_verified_at, u.privacy_consent_accepted_at,
            u.privacy_consent_version, u.last_active_at, u.created_at
     FROM member_sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.token = ?
     LIMIT 1`,
    [token]
  );
  if (!row || Date.parse(String(row.expires_at)) <= Date.now()) {
    return null;
  }

  return {
    userId: String(row.user_id),
    fullName: String(row.full_name),
    email: String(row.email),
    authSubject: row.auth_subject ? String(row.auth_subject) : null,
    authProvider: String(row.auth_provider ?? "LOGTO") as "INTERNAL" | "LOGTO",
    country: String(row.country),
    address: String(row.address ?? ""),
    investorTier: String(row.investor_tier) as "retail" | "professional" | "institutional",
    status: String(row.status) as "active" | "pending_review" | "suspended",
    referralCode: row.referral_code ? String(row.referral_code) : null,
    emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
    privacyConsentAcceptedAt: row.privacy_consent_accepted_at ? String(row.privacy_consent_accepted_at) : null,
    privacyConsentVersion: row.privacy_consent_version ? String(row.privacy_consent_version) : MEMBER_REGISTRATION_DISCLOSURE_VERSION,
    lastActiveAt: String(row.last_active_at),
    createdAt: String(row.created_at)
  };
}
