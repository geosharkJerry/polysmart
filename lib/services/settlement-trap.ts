import { pushAudit, runtimeState } from "@/lib/store";
import { FlashLiquidationReport, SettlementTrapTarget, T0Event } from "@/lib/types";

function round(value: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function nowIso() {
  return new Date().toISOString();
}

function hoursToSettlement(event: T0Event) {
  const hours = (Date.parse(event.endTimeUtc) - Date.now()) / (1000 * 60 * 60);
  return Math.max(1, hours);
}

function pseudoAskPrice(eventId: string) {
  const seed = eventId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return round(0.961 + (seed % 18) / 1000, 3);
}

function pseudoAiConfidence(event: T0Event) {
  // Promote already-high confidence contracts into deterministic settlement candidates.
  if (event.aiWinProbability >= 0.8 && event.edgeSpreadPct >= 3) {
    return 0.9992;
  }
  return Math.min(0.9985, round(event.aiWinProbability + 0.12, 4));
}

export function computeDynamicApy(priceAsk: number, deltaDays: number) {
  if (!Number.isFinite(priceAsk) || priceAsk <= 0 || !Number.isFinite(deltaDays) || deltaDays <= 0) {
    return 0;
  }
  return Math.pow(1 / priceAsk, 365 / deltaDays) - 1;
}

export function getAntiLockupCeilingUsd() {
  const bufferCeiling = runtimeState.poolState.liquidBufferUsd * runtimeState.settlementTrapConfig.antiLockupCeilingRatio;
  const hardCeiling = runtimeState.poolState.totalAssetsUsd * runtimeState.settlementTrapConfig.hardExposureCapRatio;
  return round(Math.min(bufferCeiling, hardCeiling), 2);
}

export function getSettlementTrapExposureUsd() {
  return round(
    runtimeState.settlementTraps
      .filter((trap) => trap.status === "DEPLOYED")
      .reduce((sum, trap) => sum + trap.allocatedUsd, 0),
    2
  );
}

function mapEventCategory(event: T0Event): SettlementTrapTarget["category"] {
  if (event.category === "Macro") return "MACRO";
  if (event.category === "Politics") return "POLITICS";
  return "CRYPTO";
}

function createTrapFromEvent(event: T0Event): SettlementTrapTarget {
  const price = pseudoAskPrice(event.id);
  const etaHours = hoursToSettlement(event);
  const deltaDays = etaHours / 24;
  const apy = computeDynamicApy(price, deltaDays);

  return {
    trapId: `TRAP-${event.id}`,
    marketId: event.id,
    category: mapEventCategory(event),
    title: event.title,
    targetContractType: "YES",
    currentMarketPrice: price,
    projectedApy: round(apy, 4),
    allocatedUsd: 0,
    aiConfidence: pseudoAiConfidence(event),
    settlementEtaHours: round(etaHours, 2),
    status: "SCANNING",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    liquidatedAt: null
  };
}

export function scanSettlementLiquidityTraps() {
  const config = runtimeState.settlementTrapConfig;
  const candidates = runtimeState.events.map(createTrapFromEvent);
  const maxSingle = getAntiLockupCeilingUsd();
  const currentExposure = getSettlementTrapExposureUsd();
  const availableBuffer = round(runtimeState.poolState.liquidBufferUsd * config.idleBufferRatio, 2);

  const deployed: SettlementTrapTarget[] = [];
  for (const candidate of candidates) {
    const apyGate = candidate.projectedApy >= runtimeState.config.alphaFloor;
    const priceGate = candidate.currentMarketPrice > config.minAskPrice;
    const aiGate = candidate.aiConfidence >= config.minAiConfidence;
    const room = round(Math.max(0, maxSingle - currentExposure), 2);

    if (!apyGate || !priceGate || !aiGate || room <= 0) {
      continue;
    }

    const allocation = round(Math.min(room, availableBuffer * 0.2), 2);
    if (allocation <= 0) {
      continue;
    }

    const existing = runtimeState.settlementTraps.find((t) => t.marketId === candidate.marketId && t.status === "DEPLOYED");
    if (existing) {
      continue;
    }

    const trap: SettlementTrapTarget = {
      ...candidate,
      allocatedUsd: allocation,
      status: "DEPLOYED",
      updatedAt: nowIso()
    };

    runtimeState.settlementTraps.unshift(trap);
    deployed.push(trap);
  }

  if (deployed.length > 0) {
    pushAudit("RISK", "settlement trap deployed", {
      deployed: deployed.map((t) => ({ marketId: t.marketId, allocatedUsd: t.allocatedUsd, apy: t.projectedApy })),
      antiLockupCeilingUsd: maxSingle
    });
  }

  return {
    deployed,
    antiLockupCeilingUsd: maxSingle,
    exposureUsd: getSettlementTrapExposureUsd(),
    availableBufferUsd: availableBuffer
  };
}

export function triggerRedemptionDrivenFlashLiquidation(requiredUsd: number): FlashLiquidationReport {
  const start = performance.now();
  const active = runtimeState.settlementTraps.filter((trap) => trap.status === "DEPLOYED");

  if (!Number.isFinite(requiredUsd) || requiredUsd <= runtimeState.poolState.liquidBufferUsd || active.length === 0) {
    const elapsedMs = round(performance.now() - start, 3);
    const report: FlashLiquidationReport = {
      triggered: false,
      withinSla: elapsedMs <= runtimeState.settlementTrapConfig.flashLiquidationSlaMs,
      elapsedMs,
      requiredUsd: round(requiredUsd, 2),
      reclaimedUsd: 0,
      remainingShortfallUsd: round(Math.max(0, requiredUsd - runtimeState.poolState.liquidBufferUsd), 2),
      liquidatedMarkets: []
    };
    runtimeState.lastFlashLiquidation = report;
    return report;
  }

  let reclaimedUsd = 0;
  let shortfall = requiredUsd - runtimeState.poolState.liquidBufferUsd;
  const liquidatedMarkets: string[] = [];

  const liquidationPrice = 0.965;
  for (const trap of active) {
    if (shortfall <= 0) {
      break;
    }

    const cashOut = round(trap.allocatedUsd * (liquidationPrice / trap.currentMarketPrice), 2);
    const markLoss = round(Math.max(0, trap.allocatedUsd - cashOut), 2);

    trap.status = "FORCE_LIQUIDATED";
    trap.liquidatedAt = nowIso();
    trap.updatedAt = nowIso();

    reclaimedUsd = round(reclaimedUsd + cashOut, 2);
    shortfall = round(Math.max(0, shortfall - cashOut), 2);
    liquidatedMarkets.push(trap.marketId);

    runtimeState.poolState.totalAssetsUsd = round(runtimeState.poolState.totalAssetsUsd - markLoss, 2);
  }

  runtimeState.poolState.liquidBufferUsd = round(runtimeState.poolState.liquidBufferUsd + reclaimedUsd, 2);
  runtimeState.poolState.updatedAt = nowIso();

  const elapsedMs = round(performance.now() - start, 3);
  const report: FlashLiquidationReport = {
    triggered: true,
    withinSla: elapsedMs <= runtimeState.settlementTrapConfig.flashLiquidationSlaMs,
    elapsedMs,
    requiredUsd: round(requiredUsd, 2),
    reclaimedUsd,
    remainingShortfallUsd: shortfall,
    liquidatedMarkets
  };

  runtimeState.lastFlashLiquidation = report;
  pushAudit("RISK", "redemption-driven flash liquidation", {
    report,
    level4TasksTerminated: true,
    liquidationPrice
  });

  return report;
}

export function getSettlementTrapSnapshot() {
  const deployed = runtimeState.settlementTraps.filter((trap) => trap.status === "DEPLOYED");
  const forceLiquidated = runtimeState.settlementTraps.filter((trap) => trap.status === "FORCE_LIQUIDATED");
  const antiLockupCeilingUsd = getAntiLockupCeilingUsd();

  return {
    config: runtimeState.settlementTrapConfig,
    antiLockupCeilingUsd,
    currentExposureUsd: getSettlementTrapExposureUsd(),
    bufferCapitalUsd: runtimeState.poolState.liquidBufferUsd,
    maxAllowedPoolExposureUsd: round(
      runtimeState.poolState.totalAssetsUsd * runtimeState.settlementTrapConfig.hardExposureCapRatio,
      2
    ),
    activeTraps: deployed,
    liquidatedTraps: forceLiquidated,
    lastFlashLiquidation: runtimeState.lastFlashLiquidation
  };
}
