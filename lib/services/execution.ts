import { nextId, pushAudit, runtimeState } from "@/lib/store";
import {
  AccountPlatform,
  AtomicStep,
  AtomicTransaction,
  ExecutionIntent,
  InventoryPosition,
  OrderIntentLeg,
  OrderRecord,
  OrderStatus
} from "@/lib/types";
import { acquireInventoryLock, releaseInventoryLock } from "@/lib/services/inventory-locks";
import { cancelConnectorOrder, placeConnectorOrder, pollConnectorFill } from "@/lib/services/connectors";

function inventoryKey(userId: string, eventId: string) {
  return `${userId}:${eventId}`;
}

function ensureInventory(userId: string, eventId: string): InventoryPosition {
  const key = inventoryKey(userId, eventId);
  if (!runtimeState.inventory[key]) {
    runtimeState.inventory[key] = {
      userId,
      eventId,
      yesExposureUsd: 0,
      noExposureUsd: 0,
      netExposureUsd: 0,
      updatedAt: new Date().toISOString()
    };
  }
  return runtimeState.inventory[key];
}

function applyInventory(userId: string, eventId: string, side: "YES" | "NO", amount: number) {
  const inv = ensureInventory(userId, eventId);
  if (side === "YES") {
    inv.yesExposureUsd = Number((inv.yesExposureUsd + amount).toFixed(2));
  } else {
    inv.noExposureUsd = Number((inv.noExposureUsd + amount).toFixed(2));
  }
  inv.netExposureUsd = Number((inv.yesExposureUsd - inv.noExposureUsd).toFixed(2));
  inv.updatedAt = new Date().toISOString();
}

function updateOrderStatus(order: OrderRecord, status: OrderStatus, filledUsd?: number) {
  order.status = status;
  if (filledUsd !== undefined) {
    order.filledUsd = Number(filledUsd.toFixed(2));
  }
  order.updatedAt = new Date().toISOString();
}

function createAtomicTransaction(intent: ExecutionIntent): AtomicTransaction {
  const tx: AtomicTransaction = {
    txId: nextId("ATX"),
    intentId: intent.intentId,
    userId: intent.userId,
    eventId: intent.eventId,
    status: "RUNNING",
    startedAt: new Date().toISOString(),
    endedAt: null,
    steps: []
  };
  runtimeState.atomicTransactions[tx.txId] = tx;
  return tx;
}

function appendStep(
  tx: AtomicTransaction,
  name: AtomicStep["name"],
  status: AtomicStep["status"],
  message: string
) {
  tx.steps.push({
    name,
    status,
    message,
    timestamp: new Date().toISOString()
  });
}

function finalizeTx(tx: AtomicTransaction, status: AtomicTransaction["status"]) {
  tx.status = status;
  tx.endedAt = new Date().toISOString();
}

async function compensateOpenOrders(orders: OrderRecord[]) {
  let canceled = 0;
  for (const row of orders) {
    if (!row.externalOrderId || (row.status !== "PENDING" && row.status !== "PARTIAL")) {
      continue;
    }
    const cancel = await cancelConnectorOrder(row.platform, row.externalOrderId);
    if (cancel.canceled) {
      canceled += 1;
      updateOrderStatus(row, "CANCELED", row.filledUsd);
    }
  }
  return canceled;
}

export function createIntent(userId: string, eventId: string, legs: OrderIntentLeg[]): ExecutionIntent {
  const intentId = nextId("INTENT");
  const now = new Date().toISOString();
  const intent: ExecutionIntent = {
    intentId,
    userId,
    eventId,
    status: "CREATED",
    legs,
    createdAt: now,
    updatedAt: now
  };
  runtimeState.intents[intentId] = intent;
  pushAudit("EXECUTION", "intent created", { intentId, userId, eventId, legs: legs.length });
  return intent;
}

