import { beforeEach, describe, expect, it } from "vitest";
import { acquireInventoryLock } from "@/lib/services/inventory-locks";
import { createIntent, getExecutionSnapshot, submitIntent } from "@/lib/services/execution";
import { runtimeState } from "@/lib/store";

function resetExecutionState() {
  runtimeState.intents = {};
  runtimeState.orders = {};
  runtimeState.fills = [];
  runtimeState.inventory = {};
  runtimeState.inventoryLocks = {};
  runtimeState.atomicTransactions = {};
}

describe("execution service", () => {
  beforeEach(() => {
    resetExecutionState();
  });

  it("creates and submits an execution intent with atomic transaction + lock release", async () => {
    const intent = createIntent("user-alpha", "EVT-NEW", [
      {
        platform: "polymarket",
        marketId: "EVT-NEW",
        side: "YES",
        notionalUsd: 900,
        limitPrice: 0.47,
        orderType: "MAKER"
      },
      {
        platform: "kalshi",
        marketId: "EVT-NEW",
        side: "NO",
        notionalUsd: 900,
        limitPrice: 0.49,
        orderType: "MAKER"
      }
    ]);

    const run = await submitIntent(intent.intentId, { leaseMs: 5000 });
    if ("error" in run) {
      throw new Error(run.error);
    }

    expect(run.orders.length).toBe(2);
    expect(run.tx.steps.some((s) => s.name === "ACQUIRE_LOCK" && s.status === "SUCCESS")).toBe(true);
    expect(run.tx.steps.some((s) => s.name === "RELEASE_LOCK")).toBe(true);

    const snap = getExecutionSnapshot(intent.intentId) as {
      orders: unknown[];
      tx: { intentId: string } | null;
      locks: Array<{ status: string }>;
    };
    expect(snap.orders.length).toBe(2);
    expect(snap.tx?.intentId).toBe(intent.intentId);
    expect(snap.locks.length).toBe(1);
    expect(snap.locks[0].status).not.toBe("ACTIVE");
    expect(Object.values(runtimeState.inventory).length).toBeGreaterThan(0);
  });

  it("blocks execution when lock is already held by another intent", async () => {
    const intentA = createIntent("user-alpha", "EVT-LOCK", [
      {
        platform: "polymarket",
        marketId: "EVT-LOCK",
        side: "YES",
        notionalUsd: 500,
        limitPrice: 0.45,
        orderType: "MAKER"
      }
    ]);

    const lock = acquireInventoryLock({
      userId: intentA.userId,
      eventId: intentA.eventId,
      intentId: "INTENT-HOLDER",
      leaseMs: 30_000
    });
    expect(lock.acquired).toBe(true);

    const run = await submitIntent(intentA.intentId, { leaseMs: 2000 });
    expect("error" in run).toBe(true);
    if ("error" in run) {
      expect(run.code).toBe("LOCK_HELD");
      expect(run.tx?.status).toBe("FAILED");
    }
  });
});
