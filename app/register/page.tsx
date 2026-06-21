import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { MarketScene } from "@/components/VisualAssets";
import { RegisterForm } from "@/components/auth/RegisterForm";

function safePlan(value: string | string[] | undefined) {
  const plan = Array.isArray(value) ? value[0] : value;
  if (plan === "managed-performance" || plan === "agent-pro" || plan === "institutional") {
    return plan;
  }
  return "agent-pro";
}

export default function RegisterPage({ searchParams }: { searchParams?: { plan?: string | string[] } }) {
  const initialPlan = safePlan(searchParams?.plan);

  return (
    <main className="min-h-[100dvh] bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <NavBar />
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <PageHero
          label="Member Registration"
          title="Create a member identity after choosing a plan"
          description="Plan selection comes first. Registration creates the member identity, then email verification unlocks billing, wallet funding, account binding, and console access."
          aside={<MarketScene compact eyebrow="Member onboarding" headline="A staged route into the control room" subline="Registration, verification, billing, funding, and execution now share one operating language." />}
        />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <RegisterForm initialPlan={initialPlan} />
        </div>
      </div>
    </main>
  );
}
