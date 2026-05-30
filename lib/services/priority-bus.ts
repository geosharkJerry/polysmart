import { computeCompositeScore } from "@/lib/engine/scoring";
import { nextId, pushAudit, runtimeState } from "@/lib/store";
import { BusEvent, EventKind, EventLevel, ScoreInput } from "@/lib/types";

const kindDefaultLevel: Record<EventKind, EventLevel> = {
  ORDER_BOOK_UPDATE: 2,
  TRADE_FILL: 1,
  NEWS_EVENT: 3,
  ONCHAIN_EVENT: 3,
  SETTLEMENT_FUNDING: 4,
  RISK_ALERT: 1
};

function recalculateQueueDepth() {
  runtimeState.busMetrics.queueDepth = runtimeState.busQueue.length;
  runtimeState.busMetrics.updatedAt = new Date().toISOString();
}

function updateLatencyAverages(waitMs: number, level: EventLevel) {
  const metrics = runtimeState.busMetrics;
  const totalBefore = metrics.processed;
  const totalAfter = totalBefore + 1;
  metrics.avgLatencyMs = Number((((metrics.avgLatencyMs * totalBefore) + waitMs) / totalAfter).toFixed(2));
  metrics.processed = totalAfter;

  const lv = metrics.level[level];
  const lvBefore = lv.processed;
  const lvAfter = lvBefore + 1;
  lv.avgWaitMs = Number((((lv.avgWaitMs * lvBefore) + waitMs) / lvAfter).toFixed(2));
  lv.processed = lvAfter;
  lv.lastWaitMs = waitMs;

  metrics.updatedAt = new Date().toISOString();
}

function markDrop() {
  runtimeState.busMetrics.dropped += 1;
  recalculateQueueDepth();
}

function nextEventIndexBySla(nowMs: number) {
  if (runtimeState.busQueue.length === 0) {
    return -1;
  }

  // SLA urgency first (earliest deadline), then higher priority level, then FIFO.
  let bestIdx = 0;
  for (let i = 1; i < runtimeState.busQueue.length; i += 1) {
    const current = runtimeState.busQueue[i];
    const best = runtimeState.busQueue[bestIdx];
    const currentDeadline = Date.parse(current.deadlineAt);
    const bestDeadline = Date.parse(best.deadlineAt);

    if (currentDeadline < bestDeadline) {
      bestIdx = i;
      continue;
    }

    if (currentDeadline === bestDeadline) {
      if (current.level < best.level) {
        bestIdx = i;
        continue;
      }

      if (current.level === best.level) {
        const currentCreated = Date.parse(current.createdAt);
        const bestCreated = Date.parse(best.createdAt);
        if (currentCreated < bestCreated) {
          bestIdx = i;
        }
      }
    }

    // If both are already overdue, prioritize the most overdue.
    const bestSlack = bestDeadline - nowMs;
    const currentSlack = currentDeadline - nowMs;
    if (bestSlack < 0 && currentSlack < 0 && currentSlack < bestSlack) {
      bestIdx = i;
    }
  }

  return bestIdx;
}

function buildScore(payload: Record<string, unknown>) {
  const scoreInput: ScoreInput = {
    impactScore: Number(payload.impactScore ?? 0.5),
    probabilityEdge: Number(payload.probabilityEdge ?? 0.5),
    liquidityScore: Number(payload.liquidityScore ?? 0.5),
    timeDecay: Number(payload.timeDecay ?? 0.5),
    riskScore: Number(payload.riskScore ?? 0.5),
    executionCost: Number(payload.executionCost ?? 0.5)
  };
  return computeCompositeScore(scoreInput);
}

export function enqueueBusEvent(input: {
  kind: EventKind;
  eventId: string;
  payload: Record<string, unknown>;
  level?: EventLevel;
  dedupeKey?: string;
}) {
  const dedupeKey = input.dedupeKey ?? `${input.kind}:${input.eventId}`;
  const exists = runtimeState.busQueue.find((ev) => ev.dedupeKey === dedupeKey);
  if (exists) {
    markDrop();
    return { dropped: true, reason: "duplicate" as const };
  }

  const level = input.level ?? kindDefaultLevel[input.kind];
  const createdAt = new Date().toISOString();
  const maxLatencyMs = runtimeState.busSlaPolicies[level]?.maxLatencyMs ?? 2000;

  const event: BusEvent = {
    id: nextId("BUS"),
    level,
    kind: input.kind,
    eventId: input.eventId,
    payload: input.payload,
    createdAt,
    dedupeKey,
    deadlineAt: new Date(Date.parse(createdAt) + maxLatencyMs).toISOString()
  };

  runtimeState.busQueue.push(event);
  recalculateQueueDepth();
  pushAudit("SYSTEM", "bus event enqueued", {
    id: event.id,
    level: event.level,
    kind: event.kind,
    deadlineAt: event.deadlineAt
  });

  return { dropped: false, event };
}

export function processNextBusEvent() {
  if (runtimeState.busQueue.length === 0) {
    return { empty: true } as const;
  }

  const nowMs = Date.now();
  const idx = nextEventIndexBySla(nowMs);
  if (idx < 0) {
    return { empty: true } as const;
  }

  const [event] = runtimeState.busQueue.splice(idx, 1);
  const waitMs = Math.max(0, nowMs - Date.parse(event.createdAt));
  const deadlineMs = Date.parse(event.deadlineAt);
  const breached = nowMs > deadlineMs;
  const breachByMs = breached ? nowMs - deadlineMs : 0;

  const score = buildScore(event.payload as Record<string, unknown>);

  updateLatencyAverages(waitMs, event.level);
  if (breached) {
    runtimeState.busMetrics.level[event.level].breaches += 1;
  }
  recalculateQueueDepth();

  pushAudit("SYSTEM", "bus event processed", {
    id: event.id,
    kind: event.kind,
    level: event.level,
    waitMs,
    breached,
    breachByMs,
    composite: score.composite
  });

  return {
    empty: false,
    event,
    waitMs,
    breached,
    breachByMs,
    score
  } as const;
}

export function processBusBatch(limit = 5) {
  const capped = Math.min(Math.max(1, limit), 100);
  const rows: ReturnType<typeof processNextBusEvent>[] = [];

  for (let i = 0; i < capped; i += 1) {
    const next = processNextBusEvent();
    if (next.empty) {
      break;
    }
    rows.push(next);
  }

  return {
    requested: capped,
    processed: rows.length,
    remaining: runtimeState.busQueue.length,
    results: rows
  };
}

export function getBusSnapshot() {
  return {
    queue: runtimeState.busQueue,
    metrics: runtimeState.busMetrics,
    slaPolicies: runtimeState.busSlaPolicies
  };
}
