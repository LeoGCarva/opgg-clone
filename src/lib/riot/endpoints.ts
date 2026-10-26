import { getRiotClient, type RiotClient } from "./client";
import type { RiotId } from "./riot-id";
import { accountRegionOf, regionOf, type Platform } from "./routing";
import type {
  AccountDto,
  LeagueEntryDto,
  LeagueEntryListItemDto,
  LeagueListDto,
  MatchDto,
  MatchIdsQuery,
  QueueType,
  SummonerDto,
  TimelineDto,
} from "./types";

const enc = encodeURIComponent;

export function createRiotApi(client: RiotClient) {
  return {
    getAccountByRiotId(platform: Platform, { gameName, tagLine }: RiotId) {
      return client.get<AccountDto>(
        accountRegionOf(platform),
        `/riot/account/v1/accounts/by-riot-id/${enc(gameName)}/${enc(tagLine)}`,
      );
    },

    getAccountByPuuid(platform: Platform, puuid: string) {
      return client.get<AccountDto>(
        accountRegionOf(platform),
        `/riot/account/v1/accounts/by-puuid/${enc(puuid)}`,
      );
    },

    getSummonerByPuuid(platform: Platform, puuid: string) {
      return client.get<SummonerDto>(
        platform,
        `/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`,
      );
    },

    getLeagueEntriesByPuuid(platform: Platform, puuid: string) {
      return client.get<LeagueEntryDto[]>(
        platform,
        `/lol/league/v4/entries/by-puuid/${enc(puuid)}`,
      );
    },

    getChallengerLeague(platform: Platform, queue: QueueType = "RANKED_SOLO_5x5") {
      return client.get<LeagueListDto>(
        platform,
        `/lol/league/v4/challengerleagues/by-queue/${enc(queue)}`,
      );
    },

    getGrandmasterLeague(platform: Platform, queue: QueueType = "RANKED_SOLO_5x5") {
      return client.get<LeagueListDto>(
        platform,
        `/lol/league/v4/grandmasterleagues/by-queue/${enc(queue)}`,
      );
    },

    getMasterLeague(platform: Platform, queue: QueueType = "RANKED_SOLO_5x5") {
      return client.get<LeagueListDto>(
        platform,
        `/lol/league/v4/masterleagues/by-queue/${enc(queue)}`,
      );
    },

    /** Elos abaixo de Mestre, paginado (~205 jogadores por página). */
    getLeagueEntries(platform: Platform, tier: string, division: string, page = 1, queue: QueueType = "RANKED_SOLO_5x5") {
      return client.get<LeagueEntryListItemDto[]>(
        platform,
        `/lol/league/v4/entries/${enc(queue)}/${enc(tier)}/${enc(division)}`,
        { page },
      );
    },

    getMatchIds(platform: Platform, puuid: string, query: MatchIdsQuery = {}) {
      return client.get<string[]>(
        regionOf(platform),
        `/lol/match/v5/matches/by-puuid/${enc(puuid)}/ids`,
        query,
      );
    },

    getMatch(platform: Platform, matchId: string) {
      return client.get<MatchDto>(
        regionOf(platform),
        `/lol/match/v5/matches/${enc(matchId)}`,
      );
    },

    getMatchTimeline(platform: Platform, matchId: string) {
      return client.get<TimelineDto>(
        regionOf(platform),
        `/lol/match/v5/matches/${enc(matchId)}/timeline`,
      );
    },
  };
}

export type RiotApi = ReturnType<typeof createRiotApi>;

export function riotApi(): RiotApi {
  return createRiotApi(getRiotClient());
}
