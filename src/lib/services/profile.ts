import { and, desc, eq, inArray, min, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, leagueEntries, matches, matchParticipants } from "@/lib/db/schema";
import { riotApi } from "@/lib/riot/endpoints";
import type { RiotId } from "@/lib/riot/riot-id";
import type { Platform } from "@/lib/riot/routing";
import { matchToRows } from "./match-mapper";
import { saveMatches } from "./match-store";

export const REFRESH_COOLDOWN_MS = 120_000;
export const MATCHES_PAGE_SIZE = 20;
export const MAX_MATCHES_SHOWN = 100;

export const QUEUE_FILTERS = {
  all: undefined,
  solo: 420,
  flex: 440,
} as const;
export type QueueFilter = keyof typeof QUEUE_FILTERS;

export function isQueueFilter(value: unknown): value is QueueFilter {
  return typeof value === "string" && value in QUEUE_FILTERS;
}

/** Baixa e grava as partidas que ainda não estão no banco. Retorna quantas eram novas. */
async function storeMatches(platform: Platform, matchIds: string[]): Promise<number> {
  if (!matchIds.length) return 0;
  const d = db();
  const known = await d
    .select({ matchId: matches.matchId })
    .from(matches)
    .where(inArray(matches.matchId, matchIds));
  const knownIds = new Set(known.map((m) => m.matchId));

  const api = riotApi();
  const fresh = await Promise.all(
    matchIds.filter((id) => !knownIds.has(id)).map((id) => api.getMatch(platform, id)),
  );
  await saveMatches(fresh.map((m) => matchToRows(m, platform)));
  return fresh.length;
}

type RefreshTarget = { riotId: RiotId } | { puuid: string };

/**
 * Busca o jogador na Riot e grava no banco. Partidas já salvas não são baixadas de novo,
 * então um refresh típico custa 4 chamadas + 1 por partida nova.
 */
export async function refreshProfile(platform: Platform, target: RefreshTarget) {
  const api = riotApi();
  const account =
    "riotId" in target
      ? await api.getAccountByRiotId(platform, target.riotId)
      : await api.getAccountByPuuid(platform, target.puuid);
  const { puuid } = account;

  const [summoner, leagues, matchIds] = await Promise.all([
    api.getSummonerByPuuid(platform, puuid),
    api.getLeagueEntriesByPuuid(platform, puuid),
    api.getMatchIds(platform, puuid, { count: MATCHES_PAGE_SIZE }),
  ]);

  const fallbackName = "riotId" in target ? target.riotId : { gameName: "", tagLine: "" };
  const accountRow = {
    puuid,
    gameName: account.gameName ?? fallbackName.gameName,
    tagLine: account.tagLine ?? fallbackName.tagLine,
    platform,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel,
    lastRefreshedAt: new Date(),
  };

  await db().transaction(async (tx) => {
    await tx
      .insert(accounts)
      .values(accountRow)
      .onConflictDoUpdate({ target: accounts.puuid, set: accountRow });

    // Apaga e reinsere: cobre quem não aparece mais numa fila (ex.: ficou inativo).
    await tx.delete(leagueEntries).where(eq(leagueEntries.puuid, puuid));
    if (leagues.length) {
      await tx.insert(leagueEntries).values(
        leagues.map((l) => ({
          puuid,
          queueType: l.queueType,
          tier: l.tier,
          rank: l.rank,
          leaguePoints: l.leaguePoints,
          wins: l.wins,
          losses: l.losses,
          hotStreak: l.hotStreak,
        })),
      );
    }
  });

  const newMatches = await storeMatches(platform, matchIds);
  return { puuid, newMatches };
}

/** Baixa a próxima página de partidas mais antigas que a mais antiga já salva (na fila filtrada). */
export async function loadOlderMatches(platform: Platform, puuid: string, queue: QueueFilter) {
  const queueId = QUEUE_FILTERS[queue];
  const [{ oldest }] = await db()
    .select({ oldest: min(matchParticipants.gameCreation) })
    .from(matchParticipants)
    .where(
      and(
        eq(matchParticipants.puuid, puuid),
        queueId === undefined ? undefined : eq(matchParticipants.queueId, queueId),
      ),
    );

  const ids = await riotApi().getMatchIds(platform, puuid, {
    count: MATCHES_PAGE_SIZE,
    queue: queueId,
    // endTime é em segundos e inclusivo; -1 para não repetir a mais antiga.
    endTime: oldest ? Math.floor(oldest.getTime() / 1000) - 1 : undefined,
  });
  return storeMatches(platform, ids);
}

export type Participant = typeof matchParticipants.$inferSelect;
export type ProfileMatch = {
  matchId: string;
  queueId: number;
  gameCreation: Date;
  gameDuration: number;
  me: Participant;
  participants: Participant[];
};
export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/** Lê o perfil só do banco. `null` se o jogador nunca foi buscado. */
export async function getProfile(
  platform: Platform,
  riotId: RiotId,
  { queue = "all", limit = MATCHES_PAGE_SIZE }: { queue?: QueueFilter; limit?: number } = {},
) {
  const d = db();
  const [account] = await d
    .select()
    .from(accounts)
    .where(
      and(
        sql`lower(${accounts.gameName}) = lower(${riotId.gameName})`,
        sql`lower(${accounts.tagLine}) = lower(${riotId.tagLine})`,
        eq(accounts.platform, platform),
      ),
    )
    .orderBy(desc(accounts.updatedAt))
    .limit(1);
  if (!account) return null;

  const queueId = QUEUE_FILTERS[queue];
  const [leagues, mine] = await Promise.all([
    d.select().from(leagueEntries).where(eq(leagueEntries.puuid, account.puuid)),
    d
      .select({ me: matchParticipants, gameDuration: matches.gameDuration })
      .from(matchParticipants)
      .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
      .where(
        and(
          eq(matchParticipants.puuid, account.puuid),
          queueId === undefined ? undefined : eq(matchParticipants.queueId, queueId),
        ),
      )
      .orderBy(desc(matchParticipants.gameCreation))
      .limit(Math.min(limit, MAX_MATCHES_SHOWN)),
  ]);

  const matchIds = mine.map((m) => m.me.matchId);
  const everyone = matchIds.length
    ? await d
        .select()
        .from(matchParticipants)
        .where(inArray(matchParticipants.matchId, matchIds))
        .orderBy(matchParticipants.participantId)
    : [];

  const byMatch = Map.groupBy(everyone, (p) => p.matchId);
  const profileMatches: ProfileMatch[] = mine.map(({ me, gameDuration }) => ({
    matchId: me.matchId,
    queueId: me.queueId,
    gameCreation: me.gameCreation,
    gameDuration,
    me,
    participants: byMatch.get(me.matchId) ?? [],
  }));

  return { account, leagues, matches: profileMatches };
}

export async function getLastRefreshedAt(puuid: string): Promise<Date | null> {
  const [row] = await db()
    .select({ lastRefreshedAt: accounts.lastRefreshedAt })
    .from(accounts)
    .where(eq(accounts.puuid, puuid));
  return row?.lastRefreshedAt ?? null;
}
