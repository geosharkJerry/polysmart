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
  const [password, setPassword] = useState("");
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

  const useLogto = !!authStatus?.logto.configured;
  const loginReady = Boolean(authStatus?.turnstile.configured);
  const missingItems = [
    ...(authStatus?.logto.missing ?? []),
    ...(authStatus?.turnstile.missing ?? [])
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginReady) {
      setStatus("Human verification is not configured yet.");
      return;
    }
    if (!email) {
      setStatus("Email is required.");
      return;
    }
    if (!useLogto && !password) {
      setStatus("Password is required.");
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
    setStatus(useLogto ? "Opening Logto secure sign-in..." : "Signing in...");
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
          description={useLogto ? "Logto manages identity and email verification." : "Local account sign-in with Turnstile protection."}
          aside={<MarketScene compact eyebrow="Member access" headline="Secure sign-in before runtime release" subline="After sign-in, profile completion unlocks billing, account binding, wallet funding, and execution controls." />}
        />
        <div className="mt-8">
          <SurfaceCard title="Secure Member Sign In" subtitle={useLogto ? "Enter your email and complete Turnstile verification. Logto handles the credential step." : "Enter your credentials with Turnstile protection."}>
            <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Auth mode: {useLogto ? "Logto (SSO)" : "Local"}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {authStatus?.turnstile.configured ? "Human verification is active." : "Human verification is not configured yet."}
              </p>
              {missingItems.length > 0 ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Missing: {missingItems.join(", ")}</p> : null}
            </div>
            <form ref={formRef} className="contents" onSubmit={submit}>
            <div className="grid gap-4">
              <input name="email" className="input-field" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              {!useLogto && (
                <input name="password" className="input-field" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              )}
              <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken("")} />
            </div>
            <input type="hidden" name="turnstileToken" value={turnstileToken} readOnly />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn-primary-solid" type="submit" disabled={!loginReady}>
                {useLogto ? "Continue with Logto" : "Sign In"}
              </button>
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
