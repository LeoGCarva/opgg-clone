// Apenas os campos que usamos. A resposta real tem muito mais coisa,
// e o JSON completo da partida é guardado em matches.raw.

export type AccountDto = {
  puuid: string;
  gameName?: string;
  tagLine?: string;
};

export type SummonerDto = {
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type QueueType = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR" | (string & {});

export type LeagueEntryDto = {
  leagueId?: string;
  puuid: string;
  queueType: QueueType;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
};

export type LeagueListDto = {
  leagueId: string;
  tier: string;
  queue: QueueType;
  entries: {
    puuid: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }[];
};

/** Entrada de /entries/{queue}/{tier}/{division} (elos abaixo de Mestre). */
export type LeagueEntryListItemDto = Omit<LeagueEntryDto, "queueType"> & { queueType: QueueType };

// Timeline: eventos minuto a minuto. Há dezenas de tipos; só os campos que usamos estão aqui.
//   ITEM_PURCHASED / ITEM_SOLD: itemId · ITEM_UNDO: beforeId (item desfeito)
//   SKILL_LEVEL_UP: skillSlot (1-4 = Q/W/E/R), levelUpType ("NORMAL" | "EVOLVE")
export type TimelineEventDto = {
  type: string;
  timestamp: number;
  participantId?: number;
  itemId?: number;
  beforeId?: number;
  afterId?: number;
  skillSlot?: number;
  levelUpType?: string;
};

export type TimelineDto = {
  metadata: { matchId: string; participants: string[] };
  info: {
    frameInterval: number;
    participants: { participantId: number; puuid: string }[];
    frames: { timestamp: number; events: TimelineEventDto[] }[];
  };
};

export type MatchIdsQuery = {
  start?: number;
  count?: number;
  queue?: number;
  type?: "ranked" | "normal" | "tourney" | "tutorial";
  startTime?: number;
  endTime?: number;
};

export type PerkStyleDto = {
  description: "primaryStyle" | "subStyle";
  style: number;
  selections: { perk: number; var1: number; var2: number; var3: number }[];
};

export type ParticipantDto = {
  puuid: string;
  participantId: number;
  teamId: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamPosition: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks: { styles: PerkStyleDto[]; statPerks?: { offense: number; flex: number; defense: number } };
};

export type MatchDto = {
  metadata: { matchId: string; participants: string[] };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameVersion: string;
    queueId: number;
    platformId: string;
    participants: ParticipantDto[];
    teams: {
      teamId: number;
      win: boolean;
      bans: { championId: number; pickTurn: number }[];
    }[];
  };
};
