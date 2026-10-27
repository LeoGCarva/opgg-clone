import { describe, expect, it } from "vitest";
import { filterTierEntries, parseTierFilter, tierFilterParam } from "@/lib/services/tier-filters";
import type { Tier, TierEntry } from "@/lib/services/tiers";

function entry(championId: number, role: string, tier: Tier, extra: Partial<TierEntry> = {}): TierEntry {
  return { championId, role, tier, games: 100, wins: 50, bans: 0, winRate: 0.5, pickRate: 0.05, banRate: 0, score: 0.5, ...extra };
}

const NAMES: Record<number, string[]> = {
  145: ["Kai'Sa", "kaisa"],
  62: ["Wukong", "monkeyking"],
  136: ["Aurelion Sol", "aurelionsol"],
  103: ["Ahri", "ahri"],
};
const names = (id: number) => NAMES[id] ?? [];

// Na ordem que getTierList devolve (tier, depois score).
const ENTRIES = [
  entry(145, "BOTTOM", "S+", { winRate: 0.51, pickRate: 0.2, banRate: 0.1, games: 900, score: 0.7 }),
  entry(62, "TOP", "S", { winRate: 0.53, pickRate: 0.05, banRate: 0.02, games: 300, score: 0.6 }),
  entry(62, "JUNGLE", "A", { winRate: 0.53, pickRate: 0.08, banRate: 0.02, games: 450, score: 0.58 }),
  entry(136, "MIDDLE", "B", { winRate: 0.49, pickRate: 0.03, banRate: 0.3, games: 150, score: 0.5 }),
  entry(103, "MIDDLE", "C", { winRate: 0.47, pickRate: 0.1, banRate: 0.05, games: 500, score: 0.45 }),
];
const ids = (list: TierEntry[]) => list.map((e) => `${e.championId}-${e.role}`);

describe("parseTierFilter", () => {
  it("aceita a lista separada por vírgula, na ordem dos tiers", () => {
    expect(parseTierFilter("a, s+,c")).toEqual(["S+", "A", "C"]);
  });
  it("ignora valores inválidos e parâmetros ausentes", () => {
    expect(parseTierFilter("X,S++,")).toEqual([]);
    expect(parseTierFilter(undefined)).toEqual([]);
    expect(parseTierFilter(["S"])).toEqual([]);
  });
  it("tierFilterParam é o inverso; lista vazia some da URL", () => {
    expect(tierFilterParam(["S+", "B"])).toBe("S+,B");
    expect(tierFilterParam([])).toBeUndefined();
  });
});

describe("filterTierEntries", () => {
  it("sem filtros, devolve tudo na ordem original", () => {
    expect(filterTierEntries(ENTRIES, {}, names)).toEqual(ENTRIES);
  });

  it("busca sem acento, espaço ou pontuação, pelo nome ou pelo id", () => {
    expect(ids(filterTierEntries(ENTRIES, { query: "kais" }, names))).toEqual(["145-BOTTOM"]);
    expect(ids(filterTierEntries(ENTRIES, { query: "AURELION s" }, names))).toEqual(["136-MIDDLE"]);
    expect(ids(filterTierEntries(ENTRIES, { query: "monkey" }, names))).toEqual(["62-TOP", "62-JUNGLE"]);
    expect(filterTierEntries(ENTRIES, { query: "zzz" }, names)).toEqual([]);
  });

  it("combina rota e tiers", () => {
    expect(ids(filterTierEntries(ENTRIES, { tiers: ["S", "A"] }, names))).toEqual(["62-TOP", "62-JUNGLE"]);
    expect(ids(filterTierEntries(ENTRIES, { role: "MIDDLE", tiers: ["C"] }, names))).toEqual(["103-MIDDLE"]);
  });

  it("ordena do maior para o menor; empate pelo score", () => {
    expect(ids(filterTierEntries(ENTRIES, { sort: "vitoria" }, names))).toEqual([
      "62-TOP",
      "62-JUNGLE",
      "145-BOTTOM",
      "136-MIDDLE",
      "103-MIDDLE",
    ]);
    expect(ids(filterTierEntries(ENTRIES, { sort: "escolha" }, names))[0]).toBe("145-BOTTOM");
    expect(ids(filterTierEntries(ENTRIES, { sort: "banimento" }, names))[0]).toBe("136-MIDDLE");
    expect(ids(filterTierEntries(ENTRIES, { sort: "partidas", role: "MIDDLE" }, names))).toEqual([
      "103-MIDDLE",
      "136-MIDDLE",
    ]);
  });

  it("não altera a lista recebida", () => {
    const copy = [...ENTRIES];
    filterTierEntries(ENTRIES, { sort: "partidas" }, names);
    expect(ENTRIES).toEqual(copy);
  });
});
