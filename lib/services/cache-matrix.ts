import { selectAiProvider } from "@/lib/engine/ai-router";
import { pushAudit, runtimeState } from "@/lib/store";
import { CacheWarmSnapshot, FeatureCacheEntry, ProbabilityMatrixEntry, TopologyEdge, TopologyNode } from "@/lib/types";

function normalizeTopic(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function warmCacheMatrix(): CacheWarmSnapshot {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const probabilityMatrix: ProbabilityMatrixEntry[] = [];
  const featureCache: FeatureCacheEntry[] = [];
  const feedback = [];

  for (const event of runtimeState.events) {
    const marketNodeId = `${event.platform.toLowerCase()}-${event.id}`;
    const eventNodeId = `event-${event.id}`;
    const contractNodeId = `contract-${event.id}`;

    nodes.push(
      { id: marketNodeId, kind: "market", label: `${event.platform} market`, platform: event.platform.toLowerCase() as TopologyNode["platform"] },
      { id: eventNodeId, kind: "event", label: event.title, platform: "mixed" },
      { id: contractNodeId, kind: "contract", label: `${event.id} contract`, platform: event.platform.toLowerCase() as TopologyNode["platform"] }
    );

    edges.push(
      { id: `${marketNodeId}->${eventNodeId}`, from: marketNodeId, to: eventNodeId, relation: "tracks", weight: 1 },
      { id: `${contractNodeId}->${eventNodeId}`, from: contractNodeId, to: eventNodeId, relation: "settles_with", weight: Number(event.aiWinProbability.toFixed(4)) }
    );

    probabilityMatrix.push({
      marketId: marketNodeId,
      eventId: event.id,
      winProbability: Number(event.aiWinProbability.toFixed(4)),
      spreadPct: Number(event.edgeSpreadPct.toFixed(4)),
      confidence: Number(event.aiConfidence.toFixed(4)),
      updatedAt: new Date().toISOString()
    });

    featureCache.push({
      key: `feature-${event.id}`,
      embeddingTag: `emb:${normalizeTopic(event.title)}`,
      normalizedTopic: normalizeTopic(event.title),
      metadata: {
        category: event.category,
        platform: event.platform,
        edgeSpreadPct: event.edgeSpreadPct
      },
      updatedAt: new Date().toISOString()
    });

    const provider =
      event.aiProvider ??
      selectAiProvider({
        topic: event.title,
        textLength: event.title.length,
        urgency: event.aiWinProbability > 0.75 ? "high" : "medium"
      });

    feedback.push({
      marketId: marketNodeId,
      provider,
      confidence: Number(event.aiConfidence.toFixed(4)),
      outcome: "WARMED" as const,
      createdAt: new Date().toISOString()
    });
  }

  runtimeState.cacheWarmState = {
    topology: { nodes, edges, updatedAt: new Date().toISOString() },
    probabilityMatrix,
    featureCache,
    feedback
  };

  pushAudit("SYSTEM", "cache matrix warmed", {
    nodes: nodes.length,
    probabilityRows: probabilityMatrix.length,
    featureRows: featureCache.length
  });

  return runtimeState.cacheWarmState;
}

export function getCacheMatrixSnapshot() {
  return runtimeState.cacheWarmState;
}
