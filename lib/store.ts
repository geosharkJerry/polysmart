import {
  AccountCredential,
  AssetPoolState,
  AtomicTransaction,
  AuditLog,
  BillingProfile,
  BusEvent,
  BusMetrics,
  BusSlaPolicy,
  ExecutionIntent,
  FillRecord,
  InventoryLock,
  InventoryPosition,
  MatrixAccount,
  OrderRecord,
  PlatformConfig,
  PoolMember,
  FlashLiquidationReport,
  RiskMetrics,
  SettlementTrapConfig,
  SettlementTrapTarget,
  SelfHealingState,
  SettlementLedger,
  T0Event
} from "@/lib/types";

const now = new Date();
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

const levelMetrics = () => ({
  processed: 0,
  breaches: 0,
  avgWaitMs: 0,
  lastWaitMs: 0
});

export interface RuntimeState {
  config: PlatformConfig;
  events: T0Event[];
  profiles: Record<string, BillingProfile>;
  settlements: SettlementLedger[];
  accounts: MatrixAccount[];
  accountCredentials: Record<string, AccountCredential>;
  poolState: AssetPoolState;
  poolMembers: Record<string, PoolMember>;
  risk: RiskMetrics;
  healing: SelfHealingState;
  intents: Record<string, ExecutionIntent>;
  orders: Record<string, OrderRecord>;
  fills: FillRecord[];
  inventory: Record<string, InventoryPosition>;
  inventoryLocks: Record<string, InventoryLock>;
  atomicTransactions: Record<string, AtomicTransaction>;
  busQueue: BusEvent[];
  busSlaPolicies: Record<1 | 2 | 3 | 4, BusSlaPolicy>;
  busMetrics: BusMetrics;
  settlementTrapConfig: SettlementTrapConfig;
  settlementTraps: SettlementTrapTarget[];
  lastFlashLiquidation: FlashLiquidationReport | null;
  auditLogs: AuditLog[];
}

