"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { SettlementTrapWidget } from "@/components/SettlementTrapWidget";
import { PageHero } from "@/components/PageHero";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActionBar, AppButton, AppInput, AppSelect, DataTable, FormField, FormGrid, InlineGroup, PanelSection, RecordGrid, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";
import { ConsoleCommandCenter } from "@/components/admin/modern/ConsoleCommandCenter";
import { GlyphBadge } from "@/components/VisualAssets";
import { MEMBER_REGISTRATION_DISCLOSURE } from "@/lib/legal/member-registration-disclosure";
import {
  AccountPermissionAuditRecord,
  AuditLog,
  AtomicTransaction,
  BillingCycle,
  BillingProfile,
  CommissionSettlementRecord,
  ExecutionIntent,
  FillRecord,
  InvoiceRecord,
  InventoryLock,
  KellyPlan,
  MatrixAccount,
  OrderRecord,
  PaymentSessionRecord,
  PointsPackage,
  RegisteredUser,
  RiskMetrics,
  SettlementLedger,
  SubscriptionPlan,
  UserSubscription
} from "@/lib/types";

type ConsoleWorkspace = {
  user: RegisteredUser;
  profile: BillingProfile;
  subscription: UserSubscription;
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  invoices: InvoiceRecord[];
  pointsPackages: PointsPackage[];
  paymentSessions: PaymentSessionRecord[];
  accounts: MatrixAccount[];
  commissions: CommissionSettlementRecord[];
  settlements: SettlementLedger[];
  kellyPlans: KellyPlan[];
  accountPermissionAudits: Array<
    AccountPermissionAuditRecord & {
      userId: string;
      userName: string;
      accountLabel: string;
      platform: string;
    }
  >;
  fundingRecords: Array<{
    id: string;
    accountId: string;
    accountLabel: string;
    platform: string;
    walletAddress: string;
    walletChain: string;
    asset: string;
    amount: number;
    txHash: string;
    confirmedAt: string;
    grantedPermissions: Array<"QUERY" | "TRADE">;
  }>;
  fundingSummary: {
    fundedWalletBalance: number;
    totalWalletFunding: number;
    totalWalletFundingCount: number;
    totalRechargeUsd: number;
    totalRechargePoints: number;
    grossArbitrageProfitUsd: number;
    totalCommissionUsd: number;
    totalNetPayoutUsd: number;
    totalTrackedVolumeUsd: number;
  };
  execution: {
    intents: ExecutionIntent[];
    orders: OrderRecord[];
    fills: FillRecord[];
    transactions: AtomicTransaction[];
    locks: InventoryLock[];
  };
  autoRunAudits: AuditLog[];
  risk: RiskMetrics;
  events: Array<{ id: string; title: string; edgeSpreadPct: number; aiWinProbability: number; platform: string }>;
  config: { scrapeFrequencyMinutes: number };
};



const softPanelClass = "rounded-[28px] border border-sky-100 bg-white/20 p-5 backdrop-blur dark:border-white/15 dark:bg-white/10";
const postureStripClass = "flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-sky-100 bg-white/90 p-5 shadow-sm dark:border-white/15 dark:bg-slate-950/72";
const recordPanelClass = "rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-slate-950/88";
const tintedRecordPanelClass = "rounded-2xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm dark:border-white/15 dark:bg-white/10";
const emptyStateClass = "rounded-2xl border border-dashed border-sky-100 bg-sky-50/50 p-4 text-sm text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300";
const countryOptions = [
  "United States", "Canada", "United Kingdom", "Australia", "New Zealand", "Singapore", "Hong Kong", "Japan", "South Korea", "Taiwan", "United Arab Emirates", "Germany", "France", "Italy", "Spain", "Netherlands", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Brazil", "Mexico", "India", "Malaysia", "Thailand", "Indonesia", "Philippines", "Vietnam", "South Africa", "Other"
];

