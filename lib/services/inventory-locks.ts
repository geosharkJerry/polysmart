import { nextId, pushAudit, runtimeState } from "@/lib/store";
import { InventoryLock } from "@/lib/types";

export function makeLockKey(userId: string, eventId: string) {
  return `${userId}:${eventId}`;
}

function activeLockByKey(lockKey: string) {
  const now = Date.now();
  return Object.values(runtimeState.inventoryLocks).find((l) => {
    return l.lockKey === lockKey && l.status === "ACTIVE" && Date.parse(l.expiresAt) > now;
  });
}

export function acquireInventoryLock(input: {
  userId: string;
  eventId: string;
  intentId: string;
  leaseMs?: number;
}) {
  const leaseMs = input.leaseMs ?? 10_000;
  const lockKey = makeLockKey(input.userId, input.eventId);

  const existing = activeLockByKey(lockKey);
  if (existing && existing.intentId !== input.intentId) {
    return {
      acquired: false,
      reason: "LOCK_HELD",
      lock: existing
    } as const;
  }

  const now = Date.now();
  const lock: InventoryLock = {
    lockId: nextId("LOCK"),
    lockKey,
    userId: input.userId,
    eventId: input.eventId,
    intentId: input.intentId,
    status: "ACTIVE",
    leaseMs,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + leaseMs).toISOString(),
    releasedAt: null
  };

  runtimeState.inventoryLocks[lock.lockId] = lock;
  pushAudit("EXECUTION", "inventory lock acquired", {
    lockId: lock.lockId,
    lockKey,
    intentId: input.intentId,
    leaseMs
  });

  return {
    acquired: true,
    lock
  } as const;
}

export function releaseInventoryLock(lockId: string, reason = "normal") {
  const lock = runtimeState.inventoryLocks[lockId];
  if (!lock) {
    return { released: false, reason: "NOT_FOUND" as const };
  }

  if (lock.status !== "ACTIVE") {
    return { released: false, reason: "ALREADY_RELEASED" as const, lock };
  }

  lock.status = "RELEASED";
  lock.releasedAt = new Date().toISOString();
  pushAudit("EXECUTION", "inventory lock released", { lockId, reason });

  return { released: true, lock };
}

export function expireStaleLocks() {
  const now = Date.now();
  let expired = 0;
  Object.values(runtimeState.inventoryLocks).forEach((lock) => {
    if (lock.status === "ACTIVE" && Date.parse(lock.expiresAt) <= now) {
      lock.status = "EXPIRED";
      lock.releasedAt = new Date().toISOString();
      expired += 1;
    }
  });

  if (expired > 0) {
    pushAudit("EXECUTION", "stale locks expired", { expired });
  }

  return expired;
}

export function listInventoryLocks() {
  return Object.values(runtimeState.inventoryLocks);
}
