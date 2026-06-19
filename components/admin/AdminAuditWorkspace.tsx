"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, AppSelect, DataTable, FormField, FormGrid, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";
import { AuditLog } from "@/lib/types";

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminAuditWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterStatus, setFilterStatus] = useState("Loading audit logs...");
  const [category, setCategory] = useState<AuditLog["category"] | "ALL">("ALL");
  const [userId, setUserId] = useState("");
  const [startAt, setStartAt] = useState(() => toDateTimeInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)));
  const [endAt, setEndAt] = useState(() => toDateTimeInputValue(new Date()));

  const loadLogs = async () => {
    setFilterStatus("Loading audit logs...");
    const params = new URLSearchParams({ limit: "1000" });
    if (category !== "ALL") params.set("category", category);
    if (userId.trim()) params.set("userId", userId.trim());
    if (startAt) params.set("startDate", new Date(startAt).toISOString());
    if (endAt) params.set("endDate", new Date(endAt).toISOString());

    const res = await fetch(`/api/admin/audit/logs?${params.toString()}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setFilterStatus("Failed to load audit logs.");
      return;
    }

    const payload = (await res.json()) as { logs: AuditLog[] };
    setLogs(payload.logs);
    setFilterStatus(`Loaded ${payload.logs.length} audit logs.`);
  };

  useEffect(() => {
    loadLogs().catch(() => setFilterStatus("Failed to load audit logs."));
  }, []);

  const summary = useMemo(
    () => ({
      total: logs.length,
      execution: logs.filter((row) => row.category === "EXECUTION").length,
      billing: logs.filter((row) => row.category === "BILLING").length,
      risk: logs.filter((row) => row.category === "RISK").length,
      system: logs.filter((row) => row.category === "SYSTEM").length
    }),
    [logs]
  );

  const exportAudit = (format: "json" | "csv") => {
    const params = new URLSearchParams({ format, limit: "1000" });
    if (category !== "ALL") params.set("category", category);
    if (userId.trim()) params.set("userId", userId.trim());
    if (startAt) params.set("startDate", new Date(startAt).toISOString());
    if (endAt) params.set("endDate", new Date(endAt).toISOString());
    window.open(`/api/admin/audit/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AdminShell
      admin={admin}
      title="Audit Review and Export Workspace"
      description="Filter, review, and export system evidence so compliance, operations, and incident analysis use the same canonical audit slice."
      status={filterStatus}
      badges={[
        { label: workspace.risk.status, tone: workspace.risk.status === "NORMAL" ? "success" : "danger" },
        { label: `${summary.total} logs`, tone: "info" },
        { label: `${workspace.autoRunAudits.length} auto-run traces`, tone: "info" }
      ]}
      statusNote="Audit filters and exports stay aligned to the same backend query model, so on-screen review matches exported evidence."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Filtered Logs" value={summary.total} />
        <StatTile label="Execution" value={summary.execution} tone="emerald" />
        <StatTile label="Billing" value={summary.billing} tone="amber" />
        <StatTile label="Risk" value={summary.risk} tone="rose" />
        <StatTile label="System" value={summary.system} tone="slate" />
      </div>

      <WorkspaceCluster
        eyebrow="Audit operations"
        title="Filters, exports, timelines, and orchestration evidence"
        description="This workspace keeps audit filtering, export control, and auto-run evidence inside one review surface."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-6">
            <PanelSection
              title="Audit filters and export"
              description="Apply category, user, and time-range filters once, then export the exact same slice for offline review."
              eyebrow="Filter lane"
            >
              <FormGrid columns={{ base: 1, md: 2, xl: 4 }} gap={3}>
                <FormField label="Category">
                  <AppSelect value={category} onChange={(e) => setCategory(e.target.value as AuditLog["category"] | "ALL")}>
                    <option value="ALL">All categories</option>
                    <option value="SYSTEM">System</option>
                    <option value="EXECUTION">Execution</option>
                    <option value="BILLING">Billing</option>
                    <option value="RISK">Risk</option>
                  </AppSelect>
                </FormField>
                <FormField label="User ID">
                  <AppInput value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Optional user id" />
                </FormField>
                <FormField label="Start time">
                  <AppInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </FormField>
                <FormField label="End time">
                  <AppInput type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </FormField>
              </FormGrid>

              <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{filterStatus}</span>}>
                <AppButton className="text-sm" onClick={() => loadLogs()}>Apply Filters</AppButton>
                <AppButton
                  className="text-sm"
                  variant="outline"
                  onClick={() => {
                    setCategory("ALL");
                    setUserId("");
                    setStartAt(toDateTimeInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)));
                    setEndAt(toDateTimeInputValue(new Date()));
                  }}
                >
                  Reset Window
                </AppButton>
                <AppButton className="text-sm" variant="outline" onClick={() => exportAudit("json")}>Export JSON</AppButton>
                <AppButton className="text-sm" onClick={() => exportAudit("csv")}>Export CSV</AppButton>
              </ActionBar>
            </PanelSection>

            <PanelSection
              title="Audit timeline"
              description="Review filtered evidence inline before exporting or escalating the event trail."
              eyebrow="Timeline lane"
            >
              <DataTable minWidth="980px" headers={["Time", "Category", "Message", "User", "Context"]} isEmpty={logs.length === 0} emptyMessage="No audit logs matched the current filters.">
                {logs.map((row) => (
                  <TableRow key={row.id} className="align-top">
                    <TableCell suppressHydrationWarning>{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge label={row.category} tone={row.category === "EXECUTION" ? "info" : row.category === "BILLING" ? "warning" : row.category === "RISK" ? "danger" : "success"} /></TableCell>
                    <TableCell>{row.message}</TableCell>
                    <TableCell>{String(row.context.userId ?? "-")}</TableCell>
                    <TableCell className="whitespace-pre-wrap break-words font-mono text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(row.context, null, 2)}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>
          </div>

          <div className="grid gap-6">
            <PanelSection
              title="Auto-run audit trail"
              description="Review the orchestrator's autonomous trace without mixing it into the main filtered timeline."
              eyebrow="Orchestrator lane"
            >
              <div className="grid gap-3">
                {workspace.autoRunAudits.map((row) => (
                  <SettingsInset key={row.id} eyebrow="Auto-run trace" title={row.message} description={new Date(row.createdAt).toLocaleString()} actions={<StatusBadge label={row.category} tone="info" />}>
                    <p className="whitespace-pre-wrap break-words font-mono text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(row.context, null, 2)}</p>
                  </SettingsInset>
                ))}
                {workspace.autoRunAudits.length === 0 ? <div className="empty-state">No auto-run audit traces are available yet.</div> : null}
              </div>
            </PanelSection>

            <PanelSection
              title="Recent overview logs"
              description="Keep the short overview feed visible here while the full date-filtered evidence lives in the main timeline."
              eyebrow="Preview lane"
            >
              <div className="grid gap-3">
                {workspace.recentLogs.map((row) => (
                  <SettingsInset key={row.id} eyebrow={row.category} title={row.message} description={new Date(row.createdAt).toLocaleString()} actions={<StatusBadge label={row.category} tone={row.category === "RISK" ? "danger" : row.category === "BILLING" ? "warning" : row.category === "EXECUTION" ? "info" : "success"} />}>
                    <div />
                  </SettingsInset>
                ))}
                {workspace.recentLogs.length === 0 ? <div className="empty-state">No recent logs are available.</div> : null}
              </div>
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