const emptyWorkspace: ConsoleWorkspace = {
  user: {
    userId: "",
    fullName: "",
    email: "",
    authSubject: null,
    authProvider: "INTERNAL",
    country: "",
    address: "",
    investorTier: "retail",
    status: "pending_review",
    referralCode: null,
    emailVerifiedAt: null,
    privacyConsentAcceptedAt: null,
    privacyConsentVersion: null,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  profile: {
    userId: "",
    serviceType: "SELF_SERVICE",
    billingMode: "SUBSCRIPTION",
    settlementFrequency: "DAILY",
    volumeFeeRate: 0.015,
    performanceFeeRate: 0.2,
    rentExpiresAt: null,
    totalTradedVolumeUsd: 0,
    pointsBalance: 0,
    pscBalance: 0,
    accountStatus: "active",
    managedUsdtAddress: null
  },
  subscription: {
    userId: "",
    planId: "agent-pro",
    status: "active",
    billingCycle: "MONTHLY",
    startedAt: new Date().toISOString(),
    nextBillingAt: null,
    cancelAt: null,
    dailyQuota: 0,
    usedToday: 0,
    pointsIncluded: 0,
    stripeCustomerId: null
  },
  plan: null,
  plans: [],
  invoices: [],
  pointsPackages: [],
  paymentSessions: [],
  accounts: [],
  commissions: [],
  settlements: [],
  kellyPlans: [],
  accountPermissionAudits: [],
  fundingRecords: [],
  fundingSummary: {
    fundedWalletBalance: 0,
    totalWalletFunding: 0,
    totalWalletFundingCount: 0,
    totalRechargeUsd: 0,
    totalRechargePoints: 0,
    grossArbitrageProfitUsd: 0,
    totalCommissionUsd: 0,
    totalNetPayoutUsd: 0,
    totalTrackedVolumeUsd: 0
  },
  execution: {
    intents: [],
    orders: [],
    fills: [],
    transactions: [],
    locks: []
  },
  autoRunAudits: [],
  risk: {
    inventoryDeviationPct: 0,
    hedgeLatencyMs: 0,
    slippagePct: 0,
    blockedAccounts: 0,
    anomalyScore: 0,
    anomalyFlags: [],
    status: "NORMAL",
    reason: null,
    updatedAt: new Date().toISOString()
  },
  events: [],
  config: { scrapeFrequencyMinutes: 15 }
};

export default function ConsolePage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState("");
  const [workspace, setWorkspace] = useState<ConsoleWorkspace>(emptyWorkspace);
  const [selectedPlan, setSelectedPlan] = useState("agent-pro");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [settlementFrequency, setSettlementFrequency] = useState<BillingProfile["settlementFrequency"]>("DAILY");
  const [volumeFeeRate, setVolumeFeeRate] = useState(0.015);
  const [scrapeFrequency, setScrapeFrequency] = useState(15);
  const [status, setStatus] = useState("Loading workspace...");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [memberProfileDraft, setMemberProfileDraft] = useState({
    fullName: "",
    country: "",
    address: "",
    investorTier: "retail",
    acceptedRegistrationTerms: false
  });
  const [bindStatus, setBindStatus] = useState("");
  const [chargeStatus, setChargeStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [strategyStatus, setStrategyStatus] = useState("No strategy action has been run yet.");
  const [strategyQuote, setStrategyQuote] = useState<any>(null);
  const [strategyContext, setStrategyContext] = useState<any>(null);
  const [strategySimulation, setStrategySimulation] = useState<any>(null);
  const [selectedStrategyEventId, setSelectedStrategyEventId] = useState("");
  const [selectedStrategyUserId, setSelectedStrategyUserId] = useState("");
  const [selectedStrategyIntentId, setSelectedStrategyIntentId] = useState("");
  const [strategySignature, setStrategySignature] = useState<any>(null);
  const [strategyRoutePlan, setStrategyRoutePlan] = useState<any>(null);
  const [strategyExecutionSnapshot, setStrategyExecutionSnapshot] = useState<any>(null);
  const [selectedFundingAccountId, setSelectedFundingAccountId] = useState("");
  const [tradeVolume, setTradeVolume] = useState(10000);
  const [strategyDraft, setStrategyDraft] = useState({
    polyYesBid: 0.54,
    kalshiNoBid: 0.45,
    friction: 0.004,
    alphaFloor: 0.015,
    inventory: 0,
    riskAversion: 0.1,
    timeToSettlementHours: 6,
    totalOrderUsd: 1000,
    impactScore: 0.6,
    probabilityEdge: 0.58,
    liquidityScore: 0.62,
    timeDecay: 0.5,
    riskScore: 0.2,
    executionCost: 0.12,
    timeoutMs: 800,
    legAFilled: true,
    legBFillDelayMs: 600,
    forcedTakerCostPct: 0.005,
    leaseMs: 1200
  });
  const [newAccount, setNewAccount] = useState({
    platform: "polymarket",
    label: "",
    proxyUrl: "",
    externalAccountRef: "",
    apiKey: "",
    walletAddress: "",
    walletChain: "polygon",
    fundingAsset: "USDC",
    fundingThresholdUsd: 100
  });

  const readValue = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => event.target.value;

  const loadWorkspace = async (targetUserId: string) => {
    const res = await fetch(`/api/console/workspace/${targetUserId}`);
    if (!res.ok) {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      throw new Error("Failed to load workspace");
    }

    const payload: ConsoleWorkspace = await res.json();
    setWorkspace(payload);
    const complete = Boolean(
      payload.user.fullName.trim() &&
      payload.user.country.trim() &&
      payload.user.country !== "Unknown" &&
      payload.user.address.trim() &&
      payload.user.privacyConsentAcceptedAt
    );
    setProfileComplete(complete);
    setMemberProfileDraft({
      fullName: payload.user.fullName || "",
      country: payload.user.country === "Unknown" ? "" : payload.user.country || "",
      address: payload.user.address || "",
      investorTier: payload.user.investorTier || "retail",
      acceptedRegistrationTerms: Boolean(payload.user.privacyConsentAcceptedAt)
    });
    setSelectedPlan(payload.subscription.planId);
    setBillingCycle(payload.subscription.billingCycle);
    setSettlementFrequency(payload.profile.settlementFrequency);
    setVolumeFeeRate(payload.profile.volumeFeeRate);
    setScrapeFrequency(payload.config.scrapeFrequencyMinutes);
    setStatus("Workspace synced.");
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((payload) => {
        if (!payload?.user?.userId) {
          return;
        }
        setCurrentUserId(String(payload.user.userId));
        return loadWorkspace(String(payload.user.userId));
      })
      .catch(() => setStatus("Failed to load workspace."));
  }, [router]);

  useEffect(() => {
    if (workspace.accounts.length === 0) {
      setSelectedFundingAccountId("");
      return;
    }

    if (!workspace.accounts.some((account) => account.accountId === selectedFundingAccountId)) {
      const preferred = workspace.accounts.find((account) => account.walletAddress) ?? workspace.accounts[0];
      setSelectedFundingAccountId(preferred.accountId);
    }
  }, [workspace.accounts, selectedFundingAccountId]);

  const remainingQuota = useMemo(
    () => Math.max(workspace.subscription.dailyQuota - workspace.subscription.usedToday, 0),
    [workspace.subscription.dailyQuota, workspace.subscription.usedToday]
  );

  const pendingCommission = useMemo(
    () => workspace.commissions.filter((item) => item.status !== "SETTLED").reduce((sum, item) => sum + item.commissionUsd, 0),
    [workspace.commissions]
  );
  const latestPendingSession = useMemo(
    () => workspace.paymentSessions.find((session) => session.status === "pending") ?? null,
    [workspace.paymentSessions]
  );
  const selectedFundingAccount = useMemo(
    () => workspace.accounts.find((account) => account.accountId === selectedFundingAccountId) ?? null,
    [workspace.accounts, selectedFundingAccountId]
  );
  const workspaceReady = Boolean(currentUserId && workspace.user.userId);
  const hasAccounts = workspace.accounts.length > 0;

  const saveCommercialSettings = async () => {
    if (!currentUserId) {
      setStatus("Member session missing.");
      return;
    }
    setStatus("Saving commercial workspace...");
    const [subscriptionRes, profileRes, configRes] = await Promise.all([
      fetch(`/api/subscriptions/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, billingCycle, status: "active" })
      }),
      fetch(`/api/billing/profile/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementFrequency, volumeFeeRate })
      }),
      fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeFrequencyMinutes: scrapeFrequency })
      })
    ]);

    if (!subscriptionRes.ok || !profileRes.ok || !configRes.ok) {
      setStatus("Save failed. Check subscription and billing values.");
      return;
    }

    await loadWorkspace(currentUserId);
    setStatus("Commercial settings saved.");
  };

  const saveMemberProfile = async () => {
    setProfileStatus("Saving member profile...");
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberProfileDraft)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setProfileStatus(String(payload.message || "Profile completion failed."));
      return;
    }
    setProfileComplete(Boolean(payload.profileComplete));
    setProfileStatus("Member profile completed.");
    if (currentUserId) {
      await loadWorkspace(currentUserId);
    }
  };

  const bindMatrixAccount = async () => {
    if (!currentUserId) {
      setBindStatus("Member session missing.");
      return;
    }
    setBindStatus("Binding account...");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        platform: newAccount.platform,
        label: newAccount.label,
        proxyUrl: newAccount.proxyUrl,
        credentials: { apiKey: newAccount.apiKey },
        walletAddress: newAccount.walletAddress || undefined,
        walletChain: newAccount.walletChain,
        fundingAsset: newAccount.fundingAsset,
        fundingThresholdUsd: newAccount.fundingThresholdUsd
      })
    });

    const payload = (await res.json()) as any;
    if (!res.ok) {
      setBindStatus(payload.message || "Failed to bind account.");
      return;
    }

    if (newAccount.externalAccountRef) {
      await fetch(`/api/accounts/${payload.account.accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalAccountRef: newAccount.externalAccountRef,
          notes: "Linked from unified user console"
        })
      });
    }

    setNewAccount({
      platform: "polymarket",
      label: "",
      proxyUrl: "",
      externalAccountRef: "",
      apiKey: "",
      walletAddress: "",
      walletChain: "polygon",
      fundingAsset: "USDC",
      fundingThresholdUsd: 100
    });
    setBindStatus(`Account linked: ${payload.account.accountId}`);
    await loadWorkspace(currentUserId);
  };

  const syncFunding = async (accountId: string) => {
    setBindStatus(`Syncing wallet funding for ${accountId}...`);
    const res = await fetch(`/api/accounts/${accountId}/funding`, {
      method: "POST"
    });
    const payload = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      setBindStatus(String(payload.message || "Funding sync failed."));
      return;
    }
    setBindStatus(`Funding synced for ${accountId}.`);
    await loadWorkspace(currentUserId);
  };

  const simulateVolumeCharge = async () => {
    if (!currentUserId) {
      setChargeStatus("Member session missing.");
      return;
    }
    setChargeStatus("Charging live volume fee...");
    const res = await fetch("/api/trades/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, eventId: workspace.events[0]?.id ?? "MANUAL", executedVolumeUsd: tradeVolume })
    });
    const payload = (await res.json()) as any;
    if (!res.ok) {
      setChargeStatus(payload.message || "Charge failed.");
      return;
    }

    setChargeStatus(payload.code);
    await loadWorkspace(currentUserId);
  };

  const startRecharge = async (packageId: string) => {
    if (!currentUserId) {
      setPaymentStatus("Member session missing.");
      return;
    }
    setPaymentStatus("Creating Stripe checkout...");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.polysmart.io";
    const res = await fetch("/api/payments/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        packageId,
        successUrl: `${origin}/workspace?checkout=success`,
        cancelUrl: `${origin}/workspace?checkout=cancel`
      })
    });
    const payload = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      setPaymentStatus(String(payload.message || "Failed to create checkout session."));
      return;
    }

    if (typeof window !== "undefined" && payload.checkoutUrl) {
      window.open(String(payload.checkoutUrl), "_blank", "noopener,noreferrer");
    }

    setPaymentStatus(`Checkout session created: ${payload.id}`);
    await loadWorkspace(currentUserId);
  };

  const confirmRecharge = async (sessionId: string, stripeSessionId?: string | null) => {
    setPaymentStatus("Confirming Stripe recharge...");
    const res = await fetch("/api/payments/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stripeSessionId })
    });
    const payload = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      setPaymentStatus(String(payload.message || "Failed to confirm payment."));
      return;
    }

    setPaymentStatus(`Recharge completed: ${payload.session?.pointsGranted ?? 0} points added.`);
    await loadWorkspace(currentUserId);
  };

  const loadStrategySnapshot = async () => {
    if (!currentUserId || !selectedStrategyEventId) {
      setStrategyStatus("Choose an event and user first.");
      return;
    }
    setStrategyStatus("Loading trading context...");
    const contextRes = await fetch("/api/execution/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedStrategyEventId,
        userId: selectedStrategyUserId || currentUserId,
        minNotionalUsd: strategyDraft.totalOrderUsd,
        maxFraction: 0.08,
        fractionalKelly: 0.25,
        riskAversion: strategyDraft.riskAversion,
        mode: "dry-run"
      })
    });
    const contextPayload = await contextRes.json().catch(() => ({}));
    if (!contextRes.ok) {
      setStrategyStatus(String(contextPayload.message || "Context failed."));
      return;
    }
    setStrategyContext(contextPayload);
    setSelectedStrategyIntentId(String(contextPayload.kellyPlanId || ""));
    setStrategyStatus(`Trading context ready: ${contextPayload.kellyPlanId}`);
  };

  const runStrategyQuote = async () => {
    setStrategyStatus("Generating quote...");
    const res = await fetch("/api/strategy/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(strategyDraft)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrategyStatus(String(payload.message || "Quote failed."));
      return;
    }
    setStrategyQuote(payload);
    setStrategyStatus(`Quote complete · edge ${(payload.score?.composite ?? 0).toFixed?.(4) ?? payload.score?.composite ?? 0}`);
  };

  const runStrategySimulation = async () => {
    setStrategyStatus("Running execution simulation...");
    const res = await fetch("/api/execution/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeoutMs: strategyDraft.timeoutMs,
        legAFilled: strategyDraft.legAFilled,
        legBFillDelayMs: strategyDraft.legBFillDelayMs,
        forcedTakerCostPct: strategyDraft.forcedTakerCostPct
      })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrategyStatus(String(payload.message || "Simulation failed."));
      return;
    }
    setStrategySimulation(payload);
    setStrategyStatus(`Simulation complete · ${payload.state ?? "ok"}`);
  };

  const loadStrategyExecutionSnapshot = async (intentId?: string) => {
    const res = await fetch(`/api/execution/intents${intentId ? `?intentId=${intentId}` : ""}`, { cache: "no-store" });
    if (!res.ok) {
      setStrategyStatus("Failed to load execution snapshot.");
      return;
    }
    const payload = await res.json();
    setStrategyExecutionSnapshot(payload);
    if (!selectedStrategyIntentId && payload.intents?.[0]?.intentId) {
      setSelectedStrategyIntentId(payload.intents[0].intentId);
    }
  };

  const createStrategyIntent = async () => {
    if (!strategyContext?.kellyPlanId) {
      setStrategyStatus("Load a trading context first.");
      return;
    }
    setStrategyStatus("Creating execution intent...");
    const res = await fetch("/api/execution/intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, kellyPlanId: strategyContext.kellyPlanId })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrategyStatus(String(payload.message || "Intent creation failed."));
      return;
    }
    setSelectedStrategyIntentId(String(payload.intent?.intentId ?? ""));
    setStrategyStatus(`Intent created: ${payload.intent?.intentId ?? "unknown"}`);
    await loadStrategyExecutionSnapshot(String(payload.intent?.intentId ?? ""));
  };

  const signStrategyIntent = async () => {
    if (!selectedStrategyIntentId) {
      setStrategyStatus("Select an execution intent first.");
      return;
    }
    setStrategyStatus("Signing execution intent...");
    const res = await fetch("/api/execution/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: selectedStrategyIntentId })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrategyStatus(String(payload.message || "Signature failed."));
      return;
    }
    setStrategySignature(payload.signature);
    setStrategyRoutePlan(payload.routePlan);
    setStrategyStatus(`Intent signed: ${selectedStrategyIntentId}`);
    await loadStrategyExecutionSnapshot(selectedStrategyIntentId);
  };

  const submitStrategyIntent = async (action: "submit" | "cancel" = "submit") => {
    if (!selectedStrategyIntentId) {
      setStrategyStatus("Select an execution intent first.");
      return;
    }
    setStrategyStatus(action === "cancel" ? "Cancelling pending orders..." : "Submitting execution intent...");
    const res = await fetch("/api/execution/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: selectedStrategyIntentId, action, leaseMs: strategyDraft.leaseMs })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrategyStatus(String(payload.message || "Submit failed."));
      return;
    }
    setStrategyStatus(action === "cancel" ? `Canceled ${payload.canceled ?? 0} orders.` : `Intent submitted: ${payload.intent?.status ?? "ok"}`);
    await loadStrategyExecutionSnapshot(selectedStrategyIntentId);
    await loadWorkspace(currentUserId);
  };

  return (
    <main>
      <NavBar />
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-10 md:px-6">
        <PageHero
          label="Unified Investor Console"
          title="Commercial operations and execution control room"
          description="This workspace merges membership billing, account binding, wallet funding, AI review, Kelly controls, and execution evidence into one operator console."
          aside={
            <div className={softPanelClass}>
              <p className="text-sm font-semibold text-white">{workspace.user.fullName || "Investor"}</p>
              <p className="mt-1 text-sm text-sky-50">{workspace.user.email || "No email"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge label={workspace.user.status} tone={workspace.user.status === "active" ? "success" : "warning"} />
                <StatusBadge label={workspace.profile.billingMode} tone="info" />
              </div>
            </div>
          }
        />

        <div className={`${postureStripClass} mt-7`}>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Runtime readiness check</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Verified session required, Stripe checkout must resolve on the current domain, and wallet sync only unlocks trading after funding thresholds are met.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={workspaceReady ? "session ready" : "loading session"} tone={workspaceReady ? "success" : "warning"} />
            <StatusBadge label={profileComplete ? "profile complete" : "profile required"} tone={profileComplete ? "success" : "warning"} />
            <StatusBadge label={hasAccounts ? `${workspace.accounts.length} accounts` : "no accounts"} tone={hasAccounts ? "info" : "warning"} />
            <StatusBadge label={workspace.risk.status} tone={workspace.risk.status === "NORMAL" ? "success" : "danger"} />
            <ThemeToggle />
          </div>
        </div>

        {!profileComplete ? (
          <div className="mt-7">
            <SurfaceCard
              eyebrow="Member onboarding"
              title="Complete Member Profile"
              subtitle="Logto has created the secure identity. Complete the operating profile before payment, wallet funding, account binding, and automated execution are released."
              glyph={{ kind: "users", tone: "emerald" }}
            >
              <PanelSection
                eyebrow="Required profile"
                title="Identity details for billing and account operations"
                description="These fields are collected after Logto sign-up so the registration gate stays focused on identity and human verification."
                glyph={{ kind: "shield", tone: "amber" }}
              >
                <FormGrid columns={{ base: 1, md: 2 }} gap={5}>
                  <FormField label="Full Name">
                    <AppInput value={memberProfileDraft.fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setMemberProfileDraft((current) => ({ ...current, fullName: e.target.value }))} />
                  </FormField>
                  <FormField label="Country or Region">
                    <AppSelect value={memberProfileDraft.country} onChange={(e: ChangeEvent<HTMLSelectElement>) => setMemberProfileDraft((current) => ({ ...current, country: e.target.value }))}>
                      <option value="" disabled>Select country or region</option>
                      {countryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </AppSelect>
                  </FormField>
                  <FormField label="Investor Tier">
                    <AppSelect value={memberProfileDraft.investorTier} onChange={(e: ChangeEvent<HTMLSelectElement>) => setMemberProfileDraft((current) => ({ ...current, investorTier: e.target.value }))}>
                      <option value="retail">Retail</option>
                      <option value="professional">Professional</option>
                      <option value="institutional">Institutional</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Address">
                    <AppInput value={memberProfileDraft.address} onChange={(e: ChangeEvent<HTMLInputElement>) => setMemberProfileDraft((current) => ({ ...current, address: e.target.value }))} />
                  </FormField>
                </FormGrid>
              </PanelSection>

              <section className="mt-5 rounded-3xl border border-sky-100 bg-sky-50/60 p-5 dark:border-white/15 dark:bg-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{MEMBER_REGISTRATION_DISCLOSURE.version}</p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">{MEMBER_REGISTRATION_DISCLOSURE.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{MEMBER_REGISTRATION_DISCLOSURE.summary}</p>
                <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  <input className="mt-1 h-4 w-4 rounded border-sky-200 accent-blue-600" type="checkbox" checked={memberProfileDraft.acceptedRegistrationTerms} onChange={(event) => setMemberProfileDraft((current) => ({ ...current, acceptedRegistrationTerms: event.target.checked }))} />
                  <span>I have read and agree to the Polysmart Member Registration Disclosure and Privacy Notice for member onboarding, billing, account servicing, and platform operations.</span>
                </label>
              </section>

              <ActionBar status={profileStatus || "Complete the required profile to unlock the operating console."} mt={5}>
                <AppButton bg="blue.600" color="white" rounded="xl" onClick={saveMemberProfile} disabled={!workspaceReady || !memberProfileDraft.acceptedRegistrationTerms} _hover={{ bg: "blue.700" }}>
                  Save Member Profile
                </AppButton>
              </ActionBar>
            </SurfaceCard>
          </div>
        ) : null}

        <div className="mt-7">
          <ConsoleCommandCenter
            user={workspace.user}
            profile={workspace.profile}
            subscription={workspace.subscription}
            plan={workspace.plan}
            accounts={workspace.accounts}
            fundingSummary={workspace.fundingSummary}
            events={workspace.events}
            risk={workspace.risk}
            remainingQuota={remainingQuota}
            status={status}
            onRefreshWorkspace={() => loadWorkspace(currentUserId)}
          />
        </div>

        <RecordGrid mt={7} columns={{ base: 1, xl: 2 }} gap={7} templateColumns={{ xl: "1.35fr 0.95fr" }}>
          <div className="grid gap-7">
            <WorkspaceCluster
              eyebrow="Commercial workspace"
              title="Membership, billing, and recharge lanes"
              description="Commercial operations are grouped here so plan control, fee posture, invoices, and Stripe-backed point recharge behave like one investor command block."
            >
            <SurfaceCard
              id="commercial-subscription-center"
              eyebrow="Subscription command"
              title="Subscription and billing command desk"
              subtitle="Manage membership plan, cadence, settlement rhythm, and self-service fee posture from one commercial lane while keeping managed USDT settlement isolated."
              glyph={{ kind: "invoice", tone: "amber" }}
            >
              <PanelSection
                eyebrow="Plan cadence"
                title="Plan cadence and pricing window"
                description="Choose the active package, billing cycle, settlement rhythm, and T+0 scan interval for this member workspace."
                glyph={{ kind: "oracle", tone: "sky" }}
              >
                <FormGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
                  <FormField label="Subscription Plan">
                    <AppSelect value={selectedPlan} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPlan(readValue(e))}>
                      {workspace.plans.map((plan) => (
                        <option key={plan.planId} value={plan.planId}>
                          {plan.name}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                  <FormField label="Billing Cycle">
                    <AppSelect value={billingCycle} onChange={(e: ChangeEvent<HTMLSelectElement>) => setBillingCycle(readValue(e) as BillingCycle)}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUAL">Annual</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Settlement Frequency">
                    <AppSelect value={settlementFrequency} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSettlementFrequency(readValue(e) as BillingProfile["settlementFrequency"])}>
                      <option value="EVENT_END">Event End</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Refresh Interval">
                    <AppInput type="number" min={1} max={60} value={scrapeFrequency} onChange={(e: ChangeEvent<HTMLInputElement>) => setScrapeFrequency(Number(readValue(e)))} />
                  </FormField>
                </FormGrid>
              </PanelSection>

              <PanelSection
                mt={5}
                eyebrow="Fee guardrail"
                title="Self-service fee guardrail"
                description="For self-service subscribers, volume service fees consume points credits and remain separate from managed USDT commission settlement."
                glyph={{ kind: "gauge", tone: "rose" }}
                actions={<StatusBadge label={`${(volumeFeeRate * 100).toFixed(2)}% volume fee`} tone="info" />}
              >
                <AppInput
                  type="range"
                  min="0.005"
                  max="0.03"
                  step="0.001"
                  value={volumeFeeRate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setVolumeFeeRate(Number(readValue(e)))}
                  h={2}
                  w="full"
                  cursor="pointer"
                  appearance="none"
                  rounded="full"
                  bg="sky.100"
                  borderWidth={0}
                  p={0}
                  accentColor="#007AFF"
                />
              </PanelSection>

              <ActionBar
                status={status}
                mt={5}
              >
                <AppButton bg="blue.600" color="white" rounded="xl" onClick={saveCommercialSettings} disabled={!workspaceReady || workspace.plans.length === 0} _hover={{ bg: "blue.700" }}>
                  Save Settings
                </AppButton>
              </ActionBar>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Commercial ledger"
              title="Billing, points, and settlement ledger"
              subtitle="Review subscription invoices, points-fee charges, and managed settlement entries together without blending self-service credits with hosted commission accounting."
              glyph={{ kind: "archive", tone: "sky" }}
            >
              <DataTable
                minWidth="860px"
                headers={["Record", "Type", "Amount", "Status", "Date"]}
                isEmpty={workspace.invoices.length === 0 && workspace.settlements.length === 0}
                emptyMessage="No billing or settlement records are available yet."
              >
                {workspace.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>${invoice.amountUsd.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge label={invoice.status} tone={invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "neutral"} />
                    </TableCell>
                    <TableCell suppressHydrationWarning>{new Date(invoice.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {workspace.settlements.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>Points fee / managed settlement ledger</TableCell>
                    <TableCell>${row.platformRevenueUsd.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge label={row.mode === "SUBSCRIPTION" ? "points fee" : "managed share"} tone="info" />
                    </TableCell>
                    <TableCell suppressHydrationWarning>{new Date(row.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
              <ActionBar mt={5} status={chargeStatus}>
                <FormField label="Executed Volume" maxW="56">
                  <AppInput type="number" min={100} value={tradeVolume} onChange={(e: ChangeEvent<HTMLInputElement>) => setTradeVolume(Number(readValue(e)))} />
                </FormField>
                <AppButton variant="outline" rounded="xl" onClick={simulateVolumeCharge} disabled={!workspaceReady || tradeVolume <= 0}>
                  Simulate Points Fee
                </AppButton>
              </ActionBar>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Recharge lane"
              title="Execution credit recharge desk"
              subtitle="Top up self-service execution credits through Stripe without touching the managed-service commission and payout ledger."
              glyph={{ kind: "invoice", tone: "amber" }}
            >
              <RecordGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                {workspace.pointsPackages.map((pkg) => (
                  <SettingsInset key={pkg.packageId} p={5} glyph={{ kind: "invoice", tone: "amber" }}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{pkg.name}</p>
                    <p className="mt-2 text-3xl font-bold text-sky-700 dark:text-sky-200">{pkg.points.toLocaleString()} pts</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">${pkg.amountUsd.toLocaleString()} via Stripe Checkout</p>
                    <AppButton mt={4} bg="blue.600" color="white" rounded="xl" onClick={() => startRecharge(pkg.packageId)} disabled={!workspaceReady} _hover={{ bg: "blue.700" }}>
                      Start Recharge
                    </AppButton>
                  </SettingsInset>
                ))}
              </RecordGrid>
              <div className="mt-5">
                <p className="font-semibold text-slate-900 dark:text-white">Latest checkout session</p>
                {latestPendingSession ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p>{latestPendingSession.id} · {latestPendingSession.pointsGranted.toLocaleString()} pts · ${latestPendingSession.amountUsd.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                        Status: {latestPendingSession.status} · Created {new Date(latestPendingSession.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <AppButton
                      variant="outline"
                      rounded="xl"
                      onClick={() => confirmRecharge(latestPendingSession.id, latestPendingSession.stripeSessionId)}
                      disabled={!workspaceReady}
                    >
                      Confirm Recharge
                    </AppButton>
                  </div>
                ) : (
                  <p className="mt-2 text-slate-600 dark:text-slate-300">No pending Stripe recharge session.</p>
                )}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{paymentStatus}</p>
              </div>
            </SurfaceCard>
            </WorkspaceCluster>

            <WorkspaceCluster
              eyebrow="Funding workspace"
              title="Venue funding, access, and execution account matrix"
              description="Wallet operations, permission unlocks, and venue-account binding are kept together so the member sees one continuous path from deposit to trade-ready execution."
            >
            <SurfaceCard
              eyebrow="Wallet command"
              title="Funding and permission unlock lane"
              subtitle="Select a bound venue wallet, fund it on the correct chain, then sync the balance back into Polysmart to unlock trading and query permissions."
              glyph={{ kind: "wallet", tone: "amber" }}
            >
              <RecordGrid columns={{ base: 1, md: 2 }} gap={4} templateColumns={{ md: "1.2fr 1fr" }}>
                <SettingsInset p={5} glyph={{ kind: "network", tone: "sky" }}>
                  <FormField label="Choose Recharge Wallet">
                    <AppSelect value={selectedFundingAccountId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedFundingAccountId(e.target.value)}>
                      {workspace.accounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.label} · {account.platform} · {account.fundingAsset}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>

                  {selectedFundingAccount ? (
                    <div className="mt-5 grid gap-3 text-sm text-slate-700 dark:text-slate-200">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Deposit Address</p>
                        <p className="mt-2 break-all font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {selectedFundingAccount.walletAddress ?? "Bind a wallet address first"}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p>Network</p>
                          <p className="mt-1 font-semibold capitalize text-slate-900 dark:text-white">{selectedFundingAccount.walletChain}</p>
                        </div>
                        <div>
                          <p>Funding Asset</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedFundingAccount.fundingAsset}</p>
                        </div>
                        <div>
                          <p>Tracked Balance</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {selectedFundingAccount.walletBalance.toLocaleString()} {selectedFundingAccount.fundingAsset}
                          </p>
                        </div>
                        <div>
                          <p>Trading Threshold</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                            ${selectedFundingAccount.fundingThresholdUsd.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge label={selectedFundingAccount.canTrade ? "trade-enabled" : "funding-required"} tone={selectedFundingAccount.canTrade ? "success" : "warning"} />
                        <StatusBadge label={selectedFundingAccount.canQuery ? "query-enabled" : "query-blocked"} tone={selectedFundingAccount.canQuery ? "info" : "danger"} />
                        <AppButton variant="outline" rounded="xl" onClick={() => syncFunding(selectedFundingAccount.accountId)}>
                          Sync Wallet
                        </AppButton>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                        Last sync: {selectedFundingAccount.lastFundingSyncAt ? new Date(selectedFundingAccount.lastFundingSyncAt).toLocaleString() : "Not synced yet"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Bind a venue account and wallet address to activate recharge sync.</p>
                  )}
                </SettingsInset>

                <div className={recordPanelClass}>
                  <p className="font-semibold text-slate-900 dark:text-white">Funding and unlock summary</p>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Live wallet balances", `$${workspace.fundingSummary.fundedWalletBalance.toLocaleString()}`],
                      ["Tracked wallet deposits", `$${workspace.fundingSummary.totalWalletFunding.toLocaleString()}`],
                      ["Stripe recharge value", `$${workspace.fundingSummary.totalRechargeUsd.toLocaleString()}`],
                      ["Recharge points granted", `${workspace.fundingSummary.totalRechargePoints.toLocaleString()} pts`],
                      ["Tracked arbitrage profit", `$${workspace.fundingSummary.grossArbitrageProfitUsd.toLocaleString()}`],
                      ["Tracked volume", `$${workspace.fundingSummary.totalTrackedVolumeUsd.toLocaleString()}`]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </RecordGrid>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{bindStatus}</p>
            </SurfaceCard>

            <SurfaceCard
              id="wallet-funding"
              eyebrow="Funding ledger"
              title="Deposit and unlock ledger"
              subtitle="Review every confirmed wallet top-up, the source execution account, and the transaction used to unlock runtime access."
              glyph={{ kind: "archive", tone: "sky" }}
            >
              <DataTable
                minWidth="1040px"
                headers={["Record", "Account", "Wallet / Network", "Amount", "Permissions", "Confirmed"]}
                isEmpty={workspace.fundingRecords.length === 0}
                emptyMessage="No detected wallet recharges yet. Fund a bound wallet and run a sync to populate this table."
              >
                {workspace.fundingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900 dark:text-white">{record.id}</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{record.txHash}</p>
                    </TableCell>
                    <TableCell>
                      <p>{record.accountLabel}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">{record.platform}</p>
                    </TableCell>
                    <TableCell>
                      <p className="break-all">{record.walletAddress}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">{record.walletChain}</p>
                    </TableCell>
                    <TableCell>{record.amount.toLocaleString()} {record.asset}</TableCell>
                    <TableCell>{record.grantedPermissions.join(", ")}</TableCell>
                    <TableCell suppressHydrationWarning>{new Date(record.confirmedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Permission audit"
              title="Access decision ledger"
              subtitle="Review the latest account access decisions generated by wallet funding syncs and admin overrides before automated execution is allowed."
              glyph={{ kind: "shield", tone: "rose" }}
            >
              <DataTable
                minWidth="1040px"
                headers={["Audit", "Account", "Access", "Funding", "Reason", "Time"]}
                isEmpty={workspace.accountPermissionAudits.length === 0}
                emptyMessage="No permission audit records are available yet. Run wallet funding sync to create the first access decision."
              >
                {workspace.accountPermissionAudits.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{record.id}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.source}</p>
                    </TableCell>
                    <TableCell>
                      <p>{record.accountLabel}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">{record.platform}</p>
                    </TableCell>
                    <TableCell>
                      <InlineGroup gap={2} wrap>
                        <StatusBadge label={record.canQuery ? "query" : "query blocked"} tone={record.canQuery ? "info" : "danger"} />
                        <StatusBadge label={record.canTrade ? "trade" : "trade blocked"} tone={record.canTrade ? "success" : "warning"} />
                      </InlineGroup>
                      <p className="mt-1 text-xs">{record.grantedPermissions.join(", ") || "none"}</p>
                    </TableCell>
                    <TableCell>
                      <p>${record.walletBalance.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">threshold ${record.fundingThresholdUsd.toLocaleString()}</p>
                    </TableCell>
                    <TableCell maxW="72">
                      <p className="text-xs text-slate-600 dark:text-slate-300">{record.reason}</p>
                    </TableCell>
                    <TableCell suppressHydrationWarning>{new Date(record.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </SurfaceCard>

            <SurfaceCard
              id="venue-account-registry"
              eyebrow="Execution account matrix"
              title="Venue binding registry"
              subtitle="Bind and manage Polymarket, Kalshi, and PredictIt accounts from one matrix, including KYC, proxy routing, funding posture, and external venue references."
              glyph={{ kind: "venue", tone: "emerald" }}
            >
              <PanelSection
                eyebrow="Binding controls"
                title="Venue binding lane"
                description="Register a venue account, wallet address, funding threshold, and runtime reference before funding sync can unlock query or trade access."
                glyph={{ kind: "venue", tone: "emerald" }}
              >
                <FormGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
                  <FormField label="Platform">
                    <AppSelect value={newAccount.platform} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAccount((current) => ({ ...current, platform: readValue(e) }))}>
                        <option value="polymarket">Polymarket</option>
                        <option value="kalshi">Kalshi</option>
                        <option value="predictit">PredictIt</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Account Label">
                    <AppInput value={newAccount.label} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, label: readValue(e) }))} />
                  </FormField>
                  <FormField label="Proxy URL">
                    <AppInput value={newAccount.proxyUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, proxyUrl: readValue(e) }))} />
                  </FormField>
                  <FormField label="External Account Ref">
                    <AppInput value={newAccount.externalAccountRef} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, externalAccountRef: readValue(e) }))} />
                  </FormField>
                  <FormField label="API Key / Secret">
                    <AppInput value={newAccount.apiKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, apiKey: readValue(e) }))} />
                  </FormField>
                  <FormField label="Wallet Address">
                    <AppInput value={newAccount.walletAddress} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, walletAddress: readValue(e) }))} />
                  </FormField>
                  <FormField label="Wallet Chain">
                    <AppSelect value={newAccount.walletChain} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAccount((current) => ({ ...current, walletChain: readValue(e) }))}>
                        <option value="polygon">Polygon</option>
                        <option value="ethereum">Ethereum</option>
                        <option value="base">Base</option>
                        <option value="manual">Manual / Off-chain</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Funding Asset">
                    <AppSelect value={newAccount.fundingAsset} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAccount((current) => ({ ...current, fundingAsset: readValue(e) }))}>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="USD">USD</option>
                        <option value="POINTS">POINTS</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Funding Threshold">
                    <AppInput type="number" min={0} value={newAccount.fundingThresholdUsd} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAccount((current) => ({ ...current, fundingThresholdUsd: Number(readValue(e)) }))} />
                  </FormField>
                </FormGrid>
                <ActionBar status={bindStatus}>
                  <AppButton bg="blue.600" color="white" rounded="xl" onClick={bindMatrixAccount} _hover={{ bg: "blue.700" }}>
                    Bind Account
                  </AppButton>
                </ActionBar>
              </PanelSection>
              <PanelSection
                mt={5}
                eyebrow="Live bindings"
                title="Bound execution account registry"
                description="Review account access, funding status, KYC posture, proxy routing, and wallet sync actions."
                glyph={{ kind: "network", tone: "sky" }}
              >
                <DataTable
                  minWidth="1180px"
                  headers={["Platform", "Label", "External Ref", "Wallet", "Balance", "Access", "Proxy", "KYC", "Status"]}
                  isEmpty={workspace.accounts.length === 0}
                  emptyMessage="No execution accounts are bound yet. Add a Polymarket, Kalshi, or PredictIt account with a wallet address before funding sync can unlock trading."
                >
                  {workspace.accounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell className="font-medium capitalize">{account.platform}</TableCell>
                      <TableCell>{account.label}</TableCell>
                      <TableCell>{account.externalAccountRef ?? "-"}</TableCell>
                      <TableCell className="break-all">{account.walletAddress ?? "-"}</TableCell>
                      <TableCell>{account.walletBalance.toLocaleString()} {account.fundingAsset}</TableCell>
                      <TableCell>
                        <StatusBadge label={account.canTrade ? "trade-enabled" : "funding-required"} tone={account.canTrade ? "success" : "warning"} />
                      </TableCell>
                      <TableCell>{account.proxyUrl}</TableCell>
                      <TableCell>
                        <StatusBadge label={account.kycStatus} tone={account.kycStatus === "verified" ? "success" : "warning"} />
                      </TableCell>
                      <TableCell>
                        <InlineGroup align="center" gap={2}>
                          <StatusBadge label={account.status} tone={account.status === "healthy" ? "success" : account.status === "degraded" ? "warning" : "danger"} />
                          <AppButton size="xs" variant="outline" rounded="lg" onClick={() => syncFunding(account.accountId)}>
                            Sync Wallet
                          </AppButton>
                        </InlineGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </DataTable>
              </PanelSection>
            </SurfaceCard>
            </WorkspaceCluster>
          </div>

          <div className="grid content-start gap-7">
            <WorkspaceCluster
              eyebrow="Runtime governance"
              title="Posture, Kelly, and execution evidence"
              description="The right rail compresses the member's operational posture, orchestrator decisions, Kelly sizing, intent evidence, and managed settlement state into one review surface."
            >
            <SurfaceCard
              eyebrow="Membership posture"
              title="Subscription posture snapshot"
              subtitle="Keep the active plan, renewal window, included credits, and runtime billing mode visible without leaving the investor console."
              glyph={{ kind: "trend", tone: "sky" }}
            >
              <div className="grid gap-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="invoice" tone="amber" size={18} />
                    <p>Plan</p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{workspace.plan?.name ?? "Unassigned"}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="stack" tone="sky" size={18} />
                    <p>Service type</p>
                  </div>
                  <StatusBadge label={workspace.profile.serviceType} tone="info" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="cash" tone="amber" size={18} />
                    <p>Billing mode</p>
                  </div>
                  <StatusBadge label={workspace.profile.billingMode} tone="info" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="trend" tone="sky" size={18} />
                    <p>Next billing</p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{workspace.subscription.nextBillingAt ? new Date(workspace.subscription.nextBillingAt).toLocaleDateString() : "N/A"}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="wallet" tone="amber" size={18} />
                    <p>Included points</p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{workspace.subscription.pointsIncluded.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="users" tone="emerald" size={18} />
                    <p>Referral code</p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{workspace.user.referralCode ?? "None"}</p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Orchestrator audit"
              title="Auto-run decision lane"
              subtitle="Review AI confidence, Kelly sizing inputs and outputs, plus all auto-run skip reasons before a live execution window opens."
              glyph={{ kind: "gauge", tone: "rose" }}
            >
              <DataTable
                minWidth="1120px"
                headers={["Event", "Decision", "Kelly Input", "Kelly Output", "Reason", "Time"]}
                isEmpty={workspace.autoRunAudits.length === 0}
                emptyMessage="No orchestrator decision records are available yet."
              >
                {workspace.autoRunAudits.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900 dark:text-white">{String(row.context.title ?? row.context.eventId ?? row.id)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{String(row.context.eventId ?? "-")}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={row.message === "auto arbitrage executed" ? "EXECUTE" : row.message === "auto arbitrage dry run prepared" ? "DRY_RUN" : "SKIP"}
                        tone={row.message === "auto arbitrage executed" ? "success" : row.message === "auto arbitrage dry run prepared" ? "info" : "warning"}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">Win p: {String(row.context.winProbability ?? row.context.aiWinProbability ?? "-")}</p>
                      <p className="text-xs">Entry: {String(row.context.entryPrice ?? row.context.polyTargetBid ?? "-")}</p>
                      <p className="text-xs">Bankroll: {String(row.context.bankrollUsd ?? row.context.notionalUsd ?? "-")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">Notional: {String(row.context.recommendedNotionalUsd ?? row.context.notionalUsd ?? "-")}</p>
                      <p className="text-xs">Kelly: {String(row.context.rawKellyFraction ?? "-")}</p>
                      <p className="text-xs">Edge: {String(row.context.expectedNetEdge ?? row.context.score ?? "-")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {String(row.context.reason ?? row.context.reasonCode ?? row.message)}
                      </p>
                    </TableCell>
                    <TableCell suppressHydrationWarning>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Kelly ledger"
              title="Kelly sizing ledger"
              subtitle="Trace every generated Kelly plan before it becomes an execution intent, including AI confidence, bankroll inputs, notional sizing, and halt reasons."
              glyph={{ kind: "automation", tone: "violet" }}
            >
              <DataTable
                minWidth="1120px"
                headers={["Kelly Plan", "Event", "AI", "Sizing", "Status", "Created"]}
                isEmpty={workspace.kellyPlans.length === 0}
                emptyMessage="No Kelly plans have been generated for this member yet."
              >
                {workspace.kellyPlans.map((plan) => (
                  <TableRow key={plan.kellyPlanId}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{plan.kellyPlanId}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.source} · {plan.mode ?? "manual"}</p>
                    </TableCell>
                    <TableCell>{plan.eventId}</TableCell>
                    <TableCell>
                      <p className="text-xs">Provider: {plan.ai?.provider ?? "-"}</p>
                      <p className="text-xs">Win p: {plan.ai?.winProbability ?? "-"}</p>
                      <p className="text-xs">Confidence: {plan.ai?.confidence ?? "-"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">Bankroll: ${plan.kellyInput.bankrollUsd.toLocaleString()}</p>
                      <p className="text-xs">Notional: ${plan.recommendedNotionalUsd.toLocaleString()}</p>
                      <p className="text-xs">Kelly: {(plan.kellyOutput.constrainedFraction * 100).toFixed(2)}%</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={plan.status} tone={plan.status === "READY" ? "success" : plan.status === "CONSUMED" ? "info" : "warning"} />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {plan.kellyOutput.haltReasons.length ? plan.kellyOutput.haltReasons.join(", ") : "no halt reasons"}
                      </p>
                    </TableCell>
                    <TableCell suppressHydrationWarning>{new Date(plan.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Runtime trail"
              title="Execution intent trail"
              subtitle="Scan each execution intent, its linked Kelly plan ID, order and fill counts, transaction status, and final runtime state from the member console."
              glyph={{ kind: "flow", tone: "violet" }}
            >
              <DataTable
                minWidth="1120px"
                headers={["Intent", "Kelly Plan", "Event", "Orders / Fills", "Transaction", "Created"]}
                isEmpty={workspace.execution.intents.length === 0}
                emptyMessage="No execution intents are recorded yet."
              >
                {workspace.execution.intents.map((intent) => {
                  const orders = workspace.execution.orders.filter((row) => row.intentId === intent.intentId);
                  const fills = workspace.execution.fills.filter((row) => row.intentId === intent.intentId);
                  const tx = workspace.execution.transactions.find((row) => row.intentId === intent.intentId) ?? null;
                  return (
                    <TableRow key={intent.intentId}>
                    <TableCell>
                        <p className="font-semibold text-slate-900 dark:text-white">{intent.intentId}</p>
                        <StatusBadge label={intent.status} tone={intent.status === "HEDGED" ? "success" : intent.status === "FAILED" ? "danger" : "warning"} />
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs">{intent.kellyPlanId ?? "manual-intent"}</p>
                      </TableCell>
                      <TableCell>{intent.eventId}</TableCell>
                      <TableCell>
                        <p className="text-xs">{orders.length} orders · {fills.length} fills</p>
                        <p className="text-xs">Filled ${fills.reduce((sum, fill) => sum + fill.filledUsd, 0).toLocaleString()}</p>
                      </TableCell>
                      <TableCell>
                        {tx ? (
                          <StatusBadge label={tx.status} tone={tx.status === "COMMITTED" ? "success" : tx.status === "FAILED" ? "danger" : "warning"} />
                        ) : (
                          <p className="text-xs">No transaction</p>
                        )}
                      </TableCell>
                      <TableCell suppressHydrationWarning>{new Date(intent.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </DataTable>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Intent context"
              title="Intent context ledger"
              subtitle="Inspect every intent with AI provider, model, win rate, confidence, and captured order book snapshots before and after execution."
              glyph={{ kind: "archive", tone: "sky" }}
            >
              <div className="grid gap-4">
                {workspace.execution.intents.map((intent) => {
                  const tx = workspace.execution.transactions.find((row) => row.intentId === intent.intentId) ?? null;
                  const fills = workspace.execution.fills.filter((row) => row.intentId === intent.intentId);
                  return (
                    <div key={intent.intentId} className={recordPanelClass}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{intent.intentId}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {intent.eventId} · {intent.strategyContext?.source ?? "MANUAL"} · {intent.strategyContext?.mode ?? "manual"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                            Kelly plan: {intent.kellyPlanId ?? "manual-intent"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={intent.status} tone={intent.status === "HEDGED" ? "success" : intent.status === "FAILED" ? "danger" : "warning"} />
                          {tx ? <StatusBadge label={tx.status} tone={tx.status === "COMMITTED" ? "success" : tx.status === "FAILED" ? "danger" : "warning"} /> : null}
                        </div>
                      </div>
                      <RecordGrid mt={4} columns={{ base: 1, xl: 3 }} gap={3}>
                        <div className={tintedRecordPanelClass}>
                          <div className="flex items-center gap-2">
                            <GlyphBadge kind="oracle" tone="sky" size={16} />
                            <p className="text-xs uppercase tracking-[0.14em]">AI Context</p>
                          </div>
                          <p className="mt-2 text-sm">Provider: <span className="font-semibold">{intent.strategyContext?.ai?.provider ?? "-"}</span></p>
                          <p className="text-sm">Model: <span className="font-semibold">{intent.strategyContext?.ai?.model ?? "-"}</span></p>
                          <p className="text-sm">Win rate: <span className="font-semibold">{intent.strategyContext?.ai?.winProbability ?? "-"}</span></p>
                          <p className="text-sm">Confidence: <span className="font-semibold">{intent.strategyContext?.ai?.confidence ?? "-"}</span></p>
                        </div>
                        <div className={tintedRecordPanelClass}>
                          <div className="flex items-center gap-2">
                            <GlyphBadge kind="automation" tone="violet" size={16} />
                            <p className="text-xs uppercase tracking-[0.14em]">Kelly Input / Output</p>
                          </div>
                          <p className="mt-2 text-sm">Bankroll: <span className="font-semibold">{intent.strategyContext?.kellyInput?.bankrollUsd ?? "-"}</span></p>
                          <p className="text-sm">Entry: <span className="font-semibold">{intent.strategyContext?.kellyInput?.entryPrice ?? "-"}</span></p>
                          <p className="text-sm">Notional: <span className="font-semibold">{intent.strategyContext?.kellyOutput?.recommendedNotionalUsd ?? "-"}</span></p>
                          <p className="text-sm">Halt reasons: <span className="font-semibold">{intent.strategyContext?.kellyOutput?.haltReasons.join(", ") || "none"}</span></p>
                        </div>
                        <div className={tintedRecordPanelClass}>
                          <div className="flex items-center gap-2">
                            <GlyphBadge kind="monitor" tone="sky" size={16} />
                            <p className="text-xs uppercase tracking-[0.14em]">Market Snapshots</p>
                          </div>
                          {intent.strategyContext?.orderBooks?.length ? intent.strategyContext.orderBooks.map((book) => (
                            <div key={`${intent.intentId}-${book.platform}`} className="mt-2">
                              <p className="font-semibold capitalize">{book.platform}</p>
                              <p className="text-xs">YES bid {book.bestYesBid} · NO bid {book.bestNoBid} · spread {book.spread}</p>
                              <p className="text-xs">Depth {book.depthUsd} · {book.source}</p>
                            </div>
                          )) : <p className="mt-2 text-xs">No snapshot recorded.</p>}
                        </div>
                      </RecordGrid>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Legs: {intent.legs.length} · Fills: {fills.length} · Created {new Date(intent.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
                {workspace.execution.intents.length === 0 ? <div className={emptyStateClass}>No execution intents are recorded yet.</div> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Managed settlement"
              title="Managed commission ledger"
              subtitle="Track managed-service commissions held for USDT settlement while keeping them separate from self-service credits and fee usage."
              glyph={{ kind: "cash", tone: "amber" }}
            >
              <div className="grid gap-3">
                {workspace.commissions.map((commission) => (
                  <div key={commission.id} className={tintedRecordPanelClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <GlyphBadge kind="cash" tone="amber" size={18} />
                          <p className="font-semibold text-slate-900 dark:text-white">{commission.id}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{commission.eventId}</p>
                      </div>
                      <StatusBadge label={commission.status} tone={commission.status === "SETTLED" ? "success" : commission.status === "HELD" ? "danger" : "warning"} />
                    </div>
                    <RecordGrid mt={3} columns={{ base: 1, sm: 2 }} gap={3}>
                      <p className="text-sm text-slate-700 dark:text-slate-300">Gross profit: <span className="font-semibold">${commission.grossProfitUsd.toLocaleString()}</span></p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">Commission: <span className="font-semibold">${commission.commissionUsd.toLocaleString()}</span></p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">Locked USDT: <span className="font-semibold">${commission.lockedUsdtAmount.toLocaleString()}</span></p>
                    </RecordGrid>
                  </div>
                ))}
                {workspace.commissions.length === 0 ? (
                  <div className={emptyStateClass}>No managed commission records are available yet.</div>
                ) : null}
              </div>
            </SurfaceCard>
            </WorkspaceCluster>

            <WorkspaceCluster
              eyebrow="Oracle release studio"
              title="Live market brief and execution release"
              description="Use this final lane to review the current T+0 market brief, generate quotes, inspect context, simulate outcomes, and release signed execution."
            >
            <SurfaceCard
              id="live-runtime-snapshot"
              eyebrow="Live market brief"
              title="T+0 market brief"
              subtitle="Review the live T+0 queue, risk stance, and strongest current event edge from one compact runtime brief."
              glyph={{ kind: "monitor", tone: "sky" }}
            >
              <div className="grid gap-4 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="monitor" tone="sky" size={18} />
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Top T+0 candidate</p>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{workspace.events[0]?.title ?? "No active event"}</p>
                  <p className="mt-2">Edge spread: <span className="font-semibold">{workspace.events[0]?.edgeSpreadPct ?? 0}%</span></p>
                  <p>AI confidence: <span className="font-semibold">{(((workspace.events[0]?.aiWinProbability ?? 0) * 100)).toFixed(1)}%</span></p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="shield" tone="rose" size={18} />
                    <p>Risk state: <span className="font-semibold">{workspace.risk.status}</span></p>
                  </div>
                  <p className="mt-2">Hedge latency: <span className="font-semibold">{workspace.risk.hedgeLatencyMs}ms</span></p>
                  <p>Inventory deviation: <span className="font-semibold">{(workspace.risk.inventoryDeviationPct * 100).toFixed(2)}%</span></p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              id="strategy-execution"
              eyebrow="Oracle execution lane"
              title="Quote, context, simulation, and execution control"
              subtitle="Move through the member execution loop from pricing quote to Kelly context, simulation, signing, and submit or cancel without leaving the console."
              glyph={{ kind: "flow", tone: "violet" }}
            >
              <PanelSection
                eyebrow="Inputs"
                title="Quote input deck"
                description="Use the latest member event and account data to drive quote, context, and simulation actions."
                glyph={{ kind: "oracle", tone: "sky" }}
              >
                <FormGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
                  <FormField label="Event">
                    <AppSelect value={selectedStrategyEventId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStrategyEventId(e.target.value)}>
                        <option value="">Select event</option>
                        {workspace.events.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.platform} · {event.title}
                          </option>
                        ))}
                    </AppSelect>
                  </FormField>
                  <FormField label="User">
                    <AppSelect value={selectedStrategyUserId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStrategyUserId(readValue(e))}>
                        <option value="">Use current member</option>
                        <option value={workspace.user.userId}>{workspace.user.fullName}</option>
                    </AppSelect>
                  </FormField>
                  <FormField label="Order USD">
                    <AppInput type="number" step="10" value={strategyDraft.totalOrderUsd} onChange={(e: ChangeEvent<HTMLInputElement>) => setStrategyDraft((current) => ({ ...current, totalOrderUsd: Number(readValue(e)) }))} />
                  </FormField>
                  <FormField label="Risk aversion">
                    <AppInput type="number" step="0.01" value={strategyDraft.riskAversion} onChange={(e: ChangeEvent<HTMLInputElement>) => setStrategyDraft((current) => ({ ...current, riskAversion: Number(readValue(e)) }))} />
                  </FormField>
                  <FormField label="Friction">
                    <AppInput type="number" step="0.001" value={strategyDraft.friction} onChange={(e: ChangeEvent<HTMLInputElement>) => setStrategyDraft((current) => ({ ...current, friction: Number(readValue(e)) }))} />
                  </FormField>
                  <FormField label="Time to settlement">
                    <AppInput type="number" step="0.1" value={strategyDraft.timeToSettlementHours} onChange={(e: ChangeEvent<HTMLInputElement>) => setStrategyDraft((current) => ({ ...current, timeToSettlementHours: Number(readValue(e)) }))} />
                  </FormField>
                </FormGrid>
                <InlineGroup mt={4} wrap gap={2}>
                  <AppButton size="sm" rounded="xl" bg="blue.600" color="white" onClick={runStrategyQuote} _hover={{ bg: "blue.700" }}>
                    Run Quote
                  </AppButton>
                  <AppButton size="sm" rounded="xl" variant="outline" onClick={loadStrategySnapshot}>
                    Load Context
                  </AppButton>
                  <AppButton size="sm" rounded="xl" variant="outline" onClick={runStrategySimulation}>
                    Simulate
                  </AppButton>
                </InlineGroup>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{strategyStatus}</p>
              </PanelSection>

              <RecordGrid mt={5} columns={{ base: 1, lg: 3 }} gap={4}>
                <div className={recordPanelClass}>
                  <p className="text-xs uppercase tracking-[0.14em]">Price quote</p>
                  <p className="mt-2 text-sm">{strategyQuote ? `edge ${(strategyQuote.score?.composite ?? 0).toFixed?.(4) ?? strategyQuote.score?.composite ?? 0}` : "No quote yet."}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{strategyQuote ? `Poly ${strategyQuote.pricing.polyTargetBid?.toFixed?.(3) ?? strategyQuote.pricing.polyTargetBid} · Kalshi ${strategyQuote.pricing.kalshiTargetBid?.toFixed?.(3) ?? strategyQuote.pricing.kalshiTargetBid}` : "Run quote to preview pricing."}</p>
                </div>
                <div className={recordPanelClass}>
                  <p className="text-xs uppercase tracking-[0.14em]">Trading context</p>
                  <p className="mt-2 text-sm">{strategyContext ? `${strategyContext.kellyPlanId} · ${strategyContext.recommendedNotionalUsd}` : "No trading context yet."}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{strategyContext ? `${strategyContext.probabilityCheck.status} · ${strategyContext.riskCheck.status} · ${strategyContext.complianceCheck.status}` : "Load context for Kelly controls."}</p>
                </div>
                <div className={recordPanelClass}>
                  <p className="text-xs uppercase tracking-[0.14em]">Scenario simulation</p>
                  <p className="mt-2 text-sm">{strategySimulation ? `${strategySimulation.state} · ${strategySimulation.timeline.join(" → ")}` : "No simulation yet."}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{strategySimulation ? `edge ${strategySimulation.realizedEdgePct}` : "Use simulation to test the execution path."}</p>
                </div>
              </RecordGrid>
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Execution workspace"
              title="Intent signing and release"
              subtitle="Create an execution intent from the loaded Kelly plan, sign it, and submit or cancel pending orders."
              glyph={{ kind: "flow", tone: "violet" }}
            >
              <RecordGrid columns={{ base: 1, md: 2 }} gap={4}>
                <FormField label="Selected intent">
                  <AppSelect value={selectedStrategyIntentId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStrategyIntentId(e.target.value)}>
                      <option value="">Select intent</option>
                      {(strategyExecutionSnapshot?.intents ?? workspace.execution.intents).map((intent: { intentId: string; status: string }) => (
                        <option key={intent.intentId} value={intent.intentId}>
                          {intent.intentId} · {intent.status}
                        </option>
                      ))}
                  </AppSelect>
                </FormField>
                <FormField label="Current mode">
                  <AppInput value={strategyExecutionSnapshot?.intents.find((row: { intentId: string; status: string }) => row.intentId === selectedStrategyIntentId)?.status ?? "no intent selected"} readOnly />
                </FormField>
              </RecordGrid>
              <InlineGroup mt={4} wrap gap={2}>
                <AppButton size="sm" rounded="xl" bg="blue.600" color="white" onClick={createStrategyIntent} _hover={{ bg: "blue.700" }}>
                  Create Intent
                </AppButton>
                <AppButton size="sm" rounded="xl" variant="outline" onClick={signStrategyIntent}>
                  Sign Intent
                </AppButton>
                <AppButton size="sm" rounded="xl" variant="outline" onClick={() => submitStrategyIntent("submit")}>
                  Submit Intent
                </AppButton>
                <AppButton size="sm" rounded="xl" variant="outline" onClick={() => submitStrategyIntent("cancel")}>
                  Cancel Orders
                </AppButton>
                <AppButton size="sm" rounded="xl" variant="outline" onClick={() => loadStrategyExecutionSnapshot(selectedStrategyIntentId)}>
                  Refresh Snapshot
                </AppButton>
              </InlineGroup>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{strategyStatus}</p>
              <div className="mt-4 grid gap-3">
                {strategySignature ? (
                  <div className={recordPanelClass}>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Signature</p>
                    <p className="mt-2 break-all font-mono text-xs">{strategySignature.signature}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{strategySignature.signerRef} · {strategySignature.standard}</p>
                  </div>
                ) : null}
                {strategyRoutePlan ? (
                  <div className={recordPanelClass}>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Route plan</p>
                    <div className="mt-2 grid gap-2">
                      {strategyRoutePlan.routes.map((route: { accountId: string; marketId: string; platform: string; executionMode: string }) => (
                        <div key={`${route.accountId}-${route.marketId}`}>
                          <p className="font-semibold text-slate-900 dark:text-white">{route.accountId}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{route.platform} · {route.executionMode} · {route.marketId}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </SurfaceCard>

            <SettlementTrapWidget />
            </WorkspaceCluster>
          </div>
        </RecordGrid>
      </section>
    </main>
  );
}
