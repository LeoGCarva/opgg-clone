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

// O "dia" da partida é o de Brasília, não o do servidor (que pode estar em UTC).
const TIME_ZONE = "America/Sao_Paulo";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }); // AAAA-MM-DD
const dayMonth = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
const fullDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Partida de hoje: "há 2 horas". De outro dia: "28/10" (com ano se não for o atual). */
export function matchTime(date: Date, now: number): string {
  const day = dayKey.format(date);
  const today = dayKey.format(now);
  if (day === today) return timeAgo(date, now);
  return day.slice(0, 4) === today.slice(0, 4) ? dayMonth.format(date) : fullDate.format(date);
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

/** Resumo de um jogador na busca: "Desafiante · 3575 PDL", "Nível 123" ou null. */
export function playerDetail(p: {
  tier: string | null;
  rank: string | null;
  leaguePoints: number | null;
  summonerLevel: number | null;
}): string | null {
  if (p.tier) return `${tierLabel(p.tier, p.rank ?? "")} · ${p.leaguePoints} PDL`;
  return p.summonerLevel ? `Nível ${p.summonerLevel}` : null;
}
