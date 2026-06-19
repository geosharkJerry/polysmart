"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, FormField, FormGrid, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";
import { PolymarketEventTrackingReport } from "@/lib/services/polymarket-tracking";
import { CacheWarmSnapshot, PscReconciliationReport, RiskMetrics } from "@/lib/types";

function toneForRunStatus(status: string) {
  if (status === "SUCCESS" || status === "READY") return "success" as const;
  if (status === "ERROR" || status === "BLOCKED") return "danger" as const;
  if (status === "STARTED" || status === "OPEN") return "warning" as const;
  return "info" as const;
}

export function AdminIntegrationsWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [polymarketDraft, setPolymarketDraft] = useState({
    slug: "",
    amountUsd: 10000,
    selectedOutcome: "",
    entryPrice: "",
    volumeFeeRate: 0.015,
    managedCommissionRate: 0.2
  });
  const [polymarketReport, setPolymarketReport] = useState<PolymarketEventTrackingReport | null>(null);
  const [polymarketStatus, setPolymarketStatus] = useState("No settlement tracking has been run yet.");
  const [polymarketBusy, setPolymarketBusy] = useState(false);
  const [venueBusy, setVenueBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [validationBusy, setValidationBusy] = useState(false);
  const [streamBusy, setStreamBusy] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [validationStatus, setValidationStatus] = useState("No validation run has been recorded yet.");
  const [validationReport, setValidationReport] = useState<{ psc: PscReconciliationReport | null; risk: RiskMetrics | null; resultCount: number }>({ psc: null, risk: null, resultCount: 0 });
  const [connectorHealth, setConnectorHealth] = useState<Array<{ platform: string; healthy: boolean; latencyMs: number; message: string; mode?: string }>>(
    workspace.connectorProbeLogs.map((row) => ({
      platform: row.platform,
      healthy: row.healthy,
      latencyMs: row.latencyMs,
      message: row.message,
      mode: row.mode
    }))
  );
  const [streamSnapshots, setStreamSnapshots] = useState<Array<{ marketId: string; platform: string; timestamp: string; spread: number; depthUsd: number; source: string }>>([]);
  const [cacheSnapshot, setCacheSnapshot] = useState<CacheWarmSnapshot>(workspace.cacheWarmState);
  const [streamStatus, setStreamStatus] = useState("No connector stream sync has been run yet.");
  const [cacheStatus, setCacheStatus] = useState("No cache warm run has been recorded yet.");

  const latestConnectorProbe = useMemo(() => workspace.connectorProbeLogs[0] ?? null, [workspace.connectorProbeLogs]);
  const latestWalletProbe = useMemo(() => workspace.walletFundingProbeLogs[0] ?? null, [workspace.walletFundingProbeLogs]);
  const latestValidation = useMemo(() => workspace.productionValidationRuns[0] ?? null, [workspace.productionValidationRuns]);
  const latestCacheNodeCount = cacheSnapshot.topology.nodes.length;
  const latestCacheEdgeCount = cacheSnapshot.topology.edges.length;

  const refreshWorkspaceSlices = async () => {
    const res = await fetch("/api/admin/workspace", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const payload = await res.json().catch(() => null);
    if (!payload) return;
    setConnectorHealth(
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

  const runPolymarketTrack = async () => {
    const slug = polymarketDraft.slug.trim();
    if (!slug) {
      setPolymarketStatus("Enter a Polymarket market slug first.");
      return;
    }

    setPolymarketBusy(true);
    setPolymarketStatus("Tracking Polymarket settlement...");
    try {
      const res = await fetch("/api/admin/integrations/polymarket/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          amountUsd: polymarketDraft.amountUsd,
          selectedOutcome: polymarketDraft.selectedOutcome.trim() || undefined,
          entryPrice: polymarketDraft.entryPrice.trim() ? Number(polymarketDraft.entryPrice) : undefined,
          volumeFeeRate: polymarketDraft.volumeFeeRate,
          managedCommissionRate: polymarketDraft.managedCommissionRate
        })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = (await res.json().catch(() => ({ message: "Polymarket tracking failed." }))) as Record<string, any>;
      if (!res.ok) {
        setPolymarketStatus(payload.message || "Polymarket tracking failed.");
        return;
      }
      setPolymarketReport(payload as PolymarketEventTrackingReport);
      setPolymarketStatus(`Tracked ${payload.title} · ${payload.closed ? "closed" : "open"}`);
    } finally {
      setPolymarketBusy(false);
    }
  };

  const runVenueProbe = async () => {
    setVenueBusy(true);
    try {
      const res = await fetch("/api/admin/venue-probes", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        setPolymarketStatus("Venue probe failed.");
        return;
      }
      setPolymarketStatus("Venue probes refreshed.");
      await refreshWorkspaceSlices();
    } finally {
      setVenueBusy(false);
    }
  };

  const refreshConnectorHealth = async () => {
    setVenueBusy(true);
    try {
      const res = await fetch("/api/connectors/health", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ connectors: [] }));
      if (!res.ok) {
        setPolymarketStatus("Connector health refresh failed.");
        return;
      }
      setConnectorHealth(Array.isArray(payload.connectors) ? payload.connectors : []);
      setPolymarketStatus(`Connector health refreshed · ${Array.isArray(payload.connectors) ? payload.connectors.length : 0} rows.`);
    } finally {
      setVenueBusy(false);
    }
  };

  const refreshConnectorStream = async () => {
    setStreamBusy(true);
    setStreamStatus("Syncing connector order book stream...");
    try {
      const res = await fetch("/api/connectors/stream", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ snapshots: [] }));
      if (!res.ok) {
        setStreamStatus(payload.message || "Connector stream sync failed.");
        return;
      }
      setStreamSnapshots(Array.isArray(payload.snapshots) ? payload.snapshots : []);
      setStreamStatus(`Connector stream synced · ${Array.isArray(payload.snapshots) ? payload.snapshots.length : 0} snapshots.`);
    } finally {
      setStreamBusy(false);
    }
  };

  const warmCache = async () => {
    setCacheBusy(true);
    setCacheStatus("Warming cache topology and probability matrix...");
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
        setCacheStatus(payload.message || "Cache warm failed.");
        return;
      }
      setCacheSnapshot(payload as CacheWarmSnapshot);
      setCacheStatus(`Cache warmed · ${payload.topology?.nodes?.length ?? 0} nodes · ${payload.probabilityMatrix?.length ?? 0} probability rows.`);
    } finally {
      setCacheBusy(false);
    }
  };

  const runWalletProbe = async () => {
    setWalletBusy(true);
    try {
      const res = await fetch("/api/admin/wallet-funding-probes", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        setValidationStatus("Wallet probe failed.");
        return;
      }
      setValidationStatus("Wallet probes refreshed.");
      await refreshWorkspaceSlices();
    } finally {
      setWalletBusy(false);
    }
  };

  const runValidation = async () => {
    setValidationBusy(true);
    setValidationStatus("Running production validation...");
    try {
      const res = await fetch("/api/admin/production-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeNetwork: true })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ message: "Validation failed." }));
      if (!res.ok) {
        setValidationStatus(payload.message || "Validation failed.");
        return;
      }
      setValidationReport({ psc: payload.record?.report?.psc ?? null, risk: payload.record?.report?.risk ?? null, resultCount: payload.record?.totalChecks ?? 0 });
      setValidationStatus(`Validation ${payload.record?.status ?? "recorded"} · P0 open ${payload.record?.p0Open ?? 0}`);
    } finally {
      setValidationBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Integrations Control Workspace"
      description="Operate external venue probes, cache topology, runtime validation, and settlement tracking from one integrated operator surface."
      status={status}
      badges={[
        { label: workspace.risk.status, tone: workspace.risk.status === "NORMAL" ? "success" : "danger" },
        { label: `${workspace.connectorProbeLogs.length} venue probes`, tone: "info" },
        { label: `${workspace.walletFundingProbeLogs.length} wallet probes`, tone: "info" }
      ]}
      statusNote="Venue health, runtime stream sync, cache warm-up, and validation evidence now sit in one integration workspace instead of being spread across smaller cards."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Venue Probes" value={workspace.connectorProbeLogs.length} detail="Connector health and permissions" />
        <StatTile label="Wallet Probes" value={workspace.walletFundingProbeLogs.length} tone="emerald" detail="Funding checks and unlock state" />
        <StatTile label="Validation Runs" value={workspace.productionValidationRuns.length} tone="amber" detail="Readiness snapshots" />
        <StatTile label="Settlement Tracks" value={polymarketReport ? 1 : 0} tone="rose" detail="Polymarket closeout estimates" />
      </div>

      <WorkspaceCluster
        eyebrow="Integration operations"
        title="Venue health, settlement tracking, cache, and readiness"
        description="This workspace consolidates connector telemetry, settlement tracking, stream sync, topology warm-up, and readiness evidence."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-6">
            <PanelSection
              title="Polymarket settlement tracking"
              description="Estimate outcome-specific net profit and fee impact from a live or closed Polymarket contract."
              eyebrow="Settlement lane"
            >
              <FormGrid columns={{ base: 1, lg: 2 }} gap={3}>
                <FormField label="Market slug">
                  <AppInput value={polymarketDraft.slug} onChange={(e) => setPolymarketDraft((current) => ({ ...current, slug: e.target.value }))} placeholder="who-wins-..." />
                </FormField>
                <FormField label="Settlement amount USD">
                  <AppInput type="number" min={1} value={polymarketDraft.amountUsd} onChange={(e) => setPolymarketDraft((current) => ({ ...current, amountUsd: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Selected outcome">
                  <AppInput value={polymarketDraft.selectedOutcome} onChange={(e) => setPolymarketDraft((current) => ({ ...current, selectedOutcome: e.target.value }))} placeholder="Yes / No" />
                </FormField>
                <FormField label="Entry price">
                  <AppInput value={polymarketDraft.entryPrice} onChange={(e) => setPolymarketDraft((current) => ({ ...current, entryPrice: e.target.value }))} placeholder="Optional actual fill price" />
                </FormField>
                <FormField label="Volume fee rate">
                  <AppInput type="number" step="0.001" min="0" max="0.1" value={polymarketDraft.volumeFeeRate} onChange={(e) => setPolymarketDraft((current) => ({ ...current, volumeFeeRate: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Managed commission rate">
                  <AppInput type="number" step="0.01" min="0" max="0.5" value={polymarketDraft.managedCommissionRate} onChange={(e) => setPolymarketDraft((current) => ({ ...current, managedCommissionRate: Number(e.target.value) }))} />
                </FormField>
              </FormGrid>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{polymarketStatus}</span>}>
                <AppButton className="text-sm" disabled={polymarketBusy} onClick={runPolymarketTrack}>
                  {polymarketBusy ? "Tracking..." : "Track Settlement"}
                </AppButton>
              </ActionBar>

              {polymarketReport ? (
                <div className="mt-4 grid gap-3">
                  <SettingsInset eyebrow="Tracked market" title={polymarketReport.title} description={`${polymarketReport.slug} · ${polymarketReport.marketId} · ${polymarketReport.closed ? "closed" : "open"}`}>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Winning outcome: {polymarketReport.winningOutcome ?? "unknown"} · Selected: {polymarketReport.selectedOutcome ?? "auto"}</p>
                  </SettingsInset>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {polymarketReport.tracking.slice(0, 4).map((row) => (
                      <SettingsInset key={`${row.outcome}-${row.entryPrice}`} eyebrow={row.outcome} title={`Gross $${row.grossProfitUsd.toLocaleString()}`} description={`Entry ${row.entryPrice} · Final ${row.finalPrice} · Shares ${row.shares}`}>
                        <p className="text-xs text-slate-600 dark:text-slate-300">Subscription net ${row.subscriptionNetProfitUsd.toLocaleString()} · Managed net ${row.managedNetProfitUsd.toLocaleString()}</p>
                      </SettingsInset>
                    ))}
                  </div>

                  {polymarketReport.warnings.length > 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">{polymarketReport.warnings.join(" | ")}</p> : null}
                </div>
              ) : null}
            </PanelSection>

            <PanelSection
              title="Probe and validation controls"
              description="Drive venue probes, wallet probes, and production validation from one operator lane."
              eyebrow="Readiness lane"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <SettingsInset eyebrow="Latest venue probe" title={latestConnectorProbe?.platform ?? "No venue probe"} description={latestConnectorProbe ? `${latestConnectorProbe.healthy ? "healthy" : "unavailable"} · ${latestConnectorProbe.mode} · ${latestConnectorProbe.latencyMs}ms` : "No venue probe recorded yet."}>
                  <div />
                </SettingsInset>
                <SettingsInset eyebrow="Latest wallet probe" title={latestWalletProbe?.accountId ?? "No wallet probe"} description={latestWalletProbe ? `${latestWalletProbe.status} · ${latestWalletProbe.chain} · ${latestWalletProbe.asset}` : "No wallet probe recorded yet."}>
                  <div />
                </SettingsInset>
                <SettingsInset eyebrow="Latest validation" title={latestValidation?.status ?? "No validation"} description={latestValidation ? `P0 ${latestValidation.p0Open} · P1 ${latestValidation.p1Open}` : "No validation run recorded yet."}>
                  <div />
                </SettingsInset>
              </div>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{validationStatus}</span>}>
                <AppButton className="text-sm" variant="outline" disabled={venueBusy} onClick={runVenueProbe}>{venueBusy ? "Running..." : "Run Venue Probe"}</AppButton>
                <AppButton className="text-sm" variant="outline" disabled={venueBusy} onClick={refreshConnectorHealth}>Refresh Connector Health</AppButton>
                <AppButton className="text-sm" variant="outline" disabled={walletBusy} onClick={runWalletProbe}>{walletBusy ? "Running..." : "Run Wallet Probe"}</AppButton>
                <AppButton className="text-sm" disabled={validationBusy} onClick={runValidation}>{validationBusy ? "Running..." : "Run Validation"}</AppButton>
              </ActionBar>
            </PanelSection>
          </div>

          <div className="grid gap-6">
            <PanelSection
              title="Connector and stream operations"
              description="Inspect connector readiness and sync live order book snapshots into the runtime stream."
              eyebrow="Connector lane"
            >
              <SettingsInset
                eyebrow="Connector health matrix"
                title="Venue health"
                description="Platform status, latency, and live-mode posture from the current connector set."
                actions={<AppButton className="text-sm" variant="outline" disabled={venueBusy} onClick={refreshConnectorHealth}>Refresh Health Matrix</AppButton>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {connectorHealth.map((row) => (
                    <SettingsInset key={row.platform} eyebrow={row.platform} title={row.healthy ? "Healthy" : "Unavailable"} description={`${row.message} · ${row.latencyMs}ms · ${row.mode ?? "unknown"}`} actions={<StatusBadge label={row.healthy ? "healthy" : "unavailable"} tone={row.healthy ? "success" : "danger"} />}>
                      <div />
                    </SettingsInset>
                  ))}
                  {connectorHealth.length === 0 ? <div className="empty-state">No connector health rows yet. Run a health check to populate this matrix.</div> : null}
                </div>
              </SettingsInset>

              <SettingsInset
                mt={4}
                eyebrow="Order book stream sync"
                title="Runtime stream snapshots"
                description={streamStatus}
                actions={<AppButton className="text-sm" variant="outline" disabled={streamBusy} onClick={refreshConnectorStream}>{streamBusy ? "Syncing..." : "Sync Stream"}</AppButton>}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {streamSnapshots.map((snapshot) => (
                    <SettingsInset key={`${snapshot.marketId}-${snapshot.timestamp}`} eyebrow={snapshot.platform} title={snapshot.marketId} description={`Spread ${snapshot.spread} · Depth $${snapshot.depthUsd.toLocaleString()}`}>
                      <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(snapshot.timestamp).toLocaleString()}</p>
                    </SettingsInset>
                  ))}
                  {streamSnapshots.length === 0 ? <div className="empty-state">No stream snapshots have been synced yet.</div> : null}
                </div>
              </SettingsInset>
            </PanelSection>

            <PanelSection
              title="Cache warm and topology"
              description="Populate topology, probability rows, and feature cache from the current runtime event graph."
              eyebrow="Cache lane"
            >
              <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{cacheStatus}</span>}>
                <AppButton className="text-sm" disabled={cacheBusy} onClick={warmCache}>{cacheBusy ? "Warming..." : "Warm Cache"}</AppButton>
              </ActionBar>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SettingsInset eyebrow="Nodes" title={String(latestCacheNodeCount)}><div /></SettingsInset>
                <SettingsInset eyebrow="Edges" title={String(latestCacheEdgeCount)}><div /></SettingsInset>
                <SettingsInset eyebrow="Probability rows" title={String(cacheSnapshot.probabilityMatrix.length)}><div /></SettingsInset>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {cacheSnapshot.featureCache.slice(0, 4).map((row) => (
                  <SettingsInset key={row.key} eyebrow={row.key} title={row.normalizedTopic} description={row.embeddingTag}>
                    <div />
                  </SettingsInset>
                ))}
                {cacheSnapshot.featureCache.length === 0 ? <div className="empty-state">No cache entries warmed yet.</div> : null}
              </div>
            </PanelSection>

            <PanelSection
              title="Readiness and evidence"
              description="Keep validation snapshots and PSC evidence visible without returning to the overview workspace."
              eyebrow="Evidence lane"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workspace.productionValidationRuns.slice(0, 4).map((run) => (
                  <SettingsInset key={run.id} eyebrow={run.id} title={run.status} description={new Date(run.generatedAt).toLocaleString()} actions={<StatusBadge label={run.status} tone={toneForRunStatus(run.status)} />}>
                    <div />
                  </SettingsInset>
                ))}
              </div>

              {validationReport.psc ? (
                <SettingsInset mt={4} eyebrow="Validation PSC snapshot" title={`Net profit $${validationReport.psc.netProfitUsd.toLocaleString()}`} description={`Revenue $${validationReport.psc.totalRevenueUsd.toLocaleString()} · checks ${validationReport.resultCount}`}>
                  <div />
                </SettingsInset>
              ) : null}
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