export const runtimeState: RuntimeState = {
  config: {
    scrapeFrequencyMinutes: 15,
    alphaFloor: 0.015,
    hedgeTimeoutMs: 800,
    emergencyBufferRatio: 0.15
  },
  events: [
    {
      id: "EVT-001",
      platform: "Polymarket",
      title: "Will U.S. PCE inflation print below 2.8% today?",
      category: "Macro",
      endTimeUtc: inHours(4),
      edgeSpreadPct: 3.4,
      aiWinProbability: 0.76
    },
    {
      id: "EVT-002",
      platform: "Kalshi",
      title: "Will a Fed governor deliver a hawkish speech by market close?",
      category: "Politics",
      endTimeUtc: inHours(6),
      edgeSpreadPct: 2.2,
      aiWinProbability: 0.68
    },
    {
      id: "EVT-003",
      platform: "PredictIt",
      title: "Will the committee advance the bill in today's hearing?",
      category: "Regulation",
      endTimeUtc: inHours(8),
      edgeSpreadPct: 4.1,
      aiWinProbability: 0.81
    }
  ],
  profiles: {
    "user-alpha": {
      userId: "user-alpha",
      billingMode: "SUBSCRIPTION",
      settlementFrequency: "DAILY",
      volumeFeeRate: 0.015,
      performanceFeeRate: 0.2,
      rentExpiresAt: "2026-12-31T23:59:59Z",
      totalTradedVolumeUsd: 253400,
      pscBalance: 4860,
      accountStatus: "active"
    },
    "user-beta": {
      userId: "user-beta",
      billingMode: "PERFORMANCE",
      settlementFrequency: "EVENT_END",
      volumeFeeRate: 0.015,
      performanceFeeRate: 0.2,
      rentExpiresAt: null,
      totalTradedVolumeUsd: 92600,
      pscBalance: 1400,
      accountStatus: "active"
    }
  },
  settlements: [
    {
      id: "SET-801",
      userId: "user-alpha",
      mode: "SUBSCRIPTION",
      eventId: "EVT-001",
      tradedVolumeUsd: 38000,
      platformRevenueUsd: 570,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: "SET-802",
      userId: "user-beta",
      mode: "PERFORMANCE",
      eventId: "EVT-003",
      tradedVolumeUsd: 22000,
      platformRevenueUsd: 1440,
      timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString()
    }
  ],
  accounts: [
    {
      accountId: "acc-poly-1",
      userId: "user-alpha",
      platform: "polymarket",
      label: "Poly Primary",
      proxyUrl: "socks5://proxy-a.example",
      status: "healthy",
      lastHealthCheckAt: now.toISOString()
    },
    {
      accountId: "acc-kalshi-1",
      userId: "user-alpha",
      platform: "kalshi",
      label: "Kalshi Main",
      proxyUrl: "socks5://proxy-b.example",
      status: "healthy",
      lastHealthCheckAt: now.toISOString()
    }
  ],
  accountCredentials: {},
  poolState: {
    totalAssetsUsd: 890000,
    liquidBufferUsd: 133500,
    totalShares: 810000,
    nav: 1.0988,
    emergencyPenaltyRate: 0.02,
    updatedAt: now.toISOString()
  },
  poolMembers: {
    "user-alpha": {
      userId: "user-alpha",
      shares: 124000,
      principalUsd: 120000,
      pnlUsd: 6240
    },
    "user-beta": {
      userId: "user-beta",
      shares: 91000,
      principalUsd: 85000,
      pnlUsd: 4990
    }
  },
  risk: {
    inventoryDeviationPct: 0.08,
    hedgeLatencyMs: 420,
    slippagePct: 0.002,
    blockedAccounts: 0,
    status: "NORMAL",
    reason: null,
    updatedAt: now.toISOString()
  },
  healing: {
    mode: "NORMAL",
    lastTransitionAt: now.toISOString(),
    reason: null
  },
  intents: {},
  orders: {},
  fills: [],
  inventory: {},
  inventoryLocks: {},
  atomicTransactions: {},
  busQueue: [],
  busSlaPolicies: {
    1: { level: 1, maxLatencyMs: 50 },
    2: { level: 2, maxLatencyMs: 200 },
    3: { level: 3, maxLatencyMs: 500 },
    4: { level: 4, maxLatencyMs: 2000 }
  },
  busMetrics: {
    queueDepth: 0,
    processed: 0,
    dropped: 0,
    avgLatencyMs: 0,
    level: {
      1: levelMetrics(),
      2: levelMetrics(),
      3: levelMetrics(),
      4: levelMetrics()
    },
    updatedAt: now.toISOString()
  },
  settlementTrapConfig: {
    idleBufferRatio: 0.15,
    antiLockupCeilingRatio: 0.3,
    hardExposureCapRatio: 0.045,
    flashLiquidationSlaMs: 50,
    minAskPrice: 0.96,
    minAiConfidence: 0.999
  },
  settlementTraps: [
    {
      trapId: "TRAP-01",
      marketId: "PM-FED-20260530",
      category: "MACRO",
      title: "Fed voting outcome already confirmed, awaiting settlement unlock",
      targetContractType: "YES",
      currentMarketPrice: 0.972,
      projectedApy: 3.842,
      allocatedUsd: 4500,
      aiConfidence: 0.9993,
      settlementEtaHours: 36,
      status: "DEPLOYED",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      liquidatedAt: null
    },
    {
      trapId: "TRAP-02",
      marketId: "PM-WEATHER-20260530",
      category: "WEATHER",
      title: "Weather bureau report finalized, market still in dispute window",
      targetContractType: "YES",
      currentMarketPrice: 0.968,
      projectedApy: 4.125,
      allocatedUsd: 2100,
      aiConfidence: 0.9991,
      settlementEtaHours: 32,
      status: "DEPLOYED",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      liquidatedAt: null
    }
  ],
  lastFlashLiquidation: null,
  auditLogs: []
};

export const nextId = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;

export function pushAudit(category: AuditLog["category"], message: string, context: Record<string, unknown>) {
  runtimeState.auditLogs.unshift({
    id: nextId("LOG"),
    category,
    message,
    context,
    createdAt: new Date().toISOString()
  });
  if (runtimeState.auditLogs.length > 5000) {
    runtimeState.auditLogs.length = 5000;
  }
}
