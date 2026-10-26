import { and, desc, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import {
  bracketTotals,
  championBans,
  championBuilds,
  championMatchups,
  championStats,
} from "@/lib/db/schema";
import type { BuildKind } from "./global-builds";
import { assignTiers, minGamesFor, type TierEntry } from "./tiers";

// Leituras das tabelas do agregador. O cache é curto porque o agregador roda em outro
// processo (não tem como avisar o Next) — os dados aparecem em até ~1 min.

export const GLOBAL_BRACKETS = {
  all: "Todos (Esmeralda+)",
  master_plus: "Mestre+",
  diamond: "Diamante",
  emerald: "Esmeralda",
} as const;
export type GlobalBracket = keyof typeof GLOBAL_BRACKETS;

export function isGlobalBracket(value: unknown): value is GlobalBracket {
  return typeof value === "string" && value in GLOBAL_BRACKETS;
}

export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

async function latestTotals(bracket: GlobalBracket) {
  const [row] = await db()
    .select()
    .from(bracketTotals)
    .where(eq(bracketTotals.bracket, bracket))
    .orderBy(desc(bracketTotals.updatedAt))
    .limit(1);
  return row ?? null;
}

async function tierEntries(patch: string, bracket: GlobalBracket, totalMatches: number) {
  const d = db();
  const [stats, bans] = await Promise.all([
    d.select().from(championStats).where(and(eq(championStats.patch, patch), eq(championStats.bracket, bracket))),
    d.select().from(championBans).where(and(eq(championBans.patch, patch), eq(championBans.bracket, bracket))),
  ]);
  const bansByChampion = new Map(bans.map((b) => [b.championId, b.bans]));
  return assignTiers(
    stats.map((s) => ({ ...s, bans: bansByChampion.get(s.championId) ?? 0 })),
    totalMatches,
  );
}

export type TierList = {
  patch: string;
  totalMatches: number;
  minGames: number;
  entries: TierEntry[];
};

export async function getTierList(bracket: GlobalBracket): Promise<TierList | null> {
  "use cache";
  cacheLife("minutes");

  const totals = await latestTotals(bracket);
  if (!totals) return null;
  return {
    patch: totals.patch,
    totalMatches: totals.matches,
    minGames: minGamesFor(totals.matches),
    entries: await tierEntries(totals.patch, bracket, totals.matches),
  };
}

export type BuildOption = { key: string; games: number; wins: number };

export type ChampionDetails = {
  patch: string;
  totalMatches: number;
  role: Role;
  roles: { role: Role; games: number }[];
  summary: TierEntry | null; // null se abaixo do mínimo de partidas
  games: number;
  wins: number;
  builds: Record<BuildKind, BuildOption[]>;
  matchups: { opponentId: number; games: number; wins: number }[];
};

const BUILD_OPTIONS_SHOWN = 3;
const MIN_MATCHUP_GAMES = 3;

export async function getChampionDetails(
  championId: number,
  bracket: GlobalBracket,
  requestedRole?: Role,
): Promise<ChampionDetails | null> {
  "use cache";
  cacheLife("minutes");

  const totals = await latestTotals(bracket);
  if (!totals) return null;
  const { patch } = totals;
  const d = db();

  const roleRows = await d
    .select({ role: championStats.role, games: championStats.games, wins: championStats.wins })
    .from(championStats)
    .where(
      and(eq(championStats.patch, patch), eq(championStats.bracket, bracket), eq(championStats.championId, championId)),
    )
    .orderBy(desc(championStats.games));
  const roles = roleRows.filter((r) => isRole(r.role)) as { role: Role; games: number; wins: number }[];
  if (!roles.length) return null;

  const current = roles.find((r) => r.role === requestedRole) ?? roles[0];
  const role = current.role;

  const [buildRows, matchupRows, tiers] = await Promise.all([
    d
      .select()
      .from(championBuilds)
      .where(
        and(
          eq(championBuilds.patch, patch),
          eq(championBuilds.bracket, bracket),
          eq(championBuilds.championId, championId),
          eq(championBuilds.role, role),
        ),
      )
      .orderBy(desc(championBuilds.games), desc(championBuilds.wins)),
    d
      .select()
      .from(championMatchups)
      .where(
        and(
          eq(championMatchups.patch, patch),
          eq(championMatchups.bracket, bracket),
          eq(championMatchups.championId, championId),
          eq(championMatchups.role, role),
        ),
      ),
    tierEntries(patch, bracket, totals.matches),
  ]);

  const builds = {} as Record<BuildKind, BuildOption[]>;
  for (const kind of ["start", "boots", "core", "runes", "spells", "skills", "skill_path"] as BuildKind[]) {
    builds[kind] = buildRows
      .filter((b) => b.kind === kind)
      .slice(0, BUILD_OPTIONS_SHOWN)
      .map(({ key, games, wins }) => ({ key, games, wins }));
  }

  return {
    patch,
    totalMatches: totals.matches,
    role,
    roles: roles.map(({ role, games }) => ({ role, games })),
    summary: tiers.find((t) => t.championId === championId && t.role === role) ?? null,
    games: current.games,
    wins: current.wins,
    builds,
    matchups: matchupRows
      .filter((m) => m.games >= MIN_MATCHUP_GAMES)
      .map(({ opponentId, games, wins }) => ({ opponentId, games, wins })),
  };
}
