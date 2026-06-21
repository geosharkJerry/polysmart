import { StatusBadge } from "@/components/StatusBadge";
import { GlyphBadge, compactGlyphForSection } from "@/components/VisualAssets";
import { SecretBindingStatus } from "@/lib/types";

export function toneForSecretStatus(status: "configured" | "placeholder" | "missing") {
  if (status === "configured") return "success" as const;
  if (status === "placeholder") return "warning" as const;
  return "danger" as const;
}

export function SecretStatusCard({ secret }: { secret: SecretBindingStatus }) {
  const glyph = secret.status === "configured"
    ? compactGlyphForSection(`secret configured ${secret.key}`)
    : secret.status === "placeholder"
      ? compactGlyphForSection(`secret placeholder ${secret.key}`)
      : compactGlyphForSection(`secret missing ${secret.key}`);

  return (
    <section className="rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-sm dark:border-white/15 dark:bg-slate-950/70">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <GlyphBadge kind={glyph.kind} tone={glyph.tone} size={18} />
          <p className="truncate font-semibold text-slate-900 dark:text-white">{secret.key}</p>
        </div>
        <StatusBadge label={secret.status} tone={toneForSecretStatus(secret.status)} />
      </div>
      <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">{secret.preview ?? "missing"}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{secret.message}</p>
    </section>
  );
}
