import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Platform } from "@/lib/riot/routing";

// A Riot só encontra Riot IDs exatos; o autocomplete usa os nomes que já temos no banco:
// contas buscadas no site e os 10 jogadores de cada partida salva (perfil + coletor).

const MIN_NAME_LENGTH = 2;

export type SearchInput = {
  name: string; // nome em minúsculas, sem escape (para comparar igualdade)
  namePattern: string; // padrão LIKE do nome
  tagPattern?: string; // padrão LIKE da tag, quando o usuário digitou "#"
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * "yuk" → nome começando com "yuk". "Yukarina#3" → nome exato "yukarina" e tag começando com "3".
 * `null` se não há o suficiente para buscar.
 */
export function parseSearchInput(input: string): SearchInput | null {
  const hash = input.indexOf("#");
  const name = (hash === -1 ? input : input.slice(0, hash)).trim().toLowerCase();
  if (name.length < MIN_NAME_LENGTH) return null;

  if (hash === -1) return { name, namePattern: `${escapeLike(name)}%` };
  const tag = input.slice(hash + 1).trim().toLowerCase();
  return { name, namePattern: escapeLike(name), tagPattern: `${escapeLike(tag)}%` };
}

export type PlayerSuggestion = {
  gameName: string;
  tagLine: string;
  hasProfile: boolean;
  profileIconId: number | null;
  summonerLevel: number | null;
  tier: string | null;
  rank: string | null;
  leaguePoints: number | null;
};

type Row = {
  game_name: string;
  tag_line: string;
  has_profile: boolean;
  profile_icon_id: number | null;
  summoner_level: number | null;
  tier: string | null;
  rank: string | null;
  league_points: number | null;
};

export async function searchPlayers(platform: Platform, query: string, limit = 8): Promise<PlayerSuggestion[]> {
  const input = parseSearchInput(query);
  if (!input) return [];

  const accountTag = input.tagPattern ? sql`and lower(a.tag_line) like ${input.tagPattern}` : sql``;
  const participantTag = input.tagPattern ? sql`and lower(p.riot_id_tagline) like ${input.tagPattern}` : sql``;

  const rows = await db().execute<Row>(sql`
    with candidates as (
      select a.puuid, a.game_name, a.tag_line, a.profile_icon_id, a.summoner_level,
             true as has_profile, a.updated_at as seen_at
      from accounts a
      where a.platform = ${platform} and lower(a.game_name) like ${input.namePattern} ${accountTag}
      union all
      select p.puuid, p.riot_id_game_name, p.riot_id_tagline, null, null,
             false, p.game_creation
      from match_participants p
      join matches m on m.match_id = p.match_id
      where m.platform = ${platform}
        and lower(p.riot_id_game_name) like ${input.namePattern}
        and p.riot_id_tagline is not null ${participantTag}
    ),
    -- Um por jogador: a conta salva (nome atualizado) ganha; senão o nome da partida mais recente.
    latest as (
      select distinct on (puuid) *
      from candidates
      order by puuid, has_profile desc, seen_at desc
    )
    select l.game_name, l.tag_line, l.has_profile, l.profile_icon_id, l.summoner_level,
           le.tier, le.rank, le.league_points
    from latest l
    left join league_entries le on le.puuid = l.puuid and le.queue_type = 'RANKED_SOLO_5x5'
    order by l.has_profile desc, (lower(l.game_name) = ${input.name}) desc,
             length(l.game_name), lower(l.game_name), l.tag_line
    limit ${limit}`);

  return rows.map((r) => ({
    gameName: r.game_name,
    tagLine: r.tag_line,
    hasProfile: r.has_profile,
    profileIconId: r.profile_icon_id,
    summonerLevel: r.summoner_level,
    tier: r.tier,
    rank: r.rank,
    leaguePoints: r.league_points,
  }));
}
