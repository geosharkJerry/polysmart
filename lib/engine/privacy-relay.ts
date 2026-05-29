import { RelayPlan } from "@/lib/types";

export function buildRelayPlan(totalUsd: number, wallets: string[]): RelayPlan {
  if (totalUsd <= 0 || wallets.length === 0) {
    return { totalUsd: 0, slices: [] };
  }

  const perWallet = totalUsd / wallets.length;
  const slices = wallets.map((wallet, idx) => {
    const ratio = 0.85 + (idx % 4) * 0.05;
    return {
      wallet,
      amountUsd: Number((perWallet * ratio).toFixed(2)),
      delayMs: 200 + idx * 180
    };
  });

  const sum = slices.reduce((acc, s) => acc + s.amountUsd, 0);
  const delta = Number((totalUsd - sum).toFixed(2));
  if (slices.length > 0 && delta !== 0) {
    slices[slices.length - 1].amountUsd = Number((slices[slices.length - 1].amountUsd + delta).toFixed(2));
  }

  return {
    totalUsd,
    slices
  };
}
