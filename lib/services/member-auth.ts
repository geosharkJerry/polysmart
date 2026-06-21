import crypto from "node:crypto";
import { MEMBER_REGISTRATION_DISCLOSURE_VERSION } from "@/lib/legal/member-registration-disclosure";
import { d1Batch, d1First, getOptionalD1 } from "@/lib/db/d1";
import { nextId, pushAudit, runtimeState } from "@/lib/store";
import {
  BillingCycle,
  BillingProfile,
  InvestorTier,
  MemberCredential,
  MemberEmailDeliveryResult,
  MemberVerification,
  RegisteredUser,
  SubscriptionPlanId,
  UserSubscription
} from "@/lib/types";
import { sendMemberVerificationEmail } from "@/lib/services/member-email";

export const MEMBER_SESSION_COOKIE = "polysmart_member_session";

const MEMBER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  country: string;
  address: string;
  acceptedRegistrationTerms: boolean;
  investorTier: InvestorTier;
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
};

type RegisterMemberSuccess = {
  user: RegisteredUser;
  profile: BillingProfile;
  subscription: UserSubscription;
  verification: {
    token: string;
    verificationUrl: string;
    email: string;
  };
};

type RegisterMemberAsyncSuccess = RegisterMemberSuccess & {
  delivery: MemberEmailDeliveryResult;
};

type RegistrationBundle = {
  user: RegisteredUser;
  credential: MemberCredential;
  verification: MemberVerification;
  profile: BillingProfile;
  subscription: UserSubscription;
};

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(storedHash: string, password: string) {
  return storedHash === hashPassword(password);
}

function signToken(userId: string, expiresAt: string) {
  const payload = JSON.stringify({ userId, expiresAt });
  const signature = crypto
    .createHmac("sha256", process.env.MEMBER_JWT_SECRET || "polysmart-member-secret")
    .update(payload)
    .digest("hex");
  return Buffer.from(JSON.stringify({ payload, signature }), "utf8").toString("base64url");
}

function decodeToken(token: string): { userId: string; expiresAt: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      payload?: string;
      signature?: string;
    };
    if (!decoded.payload || !decoded.signature) {
      return null;
    }

    const expected = crypto
      .createHmac("sha256", process.env.MEMBER_JWT_SECRET || "polysmart-member-secret")
      .update(decoded.payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(decoded.signature), Buffer.from(expected))) {
      return null;
    }

    const payload = JSON.parse(decoded.payload) as { userId?: string; expiresAt?: string };
    if (!payload.userId || !payload.expiresAt) {
      return null;
    }

    return { userId: payload.userId, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
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

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function verificationUrlForToken(token: string) {
  const baseUrl = (process.env.APP_BASE_URL || "https://www.polysmart.io").replace(/\/+$/, "");
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

function createMemberSession(userId: string) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + MEMBER_SESSION_TTL_MS).toISOString();
  const token = signToken(userId, expiresAt);
  runtimeState.memberSessions[token] = {
    token,
    userId,
    authSubject: runtimeState.users[userId]?.authSubject ?? null,
    issuedAt,
    expiresAt
  };
  return token;
}

function hydrateMemberBundle(input: {
  user: RegisteredUser;
  profile?: BillingProfile | null;
  subscription?: UserSubscription | null;
  credential?: MemberCredential | null;
  verification?: MemberVerification | null;
}) {
  runtimeState.users[input.user.userId] = input.user;
  if (input.profile) {
    runtimeState.profiles[input.user.userId] = input.profile;
  }
  if (input.subscription) {
    runtimeState.subscriptions[input.user.userId] = input.subscription;
  }
  if (input.credential) {
    runtimeState.memberCredentials[input.user.userId] = input.credential;
  }
  if (input.verification) {
    runtimeState.memberVerifications[input.verification.token] = input.verification;
  }
}

function validationError(input: RegisterInput) {
  const email = normalizedEmail(input.email);
  if (!input.fullName.trim() || !email || !input.password.trim() || !input.country.trim() || !input.address.trim()) {
    return "Missing required registration fields";
  }
  if (input.password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!input.acceptedRegistrationTerms) {
    return "You must accept the registration privacy disclosure to continue";
  }
  return null;
}