export async function submitIntent(intentId: string, options?: { leaseMs?: number }) {
  const intent = runtimeState.intents[intentId];
  if (!intent) {
    return { error: "Intent not found" } as const;
  }

  const tx = createAtomicTransaction(intent);

  appendStep(tx, "ACQUIRE_LOCK", "PENDING", "acquiring global inventory lock");
  const lockAttempt = acquireInventoryLock({
    userId: intent.userId,
    eventId: intent.eventId,
    intentId: intent.intentId,
    leaseMs: options?.leaseMs
  });

  if (!lockAttempt.acquired) {
    appendStep(tx, "ACQUIRE_LOCK", "FAILED", "inventory lock held by another intent");
    appendStep(tx, "RELEASE_LOCK", "FAILED", "lock acquisition failed, nothing to release");
    finalizeTx(tx, "FAILED");
    pushAudit("EXECUTION", "intent lock conflict", {
      intentId,
      lockId: lockAttempt.lock.lockId,
      holderIntentId: lockAttempt.lock.intentId
    });
    return {
      error: "Inventory lock held by another intent",
      code: "LOCK_HELD",
      tx,
      lock: lockAttempt.lock
    } as const;
  }

  const activeLock = lockAttempt.lock;
  appendStep(tx, "ACQUIRE_LOCK", "SUCCESS", `lock ${activeLock.lockId} acquired`);

  intent.status = "LOCKED";
  intent.updatedAt = new Date().toISOString();

  const orders: OrderRecord[] = [];

  try {
    appendStep(tx, "PLACE_ORDERS", "PENDING", `placing ${intent.legs.length} legs`);
    for (const leg of intent.legs) {
      const place = await placeConnectorOrder(leg.platform, {
        marketId: leg.marketId,
        side: leg.side,
        price: leg.limitPrice,
        notionalUsd: leg.notionalUsd,
        orderType: leg.orderType
      });

      const orderId = nextId("ORD");
      const record: OrderRecord = {
        orderId,
        intentId,
        userId: intent.userId,
        platform: leg.platform,
        marketId: leg.marketId,
        side: leg.side,
        orderType: leg.orderType,
        limitPrice: leg.limitPrice,
        notionalUsd: leg.notionalUsd,
        filledUsd: 0,
        status: place.accepted ? "PENDING" : "REJECTED",
        externalOrderId: place.accepted ? place.externalOrderId : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      runtimeState.orders[orderId] = record;
      orders.push(record);
    }

    const anyRejectedAtPlacement = orders.some((o) => o.status === "REJECTED");
    if (anyRejectedAtPlacement) {
      appendStep(tx, "PLACE_ORDERS", "FAILED", "one or more legs rejected at placement");
      appendStep(tx, "COMPENSATE", "PENDING", "canceling open orders after placement rejection");
      const canceled = await compensateOpenOrders(orders);
      appendStep(tx, "COMPENSATE", "SUCCESS", `${canceled} open orders canceled`);

      intent.status = "FAILED";
      intent.updatedAt = new Date().toISOString();
      finalizeTx(tx, "ROLLED_BACK");

      pushAudit("EXECUTION", "intent rolled back after placement rejection", {
        intentId,
        txId: tx.txId,
        canceled
      });

      return {
        intent,
        tx,
        lock: activeLock,
        orders,
        inventory: runtimeState.inventory[inventoryKey(intent.userId, intent.eventId)] ?? null
      } as const;
    }

    appendStep(tx, "PLACE_ORDERS", "SUCCESS", `${orders.length} legs accepted`);

    intent.status = "EXECUTING";
    intent.updatedAt = new Date().toISOString();

    appendStep(tx, "POLL_FILLS", "PENDING", "polling fills for all accepted legs");
    for (const order of orders) {
      if (!order.externalOrderId || order.status === "REJECTED") {
        continue;
      }

      const fill = await pollConnectorFill(order.platform as AccountPlatform, order.externalOrderId);
      updateOrderStatus(order, fill.status, fill.filledUsd);

      runtimeState.fills.unshift({
        fillId: nextId("FILL"),
        orderId: order.orderId,
        intentId: order.intentId,
        platform: order.platform,
        filledUsd: fill.filledUsd,
        avgPrice: fill.avgPrice,
        latencyMs: fill.latencyMs,
        createdAt: new Date().toISOString()
      });

      if (fill.filledUsd > 0) {
        applyInventory(intent.userId, intent.eventId, order.side, fill.filledUsd);
      }
    }

    const orderRows = Object.values(runtimeState.orders).filter((x) => x.intentId === intentId);
    const allFilled = orderRows.length > 0 && orderRows.every((o) => o.status === "FILLED");

    if (allFilled) {
      appendStep(tx, "POLL_FILLS", "SUCCESS", "all legs filled");
      appendStep(tx, "FINALIZE", "SUCCESS", "atomic transaction committed");
      intent.status = "HEDGED";
      finalizeTx(tx, "COMMITTED");
    } else {
      appendStep(tx, "POLL_FILLS", "FAILED", "one or more legs not fully filled within cycle");
      appendStep(tx, "COMPENSATE", "PENDING", "canceling unfilled/partial legs");
      const canceled = await compensateOpenOrders(orderRows);
      appendStep(tx, "COMPENSATE", "SUCCESS", `${canceled} residual open legs canceled`);
      appendStep(tx, "FINALIZE", "FAILED", "atomic transaction rolled back to safe state");

      intent.status = "FAILED";
      finalizeTx(tx, "ROLLED_BACK");
    }

    intent.updatedAt = new Date().toISOString();
    pushAudit("EXECUTION", "intent submitted", {
      intentId,
      txId: tx.txId,
      finalStatus: intent.status,
      txStatus: tx.status,
      orders: orderRows.length,
      fills: runtimeState.fills.filter((f) => f.intentId === intentId).length
    });

    return {
      intent,
      tx,
      lock: activeLock,
      orders: orderRows,
      inventory: runtimeState.inventory[inventoryKey(intent.userId, intent.eventId)]
    } as const;
  } catch (error) {
    appendStep(tx, "FINALIZE", "FAILED", `execution error: ${(error as Error).message}`);
    intent.status = "FAILED";
    intent.updatedAt = new Date().toISOString();
    finalizeTx(tx, "FAILED");

    pushAudit("EXECUTION", "intent execution failed", {
      intentId,
      txId: tx.txId,
      error: (error as Error).message
    });

    return {
      error: "Execution failed",
      code: "EXECUTION_FAILED",
      tx
    } as const;
  } finally {
    const release = releaseInventoryLock(activeLock.lockId, "submit_intent_complete");
    if (release.released) {
      appendStep(tx, "RELEASE_LOCK", "SUCCESS", `lock ${activeLock.lockId} released`);
    } else {
      appendStep(tx, "RELEASE_LOCK", "FAILED", `lock release skipped: ${release.reason}`);
    }
  }
}

export async function cancelIntentOrders(intentId: string) {
  const rows = Object.values(runtimeState.orders).filter((o) => o.intentId === intentId);
  for (const row of rows) {
    if (!row.externalOrderId || (row.status !== "PENDING" && row.status !== "PARTIAL")) {
      continue;
    }
    const cancel = await cancelConnectorOrder(row.platform, row.externalOrderId);
    if (cancel.canceled) {
      updateOrderStatus(row, "CANCELED", row.filledUsd);
    }
  }

  const intent = runtimeState.intents[intentId];
  if (intent && intent.status !== "HEDGED") {
    intent.status = "FAILED";
    intent.updatedAt = new Date().toISOString();
  }

  pushAudit("EXECUTION", "intent canceled", { intentId, affectedOrders: rows.length });
  return rows;
}

export function getExecutionSnapshot(intentId?: string) {
  if (intentId) {
    return {
      intent: runtimeState.intents[intentId] ?? null,
      orders: Object.values(runtimeState.orders).filter((o) => o.intentId === intentId),
      fills: runtimeState.fills.filter((f) => f.intentId === intentId),
      tx: Object.values(runtimeState.atomicTransactions).find((x) => x.intentId === intentId) ?? null,
      locks: Object.values(runtimeState.inventoryLocks).filter((x) => x.intentId === intentId)
    };
  }

  return {
    intents: Object.values(runtimeState.intents),
    orders: Object.values(runtimeState.orders),
    fills: runtimeState.fills,
    inventory: Object.values(runtimeState.inventory),
    transactions: Object.values(runtimeState.atomicTransactions),
    locks: Object.values(runtimeState.inventoryLocks)
  };
}
