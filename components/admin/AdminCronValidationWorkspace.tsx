"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, FormField, FormGrid, PanelSection, SettingsInset, WorkspaceCluster } from "@/components/dashboard-sections";

export function AdminCronValidationWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [busy, setBusy] = useState(false);
  const [triggerRef, setTriggerRef] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [probeNetwork, setProbeNetwork] = useState(false);
  const [message, setMessage] = useState("No cron validation run yet.");
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);

  const summary = useMemo(() => ({
    scheduled: (workspace.events??[]).length,
    results: runResult ? 1 : 0
  }), [(workspace.events??[]).length, runResult]);

  const runCronValidation = async () => {
    setBusy(true); setMessage("Running cron validation...");
    try {
      const body = { triggerRef: triggerRef || undefined, scheduledTime: scheduledTime || undefined, probeNetwork };
      const res = await fetch("/api/admin/production-validation-cron", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Cron validation failed." }));
      if (!res.ok) { setMessage(payload.message || "Cron validation failed."); return; }
      setRunResult(payload.result);
      setMessage("Cron validation completed.");
    } finally { setBusy(false); }
  };

  return (
    <AdminShell admin={admin} title="Cron Validation Workspace" description="Run scheduled on-demand production validation through the cron pipeline." status={status}
      badges={[{ label: summary.scheduled + " scheduled jobs", tone: "info" }, { label: summary.results + " results", tone: "success" }]}
      statusNote="This workspace produces production-cron evidence from the same engine that powers scheduled validation runs."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}>
      <div className="grid gap-4 md:grid-cols-2">
        <StatTile label="Scheduled Jobs" value={summary.scheduled} />
        <StatTile label="Results" value={summary.results} tone="emerald" />
      </div>
      <WorkspaceCluster eyebrow="Cron validation" title="Validation runner" description="Run the cron validation pipeline with optional trigger ref and probe network toggle." mt={7}>
        <PanelSection title="Validation runner" description="Provide a trigger ref and scheduled ISO time, toggle network probing, then execute." eyebrow="Runner lane">
          <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
            <FormField label="Trigger ref"><AppInput value={triggerRef} onChange={(e) => setTriggerRef(e.target.value)} /></FormField>
            <FormField label="Scheduled time (ISO)"><AppInput value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="2026-06-08T10:15:00.000Z" /></FormField>
          </FormGrid>
          <ActionBar mt={4} status={<span className="text-xs text-slate-500">{message}</span>}>
            <AppButton className="text-sm" variant="outline" onClick={() => setProbeNetwork((c) => !c)}>Toggle Probe Network: {probeNetwork ? "ON" : "OFF"}</AppButton>
            <AppButton className="text-sm" disabled={busy} onClick={runCronValidation}>{busy ? "Running..." : "Run Cron Validation"}</AppButton>
          </ActionBar>
          {runResult ? (
            <SettingsInset mt={4} eyebrow="Last run" title={String(runResult.status)} description={String(runResult.message ?? "OK")}>
              <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-slate-900/5 p-3 text-xs">{JSON.stringify(runResult, null, 2)}</pre>
            </SettingsInset>
          ) : null}
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
