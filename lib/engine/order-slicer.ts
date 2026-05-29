import { AllocationOutput, QuoteAccount } from "@/lib/types";

export function sliceOrderAcrossAccounts(totalUsd: number, accounts: QuoteAccount[]): AllocationOutput[] {
  const healthy = accounts.filter((a) => a.availableUsd > 0 && a.weight > 0);
  const weightSum = healthy.reduce((acc, x) => acc + x.weight, 0);
  if (!healthy.length || weightSum === 0 || totalUsd <= 0) {
    return [];
  }

  const rows = healthy.map((account, idx) => {
    const desired = (totalUsd * account.weight) / weightSum;
    const assignedUsd = Math.min(desired, account.availableUsd);
    return {
      accountId: account.accountId,
      assignedUsd: Number(assignedUsd.toFixed(2)),
      jitterMs: 10 + idx * 13
    };
  });

  const assignedSum = rows.reduce((acc, row) => acc + row.assignedUsd, 0);
  let remainder = Number((totalUsd - assignedSum).toFixed(2));
  if (remainder > 0) {
    for (const row of rows) {
      const account = healthy.find((x) => x.accountId === row.accountId);
      if (!account) {
        continue;
      }
      const room = Number((account.availableUsd - row.assignedUsd).toFixed(2));
      if (room <= 0) {
        continue;
      }
      const add = Math.min(room, remainder);
      row.assignedUsd = Number((row.assignedUsd + add).toFixed(2));
      remainder = Number((remainder - add).toFixed(2));
      if (remainder <= 0) {
        break;
      }
    }
  }

  return rows;
}
