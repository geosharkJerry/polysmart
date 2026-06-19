"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppLinkButton, PanelSection, SettingsInset, WorkspaceCluster } from "@/components/dashboard-sections";
import { CacheWarmSnapshot } from "@/lib/types";

export function AdminConnectorsWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status, setWorkspace } = useAdminWorkspace();
  const [healthRows, setHealthRows] = useState(
    workspace.connectorProbeLogs.slice(0, 8).map((row) => ({
      platform: row.platform,
      healthy: row.healthy,
      latencyMs: row.latencyMs,
      message: row.message,
      mode: row.mode
    }))
  );
  const [streamSnapshots, setStreamSnapshots] = useState<Array<{ marketId: string; platform: string; timestamp: string; spread: number; depthUsd: number; source: string }>>([]);
  const [cacheSnapshot, setCacheSnapshot] = useState<CacheWarmSnapshot>(workspace.cacheWarmState);
  const [healthBusy, setHealthBusy] = useState(false);
  const [streamBusy, setStreamBusy] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("No connector action has been run yet.");

  const summary = useMemo(
    () => ({
      health: healthRows.length,
      streamSnapshots: streamSnapshots.length,
      nodes: cacheSnapshot.topology.nodes.length,
      edges: cacheSnapshot.topology.edges.length,
      featureRows: cacheSnapshot.featureCache.length
    }),
    [cacheSnapshot.featureCache.length, cacheSnapshot.topology.edges.length, cacheSnapshot.topology.nodes.length, healthRows.length, streamSnapshots.length]
  );

  const refreshWorkspace = async () => {
    const res = await fetch("/api/admin/workspace", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      return;
    }
    const payload = await res.json();
    setWorkspace(payload);
    setHealthRows(
      (payload.connectorProbeLogs ?? []).map((row: { platform: string; healthy: boolean; latencyMs: number; message: string; mode?: string }) => ({
        platform: row.platform,
        healthy: row.healthy,
        latencyMs: row.latencyMs,
        message: row.message,
        mode: row.mode
      }))
    );
    if (payload.cacheWarmState) {
      setCacheSnapshot(payload.cacheWarmState);
    }
  };

  const refreshHealth = async () => {
    setHealthBusy(true);
    setStatusMessage("Refreshing connector health...");
    try {
      const res = await fetch("/api/connectors/health", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ connectors: [] }));
      if (!res.ok) {
        setStatusMessage(payload.message || "Connector health refresh failed.");
        return;
      }
      setHealthRows(Array.isArray(payload.connectors) ? payload.connectors : []);
      setStatusMessage(`Connector health refreshed · ${(payload.connectors ?? []).length} rows.`);
      await refreshWorkspace();
    } finally {
      setHealthBusy(false);
    }
  };

  const syncStream = async () => {
    setStreamBusy(true);
    setStatusMessage("Syncing order book stream...");
    try {
      const res = await fetch("/api/connectors/stream", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ snapshots: [] }));
      if (!res.ok) {
        setStatusMessage(payload.message || "Stream sync failed.");
        return;
      }
      setStreamSnapshots(Array.isArray(payload.snapshots) ? payload.snapshots : []);
      setStatusMessage(`Stream synced · ${(payload.snapshots ?? []).length} snapshots.`);
    } finally {
      setStreamBusy(false);
    }
  };

  const warmCache = async () => {
    setCacheBusy(true);
    setStatusMessage("Warming cache matrix...");
    try {
      const res = await fetch("/api/cache/warm", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res
        .json()
        .catch(() => ({ topology: { nodes: [], edges: [], updatedAt: new Date().toISOString() }, probabilityMatrix: [], featureCache: [], feedback: [] }));
      if (!res.ok) {
        setStatusMessage(payload.message || "Cache warm failed.");
        return;
      }
      setCacheSnapshot(payload as CacheWarmSnapshot);
      setStatusMessage(`Cache warmed · ${payload.topology?.nodes?.length ?? 0} nodes, ${payload.probabilityMatrix?.length ?? 0} probability rows.`);
      await refreshWorkspace();
    } finally {
      setCacheBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Connectors and Cache Workspace"
      description="Operate venue connector health, order-book stream synchronization, and cache-topology warming from one production diagnostics workspace."
      status={status}
      badges={[
        { label: `${summary.health} health rows`, tone: "info" },
        { label: `${summary.streamSnapshots} stream snapshots`, tone: "info" },
        { label: `${summary.nodes} cache nodes`, tone: "info" }
      ]}
      statusNote="This workspace separates runtime connector diagnostics from broader integrations so live venue posture stays compact and explicit."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Health" value={summary.health} />
        <StatTile label="Stream Snapshots" value={summary.streamSnapshots} tone="emerald" />
        <StatTile label="Cache Nodes" value={summary.nodes} tone="amber" />
        <StatTile label="Cache Edges" value={summary.edges} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Connector diagnostics"
        title="Health checks, stream sync, and cache topology evidence"
        description="This workspace groups venue health probes, order-book snapshots, and cache-matrix topology into one operator flow."
        mt={7}
      >
        <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{statusMessage}</span>}>
          <AppButton className="text-sm" disabled={healthBusy} onClick={refreshHealth}>{healthBusy ? "Refreshing..." : "Refresh Health"}</AppButton>
          <AppButton className="text-sm" variant="outline" disabled={streamBusy} onClick={syncStream}>{streamBusy ? "Syncing..." : "Sync Stream"}</AppButton>
          <AppButton className="text-sm" variant="outline" disabled={cacheBusy} onClick={warmCache}>{cacheBusy ? "Warming..." : "Warm Cache"}</AppButton>
        </ActionBar>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <PanelSection
            title="Connector health matrix"
            description="Inspect latency, mode, and availability for each venue connector after the latest health pass."
            eyebrow="Health lane"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {healthRows.map((row) => (
                <SettingsInset
                  key={row.platform}
                  eyebrow={row.platform}
                  title={`${row.latencyMs}ms · ${row.mode ?? "unknown"}`}
                  description={row.message}
                  actions={<StatusBadge label={row.healthy ? "healthy" : "unavailable"} tone={row.healthy ? "success" : "danger"} />}
                >
                  <p className="text-xs text-slate-600 dark:text-slate-300">Venue mode: <span className="font-semibold text-slate-900 dark:text-white">{row.mode ?? "unknown"}</span></p>
                </SettingsInset>
              ))}
              {healthRows.length === 0 ? <div className="empty-state">No connector health rows available yet.</div> : null}
            </div>
          </PanelSection>

          <div className="grid gap-6">
            <PanelSection
              title="Order book stream"
              description="Review the latest order-book snapshots emitted by live stream synchronization."
              eyebrow="Stream lane"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {streamSnapshots.slice(0, 6).map((snapshot) => (
                  <SettingsInset
                    key={`${snapshot.marketId}-${snapshot.timestamp}`}
                    eyebrow={snapshot.platform}
                    title={snapshot.marketId}
                    description={`Spread ${snapshot.spread} · Depth $${snapshot.depthUsd.toLocaleString()} · ${snapshot.source}`}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(snapshot.timestamp).toLocaleString()}</p>
                  </SettingsInset>
                ))}
                {streamSnapshots.length === 0 ? <div className="empty-state">No stream snapshots have been synced yet.</div> : null}
              </div>
            </PanelSection>

            <PanelSection
              title="Cache topology"
              description="Inspect warmed cache nodes, edge topology, probability rows, and feature-cache coverage."
              eyebrow="Cache lane"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <SettingsInset eyebrow="Nodes" title={String(cacheSnapshot.topology.nodes.length)}><div /></SettingsInset>
                <SettingsInset eyebrow="Edges" title={String(cacheSnapshot.topology.edges.length)}><div /></SettingsInset>
                <SettingsInset eyebrow="Feature rows" title={String(summary.featureRows)}><div /></SettingsInset>
              </div>
              <div className="mt-4 grid gap-3">
                {cacheSnapshot.featureCache.slice(0, 5).map((row) => (
                  <SettingsInset key={row.key} eyebrow={row.key} title={row.normalizedTopic} description={row.embeddingTag}>
                    <div />
                  </SettingsInset>
                ))}
                {cacheSnapshot.featureCache.length === 0 ? <div className="empty-state">No cache entries warmed yet.</div> : null}
              </div>
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