function buildRegistrationBundle(input: RegisterInput): RegistrationBundle | { error: string } {
  const email = normalizedEmail(input.email);
  const plan = runtimeState.subscriptionPlans.find((entry) => entry.planId === input.planId);
  if (!plan) {
    return { error: "Selected plan was not found" } as const;
  }

  const userId = nextId("user");
  const createdAt = new Date().toISOString();
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  const verificationToken = signToken(userId, verificationExpiresAt);
  const nextBillingAt = plan.billingMode === "SUBSCRIPTION"
    ? new Date(Date.now() + cycleDays(input.billingCycle) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const user: RegisteredUser = {
    userId,
    fullName: input.fullName.trim(),
    email,
    authSubject: null,
    authProvider: "INTERNAL",
    country: input.country.trim(),
    address: input.address.trim(),
    investorTier: input.investorTier,
    status: "pending_review",
    referralCode: null,
    emailVerifiedAt: null,
    privacyConsentAcceptedAt: createdAt,
    privacyConsentVersion: MEMBER_REGISTRATION_DISCLOSURE_VERSION,
    lastActiveAt: createdAt,
    createdAt
  };

  const credential: MemberCredential = {
    userId,
    passwordHash: hashPassword(input.password),
    createdAt
  };

  const verification: MemberVerification = {
    token: verificationToken,
    userId,
    email,
    planId: input.planId,
    expiresAt: verificationExpiresAt,
    createdAt,
    verifiedAt: null,
    deliveryStatus: undefined,
    deliveryProvider: undefined,
    deliveryExternalId: null,
    deliveryPreviewUrl: null,
    deliveredAt: null
  };

  const profile: BillingProfile = {
    userId,
    serviceType: plan.serviceType,
    billingMode: plan.billingMode,
    settlementFrequency: plan.billingMode === "PERFORMANCE" ? "EVENT_END" : "DAILY",
    volumeFeeRate: 0.015,
    performanceFeeRate: runtimeState.systemSettings.payment.managedPerformanceFeeRate,
    rentExpiresAt: nextBillingAt,
    totalTradedVolumeUsd: 0,
    pointsBalance: 0,
    pscBalance: 0,
    accountStatus: "active",
    managedUsdtAddress: null
  };

  const subscription: UserSubscription = {
    userId,
    planId: input.planId,
    status: "trialing",
    billingCycle: input.billingCycle,
    startedAt: createdAt,
    nextBillingAt,
    cancelAt: null,
    dailyQuota: quotaForPlan(input.planId),
    usedToday: 0,
    pointsIncluded: plan.includedPoints,
    stripeCustomerId: null
  };

  return { user, credential, verification, profile, subscription } as const;
}

function finalizeRegistrationAudit(user: RegisteredUser, input: RegisterInput) {
  pushAudit("BILLING", "member registered", {
    userId: user.userId,
    email: user.email,
    planId: input.planId,
    billingCycle: input.billingCycle,
    consentVersion: MEMBER_REGISTRATION_DISCLOSURE_VERSION
  });
}

function applyVerificationDelivery(token: string, delivery: MemberEmailDeliveryResult) {
  const current = runtimeState.memberVerifications[token];
  if (!current) {
    return;
  }
  runtimeState.memberVerifications[token] = {
    ...current,
    deliveryStatus: delivery.status,
    deliveryProvider: delivery.provider,
    deliveryExternalId: delivery.externalId,
    deliveryPreviewUrl: delivery.previewUrl,
    deliveredAt: delivery.deliveredAt
  };
}

function mapUserRow(row: Record<string, unknown> | null): RegisteredUser | null {
  if (!row) {
    return null;
  }
  return {
    userId: String(row.user_id),
    fullName: String(row.full_name),
    email: String(row.email),
    authSubject: row.auth_subject ? String(row.auth_subject) : null,
    authProvider: String(row.auth_provider ?? "INTERNAL") as RegisteredUser["authProvider"],
    country: String(row.country),
    address: String(row.address ?? ""),
    investorTier: String(row.investor_tier) as InvestorTier,
    status: String(row.status) as RegisteredUser["status"],
    referralCode: row.referral_code ? String(row.referral_code) : null,
    emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
    privacyConsentAcceptedAt: row.privacy_consent_accepted_at ? String(row.privacy_consent_accepted_at) : null,
    privacyConsentVersion: row.privacy_consent_version ? String(row.privacy_consent_version) : null,
    lastActiveAt: String(row.last_active_at),
    createdAt: String(row.created_at)
  };
}

function mapProfileRow(row: Record<string, unknown> | null): BillingProfile | null {
  if (!row) {
    return null;
  }
  return {
    userId: String(row.user_id),
    serviceType: String(row.service_type) as BillingProfile["serviceType"],
    billingMode: String(row.billing_mode) as BillingProfile["billingMode"],
    settlementFrequency: String(row.settlement_frequency) as BillingProfile["settlementFrequency"],
    volumeFeeRate: Number(row.volume_fee_rate ?? 0.015),
    performanceFeeRate: Number(row.performance_fee_rate ?? 0.2),
    rentExpiresAt: row.rent_expires_at ? String(row.rent_expires_at) : null,
    totalTradedVolumeUsd: Number(row.total_traded_volume_usd ?? 0),
    pointsBalance: Number(row.points_balance ?? 0),
    pscBalance: Number(row.psc_balance ?? 0),
    accountStatus: String(row.account_status) as BillingProfile["accountStatus"],
    managedUsdtAddress: row.managed_usdt_address ? String(row.managed_usdt_address) : null
  };
}

function mapSubscriptionRow(row: Record<string, unknown> | null): UserSubscription | null {
  if (!row) {
    return null;
  }
  return {
    userId: String(row.user_id),
    planId: String(row.plan_id) as SubscriptionPlanId,
    status: String(row.status) as UserSubscription["status"],
    billingCycle: String(row.billing_cycle) as BillingCycle,
    startedAt: String(row.started_at),
    nextBillingAt: row.next_billing_at ? String(row.next_billing_at) : null,
    cancelAt: row.cancel_at ? String(row.cancel_at) : null,
    dailyQuota: Number(row.daily_quota ?? 0),
    usedToday: Number(row.used_today ?? 0),
    pointsIncluded: Number(row.points_included ?? 0),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null
  };
}

function mapCredentialRow(row: Record<string, unknown> | null): MemberCredential | null {
  if (!row) {
    return null;
  }
  return {
    userId: String(row.user_id),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at)
  };
}

