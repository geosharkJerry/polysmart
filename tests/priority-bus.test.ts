import { beforeEach, describe, expect, it } from "vitest";
import { runtimeState } from "@/lib/store";
import { enqueueBusEvent, getBusSnapshot, processBusBatch, processNextBusEvent } from "@/lib/services/priority-bus";

function resetBusState() {
  runtimeState.busQueue = [];
  runtimeState.busMetrics.queueDepth = 0;
  runtimeState.busMetrics.processed = 0;
  runtimeState.busMetrics.dropped = 0;
  runtimeState.busMetrics.avgLatencyMs = 0;
  runtimeState.busMetrics.level[1] = { processed: 0, breaches: 0, avgWaitMs: 0, lastWaitMs: 0 };
  runtimeState.busMetrics.level[2] = { processed: 0, breaches: 0, avgWaitMs: 0, lastWaitMs: 0 };
  runtimeState.busMetrics.level[3] = { processed: 0, breaches: 0, avgWaitMs: 0, lastWaitMs: 0 };
  runtimeState.busMetrics.level[4] = { processed: 0, breaches: 0, avgWaitMs: 0, lastWaitMs: 0 };
}

describe("priority bus", () => {
  beforeEach(() => {
    resetBusState();
  });

  it("enqueues and processes events by urgency with level fallback", () => {
    enqueueBusEvent({
      kind: "NEWS_EVENT",
      eventId: "E-1",
      payload: {
        impactScore: 0.2,
        probabilityEdge: 0.7,
        liquidityScore: 0.4,
        timeDecay: 0.5,
        riskScore: 0.3,
        executionCost: 0.2
      },
      level: 3,
      dedupeKey: "news:E-1"
    });

    enqueueBusEvent({
      kind: "TRADE_FILL",
      eventId: "E-2",
      payload: {
        impactScore: 0.9,
        probabilityEdge: 0.8,
        liquidityScore: 0.7,
        timeDecay: 0.3,
        riskScore: 0.4,
        executionCost: 0.3
      },
      level: 1,
      dedupeKey: "fill:E-2"
    });

    const before = getBusSnapshot();
    expect(before.queue.length).toBe(2);

    const processed = processNextBusEvent();
    expect(processed.empty).toBe(false);
    if (!processed.empty) {
      expect(processed.event.level).toBe(1);
      expect(processed.event.deadlineAt).toBeTruthy();
    }
  });

  it("tracks SLA breaches and supports batch processing", () => {
    enqueueBusEvent({
      kind: "RISK_ALERT",
      eventId: "E-SLA",
      payload: {
        impactScore: 1,
        probabilityEdge: 1,
        liquidityScore: 1,
        timeDecay: 1,
        riskScore: 1,
        executionCost: 0
      },
      level: 1,
      dedupeKey: "risk:E-SLA"
    });

    expect(runtimeState.busQueue.length).toBe(1);
    runtimeState.busQueue[0].createdAt = new Date(Date.now() - 500).toISOString();
    runtimeState.busQueue[0].deadlineAt = new Date(Date.now() - 100).toISOString();

    const batch = processBusBatch(5);
    expect(batch.processed).toBe(1);
    expect(batch.remaining).toBe(0);
    expect(batch.results[0].empty).toBe(false);
    if (!batch.results[0].empty) {
      expect(batch.results[0].breached).toBe(true);
    }

    expect(runtimeState.busMetrics.level[1].breaches).toBe(1);
    expect(runtimeState.busMetrics.level[1].processed).toBe(1);
    expect(runtimeState.busMetrics.processed).toBe(1);
  });
});
