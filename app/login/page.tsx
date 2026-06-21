"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SurfaceCard } from "@/components/SurfaceCard";
import { MarketScene } from "@/components/VisualAssets";
import { TurnstileWidget } from "@/components/TurnstileWidget";

type AuthConfigStatus = {
  logto: { configured: boolean; missing: string[] };
  turnstile: { configured: boolean; missing: string[] };
};

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthConfigStatus | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/config-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: AuthConfigStatus) => setAuthStatus(payload))
      .catch(() => setAuthStatus(null));
  }, []);

  const loginReady = Boolean(authStatus?.logto.configured && authStatus?.turnstile.configured);
  const missingItems = [
    ...(authStatus?.logto.missing ?? []),
    ...(authStatus?.turnstile.missing ?? [])
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginReady) {
      setStatus("Production login is not fully configured yet. Review the missing Cloudflare auth settings below.");
      return;
    }
    if (!email) {
      setStatus("Email is required.");
      return;
    }
    if (!turnstileToken) {
      setStatus("Please complete human verification before continuing.");
      return;
    }
    const form = formRef.current;
    if (!form) {
      setStatus("Sign-in form is not ready.");
      return;
    }
    setStatus("Opening Logto secure sign-in...");
    form.action = "/api/auth/login";
    form.method = "POST";
    form.submit();
  };

  return (
    <main className="min-h-[100dvh] bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <NavBar />
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <PageHero
          label="Member Login"
          title="Enter the member control room"
          description="Logto manages identity and email verification. Turnstile runs first to block automated or abusive sign-in attempts."
          aside={<MarketScene compact eyebrow="Member access" headline="Secure sign-in before runtime release" subline="After Logto sign-in, profile completion unlocks billing, account binding, wallet funding, and execution controls." />}
        />
        <div className="mt-8">
          <SurfaceCard title="Secure Member Sign In" subtitle="Enter your email hint and complete Turnstile verification. Logto handles the credential step on the hosted identity page.">
            <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Authentication readiness</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {loginReady
                  ? "Logto and Turnstile are ready for production sign-in."
                  : "Sign-in is safe but not production-ready until the missing Cloudflare settings are added."}
              </p>
              {!loginReady ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Missing: {missingItems.join(", ") || "Loading configuration..."}</p> : null}
            </div>
            <form ref={formRef} className="contents" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="email" className="input-field" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken("")} />
            </div>
            <input type="hidden" name="turnstileToken" value={turnstileToken} readOnly />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn-primary-solid" type="submit" disabled={!loginReady}>Continue with Logto</button>
              <NextLink className="btn-secondary" href="/register">Register Member</NextLink>
            </div>
            {status ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
            </form>
          </SurfaceCard>
        </div>
      </div>
    </main>
  );
}
