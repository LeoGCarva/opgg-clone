import { sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { riotIds } from "@/lib/db/schema";
import { RiotAuthError } from "@/lib/riot/client";
import { riotApi } from "@/lib/riot/endpoints";
import type { Platform } from "@/lib/riot/routing";
import { mergeLeagues, type LeaderboardEntry } from "./leaderboard";

// Ranking: as três ligas vêm da Riot (cache de 10 min). Elas não trazem o Riot ID, então os
// nomes saem do banco e, para quem falta, de account-v1 — salvos em `riot_ids` para a próxima vez.

export type Leaderboard = { entries: LeaderboardEntry[]; fetchedAt: number };

export async function getLeaderboard(platform: Platform): Promise<Leaderboard> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });

  const api = riotApi();
  // Host da plataforma (br1…): não divide o limite com as chamadas de partida do coletor.
  const lists = await Promise.all([
    api.getChallengerLeague(platform),
    api.getGrandmasterLeague(platform),
    api.getMasterLeague(platform),
  ]);
  return { entries: mergeLeagues(lists), fetchedAt: Date.now() };
}

export type PlayerName = { gameName: string; tagLine: string; profileIconId: number | null };

type NameRow = { puuid: string; game_name: string | null; tag_line: string | null; profile_icon_id: number | null };

/** Nomes já conhecidos: perfil salvo → `riot_ids` → partida mais recente. */
async function namesFromDb(puuids: string[]): Promise<Map<string, PlayerName>> {
  if (!puuids.length) return new Map();
  const ids = sql.join(
    puuids.map((p) => sql`${p}`),
    sql`, `,
  );
  const rows = await db().execute<NameRow>(sql`
    select ids.puuid,
           coalesce(a.game_name, r.game_name, mp.riot_id_game_name) as game_name,
           coalesce(a.tag_line, r.tag_line, mp.riot_id_tagline) as tag_line,
           a.profile_icon_id
    from unnest(array[${ids}]::text[]) as ids(puuid)
    left join accounts a on a.puuid = ids.puuid
    left join riot_ids r on r.puuid = ids.puuid
    left join lateral (
      select p.riot_id_game_name, p.riot_id_tagline
      from match_participants p
      where p.puuid = ids.puuid and p.riot_id_tagline is not null
      order by p.game_creation desc
      limit 1
    ) mp on true`);
  const names = new Map<string, PlayerName>();
  for (const r of rows) {
    if (r.game_name && r.tag_line) {
      names.set(r.puuid, { gameName: r.game_name, tagLine: r.tag_line, profileIconId: r.profile_icon_id });
    }
  }
  return names;
}

// Buscas em andamento: recarregar a página não repete a chamada para o mesmo puuid.
const inFlight = new Map<string, Promise<PlayerName | null>>();

function fetchName(platform: Platform, puuid: string): Promise<PlayerName | null> {
  let pending = inFlight.get(puuid);
  if (!pending) {
    pending = riotApi()
      .getAccountByPuuid(platform, puuid)
      .then(async (account) => {
        if (!account.gameName || !account.tagLine) return null;
        const row = { puuid, gameName: account.gameName, tagLine: account.tagLine, updatedAt: new Date() };
        await db().insert(riotIds).values(row).onConflictDoUpdate({ target: riotIds.puuid, set: row });
        return { gameName: account.gameName, tagLine: account.tagLine, profileIconId: null };
      })
      .finally(() => inFlight.delete(puuid));
    inFlight.set(puuid, pending);
  }
  return pending;
}

const RESOLVE_TIMEOUT_MS = 6000;

/**
 * Nomes dos jogadores de uma página do ranking. Os que não estão no banco são buscados na Riot;
 * espera no máximo ~6 s — o resto continua depois da resposta e aparece na próxima visita.
 * Chave inválida (`RiotAuthError`) é lançada; outros erros só deixam aquele jogador sem nome.
 */
export async function resolveNames(platform: Platform, puuids: string[]): Promise<Map<string, PlayerName>> {
  const names = await namesFromDb(puuids);
  const missing = puuids.filter((p) => !names.has(p));
  if (!missing.length) return names;

  let authError: RiotAuthError | undefined;
  const tasks = missing.map((puuid) =>
    fetchName(platform, puuid).then(
      (name) => {
        if (name) names.set(puuid, name);
      },
      (error) => {
        if (error instanceof RiotAuthError) authError = error;
        else console.error("[leaderboard] nome de", puuid, error);
      },
    ),
  );
  const all = Promise.all(tasks);
  const timedOut = await Promise.race([
    all.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), RESOLVE_TIMEOUT_MS)),
  ]);
  if (timedOut) after(() => all);
  if (authError) throw authError;
  // Cópia: as buscas que ainda chegarem não mudam o que já foi renderizado.
  return new Map(names);
}
