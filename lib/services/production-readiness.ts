import { d1All, getOptionalD1 } from "@/lib/db/d1";
import { nextId, runtimeState } from "@/lib/store";
import { ConnectorHealth } from "@/lib/types";
import { listVenueConnectorProbeLogsAsync, runVenueConnectorProbeAsync } from "@/lib/services/venue-probes";
import { listWalletFundingProbeLogsAsync } from "@/lib/services/wallet-funding-probes";

export type IntegrationRisk = "P0" | "P1";
export type IntegrationStatus =
  | "ready"
  | "configured"
  | "configured_pending_probe"
  | "requires_real_transaction"
  | "test_key_only"
  | "placeholder"
  | "missing"
  | "unavailable";

export type IntegrationReadinessItem = {
  key: string;
  label: string;
  risk: IntegrationRisk;
  status: IntegrationStatus;
  evidence: string[];
  requiredAction: string;
};

export type IntegrationReadinessReport = {
  generatedAt: string;
  probeNetwork: boolean;
  summary: Record<IntegrationStatus, number>;
  items: IntegrationReadinessItem[];
  connectorHealth: ConnectorHealth[];
  snapshots: IntegrationReadinessSnapshot[];
  scheduledAttempts: ProductionScheduledValidationAttempt[];
  scheduledCron: {
    expression: string;
    intervalMinutes: number;
    nextExpectedAt: string | null;
  };
};

export type IntegrationReadinessSnapshot = {
  id: string;
  generatedAt: string;
  probeNetwork: boolean;
  p0Open: number;
  p1Open: number;
  summary: Record<IntegrationStatus, number>;
  report: Omit<IntegrationReadinessReport, "snapshots">;
};

export type ProductionScheduledValidationAttempt = {
  id: string;
  cron: string;
  scheduledTime: string | null;
  triggerRef: string;
  status: "STARTED" | "SUCCESS" | "ERROR";
  responseStatus: number | null;
  message: string;
  createdAt: string;
};

const runtimeSnapshots: IntegrationReadinessSnapshot[] = [];
const DEFAULT_PRODUCTION_VALIDATION_CRON = "*/15 * * * *";
const DEFAULT_PRODUCTION_VALIDATION_INTERVAL_MINUTES = 15;

function mapScheduledAttemptRow(row: Record<string, unknown>): ProductionScheduledValidationAttempt {
  return {
    id: String(row.id),
    cron: String(row.cron),
    scheduledTime: row.scheduled_time ? String(row.scheduled_time) : null,
    triggerRef: String(row.trigger_ref),
    status: String(row.status) as ProductionScheduledValidationAttempt["status"],
    responseStatus: row.response_status === null || row.response_status === undefined ? null : Number(row.response_status),
    message: String(row.message),
    createdAt: String(row.created_at)
  };
}

