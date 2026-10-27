import { describe, expect, it } from "vitest";
import { buildNameIndex, nameKey } from "@/lib/ddragon";
import { championStats, sortChampionStats, tournamentSummary } from "@/lib/esports/tournament-stats";
import { game } from "./esports-fixtures";

describe("estatísticas do torneio", () => {
  const games = [
    game("Ahri", "Zed", 1, ["Vi"], 1500),
    game("Zed", "Ahri", 1, ["Vi", "Ahri"], 2100),
    game("Zed", "Lux", 2, [], 1800),
  ];

  it("conta escolhas, bans, vitórias, presença e KDA por campeão", () => {
    const byChampion = Object.fromEntries(championStats(games).map((e) => [e.champion, e]));
    expect(byChampion.Ahri).toMatchObject({ picks: 2, bans: 1, wins: 1, presence: 1, winRate: 0.5 });
    expect(byChampion.Zed).toMatchObject({ picks: 3, bans: 0, wins: 1 });
    expect(byChampion.Vi).toMatchObject({ picks: 0, bans: 2, winRate: 0 });
    expect(byChampion.Vi.presence).toBeCloseTo(2 / 3);
  });

  it("ordena e manda campeões nunca escolhidos para o fim no WR", () => {
    const list = championStats(games);
    expect(sortChampionStats(list, "presenca")[0].champion).toBe("Ahri");
    expect(sortChampionStats(list, "escolhas")[0].champion).toBe("Zed");
    expect(sortChampionStats(list, "vitorias").at(-1)?.champion).toBe("Vi");
  });

  it("resume jogos, duração média e WR do lado azul", () => {
    expect(tournamentSummary(games)).toEqual({
      games: 3,
      avgDurationSec: 1800,
      blueWinRate: 2 / 3,
      championsPicked: 3,
      championsBanned: 2,
    });
    expect(tournamentSummary([]).games).toBe(0);
  });
});

describe("nomes em inglês → ids do Data Dragon", () => {
  it("normaliza apóstrofo, espaço, pontuação e acento", () => {
    expect(nameKey("Kai'Sa")).toBe("kaisa");
    expect(nameKey("Nunu & Willump")).toBe("nunuwillump");
    expect(nameKey("Legend: Haste")).toBe("legendhaste");
    expect(nameKey("Mercury's Treads")).toBe(nameKey("mercurys treads"));
  });

  it("prefere a versão de Summoner's Rift e depois o menor id", () => {
    const index = buildNameIndex({
      champions: [{ id: 145, name: "Kai'Sa", preferred: true }],
      items: [
        { id: 223814, name: "Edge of Night", preferred: false },
        { id: 3814, name: "Edge of Night", preferred: true },
        { id: 3042, name: "Muramana", preferred: true },
        { id: 3004, name: "Muramana", preferred: true },
      ],
      spells: [
        { id: 2202, name: "Flash", preferred: false },
        { id: 4, name: "Flash", preferred: true },
      ],
      runes: [{ id: 8005, name: "Press the Attack", preferred: true }],
    });
    expect(index.champions[nameKey("Kai'Sa")]).toBe(145);
    expect(index.items[nameKey("Edge of Night")]).toBe(3814);
    expect(index.items[nameKey("Muramana")]).toBe(3004);
    expect(index.spells.flash).toBe(4);
    expect(index.runes.presstheattack).toBe(8005);
  });
});
