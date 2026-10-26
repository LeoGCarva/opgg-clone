import type { ItemInfo } from "@/lib/ddragon";

export type BuildRow = {
  win: boolean;
  items: number[]; // inventário final: 6 slots + trinket no índice 6
  keystoneId: number | null;
  secondaryStyleId: number | null;
  summoner1Id: number;
  summoner2Id: number;
};

export type Choice<T> = { value: T; games: number; wins: number };

export type ChampionBuild = {
  games: number;
  items: Choice<number>[]; // até 6 itens finais mais frequentes
  boots: Choice<number> | null;
  runes: Choice<{ keystoneId: number; secondaryStyleId: number }> | null;
  spells: Choice<[number, number]> | null;
};

const MIN_COMPLETED_ITEM_GOLD = 2000;
const MIN_BOOTS_GOLD = 900; // descarta a bota básica (300)

export function isCompletedItem(info: ItemInfo | undefined): boolean {
  if (!info) return false;
  if (info.tags.some((t) => t === "Consumable" || t === "Trinket" || t === "Boots")) return false;
  return !info.into?.length && info.gold >= MIN_COMPLETED_ITEM_GOLD;
}

export function isUpgradedBoots(info: ItemInfo | undefined): boolean {
  return !!info && info.tags.includes("Boots") && info.gold >= MIN_BOOTS_GOLD;
}

/** Conta ocorrências por chave e devolve do mais frequente para o menos (empate: mais vitórias). */
function rank<T>(entries: { key: string; value: T; win: boolean }[]): Choice<T>[] {
  const counts = new Map<string, Choice<T>>();
  for (const { key, value, win } of entries) {
    const c = counts.get(key) ?? { value, games: 0, wins: 0 };
    c.games++;
    if (win) c.wins++;
    counts.set(key, c);
  }
  return [...counts.entries()]
    .sort(([ka, a], [kb, b]) => b.games - a.games || b.wins - a.wins || ka.localeCompare(kb))
    .map(([, pick]) => pick);
}

/**
 * Resume como um jogador costuma montar um campeão a partir das partidas dele.
 * Só temos o inventário final (sem ordem de compra — isso vem da timeline na Fase B),
 * então "build" aqui = itens finais mais frequentes.
 */
export function summarizeBuild(rows: BuildRow[], itemInfo: Record<number, ItemInfo>): ChampionBuild {
  const items = rank(
    rows.flatMap((r) =>
      // Set: o mesmo item duas vezes no inventário conta uma vez por partida.
      [...new Set(r.items.slice(0, 6))]
        .filter((id) => isCompletedItem(itemInfo[id]))
        .map((id) => ({ key: String(id), value: id, win: r.win })),
    ),
  ).slice(0, 6);

  const boots = rank(
    rows.flatMap((r) => {
      const id = r.items.slice(0, 6).find((i) => isUpgradedBoots(itemInfo[i]));
      return id ? [{ key: String(id), value: id, win: r.win }] : [];
    }),
  )[0] ?? null;

  const runes = rank(
    rows.flatMap((r) =>
      r.keystoneId && r.secondaryStyleId
        ? [{
            key: `${r.keystoneId}/${r.secondaryStyleId}`,
            value: { keystoneId: r.keystoneId, secondaryStyleId: r.secondaryStyleId },
            win: r.win,
          }]
        : [],
    ),
  )[0] ?? null;

  const spells = rank(
    rows.map((r) => {
      // Flash na D ou na F é a mesma escolha.
      const pair = [r.summoner1Id, r.summoner2Id].sort((a, b) => a - b) as [number, number];
      return { key: pair.join("/"), value: pair, win: r.win };
    }),
  )[0] ?? null;

  return { games: rows.length, items, boots, runes, spells };
}
