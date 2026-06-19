"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, DataTable, FormField, FormGrid, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";

type OperationsSnapshot = {
  pool: {
    pool: {
      totalAssetsUsd: number;
      liquidBufferUsd: number;
      totalShares: number;
      nav: number;
      highWatermarkNav: number;
      emergencyPenaltyRate: number;
      updatedAt: string;
    };
    members: Array<{
      userId: string;
      shares: number;
      principalUsd: number;
      pnlUsd: number;
      highWatermarkNav: number;
    }>;
  };
  bus: {
    queue: Array<{
      id: string;
      level: number;
      kind: string;
      eventId: string;
      createdAt: string;
      dedupeKey: string;
      deadlineAt: string;
    }>;
    metrics: {
      queueDepth: number;
      processed: number;
      dropped: number;
      avgLatencyMs: number;
      level: Record<1 | 2 | 3 | 4, { processed: number; breaches: number; avgWaitMs: number; lastWaitMs: number }>;
      updatedAt: string;
    };
    slaPolicies: Record<1 | 2 | 3 | 4, { level: number; maxLatencyMs: number }>;
  };
  tradingContext: null | {
    eventId: string;
    userId: string;
    marketSpreadPct: number;
    capitalCapacityUsd: number;
    liquidityEdgeScore: number;
    kellyPlanId: string;
    recommendedNotionalUsd: number;
    probabilityCheck: { status: string; source: string; reason: string | null };
    riskCheck: { status: string; reason: string | null };
    complianceCheck: { status: string; reason: string | null };
    executionPlan: Array<{ accountId: string; assignedUsd: number; jitterMs: number }>;
  };
  risk: {
    inventoryDeviationPct: number;
    hedgeLatencyMs: number;
    slippagePct: number;
    blockedAccounts: number;
    anomalyScore: number;
    anomalyFlags: string[];
    status: string;
    reason: string | null;
    updatedAt: string;
  };
  healing: {
    mode: string;
    reason: string | null;
    lastTransitionAt: string;
  };
  events: Array<{
    id: string;
    platform: string;
    title: string;
    category: string;
    edgeSpreadPct: number;
    aiWinProbability: number;
  }>;
  accounts: Array<{
    accountId: string;
    userId: string;
    platform: string;
    label: string;
    walletBalance: number;
    canTrade: boolean;
    canQuery: boolean;
    status: string;
  }>;
  connectorHealth: Array<{ id: string; platform: string; healthy?: boolean; message?: string }>;
  walletFunding: Array<{ id: string; accountId: string; amount: number; walletChain: string; asset: string; confirmedAt: string }>;
};

function toneForRiskStatus(status: string) {
  if (status === "NORMAL") return "success" as const;
  if (status === "CIRCUIT_BREAKER" || status === "BLOCKED") return "danger" as const;
  if (status === "DEFENSE" || status === "RECOVERY") return "warning" as const;
  return "info" as const;
}

