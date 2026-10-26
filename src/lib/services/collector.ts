import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crawlPlayers, matches } from "@/lib/db/schema";
import { riotApi } from "@/lib/riot/endpoints";
import type { Platform } from "@/lib/riot/routing";
import type { MatchDto } from "@/lib/riot/types";
import { matchToRows, patchOf } from "./match-mapper";
import { saveMatches } from "./match-store";

// Brackets de elo usados nas estatísticas. Cada um é semeado a partir de uma ou mais ligas.
export const BRACKETS = {
  master_plus: "Mestre+",
  diamond: "Diamante",
  emerald: "Esmeralda",
} as const;
export type Bracket = keyof typeof BRACKETS;

const SOLO_QUEUE = 420;
const RECRAWL_AFTER_MS = 6 * 3600_000;
const LOOKBACK_DAYS = 7;
const MATCHES_PER_PLAYER = 20;

/** Preenche a fila do coletor com jogadores das ligas de cada bracket. */
export async function seedPlayers(platform: Platform) {
  const api = riotApi();
  const [challenger, grandmaster, master] = await Promise.all([
    api.getChallengerLeague(platform),
    api.getGrandmasterLeague(platform),
    api.getMasterLeague(platform),
  ]);
  const diamond = await Promise.all(["I", "II", "III", "IV"].map((div) => api.getLeagueEntries(platform, "DIAMOND", div)));
  const emerald = await Promise.all(["I", "II"].map((div) => api.getLeagueEntries(platform, "EMERALD", div)));

  const seeds: { puuid: string; bracket: Bracket }[] = [
    ...[challenger, grandmaster, master].flatMap((l) => l.entries.map((e) => ({ puuid: e.puuid, bracket: "master_plus" as const }))),
    ...diamond.flat().map((e) => ({ puuid: e.puuid, bracket: "diamond" as const })),
    ...emerald.flat().map((e) => ({ puuid: e.puuid, bracket: "emerald" as const })),
  ];

  const d = db();
  for (let i = 0; i < seeds.length; i += 1000) {
    await d
      .insert(crawlPlayers)
      .values(seeds.slice(i, i + 1000).map((s) => ({ ...s, platform })))
      // Se o jogador mudou de elo, atualiza o bracket mas mantém o agendamento.
      .onConflictDoUpdate({ target: crawlPlayers.puuid, set: { bracket: sql`excluded.bracket` } });
  }
  return Object.fromEntries(
    Object.keys(BRACKETS).map((b) => [b, seeds.filter((s) => s.bracket === b).length]),
  ) as Record<Bracket, number>;
}

export async function countPlayers(platform: Platform): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(crawlPlayers)
    .where(eq(crawlPlayers.platform, platform));
  return row.n;
}

export type CrawlResult = {
  bracket: string;
  saved: number; // partidas do patch atual gravadas com timeline
  otherPatch: number; // partidas de patch antigo (gravadas sem timeline)
  failed: number;
};

/**
 * Processa o próximo jogador do bracket: baixa as partidas ranqueadas recentes dele que ainda
 * não temos (ou que temos sem timeline) e reagenda. `null` = ninguém pronto nesse bracket.
 * O chamador alterna os brackets — Mestre+ tem muito mais jogadores e dominaria a fila.
 */
export async function crawlNext(
  platform: Platform,
  bracket: Bracket,
  currentPatch: string,
): Promise<CrawlResult | null> {
  const d = db();
  const [player] = await d
    .select()
    .from(crawlPlayers)
    .where(
      and(
        eq(crawlPlayers.platform, platform),
        eq(crawlPlayers.bracket, bracket),
        lte(crawlPlayers.nextCrawlAt, new Date()),
      ),
    )
    .orderBy(asc(crawlPlayers.nextCrawlAt))
    .limit(1);
  if (!player) return null;

  // Reagenda já, para que um erro no meio não prenda o coletor no mesmo jogador.
  const now = new Date();
  await d
    .update(crawlPlayers)
    .set({ lastCrawledAt: now, nextCrawlAt: new Date(now.getTime() + RECRAWL_AFTER_MS) })
    .where(eq(crawlPlayers.puuid, player.puuid));

  const api = riotApi();
  const ids = await api.getMatchIds(platform, player.puuid, {
    queue: SOLO_QUEUE,
    count: MATCHES_PER_PLAYER,
    startTime: Math.floor(now.getTime() / 1000) - LOOKBACK_DAYS * 86400,
  });

  const existing = ids.length
    ? await d
        .select({ matchId: matches.matchId, hasTimeline: matches.hasTimeline, raw: matches.raw })
        .from(matches)
        .where(inArray(matches.matchId, ids))
    : [];
  const existingById = new Map(existing.map((m) => [m.matchId, m]));
  const todo = ids.filter((id) => !existingById.get(id)?.hasTimeline);

  const result: CrawlResult = { bracket: player.bracket, saved: 0, otherPatch: 0, failed: 0 };
  const rows = (
    await Promise.all(
      todo.map(async (id) => {
        try {
          // Partida salva pelo perfil (sem timeline): reaproveita o JSON e só busca a timeline.
          const match: MatchDto = existingById.get(id)?.raw ?? (await api.getMatch(platform, id));
          if (patchOf(match.info.gameVersion) !== currentPatch) {
            result.otherPatch++;
            // Já existe sem timeline? Nada a fazer. Senão guarda (útil para perfis), sem timeline.
            return existingById.has(id) ? null : matchToRows(match, platform);
          }
          const timeline = await api.getMatchTimeline(platform, id);
          result.saved++;
          return matchToRows(match, platform, { timeline, tierBracket: player.bracket });
        } catch (err) {
          result.failed++;
          console.error(`  erro em ${id}:`, err instanceof Error ? err.message : err);
          return null;
        }
      }),
    )
  ).filter((r) => r !== null);

  await saveMatches(rows, { replace: true });
  return result;
}
