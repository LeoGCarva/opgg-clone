import type { LeagueListDto } from "@/lib/riot/types";

// Ranking da região (Desafiante, Grão-Mestre e Mestre da Solo/Duo): funções puras.

export const APEX_TIERS = ["CHALLENGER", "GRANDMASTER", "MASTER"] as const;
export type ApexTier = (typeof APEX_TIERS)[number];

/** Slug da URL (`?tier=desafiante`) → tier da Riot. */
export const LEADERBOARD_TIERS = {
  desafiante: "CHALLENGER",
  "grao-mestre": "GRANDMASTER",
  mestre: "MASTER",
} as const satisfies Record<string, ApexTier>;
export type LeaderboardTierSlug = keyof typeof LEADERBOARD_TIERS;

export function isLeaderboardTier(value: unknown): value is LeaderboardTierSlug {
  return typeof value === "string" && value in LEADERBOARD_TIERS;
}

export type LeaderboardEntry = {
  position: number; // no ranking geral da região (não muda com o filtro de tier)
  puuid: string;
  tier: ApexTier;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number; // 0-1
};

const tierOrder = (tier: string) => {
  const i = APEX_TIERS.indexOf(tier as ApexTier);
  return i === -1 ? APEX_TIERS.length : i;
};

/** Junta as três ligas: tier (Desafiante primeiro), PDL, depois win rate e mais jogos. */
export function mergeLeagues(lists: LeagueListDto[]): LeaderboardEntry[] {
  return lists
    .filter((l) => tierOrder(l.tier) < APEX_TIERS.length)
    .flatMap((l) =>
      l.entries.map((e) => {
        const games = e.wins + e.losses;
        return {
          puuid: e.puuid,
          tier: l.tier as ApexTier,
          leaguePoints: e.leaguePoints,
          wins: e.wins,
          losses: e.losses,
          winRate: games ? e.wins / games : 0,
        };
      }),
    )
    .sort(
      (a, b) =>
        tierOrder(a.tier) - tierOrder(b.tier) ||
        b.leaguePoints - a.leaguePoints ||
        b.winRate - a.winRate ||
        b.wins + b.losses - (a.wins + a.losses),
    )
    .map((e, i) => ({ position: i + 1, ...e }));
}

export type Page<T> = { items: T[]; page: number; pages: number };

/** Página `page` (1-based); fora do intervalo vira a primeira/última. */
export function paginate<T>(items: readonly T[], page: number, perPage = 100): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(pages, Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1));
  return { items: items.slice((current - 1) * perPage, current * perPage), page: current, pages };
}
