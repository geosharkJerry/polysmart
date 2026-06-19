"use client";

import { useMemo } from "react";
import { Card, Metric, Text as TremorText } from "@tremor/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SpreadEChart } from "@/components/admin/modern/SpreadEChart";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { DataTable, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";

export function AdminExecutionWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();

  const summary = useMemo(() => ({
    intents: workspace.execution.intents.length,
    orders: workspace.execution.orders.length,
    fills: workspace.execution.fills.length,
    transactions: workspace.execution.transactions.length,
    locks: workspace.execution.locks.length,
    hedged: workspace.execution.intents.filter((row) => row.status === "HEDGED").length,
    failed: workspace.execution.intents.filter((row) => row.status === "FAILED").length
  }), [workspace.execution]);

  const executionTelemetry = useMemo(
    () =>
      workspace.execution.intents.slice(0, 6).map((intent) => {
        const fills = workspace.execution.fills.filter((row) => row.intentId === intent.intentId);
        const avgLatency = fills.length ? fills.reduce((sum, fill) => sum + fill.latencyMs, 0) / fills.length : 0;
        const fillUsd = fills.reduce((sum, fill) => sum + fill.filledUsd, 0);
        return {
          label: intent.intentId.slice(0, 10),
          spreadPct: Number((fillUsd / 1000).toFixed(2)),
          confidence: Math.min(100, Math.round(avgLatency ? Math.max(10, 100 - avgLatency / 12) : 12))
        };
      }),
    [workspace.execution.fills, workspace.execution.intents]
  );

  return (
    <AdminShell
      admin={admin}
      title="Execution Intelligence Workspace"
      description="Inspect the full execution chain from AI and Kelly context to intent creation, orders, fills, atomic transactions, and inventory locks."
      status={status}
      badges={[
        { label: workspace.risk.status, tone: workspace.risk.status === "NORMAL" ? "success" : "danger" },
        { label: `${summary.intents} intents`, tone: "info" },
        { label: `${summary.fills} fills`, tone: "info" }
      ]}
      statusNote="This workspace isolates execution evidence so operators can review routing, fills, and lock behavior without mixing it into subscriber administration."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Execution Intents" value={summary.intents} />
        <StatTile label="Orders / Fills" value={`${summary.orders} / ${summary.fills}`} tone="emerald" />
        <StatTile label="Transactions / Locks" value={`${summary.transactions} / ${summary.locks}`} tone="amber" />
        <StatTile label="Hedged / Failed" value={`${summary.hedged} / ${summary.failed}`} tone="rose" />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="rounded-[28px] border border-sky-100 bg-white/95 p-5 shadow-[0_24px_70px_rgba(14,36,51,0.08)] backdrop-blur dark:border-white/15 dark:bg-slate-950/72 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Execution telemetry</p>
          <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">Fill and latency posture</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            A compact ECharts lane translates recent fill size and latency into an operator-friendly execution quality signal.
          </p>
          <div className="mt-5">
            <SpreadEChart points={executionTelemetry} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-[24px] border border-sky-100 bg-white/95 shadow-sm dark:border-white/15 dark:bg-slate-950/72">
            <TremorText className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hedged ratio</TremorText>
            <Metric className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {summary.intents ? `${Math.round((summary.hedged / summary.intents) * 100)}%` : "0%"}
            </Metric>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Share of intents that reached hedged state.</p>
          </Card>
          <Card className="rounded-[24px] border border-sky-100 bg-white/95 shadow-sm dark:border-white/15 dark:bg-slate-950/72">
            <TremorText className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Average fill latency</TremorText>
            <Metric className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {workspace.execution.fills.length
                ? `${Math.round(workspace.execution.fills.reduce((sum, fill) => sum + fill.latencyMs, 0) / workspace.execution.fills.length)}ms`
                : "0ms"}
            </Metric>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Measured from recorded fills only.</p>
          </Card>
          <Card className="rounded-[24px] border border-sky-100 bg-white/95 shadow-sm dark:border-white/15 dark:bg-slate-950/72">
            <TremorText className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Filled USD</TremorText>
            <Metric className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              ${workspace.execution.fills.reduce((sum, fill) => sum + fill.filledUsd, 0).toLocaleString()}
            </Metric>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Aggregate executed notional across all recorded fills.</p>
          </Card>
          <Card className="rounded-[24px] border border-sky-100 bg-white/95 shadow-sm dark:border-white/15 dark:bg-slate-950/72">
            <TremorText className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Active locks</TremorText>
            <Metric className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {workspace.execution.locks.filter((row) => row.status === "ACTIVE").length}
            </Metric>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Locks that still need release or expiry follow-through.</p>
          </Card>
        </div>
      </div>

      <WorkspaceCluster
        eyebrow="Execution operations"
        title="Intent context, transactions, locks, and fill evidence"
        description="This workspace brings together the AI and Kelly decision context with downstream execution evidence and lock lifecycle review."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <PanelSection
            title="Execution intent context"
            description="Each intent carries AI provider metadata, Kelly sizing context, and captured order book evidence."
            eyebrow="Intent lane"
          >
            <div className="grid gap-4">
              {workspace.execution.intents.map((intent) => {
                const tx = workspace.execution.transactions.find((row) => row.intentId === intent.intentId) ?? null;
                const fills = workspace.execution.fills.filter((row) => row.intentId === intent.intentId);
                return (
                  <SettingsInset
                    key={intent.intentId}
                    eyebrow="Execution intent"
                    title={intent.intentId}
                    description={`${intent.userId} · ${intent.eventId}`}
                    actions={
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={intent.status} tone={intent.status === "HEDGED" ? "success" : intent.status === "FAILED" ? "danger" : "warning"} />
                        {tx ? <StatusBadge label={tx.status} tone={tx.status === "COMMITTED" ? "success" : tx.status === "FAILED" ? "danger" : "warning"} /> : null}
                      </div>
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <SettingsInset eyebrow="AI" title={`${intent.strategyContext?.ai?.provider ?? "-"} · ${intent.strategyContext?.ai?.model ?? "-"}`} description={`Win ${intent.strategyContext?.ai?.winProbability ?? "-"} · confidence ${intent.strategyContext?.ai?.confidence ?? "-"}`}>
                        <div />
                      </SettingsInset>
                      <SettingsInset eyebrow="Kelly" title={`$${intent.strategyContext?.kellyOutput?.recommendedNotionalUsd ?? "-"}`} description={`Bankroll ${intent.strategyContext?.kellyInput?.bankrollUsd ?? "-"} · entry ${intent.strategyContext?.kellyInput?.entryPrice ?? "-"}`}>
                        <p className="text-xs text-slate-600 dark:text-slate-300">Halt reasons: {intent.strategyContext?.kellyOutput?.haltReasons?.join(", ") || "none"}</p>
                      </SettingsInset>
                      <SettingsInset eyebrow="Execution timing" title={`${fills.length} fills`} description={`Created ${new Date(intent.createdAt).toLocaleString()}`}>
                        <div />
                      </SettingsInset>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {intent.strategyContext?.orderBooks?.length ? intent.strategyContext.orderBooks.map((book) => (
                        <SettingsInset key={`${intent.intentId}-${book.platform}`} eyebrow={book.platform} title={`YES ${book.bestYesBid} · NO ${book.bestNoBid}`} description={`Spread ${book.spread} · Depth ${book.depthUsd} · ${book.source}`}>
                          <div />
                        </SettingsInset>
                      )) : (
                        <div className="empty-state">No order book snapshot.</div>
                      )}
                    </div>
                  </SettingsInset>
                );
              })}
              {workspace.execution.intents.length === 0 ? <div className="empty-state">No execution intents are recorded yet.</div> : null}
            </div>
          </PanelSection>

          <div className="grid gap-6">
            <PanelSection
              title="Atomic transactions"
              description="Track commit and rollback posture for every transaction bundle created around an execution intent."
              eyebrow="Transaction lane"
            >
              <DataTable
                minWidth="920px"
                headers={["Transaction", "Intent", "User / Event", "Status", "Started", "Ended"]}
                isEmpty={workspace.execution.transactions.length === 0}
                emptyMessage="No atomic transactions have been captured yet."
              >
                {workspace.execution.transactions.map((tx) => (
                  <TableRow key={tx.txId}>
                    <TableCell className="font-medium">{tx.txId}</TableCell>
                    <TableCell>{tx.intentId}</TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-900 dark:text-white">{tx.userId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tx.eventId}</p>
                    </TableCell>
                    <TableCell><StatusBadge label={tx.status} tone={tx.status === "COMMITTED" ? "success" : tx.status === "FAILED" ? "danger" : "warning"} /></TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200" suppressHydrationWarning>{new Date(tx.startedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200" suppressHydrationWarning>{tx.endedAt ? new Date(tx.endedAt).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>

            <PanelSection
              title="Inventory lock monitor"
              description="Confirm that global inventory locks are acquired, renewed, and released as expected."
              eyebrow="Lock lane"
            >
              <DataTable
                minWidth="900px"
                headers={["Lock", "Intent", "User / Event", "Status", "Lease", "Acquired", "Expires"]}
                isEmpty={workspace.execution.locks.length === 0}
                emptyMessage="No inventory locks are recorded yet."
              >
                {workspace.execution.locks.map((lock) => (
                  <TableRow key={lock.lockId}>
                    <TableCell className="font-medium">{lock.lockId}</TableCell>
                    <TableCell>{lock.intentId}</TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-900 dark:text-white">{lock.userId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{lock.eventId}</p>
                    </TableCell>
                    <TableCell><StatusBadge label={lock.status} tone={lock.status === "ACTIVE" ? "warning" : lock.status === "RELEASED" ? "success" : "danger"} /></TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200">{lock.leaseMs}ms</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200" suppressHydrationWarning>{new Date(lock.acquiredAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200" suppressHydrationWarning>{new Date(lock.expiresAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <PanelSection
            title="Execution orders"
            description="Inspect all venue orders emitted from execution intents, including notional, side, and current status."
            eyebrow="Order lane"
          >
            <DataTable
              minWidth="980px"
              headers={["Order", "Intent", "Venue", "Market", "Side", "Notional", "Filled", "Status"]}
              isEmpty={workspace.execution.orders.length === 0}
              emptyMessage="No orders have been placed yet."
            >
              {workspace.execution.orders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.intentId}</TableCell>
                  <TableCell className="capitalize">{order.platform}</TableCell>
                  <TableCell>{order.marketId}</TableCell>
                  <TableCell>{order.side} · {order.orderType}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-200">${order.notionalUsd.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-200">${order.filledUsd.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge label={order.status} tone={order.status === "FILLED" ? "success" : order.status === "REJECTED" ? "danger" : "warning"} /></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </PanelSection>

          <PanelSection
            title="Fill ledger"
            description="Track actual fills, average prices, and measured latency for each executed order."
            eyebrow="Fill lane"
          >
            <DataTable
              minWidth="920px"
              headers={["Fill", "Order", "Intent", "Venue", "Filled USD", "Avg Price", "Latency"]}
              isEmpty={workspace.execution.fills.length === 0}
              emptyMessage="No fills are recorded yet."
            >
              {workspace.execution.fills.map((fill) => (
                <TableRow key={fill.fillId}>
                  <TableCell className="font-medium">{fill.fillId}</TableCell>
                  <TableCell>{fill.orderId}</TableCell>
                  <TableCell>{fill.intentId}</TableCell>
                  <TableCell className="capitalize">{fill.platform}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-200">${fill.filledUsd.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-200">{fill.avgPrice}</TableCell>
                  <TableCell className="text-sm text-slate-700 dark:text-slate-200">{fill.latencyMs}ms</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </PanelSection>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
