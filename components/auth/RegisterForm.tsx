"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { SurfaceCard } from "@/components/SurfaceCard";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { MEMBER_REGISTRATION_DISCLOSURE } from "@/lib/legal/member-registration-disclosure";

const plans = [
  { id: "managed-performance", name: "Managed Performance" },
  { id: "agent-pro", name: "Agent Pro" },
  { id: "institutional", name: "Institutional" }
];

type Props = {
  initialPlan: string;
};

type AuthConfigStatus = {
  logto: { configured: boolean; missing: string[] };
  turnstile: { configured: boolean; missing: string[] };
};

function logtoBasedRegistration(authStatus: AuthConfigStatus | null) {
  return !!authStatus?.logto.configured;
}

export function RegisterForm({ initialPlan }: Props) {
  const [planId, setPlanId] = useState(initialPlan);
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [acceptedRegistrationTerms, setAcceptedRegistrationTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthConfigStatus | null>(null);
  const [localEmail, setLocalEmail] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  const [localFullName, setLocalFullName] = useState("");
  const [localCountry, setLocalCountry] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/config-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: AuthConfigStatus) => setAuthStatus(payload))
      .catch(() => setAuthStatus(null));
  }, []);

  const useLogto = logtoBasedRegistration(authStatus);
  const registrationReady = Boolean(authStatus?.turnstile.configured);
  const missingItems = [
    ...(authStatus?.logto.missing ?? []),
    ...(authStatus?.turnstile.missing ?? [])
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!registrationReady) {
      setStatus("Human verification is not configured yet. Review the missing Cloudflare Turnstile settings below.");
      return;
    }
    if (!acceptedRegistrationTerms) {
      setStatus("You must agree to the registration privacy disclosure before continuing.");
      return;
    }
    if (!turnstileToken) {
      setStatus("Please complete human verification before continuing.");
      return;
    }
    if (!formRef.current) {
      setStatus("Registration form is not ready.");
      return;
    }

    if (useLogto) {
      setStatus("Opening Logto secure sign-up...");
      formRef.current.submit();
    } else {
      if (!localEmail.trim() || !localPassword.trim() || !localFullName.trim() || !localCountry.trim() || !localAddress.trim()) {
        setStatus("All fields are required for local registration.");
        return;
      }
      if (localPassword.length < 8) {
        setStatus("Password must be at least 8 characters.");
        return;
      }
      setStatus("Creating local member account...");
      formRef.current.submit();
    }
  };

  return (
    <>
      <SurfaceCard title={useLogto ? "Start Secure Logto Registration" : "Local Member Registration"} subtitle={useLogto ? "Choose a package and complete Turnstile verification. Logto collects the identity credential." : "Create a local account with Turnstile protection. Upgrade to Logto later for SSO."}>
        <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Auth mode: {useLogto ? "Logto (SSO)" : "Local (Turnstile only)"}</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {authStatus?.turnstile.configured
              ? "Human verification is active."
              : "Human verification is not yet configured."}
          </p>
          {missingItems.length > 0 ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Missing Cloudflare config: {missingItems.join(", ")}</p> : null}
        </div>
        <form ref={formRef} action={useLogto ? "/api/auth/register" : "/api/auth/register"} method="POST" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Selected Package
              <select name="planId" className="input-field" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Billing Cycle
              <select name="billingCycle" className="input-field" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </label>
          </div>

          {!useLogto && (
            <div className="mt-4 grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Full Name
                  <input name="fullName" className="input-field" type="text" value={localFullName} onChange={(e) => setLocalFullName(e.target.value)} autoComplete="name" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email
                  <input name="email" className="input-field" type="email" value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} autoComplete="email" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Password
                <input name="password" className="input-field" type="password" value={localPassword} onChange={(e) => setLocalPassword(e.target.value)} autoComplete="new-password" />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Country / Region
                  <input name="country" className="input-field" type="text" value={localCountry} onChange={(e) => setLocalCountry(e.target.value)} autoComplete="country-name" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Address
                  <input name="address" className="input-field" type="text" value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} autoComplete="street-address" />
                </label>
              </div>
            </div>
          )}

          <section className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/55 p-5 dark:border-white/15 dark:bg-white/10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{MEMBER_REGISTRATION_DISCLOSURE.version}</p>
            <h3 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">{MEMBER_REGISTRATION_DISCLOSURE.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{MEMBER_REGISTRATION_DISCLOSURE.summary}</p>
            <div className="mt-5 grid gap-4">
              {MEMBER_REGISTRATION_DISCLOSURE.sections.map((section) => (
                <div key={section.heading} className="rounded-2xl border border-sky-100 bg-white p-4 dark:border-white/15 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-white">{section.heading}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.body}</p>
                </div>
              ))}
            </div>
            <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken("")} className="mt-5" />
            <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
              <input className="mt-1 h-4 w-4 rounded border-sky-200 accent-blue-600" type="checkbox" checked={acceptedRegistrationTerms} onChange={(event) => setAcceptedRegistrationTerms(event.target.checked)} />
              <span>I have read and agree to the Polysmart Member Registration Disclosure and Privacy Notice.</span>
            </label>
            <input type="hidden" name="acceptedRegistrationTerms" value={acceptedRegistrationTerms ? "true" : "false"} readOnly />
            <input type="hidden" name="turnstileToken" value={turnstileToken} readOnly />
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn-primary-solid" type="submit" disabled={!acceptedRegistrationTerms || !registrationReady}>
              {useLogto ? "Continue with Logto" : "Create Local Account"}
            </button>
            <NextLink className="btn-secondary" href="/login">Already Registered</NextLink>
          </div>
          {status ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
        </form>
      </SurfaceCard>

      <SurfaceCard title="Profile Completion After Sign-up" subtitle="The member gate is intentionally staged before payment, funding, and account operations.">
        <div className="grid gap-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <p>1. Complete registration with Turnstile verification.</p>
          <p>2. Verify your email (a verification link will be sent).</p>
          <p>3. Sign in and complete the operational member profile in the console.</p>
          <p>4. Continue into Stripe payment, wallet funding, account binding, and execution controls.</p>
        </div>
      </SurfaceCard>
    </>
  );
}
