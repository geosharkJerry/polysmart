"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppLinkButton, DataTable, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";

type AdminSessionRecord = { tokenPreview: string; adminId: string; issuedAt: string; expiresAt: string; active: boolean };
type AdminRecord = { adminId: string; email: string; role: string; createdAt: string; lastLoginAt: string | null };

export function AdminAuthWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { status } = useAdminWorkspace();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRecord[]>([]);
  const [message, setMessage] = useState("No admin session data loaded yet.");
  const [busy, setBusy] = useState(false);

  const summary = useMemo(
    () => ({
      admins: admins.length,
      sessions: sessions.length,
      activeSessions: sessions.filter((session) => session.active).length
    }),
    [admins.length, sessions]
  );

  const load = async () => {
    const res = await fetch("/api/admin/auth/sessions", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setMessage("Failed to load admin sessions.");
      return;
    }
    const payload = await res.json().catch(() => ({ admins: [], sessions: [] }));
    setAdmins(Array.isArray(payload.admins) ? payload.admins : []);
    setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
    setMessage(`Loaded ${(payload.admins ?? []).length} admin(s) and ${(payload.sessions ?? []).length} session(s).`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Admin Authentication Workspace"
      description="Inspect active admin identities, session posture, and backend access evidence without exposing raw credentials or session secrets."
      status={status}
      badges={[
        { label: `${summary.admins} admins`, tone: "info" },
        { label: `${summary.sessions} sessions`, tone: "info" },
        { label: `${summary.activeSessions} active`, tone: "success" }
      ]}
      statusNote="This workspace is the restricted audit surface for super-admin identity posture and active session review."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Admins" value={summary.admins} />
        <StatTile label="Sessions" value={summary.sessions} tone="emerald" />
        <StatTile label="Active" value={summary.activeSessions} tone="amber" />
      </div>

      <WorkspaceCluster
        eyebrow="Identity operations"
        title="Admin roster, active sessions, and access review"
        description="Use one protected workspace to refresh the admin registry, inspect live sessions, and validate super-admin access posture."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <PanelSection
            title="Session posture"
            description="Load the current backend-auth session inventory and validate which sessions remain active."
            eyebrow="Session lane"
          >
            <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}>
              <AppButton className="text-sm" disabled={busy} onClick={refresh}>
                {busy ? "Refreshing..." : "Refresh Session Data"}
              </AppButton>
            </ActionBar>

            <div className="mt-4 grid gap-3">
              {sessions.slice(0, 6).map((session) => (
                <SettingsInset
                  key={`${session.adminId}-${session.issuedAt}`}
                  eyebrow={session.adminId}
                  title={session.tokenPreview}
                  description={`Issued ${new Date(session.issuedAt).toLocaleString()} · Expires ${new Date(session.expiresAt).toLocaleString()}`}
                  actions={<StatusBadge label={session.active ? "active" : "expired"} tone={session.active ? "success" : "warning"} />}
                >
                  <p className="text-xs text-slate-600 dark:text-slate-300">Session owner: <span className="font-semibold text-slate-900 dark:text-white">{session.adminId}</span></p>
                </SettingsInset>
              ))}
              {sessions.length === 0 ? <div className="empty-state">No active admin sessions were found.</div> : null}
            </div>
          </PanelSection>

          <PanelSection
            title="Admin registry"
            description="Review the current admin roster and last login footprint returned by the backend authentication layer."
            eyebrow="Registry lane"
          >
            <DataTable minWidth="880px" headers={["Admin", "Role", "Created", "Last login"]} isEmpty={admins.length === 0} emptyMessage="No admins were returned by the backend.">
              {admins.map((row) => (
                <TableRow key={row.adminId}>
                  <TableCell>
                    <p className="font-semibold text-slate-900 dark:text-white">{row.email}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.adminId}</p>
                  </TableCell>
                  <TableCell><StatusBadge label={row.role} tone="info" /></TableCell>
                  <TableCell suppressHydrationWarning>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell suppressHydrationWarning>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "never"}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </PanelSection>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
