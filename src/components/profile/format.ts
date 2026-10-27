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

// Escala do guia: 60%+ laranja, 55%+ azul, 50%+ verde, abaixo vermelho.
export function winRateClass(rate: number): string {
  if (rate >= 60) return "text-stat-orange";
  if (rate >= 55) return "text-stat-blue";
  if (rate >= 50) return "text-win";
  return "text-loss";
}

// Escala do guia: 5+ laranja, 4+ azul, 3+ turquesa, abaixo cinza. Sem mortes conta como 5+.
export function kdaClass(kills: number, deaths: number, assists: number): string {
  const ratio = deaths === 0 ? Infinity : (kills + assists) / deaths;
  if (ratio >= 5) return "text-stat-orange";
  if (ratio >= 4) return "text-stat-blue";
  if (ratio >= 3) return "text-stat-teal";
  return "text-muted";
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
