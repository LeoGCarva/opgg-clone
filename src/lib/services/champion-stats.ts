import { and, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, matchParticipants as mp } from "@/lib/db/schema";
import type { ItemInfo } from "@/lib/ddragon";
import { summarizeBuild, type ChampionBuild } from "./champion-build";
import { QUEUE_FILTERS, type QueueFilter } from "./profile";

// Arena tem regras próprias (duplas, sem rotas/CS); misturar distorce as médias.
// Filtra pelo modo ("CHERRY" = Arena) e não por fila: a Riot cria filas novas de Arena
// com frequência (1700, 1740, 1750...).
const notArena = sql`${matches.raw}->'info'->>'gameMode' <> 'CHERRY'`;
const REMAKE_MAX_SECONDS = 210;

function playerFilter(puuids: string[], queue: QueueFilter): SQL | undefined {
  const queueId = QUEUE_FILTERS[queue];
  return and(
    inArray(mp.puuid, puuids),
    gte(matches.gameDuration, REMAKE_MAX_SECONDS),
    queueId === undefined ? notArena : eq(mp.queueId, queueId),
  );
}

export type PlayerChampionStats = Awaited<ReturnType<typeof getPlayerChampionStats>>[number];

/** Uma linha por campeão que o jogador jogou, do mais jogado para o menos. */
export async function getPlayerChampionStats(puuids: string[], { queue = "all" }: { queue?: QueueFilter } = {}) {
  const games = sql<number>`count(*)::int`;
  return db()
    .select({
      championId: mp.championId,
      games,
      wins: sql<number>`(count(*) filter (where ${mp.win}))::int`,
      kills: sql<number>`avg(${mp.kills})::float`,
      deaths: sql<number>`avg(${mp.deaths})::float`,
      assists: sql<number>`avg(${mp.assists})::float`,
      cs: sql<number>`avg(${mp.cs})::float`,
      csPerMin: sql<number>`(sum(${mp.cs}) * 60.0 / sum(${matches.gameDuration}))::float`,
      damage: sql<number>`avg(${mp.damageToChampions})::float`,
      gold: sql<number>`avg(${mp.goldEarned})::float`,
      role: sql<string>`mode() within group (order by ${mp.teamPosition})`,
    })
    .from(mp)
    .innerJoin(matches, eq(matches.matchId, mp.matchId))
    .where(playerFilter(puuids, queue))
    .groupBy(mp.championId)
    .orderBy(desc(games), desc(sql`count(*) filter (where ${mp.win})`));
}

/** Build mais usada pelo jogador em cada campeão (itens finais, bota, runas, feitiços). */
export async function getPlayerChampionBuilds(
  puuids: string[],
  itemInfo: Record<number, ItemInfo>,
  { queue = "all" }: { queue?: QueueFilter } = {},
): Promise<Map<number, ChampionBuild>> {
  const rows = await db()
    .select({
      championId: mp.championId,
      win: mp.win,
      items: mp.items,
      keystoneId: mp.keystoneId,
      secondaryStyleId: mp.secondaryStyleId,
      summoner1Id: mp.summoner1Id,
      summoner2Id: mp.summoner2Id,
    })
    .from(mp)
    .innerJoin(matches, eq(matches.matchId, mp.matchId))
    .where(playerFilter(puuids, queue));

  const byChampion = Map.groupBy(rows, (r) => r.championId);
  return new Map(
    [...byChampion].map(([championId, champRows]) => [championId, summarizeBuild(champRows, itemInfo)]),
  );
}