export function AdminOperationsWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState("Operations snapshot not loaded yet.");
  const [eventId, setEventId] = useState(workspace.events[0]?.id ?? "");
  const [userId, setUserId] = useState(workspace.users[0]?.userId ?? "");
  const [enqueuedKind, setEnqueuedKind] = useState("ONCHAIN_EVENT");
  const [enqueuedEventId, setEnqueuedEventId] = useState("OPS-DEMO");
  const [enqueuedPayload, setEnqueuedPayload] = useState("{\"topic\":\"operations\"}");
  const [enqueueStatus, setEnqueueStatus] = useState("No bus event has been enqueued yet.");
  const [processStatus, setProcessStatus] = useState("No bus event has been processed yet.");
  const [busy, setBusy] = useState(false);
  const readValue = (event: ChangeEvent<HTMLInputElement>) => event.target.value;

  const summary = useMemo(() => ({
    queueDepth: snapshot?.bus.metrics.queueDepth ?? 0,
    processed: snapshot?.bus.metrics.processed ?? 0,
    dropped: snapshot?.bus.metrics.dropped ?? 0,
    poolNav: snapshot?.pool.pool.nav ?? workspace.pool.nav,
    members: snapshot?.pool.members.length ?? 0,
    activeAccounts: snapshot?.accounts.filter((row) => row.canTrade).length ?? workspace.accounts.length
  }), [snapshot?.accounts, snapshot?.bus.metrics.dropped, snapshot?.bus.metrics.processed, snapshot?.bus.metrics.queueDepth, snapshot?.pool.members.length, snapshot?.pool.pool.nav, workspace.accounts.length, workspace.pool.nav]);

  const loadSnapshot = async () => {
    const params = new URLSearchParams();
    if (eventId.trim()) params.set("eventId", eventId.trim());
    if (userId.trim()) params.set("userId", userId.trim());
    const res = await fetch(`/api/admin/operations?${params.toString()}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setSnapshotStatus("Failed to load operations snapshot.");
      return;
    }
    const payload = (await res.json()) as OperationsSnapshot;
    setSnapshot(payload);
    setSnapshotStatus("Operations snapshot refreshed.");
  };

  const enqueueBus = async () => {
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(enqueuedPayload);
    } catch {
      setEnqueueStatus("Payload must be valid JSON.");
      return;
    }

    setBusy(true);
    setEnqueueStatus("Enqueuing bus event...");
    try {
      const res = await fetch("/api/bus/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: enqueuedKind,
          eventId: enqueuedEventId,
          payload: parsedPayload
        })
      });
      const payload = await res.json().catch(() => ({ message: "Enqueue failed." }));
      if (!res.ok) {
        setEnqueueStatus(payload.message || "Enqueue failed.");
        return;
      }
      setEnqueueStatus(payload.dropped ? "Duplicate bus event dropped." : `Bus event enqueued as ${payload.event?.id ?? "unknown"}.`);
      await loadSnapshot();
    } finally {
      setBusy(false);
    }
  };

  const processBus = async () => {
    setBusy(true);
    setProcessStatus("Processing next bus event...");
    try {
      const res = await fetch("/api/bus/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 1 })
      });
      const payload = await res.json().catch(() => ({ message: "Process failed." }));
      if (!res.ok) {
        setProcessStatus(payload.message || "Process failed.");
        return;
      }
      setProcessStatus(payload.empty ? "Bus queue is empty." : `Processed ${payload.processed ?? 1} event.`);
      await loadSnapshot();
    } finally {
      setBusy(false);
    }
  };

  const syncContext = async () => {
    setBusy(true);
    try {
      await loadSnapshot();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Operations Command Center"
      description="Coordinate pool state, priority bus, trading context, and runtime connectivity from one operations control surface."
      status={status}
      badges={[
        { label: `${summary.queueDepth} queued events`, tone: "info" },
        { label: `${summary.members} pool members`, tone: "info" },
        { label: `${summary.activeAccounts} active accounts`, tone: "info" }
      ]}
      statusNote="This page reads the runtime state that already powers pool, bus, strategy, and onchain flows so operators can inspect and drive them together."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Pool NAV" value={summary.poolNav.toFixed(4)} />
        <StatTile label="Queue Depth" value={summary.queueDepth} tone="emerald" />
        <StatTile label="Processed" value={summary.processed} tone="amber" />
        <StatTile label="Dropped" value={summary.dropped} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Operations runtime"
        title="Pool health, bus control, trading context, and connectivity"
        description="This command center aligns runtime pool state, orchestration queue, strategy context, and infrastructure posture in one place."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
          <div className="grid gap-6">
            <PanelSection
              title="Pool and risk snapshot"
              description="Inspect pool NAV, member balances, and current risk posture from one shared runtime snapshot."
              eyebrow="Pool lane"
            >
              <SettingsInset eyebrow="Pool health" title={snapshot ? new Date(snapshot.pool.pool.updatedAt).toLocaleString() : "Using workspace runtime"} description="Shared runtime state for pool NAV, liquid buffer, and risk posture.">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={snapshot?.risk.status ?? workspace.risk.status} tone={toneForRiskStatus(snapshot?.risk.status ?? workspace.risk.status)} />
                  <StatusBadge label={snapshot?.healing.mode ?? "NORMAL"} tone={(snapshot?.healing.mode ?? "NORMAL") === "NORMAL" ? "success" : "warning"} />
                </div>
              </SettingsInset>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SettingsInset eyebrow="Buffer capital" title={`$${snapshot?.pool.pool.liquidBufferUsd.toLocaleString() ?? workspace.pool.liquidBufferUsd.toLocaleString()}`}><div /></SettingsInset>
                <SettingsInset eyebrow="Exposure ceiling" title={`$${snapshot?.pool.pool.totalAssetsUsd.toLocaleString() ?? workspace.pool.totalAssetsUsd.toLocaleString()}`}><div /></SettingsInset>
              </div>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{snapshotStatus}</span>}>
                <AppButton className="text-sm" disabled={busy} onClick={syncContext}>Refresh Operations Snapshot</AppButton>
              </ActionBar>

              <div className="mt-4 grid gap-3">
                {(snapshot?.pool.members ?? []).slice(0, 4).map((member) => (
                  <SettingsInset key={member.userId} eyebrow={member.userId} title={`$${member.pnlUsd.toLocaleString()} PnL`} description={`Shares ${member.shares.toLocaleString()} · Principal $${member.principalUsd.toLocaleString()} · HWM ${member.highWatermarkNav.toFixed(4)}`}>
                    <div />
                  </SettingsInset>
                ))}
                {(snapshot?.pool.members ?? []).length === 0 ? <div className="empty-state">No pool members available in this snapshot.</div> : null}
              </div>
            </PanelSection>

            <PanelSection
              title="Priority bus controls"
              description="Enqueue, process, and inspect the current orchestration queue."
              eyebrow="Bus lane"
            >
              <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
                <FormField label="Event kind">
                  <AppInput value={enqueuedKind} onChange={(event: ChangeEvent<HTMLInputElement>) => setEnqueuedKind(readValue(event))} placeholder="ONCHAIN_EVENT" />
                </FormField>
                <FormField label="Event id">
                  <AppInput value={enqueuedEventId} onChange={(event: ChangeEvent<HTMLInputElement>) => setEnqueuedEventId(readValue(event))} placeholder="OPS-DEMO" />
                </FormField>
                <FormField label="Payload JSON" helperText="Keep this to a small JSON object so the bus can compute the score." gridColumn={{ lg: "span 2" }}>
                  <AppInput value={enqueuedPayload} onChange={(event: ChangeEvent<HTMLInputElement>) => setEnqueuedPayload(readValue(event))} placeholder='{"topic":"operations"}' />
                </FormField>
              </FormGrid>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{enqueueStatus} · {processStatus}</span>}>
                <AppButton className="text-sm" disabled={busy} onClick={enqueueBus}>Enqueue Event</AppButton>
                <AppButton className="text-sm" variant="outline" disabled={busy} onClick={processBus}>Process Next Event</AppButton>
              </ActionBar>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SettingsInset eyebrow="Queue depth" title={String(snapshot?.bus.metrics.queueDepth ?? 0)}><div /></SettingsInset>
                <SettingsInset eyebrow="Latency avg" title={`${snapshot?.bus.metrics.avgLatencyMs ?? 0}ms`}><div /></SettingsInset>
              </div>
            </PanelSection>
          </div>

          <div className="grid gap-6">
            <PanelSection
              title="Trading context and strategy"
              description="Preview the Kelly and pricing snapshot for a selected event and user."
              eyebrow="Context lane"
            >
              <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
                <FormField label="Event">
                  <AppInput value={eventId} onChange={(event: ChangeEvent<HTMLInputElement>) => setEventId(readValue(event))} placeholder={workspace.events[0]?.id ?? "EVT-001"} />
                </FormField>
                <FormField label="User">
                  <AppInput value={userId} onChange={(event: ChangeEvent<HTMLInputElement>) => setUserId(readValue(event))} placeholder={workspace.users[0]?.userId ?? "user-alpha"} />
                </FormField>
              </FormGrid>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{snapshotStatus}</span>}>
                <AppButton className="text-sm" disabled={busy} onClick={syncContext}>Load Trading Context</AppButton>
              </ActionBar>

              {snapshot?.tradingContext ? (
                <div className="mt-4 grid gap-3">
                  <SettingsInset eyebrow="Kelly plan" title={snapshot.tradingContext.kellyPlanId} description={`Spread ${snapshot.tradingContext.marketSpreadPct}% · Capacity $${snapshot.tradingContext.capitalCapacityUsd.toLocaleString()} · Notional $${snapshot.tradingContext.recommendedNotionalUsd.toLocaleString()}`} actions={<StatusBadge label={snapshot.tradingContext.probabilityCheck.status} tone={snapshot.tradingContext.probabilityCheck.status === "PASS" ? "success" : "warning"} />}>
                    <div />
                  </SettingsInset>
                  <div className="grid gap-3 md:grid-cols-2">
                    <SettingsInset eyebrow="Probability" title={snapshot.tradingContext.probabilityCheck.source} description={snapshot.tradingContext.probabilityCheck.reason ?? "ok"}><div /></SettingsInset>
                    <SettingsInset eyebrow="Risk / Compliance" title={`Risk ${snapshot.tradingContext.riskCheck.status}`} description={`Compliance ${snapshot.tradingContext.complianceCheck.status}`}><div /></SettingsInset>
                  </div>
                </div>
              ) : (
                <div className="empty-state mt-4">No trading context is available for the selected event and user.</div>
              )}
            </PanelSection>

            <PanelSection
              title="Event and connectivity snapshot"
              description="Review recent events, connector health, and wallet funding records."
              eyebrow="Connectivity lane"
            >
              <div className="grid gap-3">
                {(snapshot?.events ?? workspace.events).slice(0, 5).map((event) => (
                  <SettingsInset key={event.id} eyebrow={`${event.platform} · ${event.category}`} title={event.title} description={`AI ${(event.aiWinProbability * 100).toFixed(2)}%`} actions={<StatusBadge label={`${event.edgeSpreadPct}% edge`} tone="info" />}>
                    <div />
                  </SettingsInset>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="grid gap-3">
                  {(snapshot?.connectorHealth ?? []).slice(0, 4).map((row) => (
                    <SettingsInset key={row.id} eyebrow="Connector health" title={row.platform} description={row.message ?? "connector snapshot"} actions={<StatusBadge label={row.healthy ? "healthy" : "unknown"} tone={row.healthy ? "success" : "warning"} />}>
                      <div />
                    </SettingsInset>
                  ))}
                </div>
                <div className="grid gap-3">
                  {(snapshot?.walletFunding ?? []).slice(0, 4).map((row) => (
                    <SettingsInset key={row.id} eyebrow={row.accountId} title={`$${row.amount.toLocaleString()}`} description={`${row.asset} · ${row.walletChain}`}>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(row.confirmedAt).toLocaleString()}</p>
                    </SettingsInset>
                  ))}
                </div>
              </div>
            </PanelSection>

            <PanelSection
              title="Bus queue detail"
              description="Live queue and SLA policies from the priority bus."
              eyebrow="Queue lane"
            >
              <DataTable
                minWidth="980px"
                headers={["Event", "Kind", "Level", "Deadline", "Created"]}
                isEmpty={(snapshot?.bus.queue.length ?? 0) === 0}
                emptyMessage="No bus events are currently queued."
              >
                {(snapshot?.bus.queue ?? []).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{event.id}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.dedupeKey}</p>
                    </TableCell>
                    <TableCell>{event.kind}</TableCell>
                    <TableCell><StatusBadge label={`L${event.level}`} tone={event.level === 1 ? "danger" : event.level === 2 ? "info" : event.level === 3 ? "warning" : "neutral"} /></TableCell>
                    <TableCell suppressHydrationWarning>{new Date(event.deadlineAt).toLocaleString()}</TableCell>
                    <TableCell suppressHydrationWarning>{new Date(event.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
