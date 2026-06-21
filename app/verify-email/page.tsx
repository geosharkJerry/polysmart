import NextLink from "next/link";
import { NavBar } from "@/components/NavBar";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-[100dvh] bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <NavBar />
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <section className="rounded-3xl border border-sky-100 bg-[linear-gradient(90deg,#0e2433,#1f6feb)] p-8 text-white shadow-[0_20px_40px_-20px_rgba(18,52,86,0.4)] md:p-10">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-sky-100">Email Verification</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">Email verification now runs inside Logto</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-50 md:text-base">
            Polysmart no longer uses local verification links. Create or sign in with Logto, complete Turnstile, and then finish the member profile inside the console.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-[0_24px_70px_rgba(14,36,51,0.08)] backdrop-blur dark:border-white/15 dark:bg-slate-950/72 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Legacy Verification Disabled</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Use the secure Logto identity flow</h2>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
            This page is kept as a safe landing surface for old links. It no longer verifies local member tokens. After the Logto callback succeeds, Polysmart opens the member console and asks for profile completion there.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <NextLink className="btn-primary-solid" href="/register">Start Logto Registration</NextLink>
            <NextLink className="btn-secondary" href="/login">Go to Logto Login</NextLink>
          </div>
        </section>
      </div>
    </main>
  );
}
