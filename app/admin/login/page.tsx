"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { MarketScene } from "@/components/VisualAssets";
import { TurnstileWidget } from "@/components/TurnstileWidget";

type AuthConfigStatus = {
  logto: { configured: boolean; missing: string[] };
  turnstile: { configured: boolean; missing: string[] };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("infor@polysmart.io");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState("Super admin authentication required.");
  const [submitting, setSubmitting] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthConfigStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => {
        if (res.ok) router.replace("/admin");
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setStatus("This Logto identity is not authorized for the Polysmart super admin workspace.");
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/config-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: AuthConfigStatus) => setAuthStatus(payload))
      .catch(() => setAuthStatus(null));
  }, []);

  const adminReady = Boolean(authStatus?.logto.configured && authStatus?.turnstile.configured);
  const missingItems = [
    ...(authStatus?.logto.missing ?? []),
    ...(authStatus?.turnstile.missing ?? [])
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminReady) {
      setStatus("Production admin login is not fully configured yet. Review the missing Cloudflare auth settings below.");
      return;
    }
    if (!email || !turnstileToken) {
      setStatus("Admin email and human verification are required.");
      return;
    }
    setSubmitting(true);
    setStatus("Opening Logto admin sign-in...");

    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/admin/auth/login";
      form.style.display = "none";

      const emailInput = document.createElement("input");
      emailInput.name = "email";
      emailInput.value = email;
      form.appendChild(emailInput);

      const tokenInput = document.createElement("input");
      tokenInput.name = "turnstileToken";
      tokenInput.value = turnstileToken;
      form.appendChild(tokenInput);

      document.body.appendChild(form);
      form.submit();
    } catch {
      setStatus("Unable to reach the admin authentication service.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <NavBar />
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="grid min-h-[calc(100dvh-180px)] items-center gap-7 lg:grid-cols-2 lg:gap-10">
          <section className="rounded-[28px] border border-sky-100 bg-gradient-to-r from-[#0e2433] to-[#1f6feb] p-7 text-white shadow-[0_20px_40px_-20px_rgba(18,52,86,0.4)] md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">Admin Access Control</p>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">Super Admin Gate for Polysmart Backoffice</h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-sky-50 md:text-base">The /admin workspace is hard-gated. Logto handles super-admin identity, and Turnstile blocks automated login attempts before redirect.</p>
            <div className="mt-8 grid gap-4">
              <div className="soft-panel">
                <p className="text-sm font-semibold">Authorized identity</p>
                <p className="mt-3 text-sm text-sky-50">Email: <span className="font-semibold">infor@polysmart.io</span></p>
                <p className="mt-2 text-sm text-sky-50">Role: <span className="font-semibold">super_admin</span></p>
                <p className="mt-4 text-xs leading-6 text-sky-100">A local HTTP-only admin session is issued only after the Logto callback confirms the admin identity.</p>
              </div>
              <MarketScene compact eyebrow="Backoffice access" headline="A branded login surface for the admin console" subline="It keeps the backoffice entry visually aligned with the member experience." />
            </div>
          </section>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-[0_24px_70px_rgba(14,36,51,0.08)] backdrop-blur dark:border-white/15 dark:bg-slate-950/72 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Secure Login</p>
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Authentication readiness</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {adminReady
                  ? "Logto and Turnstile are ready for production admin sign-in."
                  : "Admin sign-in is safe but not production-ready until the missing Cloudflare settings are added."}
              </p>
              {!adminReady ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Missing: {missingItems.join(", ") || "Loading configuration..."}</p> : null}
            </div>
            <div className="mt-8 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Admin Email
                <input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Credential Step
                <input className="input-field" type="text" value="Managed by Logto" readOnly />
              </label>
              <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken("")} />
            </div>
            <button type="submit" disabled={submitting || !adminReady} className="btn-primary-solid mt-8 w-full">
              {submitting ? "Redirecting..." : "Continue with Logto"}
            </button>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{status}</p>
          </form>
        </div>
      </div>
    </main>
  );
}
