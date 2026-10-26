const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(date: Date, now: number): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "agora";
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function kdaRatio(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return "Perfeito";
  return `${((kills + assists) / deaths).toFixed(2)}:1`;
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total ? Math.round((wins / total) * 100) : 0;
}

export function winRateClass(rate: number): string {
  if (rate >= 60) return "text-amber-300";
  if (rate >= 50) return "text-sky-400";
  return "text-zinc-400";
}

const ROLE_PT: Record<string, string> = {
  TOP: "Topo",
  JUNGLE: "Selva",
  MIDDLE: "Meio",
  BOTTOM: "Atirador",
  UTILITY: "Suporte",
};

export function roleLabel(role: string | null): string {
  return (role && ROLE_PT[role]) || "—";
}

const TIER_PT: Record<string, string> = {
  IRON: "Ferro",
  BRONZE: "Bronze",
  SILVER: "Prata",
  GOLD: "Ouro",
  PLATINUM: "Platina",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Mestre",
  GRANDMASTER: "Grão-Mestre",
  CHALLENGER: "Desafiante",
};

export function tierLabel(tier: string, rank: string): string {
  const name = TIER_PT[tier] ?? tier;
  // Mestre+ não tem divisão.
  return ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier) ? name : `${name} ${rank}`;
}
