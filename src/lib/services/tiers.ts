export type TierInput = { championId: number; role: string; games: number; wins: number; bans: number };

export type Tier = "S+" | "S" | "A" | "B" | "C";

export type TierEntry = TierInput & {
  winRate: number; // 0-1, cru
  pickRate: number; // fração das partidas em que o campeão foi jogado nessa rota
  banRate: number;
  score: number;
  tier: Tier;
};

// Win rate "encolhido" para 50% com o peso de PRIOR_GAMES partidas: evita que um campeão
// com 3 jogos e 100% de vitórias apareça como S+.
const PRIOR_GAMES = 20;
const PICK_RATE_WEIGHT = 0.5;

// Percentis acumulados dentro da rota: top 10% = S+, próximos 15% = S, etc.
const TIER_CUTS: [number, Tier][] = [
  [0.1, "S+"],
  [0.25, "S"],
  [0.5, "A"],
  [0.75, "B"],
  [1, "C"],
];

export function minGamesFor(totalMatches: number): number {
  return Math.max(5, Math.round(totalMatches * 0.005));
}

/**
 * Calcula WR/PR/BR e distribui tiers por percentil de score dentro de cada rota.
 * Campeões abaixo do mínimo de partidas ficam de fora.
 */
export function assignTiers(entries: TierInput[], totalMatches: number): TierEntry[] {
  if (!totalMatches) return [];
  const minGames = minGamesFor(totalMatches);

  const scored = entries
    .filter((e) => e.games >= minGames)
    .map((e) => {
      const adjustedWinRate = (e.wins + PRIOR_GAMES / 2) / (e.games + PRIOR_GAMES);
      const pickRate = e.games / totalMatches;
      return {
        ...e,
        winRate: e.wins / e.games,
        pickRate,
        banRate: e.bans / totalMatches,
        score: adjustedWinRate + PICK_RATE_WEIGHT * pickRate,
        tier: "C" as Tier,
      };
    });

  for (const roleEntries of Map.groupBy(scored, (e) => e.role).values()) {
    roleEntries.sort((a, b) => b.score - a.score);
    roleEntries.forEach((e, i) => {
      // Fração de campeões à frente deste: o melhor de cada rota começa em 0 (S+).
      const ahead = i / roleEntries.length;
      e.tier = TIER_CUTS.find(([cut]) => ahead < cut)![1];
    });
  }

  // Tier primeiro: os tiers são por rota, então só o score misturaria S+ de uma rota abaixo de S de outra.
  const tierOrder = TIER_CUTS.map(([, t]) => t);
  return scored.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) || b.score - a.score);
}