export async function persistProductionScheduledValidationAttempt(input: {
  cron: string;
  scheduledTime: string | null;
  triggerRef: string;
  status: ProductionScheduledValidationAttempt["status"];
  responseStatus: number | null;
  message: string;
}) {
  const attempt: ProductionScheduledValidationAttempt = {
    id: nextId("SCHED"),
    cron: input.cron,
    scheduledTime: input.scheduledTime,
    triggerRef: input.triggerRef,
    status: input.status,
    responseStatus: input.responseStatus,
    message: input.message,
    createdAt: new Date().toISOString()
  };

  const db = await getOptionalD1();
  if (!db) {
    runtimeState.productionScheduledValidationAttempts.unshift(attempt);
    runtimeState.productionScheduledValidationAttempts = runtimeState.productionScheduledValidationAttempts.slice(0, 100);
    return attempt;
  }

  try {
    await db.prepare(
      `INSERT INTO production_scheduled_validation_attempts (
        id, cron, scheduled_time, trigger_ref, status, response_status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      attempt.id,
      attempt.cron,
      attempt.scheduledTime,
      attempt.triggerRef,
      attempt.status,
      attempt.responseStatus,
      attempt.message,
      attempt.createdAt
    ).run();
  } catch (error) {
    if (!(error instanceof Error) || !/no such table:\s*production_scheduled_validation_attempts/i.test(error.message)) {
      throw error;
    }
    runtimeState.productionScheduledValidationAttempts.unshift(attempt);
    runtimeState.productionScheduledValidationAttempts = runtimeState.productionScheduledValidationAttempts.slice(0, 100);
  }

  return attempt;
}

function computeNextCronWindow(nowIso: string, intervalMinutes: number) {
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime()) || intervalMinutes <= 0) {
    return null;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  const nextTime = new Date(Math.ceil(now.getTime() / intervalMs) * intervalMs);
  if (nextTime.getTime() <= now.getTime()) {
    nextTime.setTime(nextTime.getTime() + intervalMs);
  }
  return nextTime.toISOString();
}

export async function listProductionScheduledValidationAttempts(limit = 8) {
  const normalizedLimit = Math.max(1, Math.min(limit, 50));
  const db = await getOptionalD1();
  if (!db) {
    return runtimeState.productionScheduledValidationAttempts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, normalizedLimit);
  }

  try {
    const rows = await d1All<Record<string, unknown>>(
      `SELECT id, cron, scheduled_time, trigger_ref, status, response_status, message, created_at
       FROM production_scheduled_validation_attempts
       ORDER BY created_at DESC
       LIMIT ?`,
      [normalizedLimit]
    );
    const records = rows.map(mapScheduledAttemptRow);
    runtimeState.productionScheduledValidationAttempts = records;
    return records;
  } catch (error) {
    if (error instanceof Error && /no such table:\s*production_scheduled_validation_attempts/i.test(error.message)) {
      return runtimeState.productionScheduledValidationAttempts.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, normalizedLimit);
    }
    throw error;
  }
}

function envValue(key: string) {
  return process.env[key]?.trim() || "";
}

function secretState(key: string, options?: { requireLiveStripe?: boolean; placeholderPatterns?: RegExp[] }) {
  const value = envValue(key);
  if (!value) {
    return { status: "missing" as const, evidence: `${key} is missing.` };
  }

  const lowered = value.toLowerCase();
  const looksPlaceholder =
    lowered.includes("placeholder") ||
    lowered.includes("example") ||
    lowered.includes("mock") ||
    lowered === "stripe11111111111111" ||
    options?.placeholderPatterns?.some((pattern) => pattern.test(value));

  if (looksPlaceholder) {
    return { status: "placeholder" as const, evidence: `${key} is present but still looks like a placeholder.` };
  }

  if (options?.requireLiveStripe && value.startsWith("sk_test")) {
    return { status: "test_key_only" as const, evidence: `${key} is a Stripe test key, not sk_live.` };
  }

  return { status: "configured" as const, evidence: `${key} is configured.` };
}

function worstSecretStatus(states: Array<ReturnType<typeof secretState>>): IntegrationStatus {
  if (states.some((state) => state.status === "missing")) {
    return "missing";
  }
  if (states.some((state) => state.status === "placeholder")) {
    return "placeholder";
  }
  if (states.some((state) => state.status === "test_key_only")) {
    return "test_key_only";
  }
  return "configured";
}

function platformCredentialState(label: string, requiredKeys: string[]) {
  const states = requiredKeys.map((key) => secretState(key));
  const status = worstSecretStatus(states);
  return {
    label,
    status,
    evidence: states.map((state) => state.evidence)
  };
}

async function rpcProbeCall(rpcUrl: string, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `RPC ${method} failed with HTTP ${response.status}`);
  }
  return payload.result;
}

async function probePolygonUsdcReadiness(options: { enabled: boolean; rpcUrl: string; tokenAddress: string }) {
  if (!options.enabled || !options.rpcUrl || !options.tokenAddress) {
    return { status: "configured_pending_probe" as IntegrationStatus, evidence: [] as string[] };
  }

  const evidence: string[] = [];
  try {
    const latestBlockHex = String(await rpcProbeCall(options.rpcUrl, "eth_blockNumber", []));
    const latestBlock = Number.parseInt(latestBlockHex, 16);
    evidence.push(`Polygon RPC probe latest block: ${Number.isFinite(latestBlock) ? latestBlock : latestBlockHex}.`);

    const decimalsHex = String(await rpcProbeCall(options.rpcUrl, "eth_call", [
      { to: options.tokenAddress, data: "0x313ce567" },
      "latest"
    ]));
    const decimals = Number.parseInt(decimalsHex, 16);
    evidence.push(`USDC decimals probe result: ${Number.isFinite(decimals) ? decimals : decimalsHex}.`);

    return { status: "configured" as IntegrationStatus, evidence };
  } catch (error) {
    return {
      status: "unavailable" as IntegrationStatus,
      evidence: [`Polygon RPC/USDC probe failed: ${(error as Error).message}.`]
    };
  }
}

async function probeStripeApiReadiness(options: { enabled: boolean; secretKey: string }) {
  if (!options.enabled || !options.secretKey) {
    return { status: "configured_pending_probe" as IntegrationStatus, evidence: [] as string[] };
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${options.secretKey}`,
        "Stripe-Version": "2026-02-25.clover"
      }
    });
    const payload = (await response.json()) as { livemode?: boolean; object?: string; error?: { message?: string; type?: string } };
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Stripe API probe failed with HTTP ${response.status}`);
    }

    return {
      status: payload.livemode ? "configured" as IntegrationStatus : "test_key_only" as IntegrationStatus,
      evidence: [`Stripe API auth probe succeeded: ${payload.object ?? "balance"} livemode=${payload.livemode === true}.`]
    };
  } catch (error) {
    return {
      status: "unavailable" as IntegrationStatus,
      evidence: [`Stripe API auth probe failed: ${(error as Error).message}.`]
    };
  }
}

function countStatuses(items: IntegrationReadinessItem[]) {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {} as Record<IntegrationStatus, number>);
}

function item(input: IntegrationReadinessItem): IntegrationReadinessItem {
  return input;
}

function isOpenStatus(status: IntegrationStatus) {
  return status !== "ready" && status !== "configured";
}

function summarizeOpenItems(items: IntegrationReadinessItem[]) {
  return {
    p0Open: items.filter((entry) => entry.risk === "P0" && isOpenStatus(entry.status)).length,
    p1Open: items.filter((entry) => entry.risk === "P1" && isOpenStatus(entry.status)).length
  };
}

async function countD1Rows(table: "payment_sessions" | "payment_webhook_events" | "payment_reconciliation_logs" | "connector_probe_logs" | "wallet_funding_probe_logs" | "wallet_funding" | "settlements" | "commission_settlements" | "revenue_events" | "audit_logs" | "production_validation_runs") {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /no such table:/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countProductionValidationCronRows() {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(
      `SELECT COUNT(*) AS count FROM production_validation_runs WHERE trigger_source = 'CRON_HTTP'`
    ).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /(no such table:|no such column: trigger_source)/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countStripeLiveCheckoutWebhookRows() {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(
      `SELECT COUNT(*) AS count
       FROM payment_webhook_events
       WHERE livemode = 1
         AND event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
         AND payment_session_id IS NOT NULL`
    ).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /(no such table:|no such column: livemode)/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countStripeLiveCheckoutSessionRows() {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(
      `SELECT COUNT(*) AS count
       FROM payment_sessions
       WHERE livemode = 1
         AND provider = 'STRIPE'
         AND checkout_mode = 'payment'
         AND stripe_session_id LIKE 'cs_live_%'`
    ).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /(no such table:|no such column: livemode)/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countProductionWalletFundingRows() {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(
      `SELECT COUNT(*) AS count
       FROM wallet_funding
       WHERE chain = 'polygon'
         AND asset = 'USDC'
         AND status = 'CONFIRMED'
         AND detected_source = 'RPC_SCAN'
         AND token_decimals = 6
         AND tx_hash IS NOT NULL
         AND block_number IS NOT NULL`
    ).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /(no such table:|no such column: detected_source|no such column: token_decimals)/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countProductionVenueProbePlatforms() {
  const db = await getOptionalD1();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare(
      `SELECT COUNT(DISTINCT platform) AS count
       FROM connector_probe_logs
       WHERE mode = 'live'
         AND healthy = 1
         AND credentials_configured = 1
         AND kyc_satisfied = 1
         AND query_permission_ok = 1
         AND trade_permission_ok = 1
         AND rate_limit_ok = 1
         AND probe_source = 'LIVE_API'`
    ).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error) {
    if (error instanceof Error && /(no such table:|no such column: credentials_configured|no such column: probe_source)/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function countOperationalRows() {
  const [
    paymentSessions,
    webhookRows,
    reconciliationRows,
    connectorProbeRows,
    walletFundingProbeRows,
    walletFundingRows,
    settlements,
    commissionSettlements,
    revenueEvents,
    auditRows,
    validationRows,
    validationCronRows,
    liveCheckoutWebhookRows,
    liveCheckoutSessionRows,
    productionWalletFundingRows,
    productionVenueProbePlatforms
  ] = await Promise.all([
    countD1Rows("payment_sessions"),
    countD1Rows("payment_webhook_events"),
    countD1Rows("payment_reconciliation_logs"),
    countD1Rows("connector_probe_logs"),
    countD1Rows("wallet_funding_probe_logs"),
    countD1Rows("wallet_funding"),
    countD1Rows("settlements"),
    countD1Rows("commission_settlements"),
    countD1Rows("revenue_events"),
    countD1Rows("audit_logs"),
    countD1Rows("production_validation_runs"),
    countProductionValidationCronRows(),
    countStripeLiveCheckoutWebhookRows(),
    countStripeLiveCheckoutSessionRows(),
    countProductionWalletFundingRows(),
    countProductionVenueProbePlatforms()
  ]);

  const runtimeProductionVenueProbePlatforms = new Set(
    runtimeState.connectorProbeLogs
      .filter((row) =>
        row.mode === "live" &&
        row.healthy &&
        row.credentialsConfigured &&
        row.kycSatisfied &&
        row.queryPermissionOk &&
        row.tradePermissionOk &&
        row.rateLimitOk &&
        row.probeSource === "LIVE_API"
      )
      .map((row) => row.platform)
  ).size;
  const runtimeProductionWalletFundingRows = runtimeState.walletFunding.filter((row) =>
    row.walletChain === "polygon" &&
    row.asset === "USDC" &&
    row.detectedSource === "RPC_SCAN" &&
    row.tokenDecimals === 6 &&
    Boolean(row.txHash) &&
    row.blockNumber !== null
  ).length;
  const runtimeLiveCheckoutSessionRows = runtimeState.paymentSessions.filter((row) =>
    row.livemode &&
    row.provider === "STRIPE" &&
    row.checkoutMode === "payment" &&
    Boolean(row.stripeSessionId?.startsWith("cs_live_"))
  ).length;
  const runtimeLiveCheckoutWebhookRows = runtimeState.paymentWebhookEvents.filter((row) =>
    row.livemode &&
    (row.eventType === "checkout.session.completed" || row.eventType === "checkout.session.async_payment_succeeded") &&
    Boolean(row.paymentSessionId)
  ).length;

  return {
    paymentSessions: paymentSessions ?? runtimeState.paymentSessions.length,
    webhookRows: webhookRows ?? runtimeState.paymentWebhookEvents.length,
    reconciliationRows: reconciliationRows ?? runtimeState.paymentReconciliationLogs.length,
    connectorProbeRows: connectorProbeRows ?? runtimeState.connectorProbeLogs.length,
    walletFundingProbeRows: walletFundingProbeRows ?? runtimeState.walletFundingProbeLogs.length,
    walletFundingRows: walletFundingRows ?? runtimeState.walletFunding.length,
    settlementRows: (settlements ?? runtimeState.settlements.length) + (commissionSettlements ?? runtimeState.commissionSettlements.length),
    revenueRows: revenueEvents ?? runtimeState.revenueEvents.length,
    auditRows: auditRows ?? runtimeState.auditLogs.length,
    validationRows: validationRows ?? runtimeState.productionValidationRuns.length,
    validationCronRows: validationCronRows ?? runtimeState.productionValidationRuns.filter((row) => row.triggerSource === "CRON_HTTP").length,
    liveCheckoutSessionRows: liveCheckoutSessionRows ?? runtimeLiveCheckoutSessionRows,
    liveCheckoutWebhookRows: liveCheckoutWebhookRows ?? runtimeLiveCheckoutWebhookRows,
    productionWalletFundingRows: productionWalletFundingRows ?? runtimeProductionWalletFundingRows,
    productionVenueProbePlatforms: productionVenueProbePlatforms ?? runtimeProductionVenueProbePlatforms,
    source: paymentSessions === null && webhookRows === null && reconciliationRows === null && connectorProbeRows === null && walletFundingProbeRows === null && walletFundingRows === null && settlements === null && commissionSettlements === null && revenueEvents === null && auditRows === null && validationRows === null && validationCronRows === null && liveCheckoutWebhookRows === null && liveCheckoutSessionRows === null && productionWalletFundingRows === null && productionVenueProbePlatforms === null
      ? "runtime-memory"
      : "d1-first"
  };
}

function createSnapshot(report: Omit<IntegrationReadinessReport, "snapshots">): IntegrationReadinessSnapshot {
  const open = summarizeOpenItems(report.items);
  return {
    id: nextId("READY"),
    generatedAt: report.generatedAt,
    probeNetwork: report.probeNetwork,
    p0Open: open.p0Open,
    p1Open: open.p1Open,
    summary: report.summary,
    report
  };
}

function mapSnapshotRow(row: Record<string, unknown>): IntegrationReadinessSnapshot {
  return {
    id: String(row.id),
    generatedAt: String(row.generated_at),
    probeNetwork: Boolean(Number(row.probe_network ?? 0)),
    p0Open: Number(row.p0_open ?? 0),
    p1Open: Number(row.p1_open ?? 0),
    summary: JSON.parse(String(row.summary_json ?? "{}")),
    report: JSON.parse(String(row.report_json ?? "{}"))
  };
}

export async function persistProductionReadinessSnapshot(report: Omit<IntegrationReadinessReport, "snapshots">) {
  const snapshot = createSnapshot(report);
  const db = await getOptionalD1();
  if (!db) {
    runtimeSnapshots.unshift(snapshot);
    return snapshot;
  }

  try {
    await db.prepare(
      `INSERT INTO production_readiness_snapshots (
        id, generated_at, probe_network, p0_open, p1_open, summary_json, report_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      snapshot.id,
      snapshot.generatedAt,
      snapshot.probeNetwork ? 1 : 0,
      snapshot.p0Open,
      snapshot.p1Open,
      JSON.stringify(snapshot.summary),
      JSON.stringify(snapshot.report)
    ).run();
  } catch (error) {
    if (!(error instanceof Error) || !/no such table:\s*production_readiness_snapshots/i.test(error.message)) {
      throw error;
    }
    runtimeSnapshots.unshift(snapshot);
  }

  return snapshot;
}

