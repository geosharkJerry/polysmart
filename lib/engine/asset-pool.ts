import { AssetPoolState, BillingMode, BillingProfile, PoolMember, SettlementLedger } from "@/lib/types";

export function recalcNav(pool: AssetPoolState): AssetPoolState {
  const nav = pool.totalShares > 0 ? pool.totalAssetsUsd / pool.totalShares : 1;
  return {
    ...pool,
    nav: Number(nav.toFixed(6)),
    updatedAt: new Date().toISOString()
  };
}

export function depositToPool(
  pool: AssetPoolState,
  member: PoolMember | undefined,
  amountUsd: number,
  userId: string
): { pool: AssetPoolState; member: PoolMember } {
  const shares = pool.nav > 0 ? amountUsd / pool.nav : amountUsd;
  const nextPool = recalcNav({
    ...pool,
    totalAssetsUsd: Number((pool.totalAssetsUsd + amountUsd).toFixed(2)),
    liquidBufferUsd: Number((pool.liquidBufferUsd + amountUsd).toFixed(2)),
    totalShares: Number((pool.totalShares + shares).toFixed(6))
  });

  const nextMember: PoolMember = {
    userId,
    shares: Number(((member?.shares ?? 0) + shares).toFixed(6)),
    principalUsd: Number(((member?.principalUsd ?? 0) + amountUsd).toFixed(2)),
    pnlUsd: Number((member?.pnlUsd ?? 0).toFixed(2))
  };

  return { pool: nextPool, member: nextMember };
}

export function settlePerformanceFee(
  profile: BillingProfile,
  eventId: string,
  netProfitUsd: number,
  nowIso: string = new Date().toISOString()
): { profile: BillingProfile; ledger: SettlementLedger; feeUsd: number } {
  const feeRate = profile.performanceFeeRate;
  const feeUsd = profile.billingMode === "PERFORMANCE" ? netProfitUsd * feeRate : 0;

  const nextProfile: BillingProfile = {
    ...profile,
    pscBalance: Number((profile.pscBalance - feeUsd).toFixed(4)),
    accountStatus: profile.pscBalance >= feeUsd ? "active" : "quota_exhausted"
  };

  const ledger: SettlementLedger = {
    id: `SET-${Math.floor(Math.random() * 900000 + 100000)}`,
    userId: profile.userId,
    mode: profile.billingMode as BillingMode,
    eventId,
    tradedVolumeUsd: 0,
    platformRevenueUsd: Number(feeUsd.toFixed(2)),
    timestamp: nowIso
  };

  return { profile: nextProfile, ledger, feeUsd: Number(feeUsd.toFixed(2)) };
}
