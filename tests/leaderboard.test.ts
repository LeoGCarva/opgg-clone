import { describe, expect, it } from "vitest";
import type { LeagueListDto } from "@/lib/riot/types";
import { isLeaderboardTier, mergeLeagues, paginate } from "@/lib/services/leaderboard";

function league(tier: string, entries: [string, number, number, number][]): LeagueListDto {
  return {
    leagueId: tier,
    tier,
    queue: "RANKED_SOLO_5x5",
    entries: entries.map(([puuid, leaguePoints, wins, losses]) => ({ puuid, rank: "I", leaguePoints, wins, losses })),
  };
}

describe("mergeLeagues", () => {
  const merged = mergeLeagues([
    // Fora de ordem de propósito.
    league("MASTER", [["m3", 900, 30, 20], ["m1", 900, 60, 40], ["m2", 900, 35, 15]]),
    league("CHALLENGER", [["c1", 1200, 100, 80], ["c2", 1500, 90, 70]]),
    league("GRANDMASTER", [["g1", 1300, 50, 50]]),
  ]);

  it("ordena por tier e depois PDL; Grão-Mestre com mais PDL fica abaixo do Desafiante", () => {
    expect(merged.map((e) => e.puuid).slice(0, 4)).toEqual(["c2", "c1", "g1", "m2"]);
  });

  it("empate de PDL: maior win rate, depois mais jogos", () => {
    // m2 = 70%; m1 e m3 = 60%, m1 com mais jogos.
    expect(merged.slice(3).map((e) => e.puuid)).toEqual(["m2", "m1", "m3"]);
    expect(merged.find((e) => e.puuid === "m2")!.position).toBe(4);
  });

  it("posição geral, tier e win rate", () => {
    expect(merged.map((e) => e.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(merged[0]).toMatchObject({ tier: "CHALLENGER", leaguePoints: 1500, winRate: 90 / 160 });
  });

  it("ignora ligas que não são Mestre+ e jogador sem jogos tem WR 0", () => {
    const list = mergeLeagues([league("DIAMOND", [["d1", 99, 1, 1]]), league("MASTER", [["m0", 0, 0, 0]])]);
    expect(list).toEqual([{ position: 1, puuid: "m0", tier: "MASTER", leaguePoints: 0, wins: 0, losses: 0, winRate: 0 }]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 250 }, (_, i) => i);

  it("fatia por página", () => {
    expect(paginate(items, 2)).toMatchObject({ page: 2, pages: 3 });
    expect(paginate(items, 2).items[0]).toBe(100);
    expect(paginate(items, 3).items).toHaveLength(50);
  });

  it("página fora do intervalo ou inválida", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, Number.NaN).page).toBe(1);
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pages: 1 });
  });
});

describe("isLeaderboardTier", () => {
  it("aceita só os slugs conhecidos", () => {
    expect(isLeaderboardTier("grao-mestre")).toBe(true);
    expect(isLeaderboardTier("GRANDMASTER")).toBe(false);
    expect(isLeaderboardTier(undefined)).toBe(false);
  });
});
