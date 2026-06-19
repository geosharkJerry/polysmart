"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, AppButton, AppLinkButton, PanelSection, SettingsInset, WorkspaceCluster } from "@/components/dashboard-sections";

type EvidenceCounter = {
  key: string;
  label: string;
  risk: "P0" | "P1";
  requiredMinimum: number;
  current: number;
  passed: boolean;
  source: string;
  evidence: string;
};

type EvidenceSnapshot = {
  id: string;
  generatedAt: string;
  source: string;
  p0Passed: number;
  p0Total: number;
  p1Passed: number;
  p1Total: number;
  counters: EvidenceCounter[];
};

type ReadinessItem = {
  key: string;
  label: string;
  risk: "P0" | "P1";
  status: string;
  evidence: string[];
  requiredAction: string;
};

type ReadinessSnapshot = {
  id: string;
  generatedAt: string;
  probeNetwork: boolean;
  p0Open: number;
  p1Open: number;
  summary: Record<string, number>;
  report: {
    generatedAt: string;
    probeNetwork: boolean;
    summary: Record<string, number>;
    items: ReadinessItem[];
    connectorHealth: Array<{ platform: string; healthy: boolean; latencyMs: number; message: string }>;
    scheduledAttempts: Array<{ id: string; cron: string; scheduledTime: string | null; triggerRef: string; status: string; responseStatus: number | null; message: string; createdAt: string }>;
    scheduledCron: { expression: string; intervalMinutes: number; nextExpectedAt: string | null };
  };
};

type ReadinessReport = {
  generatedAt: string;
  probeNetwork: boolean;
  summary: Record<string, number>;
  items: ReadinessItem[];
  connectorHealth: Array<{ platform: string; healthy: boolean; latencyMs: number; message: string }>;
  scheduledAttempts: Array<{ id: string; cron: string; scheduledTime: string | null; triggerRef: string; status: string; responseStatus: number | null; message: string; createdAt: string }>;
  scheduledCron: { expression: string; intervalMinutes: number; nextExpectedAt: string | null };
  snapshots: ReadinessSnapshot[];
};

type EvidenceReport = {
  generatedAt: string;
  source: string;
  p0Passed: number;
  p0Total: number;
  p1Passed: number;
  p1Total: number;
  counters: EvidenceCounter[];
  snapshots: EvidenceSnapshot[];
};

function toneForStatus(status: string) {
  if (status === "ready" || status === "configured") return "success" as const;
  if (status === "unavailable" || status === "missing" || status === "test_key_only" || status === "placeholder") return "danger" as const;
  if (status === "configured_pending_probe" || status === "requires_real_transaction") return "warning" as const;
  return "info" as const;
}

function toneForProbeStatus(status: string) {
  if (status === "PASS") return "success" as const;
  if (status === "BLOCK" || status === "FAIL" || status === "ERROR") return "danger" as const;
  return "warning" as const;
}

