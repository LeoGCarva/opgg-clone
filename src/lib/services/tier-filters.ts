import { nameKey } from "@/lib/ddragon";
import type { Tier, TierEntry } from "./tiers";

// Filtros da tier list (busca, rota, tier, ordenação), aplicados em memória sobre getTierList().

export const TIERS: readonly Tier[] = ["S+", "S", "A", "B", "C"];

export const TIER_SORTS = {
  tier: "Tier",
  vitoria: "Vitória",
  escolha: "Escolha",
  banimento: "Banimento",
  partidas: "Partidas",
} as const;
export type TierSort = keyof typeof TIER_SORTS;

export function isTierSort(value: unknown): value is TierSort {
  return typeof value === "string" && value in TIER_SORTS;
}

/** "S+,A" → ["S+", "A"] na ordem dos tiers; valores desconhecidos são ignorados. */
export function parseTierFilter(param: unknown): Tier[] {
  if (typeof param !== "string") return [];
  const wanted = new Set(param.split(",").map((t) => t.trim().toUpperCase()));
  return TIERS.filter((t) => wanted.has(t));
}

/** Inverso de parseTierFilter; lista vazia = sem filtro. */
export const tierFilterParam = (tiers: readonly Tier[]) => (tiers.length ? tiers.join(",") : undefined);

const SORT_VALUE: Record<Exclude<TierSort, "tier">, (e: TierEntry) => number> = {
  vitoria: (e) => e.winRate,
  escolha: (e) => e.pickRate,
  banimento: (e) => e.banRate,
  partidas: (e) => e.games,
};

export type TierFilters = {
  role?: string;
  query?: string;
  tiers?: readonly Tier[];
  sort?: TierSort;
};

/**
 * Filtra e ordena as entradas. `names` devolve os textos pesquisáveis de um campeão (nome e id
 * do Data Dragon); a busca ignora acento, espaço e pontuação. `tier` mantém a ordem recebida.
 */
export function filterTierEntries(
  entries: readonly TierEntry[],
  { role, query, tiers = [], sort = "tier" }: TierFilters,
  names: (championId: number) => string[],
): TierEntry[] {
  const q = query ? nameKey(query) : "";
  const result = entries.filter(
    (e) =>
      (!role || e.role === role) &&
      (!tiers.length || tiers.includes(e.tier)) &&
      (!q || names(e.championId).some((n) => nameKey(n).includes(q))),
  );
  if (sort === "tier") return result;
  const value = SORT_VALUE[sort];
  return result.sort((a, b) => value(b) - value(a) || b.score - a.score);
}
