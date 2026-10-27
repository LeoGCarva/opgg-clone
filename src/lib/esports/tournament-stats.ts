import type { Game } from "./parse";

// Estatísticas do torneio por campeão, a partir dos jogos com scoreboard.

export type ChampionTournamentStats = {
  champion: string; // nome em inglês
  picks: number;
  bans: number;
  wins: number;
  presence: number; // (picks + bans) / jogos, 0–1
  winRate: number; // 0–1 (0 se nunca foi escolhido)
  kills: number;
  deaths: number;
  assists: number;
};

export type TournamentSummary = {
  games: number;
  avgDurationSec: number;
  blueWinRate: number;
  championsPicked: number;
  championsBanned: number; // campeões diferentes banidos
};

export function championStats(games: Game[]): ChampionTournamentStats[] {
  const map = new Map<string, ChampionTournamentStats>();
  const entry = (champion: string) => {
    let e = map.get(champion);
    if (!e) {
      e = { champion, picks: 0, bans: 0, wins: 0, presence: 0, winRate: 0, kills: 0, deaths: 0, assists: 0 };
      map.set(champion, e);
    }
    return e;
  };

  for (const game of games) {
    for (const ban of [...game.blue.bans, ...game.red.bans]) entry(ban).bans++;
    for (const p of game.players) {
      const e = entry(p.champion);
      e.picks++;
      if (p.win) e.wins++;
      e.kills += p.kills;
      e.deaths += p.deaths;
      e.assists += p.assists;
    }
  }

  const total = games.length;
  return [...map.values()].map((e) => ({
    ...e,
    presence: total ? (e.picks + e.bans) / total : 0,
    winRate: e.picks ? e.wins / e.picks : 0,
  }));
}

export function tournamentSummary(games: Game[]): TournamentSummary {
  const picked = new Set(games.flatMap((g) => g.players.map((p) => p.champion)));
  const banned = new Set(games.flatMap((g) => [...g.blue.bans, ...g.red.bans]));
  const n = games.length;
  return {
    games: n,
    avgDurationSec: n ? Math.round(games.reduce((sum, g) => sum + g.durationSec, 0) / n) : 0,
    blueWinRate: n ? games.filter((g) => g.winner === 1).length / n : 0,
    championsPicked: picked.size,
    championsBanned: banned.size,
  };
}

export const CHAMPION_SORTS = {
  presenca: "Presença",
  escolhas: "Escolhas",
  bans: "Banimentos",
  vitorias: "Vitórias",
  kda: "KDA",
} as const;
export type ChampionSort = keyof typeof CHAMPION_SORTS;

export function isChampionSort(value: unknown): value is ChampionSort {
  return typeof value === "string" && value in CHAMPION_SORTS;
}

export const championKda = (e: ChampionTournamentStats) => (e.kills + e.assists) / Math.max(1, e.deaths);

export function sortChampionStats(list: ChampionTournamentStats[], sort: ChampionSort) {
  const key: Record<ChampionSort, (e: ChampionTournamentStats) => number> = {
    presenca: (e) => e.presence,
    escolhas: (e) => e.picks,
    bans: (e) => e.bans,
    vitorias: (e) => (e.picks ? e.winRate : -1), // nunca escolhidos vão para o fim
    kda: (e) => (e.picks ? championKda(e) : -1),
  };
  return [...list].sort(
    (a, b) => key[sort](b) - key[sort](a) || b.picks + b.bans - (a.picks + a.bans) || a.champion.localeCompare(b.champion),
  );
}
