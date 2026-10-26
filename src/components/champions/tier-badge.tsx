import type { Tier } from "@/lib/services/tiers";

const COLORS: Record<Tier, string> = {
  "S+": "bg-amber-400 text-zinc-950",
  S: "bg-amber-600 text-zinc-950",
  A: "bg-sky-600 text-white",
  B: "bg-emerald-700 text-white",
  C: "bg-zinc-700 text-zinc-200",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-flex w-8 justify-center rounded px-1 py-0.5 text-xs font-bold ${COLORS[tier]}`}>
      {tier}
    </span>
  );
}
