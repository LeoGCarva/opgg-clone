import { describe, expect, it } from "vitest";
import type { ItemInfo } from "@/lib/ddragon";
import { aggregateBuilds, buildKeys, skillMaxOrder, type GlobalBuildRow } from "@/lib/services/global-builds";
import { assignTiers } from "@/lib/services/tiers";

const item = (gold: number, tags: string[] = [], into?: string[]): ItemInfo => ({ name: "x", gold, tags, into });
const ITEMS: Record<number, ItemInfo> = {
  1055: item(450),
  2003: item(50, ["Consumable"]),
  1001: item(300, ["Boots"], ["3006"]),
  3006: item(1100, ["Boots"]),
  1036: item(350, [], ["3031"]),
  3031: item(3450),
  3046: item(2650),
  3094: item(2650),
  3072: item(3400),
  3036: item(3000),
  3340: item(0, ["Trinket"]),
};

function row(extra: Partial<GlobalBuildRow> = {}): GlobalBuildRow {
  return {
    championId: 236,
    role: "BOTTOM",
    bracket: "diamond",
    win: true,
    itemBuild: [1055, 2003, 1001, 1036, 3031, 3006, 3046, 3031, 3094, 3072],
    // Q E Q W Q R Q E Q E R E E W W R W W
    skillOrder: [1, 3, 1, 2, 1, 4, 1, 3, 1, 3, 4, 3, 3, 2, 2, 4, 2, 2],
    startItems: [3340, 2003, 1055], // o totem deve ser ignorado
    keystoneId: 8005,
    secondaryStyleId: 8300,
    runes: [8000, 8005, 9111, 9104, 8014, 8300, 8304, 8345, 5005, 5008, 5011],
    summoner1Id: 7,
    summoner2Id: 4,
    ...extra,
  };
}

describe("skillMaxOrder", () => {
  it("ordena pela vez em que cada skill chegou ao nível 5", () => {
    expect(skillMaxOrder(row().skillOrder!)).toEqual([1, 3, 2]);
  });

  it("devolve null para partidas curtas", () => {
    expect(skillMaxOrder([1, 2, 3])).toBeNull();
  });
});

describe("buildKeys", () => {
  it("extrai cada tipo de escolha", () => {
    expect(buildKeys(row(), ITEMS)).toEqual([
      { kind: "start", key: "1055-2003" },
      { kind: "boots", key: "3006" },
      { kind: "core", key: "3031-3046-3094" }, // 3031 repetido conta uma vez
      { kind: "item4", key: "3072" },
      { kind: "runes", key: "8000-8005-9111-9104-8014-8300-8304-8345-5005-5008-5011" },
      { kind: "spells", key: "4-7" },
      { kind: "skills", key: "1-3-2" },
      { kind: "skill_path", key: "1-3-1-2-1-4-1-3-1-3-4-3-3-2-2" },
    ]);
  });

  it("pula o core quando não há 3 itens completos", () => {
    const keys = buildKeys(row({ itemBuild: [1055, 3031] }), ITEMS);
    expect(keys.find((k) => k.kind === "core")).toBeUndefined();
  });

  it("conta 4º, 5º e 6º itens separadamente", () => {
    const keys = buildKeys(row({ itemBuild: [3031, 3046, 3094, 3072, 3006, 3036] }), ITEMS);
    expect(keys.filter((k) => k.kind.startsWith("item"))).toEqual([
      { kind: "item4", key: "3072" },
      { kind: "item5", key: "3036" },
    ]);
  });

  it("pula as runas sem página completa", () => {
    expect(buildKeys(row({ runes: null }), ITEMS).find((k) => k.kind === "runes")).toBeUndefined();
  });
});

describe("aggregateBuilds", () => {
  it("conta no bracket da partida e em 'all'", () => {
    const agg = aggregateBuilds([row(), row({ win: false, bracket: "emerald" })], ITEMS);
    const runes = agg.filter((a) => a.kind === "runes");
    expect(runes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bracket: "diamond", games: 1, wins: 1 }),
        expect.objectContaining({ bracket: "emerald", games: 1, wins: 0 }),
        expect.objectContaining({ bracket: "all", games: 2, wins: 1 }),
      ]),
    );
  });
});

describe("assignTiers", () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    championId: i + 1,
    role: "MIDDLE",
    games: 100,
    wins: 40 + i * 2, // 40%..58%
    bans: i,
  }));

  it("calcula taxas e dá S+ ao melhor e C ao pior da rota", () => {
    const tiers = assignTiers([...entries, { championId: 99, role: "MIDDLE", games: 2, wins: 2, bans: 0 }], 1000);
    expect(tiers).toHaveLength(10); // o de 2 jogos fica abaixo do mínimo
    expect(tiers[0]).toMatchObject({ championId: 10, tier: "S+", winRate: 0.58, pickRate: 0.1, banRate: 0.009 });
    expect(tiers.at(-1)).toMatchObject({ championId: 1, tier: "C" });
  });

  it("ordena por tier antes do score quando mistura rotas", () => {
    const tiers = assignTiers(
      [
        ...entries,
        // Rota com um único campeão fraco: vira S+ da própria rota, com score baixo.
        { championId: 50, role: "TOP", games: 100, wins: 30, bans: 0 },
      ],
      1000,
    );
    const order = tiers.map((t) => t.tier);
    expect(order).toEqual([...order].sort((a, b) => ["S+", "S", "A", "B", "C"].indexOf(a) - ["S+", "S", "A", "B", "C"].indexOf(b)));
    expect(tiers.find((t) => t.championId === 50)!.tier).toBe("S+");
  });

  it("encolhe win rates de amostras pequenas", () => {
    const [few, many] = assignTiers(
      [
        { championId: 1, role: "TOP", games: 5, wins: 5, bans: 0 },
        { championId: 2, role: "TOP", games: 200, wins: 120, bans: 0 },
      ],
      400,
    ).sort((a, b) => a.championId - b.championId);
    expect(few.winRate).toBe(1);
    expect(many.score).toBeGreaterThan(few.score);
  });
});
