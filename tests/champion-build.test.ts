import { describe, expect, it } from "vitest";
import type { ItemInfo } from "@/lib/ddragon";
import { isCompletedItem, summarizeBuild, type BuildRow } from "@/lib/services/champion-build";

const item = (gold: number, tags: string[] = [], into?: string[]): ItemInfo => ({ name: "x", gold, tags, into });

const ITEMS: Record<number, ItemInfo> = {
  3031: item(3450), // Gume do Infinito
  3046: item(2650), // Dançarina Fantasma
  3094: item(2650), // Canhão Fumegante
  1055: item(450), // Lâmina de Doran (barato)
  1038: item(1300, [], ["3031"]), // Espada Longa B.F. (componente)
  3006: item(1100, ["Boots"]), // Grevas do Berserker
  1001: item(300, ["Boots"], ["3006"]), // Botas
  2003: item(50, ["Consumable"]), // Poção
  3340: item(0, ["Trinket"]), // Totem
};

function row(items: number[], win: boolean, extra: Partial<BuildRow> = {}): BuildRow {
  return {
    win,
    items: [...items, ...Array(6 - items.length).fill(0), 3340],
    keystoneId: 8005,
    secondaryStyleId: 8300,
    summoner1Id: 4,
    summoner2Id: 7,
    ...extra,
  };
}

describe("isCompletedItem", () => {
  it("aceita só itens finais e caros", () => {
    expect(isCompletedItem(ITEMS[3031])).toBe(true);
    expect(isCompletedItem(ITEMS[1038])).toBe(false); // evolui para outro
    expect(isCompletedItem(ITEMS[1055])).toBe(false); // barato
    expect(isCompletedItem(ITEMS[3006])).toBe(false); // bota tem slot próprio
    expect(isCompletedItem(ITEMS[2003])).toBe(false);
    expect(isCompletedItem(ITEMS[3340])).toBe(false);
    expect(isCompletedItem(undefined)).toBe(false);
  });
});

describe("summarizeBuild", () => {
  const rows = [
    row([3031, 3046, 3006, 2003], true),
    row([3031, 3094, 1001], false),
    row([3031, 3046, 3006, 1038], true, { summoner1Id: 7, summoner2Id: 4 }),
    row([3046, 1055], false, { keystoneId: 8010, secondaryStyleId: 8200 }),
  ];
  const build = summarizeBuild(rows, ITEMS);

  it("ordena itens finais por frequência e ignora componentes, consumíveis e trinket", () => {
    expect(build.games).toBe(4);
    expect(build.items).toEqual([
      { value: 3031, games: 3, wins: 2 },
      { value: 3046, games: 3, wins: 2 },
      { value: 3094, games: 1, wins: 0 },
    ]);
  });

  it("escolhe a bota evoluída mais usada", () => {
    expect(build.boots).toEqual({ value: 3006, games: 2, wins: 2 });
  });

  it("escolhe o par runa+estilo e os feitiços mais usados (ordem D/F não importa)", () => {
    expect(build.runes).toEqual({ value: { keystoneId: 8005, secondaryStyleId: 8300 }, games: 3, wins: 2 });
    expect(build.spells).toEqual({ value: [4, 7], games: 4, wins: 2 });
  });

  it("conta item repetido uma vez por partida", () => {
    const dup = summarizeBuild([row([3031, 3031], true)], ITEMS);
    expect(dup.items).toEqual([{ value: 3031, games: 1, wins: 1 }]);
  });

  it("lida com lista vazia", () => {
    expect(summarizeBuild([], ITEMS)).toEqual({ games: 0, items: [], boots: null, runes: null, spells: null });
  });
});
