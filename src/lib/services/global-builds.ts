import type { ItemInfo } from "@/lib/ddragon";
import { isCompletedItem, isUpgradedBoots } from "./champion-build";

export type GlobalBuildRow = {
  championId: number;
  role: string;
  bracket: string;
  win: boolean;
  itemBuild: number[] | null;
  skillOrder: number[] | null;
  startItems: number[] | null;
  keystoneId: number | null;
  secondaryStyleId: number | null;
  summoner1Id: number;
  summoner2Id: number;
};

export type BuildKind = "start" | "boots" | "core" | "runes" | "spells" | "skills" | "skill_path";

const CORE_SIZE = 3;
const SKILL_PATH_LEVELS = 15;

/** Ordem em que Q/W/E chegam ao nível máximo (5), ex. [1, 3, 2] = Q > E > W. */
export function skillMaxOrder(skillOrder: number[]): number[] | null {
  if (skillOrder.length < 9) return null; // partida curta demais para dizer
  const points = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  const maxedAt = new Map<number, number>();
  skillOrder.forEach((slot, i) => {
    if (!(slot in points)) return; // ultimate
    points[slot]++;
    if (points[slot] === 5) maxedAt.set(slot, i);
  });
  // Quem não maximizou fica depois, ordenado por pontos.
  return [1, 2, 3].sort(
    (a, b) =>
      (maxedAt.get(a) ?? Infinity) - (maxedAt.get(b) ?? Infinity) || points[b] - points[a] || a - b,
  );
}

/** Chaves (uma por tipo) que essa partida contribui para as estatísticas de build. */
export function buildKeys(row: GlobalBuildRow, items: Record<number, ItemInfo>): { kind: BuildKind; key: string }[] {
  const keys: { kind: BuildKind; key: string }[] = [];
  const build = row.itemBuild ?? [];

  // O totem é gratuito e todo mundo "compra"; contar ele só fragmenta as combinações.
  const start = (row.startItems ?? []).filter((id) => !items[id]?.tags.includes("Trinket"));
  if (start.length) {
    keys.push({ kind: "start", key: start.sort((a, b) => a - b).join("-") });
  }

  const boots = build.find((id) => isUpgradedBoots(items[id]));
  if (boots) keys.push({ kind: "boots", key: String(boots) });

  const core = [...new Set(build.filter((id) => isCompletedItem(items[id])))].slice(0, CORE_SIZE);
  if (core.length === CORE_SIZE) keys.push({ kind: "core", key: core.join("-") });

  if (row.keystoneId && row.secondaryStyleId) {
    keys.push({ kind: "runes", key: `${row.keystoneId}-${row.secondaryStyleId}` });
  }

  keys.push({ kind: "spells", key: [row.summoner1Id, row.summoner2Id].sort((a, b) => a - b).join("-") });

  if (row.skillOrder) {
    const maxOrder = skillMaxOrder(row.skillOrder);
    if (maxOrder) keys.push({ kind: "skills", key: maxOrder.join("-") });
    if (row.skillOrder.length >= SKILL_PATH_LEVELS) {
      keys.push({ kind: "skill_path", key: row.skillOrder.slice(0, SKILL_PATH_LEVELS).join("-") });
    }
  }
  return keys;
}

export type AggregatedBuild = {
  bracket: string;
  championId: number;
  role: string;
  kind: BuildKind;
  key: string;
  games: number;
  wins: number;
};

/** Conta cada chave por (bracket, campeão, rota). Toda linha conta também no bracket "all". */
export function aggregateBuilds(rows: GlobalBuildRow[], items: Record<number, ItemInfo>): AggregatedBuild[] {
  const counts = new Map<string, AggregatedBuild>();
  for (const row of rows) {
    for (const { kind, key } of buildKeys(row, items)) {
      for (const bracket of [row.bracket, "all"]) {
        const id = `${bracket}|${row.championId}|${row.role}|${kind}|${key}`;
        let c = counts.get(id);
        if (!c) {
          c = { bracket, championId: row.championId, role: row.role, kind, key, games: 0, wins: 0 };
          counts.set(id, c);
        }
        c.games++;
        if (row.win) c.wins++;
      }
    }
  }
  return [...counts.values()];
}
