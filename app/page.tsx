import Link from "next/link";
import { NavBar } from "@/components/NavBar";

const cards = [
  {
    title: "T+0 Event Engine",
    text: "Adaptive 15-minute event harvesting with same-day settlement filtering across Polymarket, Kalshi, and PredictIt.",
    href: "/console"
  },
  {
    title: "Commercial Billing Hub",
    text: "Switch between managed performance sharing and 1.5% volume-based subscription charging in real time.",
    href: "/console"
  },
  {
    title: "Backoffice Settlement Center",
    text: "Track subscriptions, service-fee ledgers, account status, and payout records from one admin plane.",
    href: "/admin"
  }
];

export default function HomePage() {
  return (
    <main>
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-r from-[#0e2433] to-[#1f6feb] p-10 text-white shadow-float">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-sky-100">www.polysmart.io</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight">Commercial-Grade Managed Arbitrage for Global and Domestic Investors</h1>
          <p className="mt-5 max-w-2xl text-base text-sky-50">
            This workspace implements the Polysmart operating console and admin suite for T+0 market capture, KYC account routing, and dual-mode billing settlement.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/console"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:translate-y-[-1px]"
            >
              Open User Console
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-sky-200 px-5 py-3 text-sm font-semibold text-white"
            >
              Open Admin Center
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