function mapVerificationRow(row: Record<string, unknown> | null): MemberVerification | null {
  if (!row) {
    return null;
  }
  return {
    token: String(row.token),
    userId: String(row.user_id),
    email: String(row.email),
    planId: String(row.plan_id) as SubscriptionPlanId,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    deliveryStatus: row.delivery_status ? String(row.delivery_status) as MemberVerification["deliveryStatus"] : undefined,
    deliveryProvider: row.delivery_provider ? String(row.delivery_provider) as MemberVerification["deliveryProvider"] : undefined,
    deliveryExternalId: row.delivery_external_id ? String(row.delivery_external_id) : null,
    deliveryPreviewUrl: row.delivery_preview_url ? String(row.delivery_preview_url) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null
  };
}

function isMissingMemberTables(error: unknown) {
  return error instanceof Error && /no such table:\s*(member_credentials|member_sessions|member_verifications|users|billing_profiles|subscriptions)/i.test(error.message);
}

async function loadPersistedMemberBundle(userId: string) {
  const userRow = await d1First<Record<string, unknown>>(
    `SELECT user_id, full_name, email, country, address, investor_tier, status, referral_code,
            email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  const profileRow = await d1First<Record<string, unknown>>(
    `SELECT user_id, service_type, billing_mode, settlement_frequency, volume_fee_rate, performance_fee_rate,
            rent_expires_at, total_traded_volume_usd, points_balance, psc_balance, account_status, managed_usdt_address
     FROM billing_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  const subscriptionRow = await d1First<Record<string, unknown>>(
    `SELECT user_id, plan_id, status, billing_cycle, started_at, next_billing_at, cancel_at,
            daily_quota, used_today, points_included, stripe_customer_id
     FROM subscriptions
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  const user = mapUserRow(userRow);
  if (!user) {
    return null;
  }

  const profile = mapProfileRow(profileRow);
  const subscription = mapSubscriptionRow(subscriptionRow);
  hydrateMemberBundle({ user, profile, subscription });
  return { user, profile, subscription };
}

export function resolveMemberToken(authHeader?: string | null, cookieToken?: string | null) {
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return cookieToken || "";
}

export function getMemberByToken(token: string) {
  const decoded = decodeToken(token);
  if (!decoded || Date.parse(decoded.expiresAt) <= Date.now()) {
    return null;
  }

  const session = runtimeState.memberSessions[token];
  if (!session || session.userId !== decoded.userId) {
    return null;
  }

  const user = runtimeState.users[decoded.userId];
  if (!user) {
    return null;
  }

  return user;
}

export async function getMemberByTokenAsync(token: string) {
  const decoded = decodeToken(token);
  if (!decoded || Date.parse(decoded.expiresAt) <= Date.now()) {
    return null;
  }

  const db = await getOptionalD1();
  if (!db) {
    return getMemberByToken(token);
  }

  try {
    const sessionRow = await d1First<Record<string, unknown>>(
      `SELECT token, user_id, issued_at, expires_at
       FROM member_sessions
       WHERE token = ?
       LIMIT 1`,
      [token]
    );
    if (!sessionRow || String(sessionRow.user_id) !== decoded.userId) {
      return null;
    }

    runtimeState.memberSessions[token] = {
      token: String(sessionRow.token),
      userId: String(sessionRow.user_id),
      issuedAt: String(sessionRow.issued_at),
      expiresAt: String(sessionRow.expires_at)
    };

    const bundle = await loadPersistedMemberBundle(decoded.userId);
    return bundle?.user ?? null;
  } catch (error) {
    if (isMissingMemberTables(error)) {
      return getMemberByToken(token);
    }
    throw error;
  }
}

export function revokeMemberSession(token: string) {
  delete runtimeState.memberSessions[token];
}

export async function revokeMemberSessionAsync(token: string) {
  revokeMemberSession(token);
  const db = await getOptionalD1();
  if (!db) {
    return;
  }

  try {
    await db.prepare(`DELETE FROM member_sessions WHERE token = ?`).bind(token).run();
  } catch (error) {
    if (isMissingMemberTables(error)) {
      return;
    }
    throw error;
  }
}

export function registerMember(input: RegisterInput): RegisterMemberSuccess | { error: string } {
  const email = normalizedEmail(input.email);
  const error = validationError(input);
  if (error) {
    return { error } as const;
  }

  const existing = Object.values(runtimeState.users).find((user) => normalizedEmail(user.email) === email);
  if (existing) {
    return { error: "This email is already registered" } as const;
  }

  const bundle = buildRegistrationBundle(input);
  if ("error" in bundle) {
    return bundle;
  }

  hydrateMemberBundle(bundle);
  finalizeRegistrationAudit(bundle.user, input);

  return {
    user: bundle.user,
    profile: bundle.profile,
    subscription: bundle.subscription,
    verification: {
      token: bundle.verification.token,
      verificationUrl: `/verify-email?token=${encodeURIComponent(bundle.verification.token)}`,
      email
    }
  } as const;
}

export async function registerMemberAsync(input: RegisterInput): Promise<RegisterMemberAsyncSuccess | { error: string }> {
  const email = normalizedEmail(input.email);
  const error = validationError(input);
  if (error) {
    return { error } as const;
  }

  const db = await getOptionalD1();
  if (!db) {
    const result = registerMember(input);
    if ("error" in result) {
      return result;
    }

    const delivery = await sendMemberVerificationEmail({
      email: result.user.email,
      fullName: result.user.fullName,
      verificationToken: result.verification.token,
      verificationUrl: verificationUrlForToken(result.verification.token)
    });
    applyVerificationDelivery(result.verification.token, delivery);

    return {
      ...result,
      delivery,
      verification: {
        ...result.verification,
        verificationUrl: delivery.previewUrl || verificationUrlForToken(result.verification.token)
      }
    } as const;
  }

  try {
    const existing = await d1First<Record<string, unknown>>(
      `SELECT user_id FROM users WHERE lower(email) = ? LIMIT 1`,
      [email]
    );
    if (existing) {
      return { error: "This email is already registered" } as const;
    }

    const bundle = buildRegistrationBundle(input);
    if ("error" in bundle) {
      return bundle;
    }

    hydrateMemberBundle(bundle);

    await d1Batch([
      db.prepare(
        `INSERT INTO users (
          user_id, full_name, email, auth_subject, auth_provider, country, address, investor_tier, status, referral_code,
          email_verified_at, privacy_consent_accepted_at, privacy_consent_version, last_active_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        bundle.user.userId,
        bundle.user.fullName,
        bundle.user.email,
        bundle.user.authSubject,
        bundle.user.authProvider,
        bundle.user.country,
        bundle.user.address,
        bundle.user.investorTier,
        bundle.user.status,
        bundle.user.referralCode,
        bundle.user.emailVerifiedAt,
        bundle.user.privacyConsentAcceptedAt,
        bundle.user.privacyConsentVersion,
        bundle.user.lastActiveAt,
        bundle.user.createdAt
      ),
      db.prepare(
        `INSERT INTO member_credentials (user_id, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?)`
      ).bind(bundle.credential.userId, bundle.credential.passwordHash, bundle.credential.createdAt, bundle.credential.createdAt),
      db.prepare(
        `INSERT INTO member_verifications (
          token, user_id, email, plan_id, expires_at, created_at, verified_at,
          delivery_status, delivery_provider, delivery_external_id, delivery_preview_url, delivered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        bundle.verification.token,
        bundle.verification.userId,
        bundle.verification.email,
        bundle.verification.planId,
        bundle.verification.expiresAt,
        bundle.verification.createdAt,
        null,
        null,
        null,
        null,
        null,
        null
      ),
      db.prepare(
        `INSERT INTO billing_profiles (
          user_id, service_type, billing_mode, settlement_frequency, volume_fee_rate, performance_fee_rate,
          rent_expires_at, total_traded_volume_usd, points_balance, psc_balance, account_status, managed_usdt_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        bundle.profile.userId,
        bundle.profile.serviceType,
        bundle.profile.billingMode,
        bundle.profile.settlementFrequency,
        bundle.profile.volumeFeeRate,
        bundle.profile.performanceFeeRate,
        bundle.profile.rentExpiresAt,
        bundle.profile.totalTradedVolumeUsd,
        bundle.profile.pointsBalance,
        bundle.profile.pscBalance,
        bundle.profile.accountStatus,
        bundle.profile.managedUsdtAddress
      ),
      db.prepare(
        `INSERT INTO subscriptions (
          user_id, plan_id, status, billing_cycle, started_at, next_billing_at, cancel_at,
          daily_quota, used_today, points_included, stripe_customer_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        bundle.subscription.userId,
        bundle.subscription.planId,
        bundle.subscription.status,
        bundle.subscription.billingCycle,
        bundle.subscription.startedAt,
        bundle.subscription.nextBillingAt,
        bundle.subscription.cancelAt,
        bundle.subscription.dailyQuota,
        bundle.subscription.usedToday,
        bundle.subscription.pointsIncluded,
        bundle.subscription.stripeCustomerId
      )
    ]);

    const delivery = await sendMemberVerificationEmail({
      email: bundle.user.email,
      fullName: bundle.user.fullName,
      verificationToken: bundle.verification.token,
      verificationUrl: verificationUrlForToken(bundle.verification.token)
    });

    await db.prepare(
      `UPDATE member_verifications
       SET delivery_status = ?, delivery_provider = ?, delivery_external_id = ?, delivery_preview_url = ?, delivered_at = ?
       WHERE token = ?`
    ).bind(
      delivery.status,
      delivery.provider,
      delivery.externalId,
      delivery.previewUrl,
      delivery.deliveredAt,
      bundle.verification.token
    ).run();
    applyVerificationDelivery(bundle.verification.token, delivery);
    finalizeRegistrationAudit(bundle.user, input);

    return {
      user: bundle.user,
      profile: bundle.profile,
      subscription: bundle.subscription,
      verification: {
        token: bundle.verification.token,
        verificationUrl: delivery.previewUrl || verificationUrlForToken(bundle.verification.token),
        email: bundle.user.email
      },
      delivery
    } as const;
  } catch (error) {
    if (isMissingMemberTables(error)) {
      const result = registerMember(input);
      if ("error" in result) {
        return result;
      }
      const delivery = await sendMemberVerificationEmail({
        email: result.user.email,
        fullName: result.user.fullName,
        verificationToken: result.verification.token,
        verificationUrl: verificationUrlForToken(result.verification.token)
      });
      applyVerificationDelivery(result.verification.token, delivery);
      return {
        ...result,
        delivery,
        verification: {
          ...result.verification,
          verificationUrl: delivery.previewUrl || verificationUrlForToken(result.verification.token)
        }
      };
    }
    throw error;
  }
}

export function verifyMemberEmail(token: string) {
  const verification = runtimeState.memberVerifications[token];
  if (!verification) {
    return { error: "Verification token not found" } as const;
  }
  if (verification.verifiedAt) {
    return { error: "Verification token already used" } as const;
  }
  if (Date.parse(verification.expiresAt) <= Date.now()) {
    return { error: "Verification token expired" } as const;
  }

  const user = runtimeState.users[verification.userId];
  const subscription = runtimeState.subscriptions[verification.userId];
  if (!user || !subscription) {
    return { error: "Member record not found" } as const;
  }

  const verifiedAt = new Date().toISOString();
  verification.verifiedAt = verifiedAt;
  runtimeState.users[user.userId] = {
    ...user,
    emailVerifiedAt: verifiedAt,
    status: "active",
    lastActiveAt: verifiedAt
  };

  if (subscription.planId === "managed-performance") {
    runtimeState.subscriptions[user.userId] = {
      ...subscription,
      status: "active"
    };
  }

  const sessionToken = createMemberSession(user.userId);

  pushAudit("SYSTEM", "member email verified", {
    userId: user.userId,
    email: user.email
  });

  return {
    user: runtimeState.users[user.userId],
    subscription: runtimeState.subscriptions[user.userId],
    token: sessionToken
  } as const;
}

export async function verifyMemberEmailAsync(token: string) {
  const db = await getOptionalD1();
  if (!db) {
    return verifyMemberEmail(token);
  }

  try {
    const verification = mapVerificationRow(await d1First<Record<string, unknown>>(
      `SELECT token, user_id, email, plan_id, expires_at, created_at, verified_at,
              delivery_status, delivery_provider, delivery_external_id, delivery_preview_url, delivered_at
       FROM member_verifications
       WHERE token = ?
       LIMIT 1`,
      [token]
    ));
    if (!verification) {
      return { error: "Verification token not found" } as const;
    }
    if (verification.verifiedAt) {
      return { error: "Verification token already used" } as const;
    }
    if (Date.parse(verification.expiresAt) <= Date.now()) {
      return { error: "Verification token expired" } as const;
    }

    const bundle = await loadPersistedMemberBundle(verification.userId);
    if (!bundle?.user || !bundle.subscription) {
      return { error: "Member record not found" } as const;
    }

    const verifiedAt = new Date().toISOString();
    const sessionIssuedAt = new Date().toISOString();
    const sessionExpiresAt = new Date(Date.now() + MEMBER_SESSION_TTL_MS).toISOString();
    const sessionToken = signToken(bundle.user.userId, sessionExpiresAt);

    await d1Batch([
      db.prepare(`UPDATE member_verifications SET verified_at = ? WHERE token = ?`).bind(verifiedAt, token),
      db.prepare(`UPDATE users SET email_verified_at = ?, status = 'active', last_active_at = ? WHERE user_id = ?`).bind(verifiedAt, verifiedAt, bundle.user.userId),
      db.prepare(`INSERT OR REPLACE INTO member_sessions (token, user_id, issued_at, expires_at) VALUES (?, ?, ?, ?)`).bind(sessionToken, bundle.user.userId, sessionIssuedAt, sessionExpiresAt),
      bundle.subscription.planId === "managed-performance"
        ? db.prepare(`UPDATE subscriptions SET status = 'active' WHERE user_id = ?`).bind(bundle.user.userId)
        : db.prepare(`UPDATE subscriptions SET status = status WHERE user_id = ?`).bind(bundle.user.userId)
    ]);

    runtimeState.memberSessions[sessionToken] = {
      token: sessionToken,
      userId: bundle.user.userId,
      authSubject: bundle.user.authSubject ?? null,
      issuedAt: sessionIssuedAt,
      expiresAt: sessionExpiresAt
    };
    runtimeState.memberVerifications[token] = {
      ...verification,
      verifiedAt
    };
    runtimeState.users[bundle.user.userId] = {
      ...bundle.user,
      emailVerifiedAt: verifiedAt,
      status: "active",
      lastActiveAt: verifiedAt
    };
    runtimeState.subscriptions[bundle.user.userId] = bundle.subscription.planId === "managed-performance"
      ? { ...bundle.subscription, status: "active" }
      : bundle.subscription;

    pushAudit("SYSTEM", "member email verified", {
      userId: bundle.user.userId,
      email: bundle.user.email
    });

    return {
      user: runtimeState.users[bundle.user.userId],
      subscription: runtimeState.subscriptions[bundle.user.userId],
      token: sessionToken
    } as const;
  } catch (error) {
    if (isMissingMemberTables(error)) {
      return verifyMemberEmail(token);
    }
    throw error;
  }
}

export function loginMember(emailInput: string, password: string) {
  const email = normalizedEmail(emailInput);
  const user = Object.values(runtimeState.users).find((entry) => normalizedEmail(entry.email) === email);
  if (!user) {
    return null;
  }

  const credential = runtimeState.memberCredentials[user.userId];
  if (!credential || !verifyPassword(credential.passwordHash, password) || !user.emailVerifiedAt) {
    return null;
  }

  const token = createMemberSession(user.userId);
  runtimeState.users[user.userId] = {
    ...user,
    lastActiveAt: new Date().toISOString()
  };

  return {
    user: runtimeState.users[user.userId],
    token
  };
}

export async function loginMemberAsync(emailInput: string, password: string) {
  const email = normalizedEmail(emailInput);
  const db = await getOptionalD1();
  if (!db) {
    return loginMember(email, password);
  }

  try {
    const row = await d1First<Record<string, unknown>>(
      `SELECT u.user_id, u.full_name, u.email, u.auth_subject, u.auth_provider, u.country, u.address, u.investor_tier, u.status, u.referral_code,
              u.email_verified_at, u.privacy_consent_accepted_at, u.privacy_consent_version, u.last_active_at, u.created_at,
              mc.password_hash, mc.created_at AS credential_created_at
       FROM users u
       JOIN member_credentials mc ON mc.user_id = u.user_id
       WHERE lower(u.email) = ?
       LIMIT 1`,
      [email]
    );
    const user = mapUserRow(row);
    if (!user) {
      return null;
    }

    const credential = mapCredentialRow(row ? {
      user_id: row.user_id,
      password_hash: row.password_hash,
      created_at: row.credential_created_at
    } : null);
    if (!credential || !verifyPassword(credential.passwordHash, password) || !user.emailVerifiedAt) {
      return null;
    }

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + MEMBER_SESSION_TTL_MS).toISOString();
    const token = signToken(user.userId, expiresAt);

    await d1Batch([
      db.prepare(`INSERT OR REPLACE INTO member_sessions (token, user_id, issued_at, expires_at) VALUES (?, ?, ?, ?)`).bind(token, user.userId, issuedAt, expiresAt),
      db.prepare(`UPDATE users SET last_active_at = ? WHERE user_id = ?`).bind(issuedAt, user.userId)
    ]);

    runtimeState.memberSessions[token] = {
      token,
      userId: user.userId,
      authSubject: user.authSubject ?? null,
      issuedAt,
      expiresAt
    };
    const bundle = await loadPersistedMemberBundle(user.userId);
    hydrateMemberBundle({
      user: bundle?.user ? { ...bundle.user, lastActiveAt: issuedAt } : { ...user, lastActiveAt: issuedAt },
      subscription: bundle?.subscription,
      profile: bundle?.profile,
      credential
    });

    return {
      user: runtimeState.users[user.userId],
      token
    };
  } catch (error) {
    if (isMissingMemberTables(error)) {
      return loginMember(email, password);
    }
    throw error;
  }
}
