"use client";

import { Card, Metric, Text } from "@tremor/react";
import { ReactNode } from "react";

export function TremorMetricCard({
  label,
  value,
  detail,
  tone = "sky"
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "slate";
}) {
  const accentMap: Record<string, string> = {
    sky: "border-t-4 border-t-cyan-500",
    emerald: "border-t-4 border-t-emerald-500",
    amber: "border-t-4 border-t-amber-500",
    rose: "border-t-4 border-t-rose-500",
    slate: "border-t-4 border-t-slate-500"
  };

  return (
    <Card className={`${accentMap[tone]} dark:bg-slate-950/72`} decoration="top" decorationColor={tone === "sky" ? "cyan" : tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : tone === "rose" ? "rose" : "slate"}>
      <Text>{label}</Text>
      <Metric className="mt-2">{value}</Metric>
      {detail ? <Text className="mt-1 text-xs text-slate-500">{detail}</Text> : null}
    </Card>
  );
}
