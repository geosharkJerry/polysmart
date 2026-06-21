"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefineRuntimeProvider } from "@/components/polysmart-ui/RefineRuntimeProvider";
import { PolysmartStatusPill } from "@/components/polysmart-ui/PolysmartStatusPill";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlyphBadge, PolysmartMark } from "@/components/VisualAssets";

const navGroups = [
  { label: "Core Ops", links: [{ href: "/admin", label: "Overview" }, { href: "/admin/users", label: "Users" }, { href: "/admin/accounts", label: "Accounts" }, { href: "/admin/payments", label: "Payments" }, { href: "/admin/settlements", label: "Settlements" }] },
  { label: "Automation", links: [{ href: "/admin/execution", label: "Execution" }, { href: "/admin/strategy", label: "Strategy" }, { href: "/admin/ai-route", label: "AI Route" }, { href: "/admin/risk", label: "Risk" }, { href: "/admin/pool", label: "Pool" }] },
  { label: "Production", links: [{ href: "/admin/settings", label: "Settings" }, { href: "/admin/integrations", label: "Integrations" }, { href: "/admin/connectors", label: "Connectors" }, { href: "/admin/evidence", label: "Evidence" }, { href: "/admin/audit", label: "Audit" }] }
];

export function AdminShell({
  admin,
  title,
  description,
  status,
  badges,
  actions,
  children,
  onLogout,
  statusNote
}: {
  admin: { email: string; role: string };
  title: string;
  description: string;
  status: string;
  badges?: Array<{ label: string; tone: "success" | "warning" | "danger" | "info" }>;
  actions?: ReactNode;
  children: ReactNode;
  onLogout?: () => void | Promise<void>;
  statusNote?: string;
}) {
  const pathname = usePathname();

  return (
    <RefineRuntimeProvider>
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_8%_-8%,rgba(0,122,255,0.16),transparent_34%),radial-gradient(circle_at_92%_6%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,#f8fcff_0%,#eef7ff_42%,#f8fafc_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_9%_-8%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_88%_2%,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#06111d_0%,#0b1724_46%,#0f172a_100%)] dark:text-white">
        <div className="mx-auto grid w-full max-w-[1680px] gap-6 px-4 py-4 lg:grid-cols-[292px_minmax(0,1fr)] lg:px-6 lg:py-6">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100dvh-48px)]">
            <div className="flex h-full flex-col rounded-[32px] border border-sky-100 bg-white/92 p-4 shadow-[0_24px_70px_rgba(14,36,51,0.08)] backdrop-blur dark:border-white/15 dark:bg-slate-950/72 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
              <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-2 text-slate-950 dark:text-white">
                <PolysmartMark size={38} />
                <span className="min-w-0">
                  <span className="block text-sm font-black tracking-tight">Polysmart</span>
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Admin workspace shell</span>
                </span>
              </Link>
              <div className="mt-5 space-y-5 overflow-y-auto pr-1">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                    <div className="mt-2 grid gap-1">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                            pathname === link.href
                              ? "bg-blue-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]"
                              : "text-slate-600 hover:bg-sky-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-sky-200"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto rounded-3xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Super Admin</p>
                <p className="mt-2 truncate text-sm font-extrabold text-slate-950 dark:text-white">{admin.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PolysmartStatusPill tone="info">{admin.role}</PolysmartStatusPill>
                  <PolysmartStatusPill tone={status.includes("Failed") ? "danger" : status.includes("Loading") ? "warning" : "success"}>{status}</PolysmartStatusPill>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ThemeToggle />
                  {onLogout ? (
                    <button className="rounded-full border border-sky-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-white/15 dark:bg-slate-950 dark:text-slate-200" onClick={onLogout}>
                      Sign Out
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="overflow-hidden rounded-[36px] border border-sky-100 bg-white/92 shadow-[0_24px_70px_rgba(14,36,51,0.08)] backdrop-blur dark:border-white/15 dark:bg-slate-950/72 dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
              <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-sky-300">Backoffice Management</p>
                  <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">{title}</h1>
                  <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">{description}</p>
                  {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
                </div>
                <div className="rounded-[28px] border border-sky-100 bg-sky-50/75 p-5 dark:border-white/15 dark:bg-white/10">
                  <div className="flex items-center gap-2">
                    <GlyphBadge kind="shield" tone="sky" size={20} />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Runtime Posture</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(badges ?? []).map((item) => (
                      <PolysmartStatusPill key={item.label} tone={item.tone === "danger" ? "danger" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "info"}>
                        {item.label}
                      </PolysmartStatusPill>
                    ))}
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/80 p-4 dark:bg-slate-950/55">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status note</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{statusNote ?? status}</p>
                  </div>
                </div>
              </div>
            </section>
            <div className="ops-strip mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-sky-100 bg-white/85 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-white/15 dark:bg-slate-950/72 dark:text-slate-200">
              <div className="flex min-w-0 items-center gap-3">
                <GlyphBadge kind="monitor" tone="sky" size={24} />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Admin page status</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{statusNote ?? status}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PolysmartStatusPill tone={status.includes("Failed") ? "danger" : status.includes("Loading") ? "warning" : "success"}>{status}</PolysmartStatusPill>
              </div>
            </div>

            <div className="mt-7">{children}</div>
          </div>
        </div>
      </main>
    </RefineRuntimeProvider>
  );
}
