import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bracketTotals,
  championBans,
  championBuilds,
  championMatchups,
  championStats,
  matches,
  matchParticipants as mp,
} from "@/lib/db/schema";
import { fetchStaticData } from "@/lib/ddragon";
import { aggregateBuilds } from "./global-builds";

const REMAKE_MAX_SECONDS = 210;
const INSERT_CHUNK = 1000;

// Partidas salvas antes da coluna `runes` não têm a página completa; ela é lida do JSON bruto
// aqui em vez de num backfill (reescrever todas as linhas estoura o limite de espaço do Neon).
// Mesma ordem de `runePage()` em match-mapper.ts.
const RUNES_FROM_RAW = sql`(
  select case
    when jsonb_array_length(st.pri->'selections') = 4 and jsonb_array_length(st.sub->'selections') = 2
      and p->'perks'->'statPerks' is not null
    then array[
      (st.pri->>'style')::int,
      (st.pri->'selections'->0->>'perk')::int, (st.pri->'selections'->1->>'perk')::int,
      (st.pri->'selections'->2->>'perk')::int, (st.pri->'selections'->3->>'perk')::int,
      (st.sub->>'style')::int,
      (st.sub->'selections'->0->>'perk')::int, (st.sub->'selections'->1->>'perk')::int,
      (p->'perks'->'statPerks'->>'offense')::int, (p->'perks'->'statPerks'->>'flex')::int,
      (p->'perks'->'statPerks'->>'defense')::int
    ] end
  from jsonb_array_elements(${matches.raw}->'info'->'participants') p
  cross join lateral (
    select
      (select s from jsonb_array_elements(p->'perks'->'styles') s where s->>'description' = 'primaryStyle') as pri,
      (select s from jsonb_array_elements(p->'perks'->'styles') s where s->>'description' = 'subStyle') as sub
  ) st
  where p->>'puuid' = ${mp.puuid}
)`;

/** Patch mais recente com partidas do coletor. */
export async function latestCollectedPatch(): Promise<string | null> {
  const [row] = await db()
    .select({ patch: matches.patch })
    .from(matches)
    .where(and(eq(matches.hasTimeline, true), isNotNull(matches.tierBracket)))
    .orderBy(desc(matches.gameCreation))
    .limit(1);
  return row?.patch ?? null;
}

/**
 * Recalcula todas as estatísticas globais de um patch: apaga o que existe e reinsere,
 * numa transação (as páginas nunca veem o estado pela metade).
 * Toda partida conta no seu bracket e também no bracket "all".
 */
export async function aggregatePatch(patch: string) {
  const d = db();
  const { items } = await fetchStaticData();

  // Condição comum: partidas do coletor, do patch, sem remakes. `m` = matches.
  const base = sql`m.patch = ${patch} and m.has_timeline and m.tier_bracket is not null and m.game_duration >= ${REMAKE_MAX_SECONDS}`;
  const brackets = sql`cross join lateral (values (m.tier_bracket), ('all')) as b(bracket)`;

  // Linhas para as builds: agregadas em TS porque dependem dos dados de itens do Data Dragon.
  const buildRows = await d
    .select({
      championId: mp.championId,
      role: mp.teamPosition,
      bracket: sql<string>`${matches.tierBracket}`,
      win: mp.win,
      itemBuild: mp.itemBuild,
      skillOrder: mp.skillOrder,
      startItems: mp.startItems,
      keystoneId: mp.keystoneId,
      secondaryStyleId: mp.secondaryStyleId,
      runes: sql<number[] | null>`coalesce(${mp.runes}, ${RUNES_FROM_RAW})`,
      summoner1Id: mp.summoner1Id,
      summoner2Id: mp.summoner2Id,
    })
    .from(mp)
    .innerJoin(matches, eq(matches.matchId, mp.matchId))
    .where(
      and(
        eq(matches.patch, patch),
        eq(matches.hasTimeline, true),
        isNotNull(matches.tierBracket),
        gte(matches.gameDuration, REMAKE_MAX_SECONDS),
        sql`${mp.teamPosition} <> ''`,
      ),
    );
  const builds = aggregateBuilds(buildRows, items);

  await d.transaction(async (tx) => {
    for (const table of [bracketTotals, championStats, championBans, championBuilds, championMatchups]) {
      await tx.delete(table).where(eq(table.patch, patch));
    }

    await tx.execute(sql`
      insert into bracket_totals (patch, bracket, matches)
      select ${patch}, b.bracket, count(*)::int
      from matches m ${brackets}
      where ${base}
      group by b.bracket`);

    await tx.execute(sql`
      insert into champion_stats (patch, bracket, champion_id, role, games, wins)
      select ${patch}, b.bracket, p.champion_id, p.team_position, count(*)::int, (count(*) filter (where p.win))::int
      from match_participants p
      join matches m on m.match_id = p.match_id ${brackets}
      where ${base} and p.team_position <> ''
      group by b.bracket, p.champion_id, p.team_position`);

    await tx.execute(sql`
      insert into champion_bans (patch, bracket, champion_id, bans)
      select ${patch}, b.bracket, x.champion_id, count(*)::int
      from match_bans x
      join matches m on m.match_id = x.match_id ${brackets}
      where ${base}
      group by b.bracket, x.champion_id`);

    // Adversário direto = mesma rota, time oposto.
    await tx.execute(sql`
      insert into champion_matchups (patch, bracket, champion_id, role, opponent_id, games, wins)
      select ${patch}, b.bracket, p.champion_id, p.team_position, o.champion_id,
             count(*)::int, (count(*) filter (where p.win))::int
      from match_participants p
      join match_participants o
        on o.match_id = p.match_id and o.team_position = p.team_position and o.team_id <> p.team_id
      join matches m on m.match_id = p.match_id ${brackets}
      where ${base} and p.team_position <> ''
      group by b.bracket, p.champion_id, p.team_position, o.champion_id`);

    for (let i = 0; i < builds.length; i += INSERT_CHUNK) {
      await tx.insert(championBuilds).values(
        builds.slice(i, i + INSERT_CHUNK).map((b) => ({ patch, ...b })),
      );
    }
  });

  const totals = await d.select().from(bracketTotals).where(eq(bracketTotals.patch, patch));
  return { patch, totals, buildRows: builds.length };
}
