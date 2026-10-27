import type { Tier } from "@/lib/services/tiers";

// Cores dos tiers do guia de estilo; o texto do selo é sempre ink.
const COLORS: Record<Tier, string> = {
  "S+": "bg-tier-splus",
  S: "bg-tier-s",
  A: "bg-tier-a",
  B: "bg-tier-b",
  C: "bg-tier-c",
};

const SIZES = {
  // Tabela: 48 × 36.
  md: "h-9 w-12 text-[17px] [font-stretch:112%]",
  // Faixas da visualização "Por tier".
  lg: "h-full min-h-24 w-full text-[40px] [font-stretch:125%]",
};

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-display font-black text-ink ${SIZES[size]} ${COLORS[tier]}`}
    >
      {tier}
    </span>
  );
}