export async function listProductionReadinessSnapshots(limit = 8) {
  const normalizedLimit = Math.max(1, Math.min(limit, 50));
  const db = await getOptionalD1();
  if (!db) {
    return runtimeSnapshots.slice(0, normalizedLimit);
  }

  try {
    const rows = await d1All<Record<string, unknown>>(
      `SELECT id, generated_at, probe_network, p0_open, p1_open, summary_json, report_json
       FROM production_readiness_snapshots
       ORDER BY generated_at DESC
       LIMIT ?`,
      [normalizedLimit]
    );
    return rows.map(mapSnapshotRow);
  } catch (error) {
    if (error instanceof Error && /no such table:\s*production_readiness_snapshots/i.test(error.message)) {
      return runtimeSnapshots.slice(0, normalizedLimit);
    }
    throw error;
  }
}

export async function buildProductionReadinessReport(options?: { probeNetwork?: boolean; persistSnapshot?: boolean }): Promise<IntegrationReadinessReport> {
  const generatedAt = new Date().toISOString();
  const probeNetwork = Boolean(options?.probeNetwork);
  const connectorProbe = probeNetwork ? await runVenueConnectorProbeAsync() : null;
  const connectorHealth = connectorProbe?.health ?? [];
  const connectorProbeLogs = probeNetwork
    ? connectorProbe?.records ?? []
    : await listVenueConnectorProbeLogsAsync(20);
  const walletFundingProbeLogs = await listWalletFundingProbeLogsAsync(20);
  const operationalRows = await countOperationalRows();
  const stripe = secretState("STRIPE_SECRET_KEY", { requireLiveStripe: true });
  const stripeProbe = await probeStripeApiReadiness({
    enabled: probeNetwork && stripe.status === "configured",
    secretKey: envValue("STRIPE_SECRET_KEY")
  });
  const stripeWebhook = secretState("STRIPE_WEBHOOK_SECRET", {
    placeholderPatterns: [/^whsec_?placeholder/i, /^whsec_test_placeholder/i]
  });
  const polygonRpc = secretState("RPC_URL_POLYGON", {
    placeholderPatterns: [/polygon-rpc\.example/i, /rpc\.example/i]
  });
  const polygonUsdc = secretState("TOKEN_USDC_POLYGON", {
    placeholderPatterns: [/^0x0{40}$/i]
  });
  const cronSecret = secretState("CRON_SECRET", {
    placeholderPatterns: [/^cron111/i]
  });
  const polymarketCredentials = platformCredentialState("Polymarket", [
    "POLYMARKET_API_KEY",
    "POLYMARKET_SECRET_KEY",
    "POLYMARKET_PASSPHRASE",
    "POLYMARKET_FUNDER_ADDRESS"
  ]);
  const kalshiCredentials = platformCredentialState("Kalshi", [
    "KALSHI_API_KEY_ID",
    "KALSHI_PRIVATE_KEY"
  ]);
  const predictitCredentials = platformCredentialState("PredictIt", [
    "PREDICTIT_API_TOKEN"
  ]);
  const connectorLive = envValue("POLYSMART_CONNECTORS_MODE") === "live" || runtimeState.integrations.connectorsMode === "live";
  const boundVerifiedAccounts = runtimeState.accounts.filter((account) => account.kycStatus === "verified" && account.externalAccountRef).length;
  const queryEnabledAccounts = runtimeState.accounts.filter((account) => account.kycStatus === "verified" && account.externalAccountRef && account.canQuery).length;
  const tradeEnabledAccounts = runtimeState.accounts.filter((account) => account.kycStatus === "verified" && account.externalAccountRef && account.canTrade).length;
  const liveCredentialStatus = worstSecretStatus([
    { status: polymarketCredentials.status as ReturnType<typeof secretState>["status"], evidence: "" },
    { status: kalshiCredentials.status as ReturnType<typeof secretState>["status"], evidence: "" },
    { status: predictitCredentials.status as ReturnType<typeof secretState>["status"], evidence: "" }
  ]);
  const walletFundingRows = operationalRows.walletFundingRows;
  const productionWalletFundingRows = operationalRows.productionWalletFundingRows;
  const walletFundingProbeRows = operationalRows.walletFundingProbeRows;
  const polygonProbe = await probePolygonUsdcReadiness({
    enabled: probeNetwork && polygonRpc.status === "configured" && polygonUsdc.status === "configured",
    rpcUrl: envValue("RPC_URL_POLYGON"),
    tokenAddress: envValue("TOKEN_USDC_POLYGON")
  });
  const webhookRows = operationalRows.webhookRows;
  const liveCheckoutSessionRows = operationalRows.liveCheckoutSessionRows;
  const liveCheckoutWebhookRows = operationalRows.liveCheckoutWebhookRows;
  const reconciliationRows = operationalRows.reconciliationRows;
  const connectorProbeRows = operationalRows.connectorProbeRows;
  const productionVenueProbePlatforms = operationalRows.productionVenueProbePlatforms;
  const settlementRows = operationalRows.settlementRows;
  const revenueRows = operationalRows.revenueRows;
  const auditRows = operationalRows.auditRows;
  const validationRows = operationalRows.validationRows;
  const validationCronRows = operationalRows.validationCronRows;
  const scheduledAttempts = await listProductionScheduledValidationAttempts(8);
  const scheduledSuccessAttempts = scheduledAttempts.filter((row) => row.status === "SUCCESS").length;
  const latestScheduledAttempt = scheduledAttempts[0];
  const scheduledCron = {
    expression: DEFAULT_PRODUCTION_VALIDATION_CRON,
    intervalMinutes: DEFAULT_PRODUCTION_VALIDATION_INTERVAL_MINUTES,
    nextExpectedAt: computeNextCronWindow(generatedAt, DEFAULT_PRODUCTION_VALIDATION_INTERVAL_MINUTES)
  };

  const connectorProbeStatus: IntegrationStatus = !connectorLive
    ? "placeholder"
    : probeNetwork
      ? connectorHealth.every((row) => row.healthy) ? "configured" : "unavailable"
      : "configured_pending_probe";

  const items = [
    item({
      key: "stripe-production-payment",
      label: "Stripe production Checkout payment",
      risk: "P0",
      status: stripe.status === "configured"
        ? stripeProbe.status === "unavailable" || stripeProbe.status === "test_key_only"
          ? stripeProbe.status
          : liveCheckoutSessionRows > 0 ? "configured" : "requires_real_transaction"
        : stripe.status,
      evidence: [
        stripe.evidence,
        ...stripeProbe.evidence,
        `payment_sessions rows (${operationalRows.source}): ${operationalRows.paymentSessions}`,
        `production livemode Checkout sessions (${operationalRows.source}): ${liveCheckoutSessionRows}`,
        `payment_reconciliation_logs rows (${operationalRows.source}): ${reconciliationRows}`
      ],
      requiredAction: stripe.status === "configured"
        ? "Run a real sk_live Checkout payment and verify hosted checkout completion."
        : "Configure STRIPE_SECRET_KEY with a real sk_live key."
    }),
    item({
      key: "stripe-webhook-reconciliation",
      label: "Stripe signed webhook reconciliation",
      risk: "P0",
      status: stripeWebhook.status === "configured" ? (liveCheckoutWebhookRows > 0 ? "configured" : "requires_real_transaction") : stripeWebhook.status,
      evidence: [
        stripeWebhook.evidence,
        `processed Stripe webhook events (${operationalRows.source}): ${webhookRows}`,
        `production livemode checkout webhooks (${operationalRows.source}): ${liveCheckoutWebhookRows}`,
        `manual Stripe reconciliation logs (${operationalRows.source}): ${reconciliationRows}`
      ],
      requiredAction: stripeWebhook.status === "configured"
        ? "Send a real checkout.session.completed event from Stripe production and verify invoice/points settlement."
        : "Configure STRIPE_WEBHOOK_SECRET from the production webhook endpoint."
    }),
    item({
      key: "prediction-market-account-matrix",
      label: "Polymarket/Kalshi/PredictIt account binding and KYC matrix",
      risk: "P0",
      status: liveCredentialStatus !== "configured"
        ? liveCredentialStatus
        : boundVerifiedAccounts === 0 || queryEnabledAccounts === 0 || tradeEnabledAccounts === 0
          ? "configured_pending_probe"
          : productionVenueProbePlatforms >= 3 ? "configured" : connectorProbeStatus === "unavailable" ? "unavailable" : "configured_pending_probe",
      evidence: [
        ...polymarketCredentials.evidence,
        ...kalshiCredentials.evidence,
        ...predictitCredentials.evidence,
        `connectors mode: ${connectorLive ? "live" : "mock"}`,
        `verified accounts with external refs: ${boundVerifiedAccounts}`,
        `query-enabled verified accounts: ${queryEnabledAccounts}`,
        `trade-enabled verified accounts: ${tradeEnabledAccounts}`,
        `connector probe logs (${operationalRows.source}): ${connectorProbeRows}`,
        `production live venue probe platforms (${operationalRows.source}): ${productionVenueProbePlatforms}/3`,
        ...connectorProbeLogs.slice(0, 3).map((row) => `${row.platform} probe ${row.healthy ? "healthy" : "unavailable"} · ${row.mode} · ${row.probeSource} · credentials ${row.credentialsConfigured ? "ok" : "missing"} · kyc ${row.kycSatisfied ? "ok" : "missing"} · query ${row.queryPermissionOk ? "ok" : "missing"} · trade ${row.tradePermissionOk ? "ok" : "missing"} · rate-limit ${row.rateLimitOk ? "ok" : "pending"} · ${row.latencyMs}ms`),
        `order-book polling interval: ${runtimeState.systemSettings.api.orderBookPollingMs}ms`
      ],
      requiredAction: "Configure each venue credential set, sync KYC/external refs, confirm QUERY/TRADE permissions, then probe connector health under production rate limits."
    }),
    item({
      key: "polygon-wallet-funding-listener",
      label: "Polygon wallet recharge listener",
      risk: "P0",
      status: polygonRpc.status !== "configured"
        ? polygonRpc.status
        : polygonUsdc.status !== "configured"
          ? polygonUsdc.status
          : polygonProbe.status === "unavailable"
            ? "unavailable"
            : productionWalletFundingRows > 0 ? "configured" : "requires_real_transaction",
      evidence: [
        polygonRpc.evidence,
        polygonUsdc.evidence,
        ...polygonProbe.evidence,
        `wallet funding records (${operationalRows.source}): ${walletFundingRows}`,
        `production Polygon USDC RPC funding records (${operationalRows.source}): ${productionWalletFundingRows}`,
        `wallet funding probe logs (${operationalRows.source}): ${walletFundingProbeRows}`,
        ...walletFundingProbeLogs.slice(0, 3).map((row) => `${row.accountId} probe ${row.status} · ${row.chain}/${row.asset} · decimals ${row.tokenDecimals ?? "unknown"} · transfers ${row.detectedTransferCount}`)
      ],
      requiredAction: "Run a real Polygon USDC deposit, verify token decimals, transfer scan, permission audit, and D1 wallet_funding persistence."
    }),
    item({
      key: "backoffice-operational-ledgers",
      label: "Backoffice revenue, commission, settlement, and audit ledgers",
      risk: "P1",
      status: settlementRows > 0 || revenueRows > 0 || auditRows > 0 ? "configured" : "configured_pending_probe",
      evidence: [
        `settlement/commission rows (${operationalRows.source}): ${settlementRows}`,
        `revenue event rows (${operationalRows.source}): ${revenueRows}`,
        `payment reconciliation rows (${operationalRows.source}): ${reconciliationRows}`,
        `connector probe rows (${operationalRows.source}): ${connectorProbeRows}`,
        `wallet funding probe rows (${operationalRows.source}): ${walletFundingProbeRows}`,
        `audit log rows (${operationalRows.source}): ${auditRows}`,
        `audit log retention policy: ${runtimeState.systemSettings.logs.retentionDays} days`,
        "D1 schema includes settlements, commission_settlements, revenue_events, payment_webhook_events, payment_reconciliation_logs, connector_probe_logs, wallet_funding_probe_logs, wallet_funding, and audit_logs."
      ],
      requiredAction: "After production deployment, verify D1 contains fresh audit_logs, revenue_events, payment_reconciliation_logs, connector_probe_logs, wallet_funding_probe_logs, and settlement ledgers after live operations."
    }),
    item({
      key: "production-validation-automation",
      label: "Automated production validation heartbeat",
      risk: "P1",
      status: cronSecret.status === "configured"
        ? validationCronRows > 0 ? "configured" : "configured_pending_probe"
        : cronSecret.status,
      evidence: [
        cronSecret.evidence,
        `production validation runs (${operationalRows.source}): ${validationRows}`,
        `CRON_HTTP validation runs (${operationalRows.source}): ${validationCronRows}`,
        `scheduled validation attempts (d1-first): ${scheduledAttempts.length}`,
        latestScheduledAttempt
          ? `latest scheduled attempt: ${latestScheduledAttempt.status} · ${latestScheduledAttempt.responseStatus ?? "no-response"} · ${latestScheduledAttempt.createdAt}`
          : "latest scheduled attempt: none recorded",
        `next expected cron window: ${scheduledCron.nextExpectedAt ?? "unknown"} (${scheduledCron.expression})`,
        "Cron endpoint: POST /api/admin/production-validation-cron with Bearer CRON_SECRET or x-cron-secret."
      ],
      requiredAction: cronSecret.status === "configured"
        ? scheduledSuccessAttempts > 0
          ? "Monitor scheduled attempt diagnostics and D1 CRON_HTTP rows; P0 remains blocked until live external integration evidence lands."
          : "Trigger the protected cron endpoint from Cloudflare Cron Trigger or an external scheduler and verify a CRON_HTTP row lands in D1."
        : "Configure CRON_SECRET as a Cloudflare Secret before enabling automated production validation."
    })
  ];

  const report = {
    generatedAt,
    probeNetwork,
    summary: countStatuses(items),
    items,
    connectorHealth,
    scheduledAttempts,
    scheduledCron
  };

  if (options?.persistSnapshot) {
    await persistProductionReadinessSnapshot(report);
  }

  return {
    ...report,
    snapshots: await listProductionReadinessSnapshots()
  };
}