export function AdminEvidenceWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [evidence, setEvidence] = useState<EvidenceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("No production evidence has been loaded yet.");

  const loadEvidence = async () => {
    const res = await fetch("/api/admin/evidence", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const payload = (await res.json()) as EvidenceReport;
    setEvidence(payload);
  };

  const loadReadiness = async (probeNetwork = false) => {
    const url = `/api/admin/readiness${probeNetwork ? "?probe=1" : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const payload = (await res.json()) as ReadinessReport;
    setReadiness(payload);
    setMessage("Readiness evidence refreshed.");
  };

  useEffect(() => {
    loadEvidence().catch(() => setMessage("Failed to load production evidence."));
    loadReadiness(false).catch(() => setMessage("Failed to load readiness evidence."));
  }, []);

  const refreshAll = async (probeNetwork = false) => {
    setRefreshing(true);
    try {
      await Promise.all([loadEvidence(), loadReadiness(probeNetwork)]);
      setMessage(probeNetwork ? "Readiness and evidence refreshed with probe enabled." : "Readiness and evidence refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  const runProductionValidation = async (probeNetwork = false) => {
    setBusy(true);
    setMessage("Recording production validation...");
    try {
      const res = await fetch("/api/admin/production-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeNetwork })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ message: "Production validation failed." }));
      if (!res.ok) {
        setMessage(payload.message || "Production validation failed.");
        return;
      }
      setMessage(`Production validation recorded · ${payload.record?.status ?? "ok"}`);
      await refreshAll(probeNetwork);
    } finally {
      setBusy(false);
    }
  };

  const readinessItems = readiness?.items ?? [];
  const evidenceCounters = evidence?.counters ?? [];

  const summary = useMemo(
    () => ({
      readinessTotal: readinessItems.length,
      readinessOpenP0: readinessItems.filter((item) => item.risk === "P0" && toneForStatus(item.status) !== "success").length,
      readinessOpenP1: readinessItems.filter((item) => item.risk === "P1" && toneForStatus(item.status) !== "success").length
    }),
    [readinessItems]
  );

  return (
    <AdminShell
      admin={admin}
      title="Evidence and Readiness Workspace"
      description="Review production evidence snapshots, readiness counters, scheduled attempts, and P0 or P1 operational posture from one audit-grade workspace."
      status={message}
      badges={[
        { label: `${summary.readinessTotal} readiness items`, tone: "info" },
        { label: `${summary.readinessOpenP0} P0 open`, tone: "danger" },
        { label: `${summary.readinessOpenP1} P1 open`, tone: "warning" }
      ]}
      statusNote="This workspace consolidates evidence, readiness, and scheduled-validation posture into one operator-facing audit surface."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Readiness items" value={summary.readinessTotal} />
        <StatTile label="P0 open" value={summary.readinessOpenP0} tone="rose" />
        <StatTile label="P1 open" value={summary.readinessOpenP1} tone="amber" />
        <StatTile label="Evidence counters" value={evidenceCounters.length} tone="emerald" />
      </div>

      <WorkspaceCluster
        eyebrow="Readiness review"
        title="Validation controls, evidence snapshots, and readiness matrix"
        description="Refresh evidence, trigger production validation, inspect scheduled attempts, and review every open readiness item from one workspace."
        mt={7}
      >
        <PanelSection
          title="Evidence control"
          description="Refresh evidence snapshots, update readiness state, or record a new production validation run."
          eyebrow="Control lane"
        >
          <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}>
            <AppButton className="text-sm" disabled={busy} onClick={() => runProductionValidation(false)}>{busy ? "Recording..." : "Record Validation"}</AppButton>
            <AppButton className="text-sm" variant="outline" disabled={busy} onClick={() => runProductionValidation(true)}>Record + Probe</AppButton>
            <AppButton className="text-sm" variant="outline" disabled={refreshing} onClick={() => refreshAll(false)}>{refreshing ? "Refreshing..." : "Refresh Evidence"}</AppButton>
            <AppButton className="text-sm" variant="outline" disabled={refreshing} onClick={() => refreshAll(true)}>Refresh + Probe</AppButton>
          </ActionBar>
        </PanelSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
          <PanelSection
            title="Production evidence snapshots"
            description="Review persisted P0 or P1 coverage snapshots and their underlying evidence counters."
            eyebrow="Evidence lane"
          >
            <div className="grid gap-3">
              {evidence?.snapshots.slice(0, 4).map((snapshot) => (
                <SettingsInset
                  key={snapshot.id}
                  eyebrow={snapshot.source}
                  title={snapshot.id}
                  description={`P0 ${snapshot.p0Passed}/${snapshot.p0Total} · P1 ${snapshot.p1Passed}/${snapshot.p1Total}`}
                  actions={<StatusBadge label={`P0 ${snapshot.p0Passed}/${snapshot.p0Total}`} tone={snapshot.p0Passed === snapshot.p0Total ? "success" : "danger"} />}
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(snapshot.generatedAt).toLocaleString()}</p>
                </SettingsInset>
              ))}
              {evidence?.snapshots.length ? null : <div className="empty-state">No production evidence snapshots yet.</div>}
            </div>
          </PanelSection>

          <PanelSection
            title="Readiness snapshots and scheduled attempts"
            description="Inspect the current readiness report, cron schedule, and prior scheduled validation attempts."
            eyebrow="Schedule lane"
          >
            <div className="grid gap-3">
              <SettingsInset eyebrow="Scheduled window" title={readiness?.scheduledCron.expression ?? "unknown"} description={`Every ${readiness?.scheduledCron.intervalMinutes ?? "?"} minutes · next ${readiness?.scheduledCron.nextExpectedAt ?? "unknown"}`}>
                <div />
              </SettingsInset>
              {(readiness?.scheduledAttempts ?? []).slice(0, 4).map((attempt) => (
                <SettingsInset
                  key={attempt.id}
                  eyebrow={attempt.id}
                  title={attempt.triggerRef}
                  description={`${attempt.cron} · response ${attempt.responseStatus ?? "pending"}`}
                  actions={<StatusBadge label={attempt.status} tone={toneForProbeStatus(attempt.status)} />}
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(attempt.createdAt).toLocaleString()}</p>
                </SettingsInset>
              ))}
              {(readiness?.scheduledAttempts ?? []).length ? null : <div className="empty-state">No scheduled attempts yet.</div>}
            </div>
          </PanelSection>
        </div>

        <PanelSection
          title="Readiness matrix"
          description="Review every P0 and P1 check, its current operational status, and the required next action."
          eyebrow="Matrix lane"
          mt={6}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {readinessItems.map((item) => (
              <SettingsInset
                key={item.key}
                eyebrow={`${item.risk} · ${item.key}`}
                title={item.label}
                description={item.requiredAction}
                actions={<StatusBadge label={item.status} tone={toneForStatus(item.status)} />}
              >
                <div className="grid gap-1">
                  {item.evidence.map((line) => (
                    <p key={line} className="text-xs text-slate-600 dark:text-slate-300">{line}</p>
                  ))}
                </div>
              </SettingsInset>
            ))}
            {readinessItems.length === 0 ? <div className="empty-state">No readiness items loaded yet.</div> : null}
          </div>
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
