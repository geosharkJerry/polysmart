import net from "node:net";
import { pushAudit, runtimeState } from "@/lib/store";
import { listAuditLogsAsync } from "@/lib/services/audit-export";
import { AdminSystemSettings, AuditLog, IpAccessRule, SecretBindingStatus } from "@/lib/types";

type DeepPartial<T> = T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type AdminSystemSettingsPatch = DeepPartial<AdminSystemSettings>;

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidIpRuleValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const [host, cidr] = trimmed.split("/");
  const ipVersion = net.isIP(host);
  if (!ipVersion) {
    return false;
  }
  if (!cidr) {
    return true;
  }

  const cidrNum = Number(cidr);
  if (!Number.isInteger(cidrNum)) {
    return false;
  }
  return ipVersion === 4 ? cidrNum >= 0 && cidrNum <= 32 : cidrNum >= 0 && cidrNum <= 128;
}

function trimAuditLogs() {
  const retentionMs = runtimeState.systemSettings.logs.retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  runtimeState.auditLogs = runtimeState.auditLogs
    .filter((row) => new Date(row.createdAt).getTime() >= cutoff)
    .slice(0, 5000);
}

function previewSecret(value: string) {
  if (!value) {
    return null;
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function classifySecret(key: string, value?: string | null): SecretBindingStatus {
  const normalized = value?.trim() || "";
  if (!normalized) {
    return {
      key,
      status: "missing",
      preview: null,
      readonly: true,
      source: "cloudflare-secret",
      message: `${key} is missing from the runtime environment.`
    };
  }

  const lowered = normalized.toLowerCase();
  const isPlaceholder =
    lowered.includes("placeholder") ||
    lowered.includes("example.com") ||
    lowered.includes("mock") ||
    lowered === "stripe11111111111111" ||
    (key === "STRIPE_SECRET_KEY" && !normalized.startsWith("sk_")) ||
    (key === "RPC_URL_POLYGON" && (lowered.includes("rpc.example") || lowered.includes("polygon-rpc.example"))) ||
    (key === "TOKEN_USDC_POLYGON" && /^0x0{40}$/i.test(normalized));

  if (isPlaceholder) {
    return {
      key,
      status: "placeholder",
      preview: previewSecret(normalized),
      readonly: true,
      source: "cloudflare-secret",
      message: `${key} is present but still looks like a placeholder value.`
    };
  }

  return {
    key,
    status: "configured",
    preview: previewSecret(normalized),
    readonly: true,
    source: "cloudflare-secret",
    message: `${key} is injected from the runtime environment and appears production-ready.`
  };
}

function syncDerivedFields() {
  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY || "";
  const rpcUrlPolygon = process.env.RPC_URL_POLYGON || "";
  const tokenUsdcPolygon = process.env.TOKEN_USDC_POLYGON || "";
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  const logtoEndpoint = process.env.LOGTO_ENDPOINT || "";
  const logtoAppId = process.env.LOGTO_APP_ID || "";
  const logtoAppSecret = process.env.LOGTO_APP_SECRET || "";
  const logtoCookieSecret = process.env.LOGTO_COOKIE_SECRET || "";
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY || "";

  runtimeState.systemSettings.api.scrapeFrequencyMinutes = runtimeState.config.scrapeFrequencyMinutes;
  runtimeState.systemSettings.api.hedgeTimeoutMs = runtimeState.config.hedgeTimeoutMs;
  runtimeState.systemSettings.api.orderBookPollingMs = runtimeState.integrations.orderBookPollingMs;
  runtimeState.systemSettings.api.connectorsMode = runtimeState.integrations.connectorsMode;
  runtimeState.systemSettings.api.aiGatewayMode = runtimeState.integrations.aiGatewayMode;
  runtimeState.systemSettings.api.aiGatewayBaseUrl =
    process.env.AI_GATEWAY_BASE_URL || runtimeState.systemSettings.api.aiGatewayBaseUrl || "https://max2.jojocode.com/v1";
  runtimeState.systemSettings.api.aiGatewayModel =
    process.env.AI_GATEWAY_MODEL || runtimeState.systemSettings.api.aiGatewayModel || "gpt-5.4-mini";
  runtimeState.systemSettings.api.secretStatuses = {
    aiGatewayApiKey: classifySecret("AI_GATEWAY_API_KEY", aiGatewayApiKey),
    rpcUrlPolygon: classifySecret("RPC_URL_POLYGON", rpcUrlPolygon),
    tokenUsdcPolygon: classifySecret("TOKEN_USDC_POLYGON", tokenUsdcPolygon),
    logtoEndpoint: classifySecret("LOGTO_ENDPOINT", logtoEndpoint),
    logtoAppId: classifySecret("LOGTO_APP_ID", logtoAppId),
    logtoAppSecret: classifySecret("LOGTO_APP_SECRET", logtoAppSecret),
    logtoCookieSecret: classifySecret("LOGTO_COOKIE_SECRET", logtoCookieSecret),
    turnstileSiteKey: classifySecret("TURNSTILE_SITE_KEY", turnstileSiteKey),
    turnstileSecretKey: classifySecret("TURNSTILE_SECRET_KEY", turnstileSecretKey)
  };
  runtimeState.systemSettings.api.aiGatewayKeyConfigured = runtimeState.systemSettings.api.secretStatuses.aiGatewayApiKey.status === "configured";
  runtimeState.systemSettings.payment.secretStatuses = {
    stripeSecretKey: classifySecret("STRIPE_SECRET_KEY", stripeSecretKey)
  };
  runtimeState.systemSettings.payment.stripeSecretConfigured =
    runtimeState.systemSettings.payment.secretStatuses.stripeSecretKey.status === "configured";
  runtimeState.systemSettings.payment.stripeMode = runtimeState.systemSettings.payment.stripeSecretConfigured
    ? "live"
    : runtimeState.systemSettings.payment.stripeMode;
  trimAuditLogs();
}

function normalizeIpRules(rules: IpAccessRule[]) {
  return rules.map((rule, index) => ({
    id: rule.id || `IP-RULE-${index + 1}`,
    label: rule.label.trim(),
    value: rule.value.trim(),
    type: rule.type,
    scope: rule.scope,
    enabled: Boolean(rule.enabled),
    note: rule.note?.trim() || undefined,
    updatedAt: new Date().toISOString()
  }));
}

function validatePatch(patch: AdminSystemSettingsPatch) {
  if (patch.api?.scrapeFrequencyMinutes !== undefined) {
    const value = Number(patch.api.scrapeFrequencyMinutes);
    if (!Number.isFinite(value) || value < 1 || value > 60) {
      return "scrapeFrequencyMinutes must be between 1 and 60";
    }
  }

  if (patch.api?.hedgeTimeoutMs !== undefined) {
    const value = Number(patch.api.hedgeTimeoutMs);
    if (!Number.isFinite(value) || value < 50 || value > 10_000) {
      return "hedgeTimeoutMs must be between 50 and 10000";
    }
  }

  if (patch.api?.orderBookPollingMs !== undefined) {
    const value = Number(patch.api.orderBookPollingMs);
    if (!Number.isFinite(value) || value < 500 || value > 60_000) {
      return "orderBookPollingMs must be between 500 and 60000";
    }
  }

  if (patch.api?.aiGatewayBaseUrl !== undefined && !isValidHttpUrl(patch.api.aiGatewayBaseUrl)) {
    return "aiGatewayBaseUrl must be a valid http or https URL";
  }

  if (patch.logs?.retentionDays !== undefined) {
    const value = Number(patch.logs.retentionDays);
    if (!Number.isFinite(value) || value < 1 || value > 365) {
      return "retentionDays must be between 1 and 365";
    }
  }

  if (patch.logs?.exportWebhookUrl !== undefined && patch.logs.exportWebhookUrl !== null && !isValidHttpUrl(patch.logs.exportWebhookUrl)) {
    return "exportWebhookUrl must be a valid http or https URL";
  }

  if (patch.ip?.rules) {
    for (const rule of patch.ip.rules) {
      if (!rule.label?.trim()) {
        return "IP rule label is required";
      }
      if (!rule.value?.trim() || !isValidIpRuleValue(rule.value)) {
        return `IP rule value is invalid: ${rule.value}`;
      }
    }
  }

  if (patch.payment?.minRechargeUsd !== undefined) {
    const value = Number(patch.payment.minRechargeUsd);
    if (!Number.isFinite(value) || value < 1 || value > 1_000_000) {
      return "minRechargeUsd must be between 1 and 1000000";
    }
  }

  if (patch.payment?.managedPerformanceFeeRate !== undefined) {
    const value = Number(patch.payment.managedPerformanceFeeRate);
    if (!Number.isFinite(value) || value < 0 || value > 0.5) {
      return "managedPerformanceFeeRate must be between 0 and 0.5";
    }
  }

  return null;
}

export function getRecentAuditLogs(limit = 12): AuditLog[] {
  syncDerivedFields();
  return runtimeState.auditLogs.slice(0, limit);
}

export async function getRecentAuditLogsAsync(limit = 12): Promise<AuditLog[]> {
  syncDerivedFields();
  return listAuditLogsAsync({ limit });
}

export function getAdminSystemSettings(): AdminSystemSettings {
  syncDerivedFields();
  return structuredClone(runtimeState.systemSettings);
}

export function updateAdminSystemSettings(patch: AdminSystemSettingsPatch, actor = "system") {
  syncDerivedFields();
  const validationError = validatePatch(patch);
  if (validationError) {
    return { error: validationError } as const;
  }

  if (patch.api) {
    const { secretStatuses: _apiSecretStatuses, aiGatewayKeyConfigured: _apiKeyConfigured, ...apiPatch } = patch.api;
    runtimeState.systemSettings.api = {
      ...runtimeState.systemSettings.api,
      ...apiPatch
    };
    if (apiPatch.scrapeFrequencyMinutes !== undefined) {
      runtimeState.config.scrapeFrequencyMinutes = Math.round(Number(apiPatch.scrapeFrequencyMinutes));
    }
    if (apiPatch.hedgeTimeoutMs !== undefined) {
      runtimeState.config.hedgeTimeoutMs = Math.round(Number(apiPatch.hedgeTimeoutMs));
    }
    if (apiPatch.orderBookPollingMs !== undefined) {
      runtimeState.integrations.orderBookPollingMs = Math.round(Number(apiPatch.orderBookPollingMs));
    }
    if (apiPatch.connectorsMode !== undefined) {
      runtimeState.integrations.connectorsMode = apiPatch.connectorsMode;
    }
    if (apiPatch.aiGatewayMode !== undefined) {
      runtimeState.integrations.aiGatewayMode = apiPatch.aiGatewayMode;
    }
  }

  if (patch.logs) {
    runtimeState.systemSettings.logs = {
      ...runtimeState.systemSettings.logs,
      ...patch.logs
    };
  }

  if (patch.ip) {
    runtimeState.systemSettings.ip = {
      ...runtimeState.systemSettings.ip,
      ...patch.ip,
      rules: patch.ip.rules ? normalizeIpRules(patch.ip.rules as IpAccessRule[]) : runtimeState.systemSettings.ip.rules
    };
  }

  if (patch.payment) {
    const { secretStatuses: _paymentSecretStatuses, stripeSecretConfigured: _stripeSecretConfigured, ...paymentPatch } = patch.payment;
    runtimeState.systemSettings.payment = {
      ...runtimeState.systemSettings.payment,
      ...paymentPatch
    };
  }

  runtimeState.systemSettings.updatedAt = new Date().toISOString();
  runtimeState.systemSettings.updatedBy = actor;
  syncDerivedFields();

  pushAudit("SYSTEM", "admin system settings updated", {
    actor,
    sections: Object.keys(patch)
  });

  return { settings: getAdminSystemSettings() } as const;
}
