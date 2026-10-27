import type { matchBans, matches, matchParticipants } from "@/lib/db/schema";
import type { Platform } from "@/lib/riot/routing";
import type { MatchDto, ParticipantDto, TimelineDto } from "@/lib/riot/types";
import { timelineToBuilds } from "./timeline-mapper";

export type MatchRow = typeof matches.$inferInsert;
export type ParticipantRow = typeof matchParticipants.$inferInsert;
export type BanRow = typeof matchBans.$inferInsert;

/** "16.21.829.8620" → "16.21" */
export function patchOf(gameVersion: string): string {
  return gameVersion.split(".").slice(0, 2).join(".");
}

// Metade do JSON de cada partida, e o site não usa nenhum dos dois. Guardar sem eles mantém
// o banco dentro do limite do plano gratuito do Neon.
export const DROPPED_PARTICIPANT_FIELDS = ["challenges", "missions"];

/** Cópia da partida sem os campos pesados de cada participante. */
export function slimMatch(dto: MatchDto): MatchDto {
  return {
    ...dto,
    info: {
      ...dto.info,
      participants: dto.info.participants.map(
        (p) =>
          Object.fromEntries(
            Object.entries(p).filter(([key]) => !DROPPED_PARTICIPANT_FIELDS.includes(key)),
          ) as ParticipantDto,
      ),
    },
  };
}

/** [primária, 4 runas, secundária, 2 runas, fragmentos]; null se a página vier incompleta. */
export function runePage(perks: ParticipantDto["perks"] | undefined): number[] | null {
  const primary = perks?.styles.find((s) => s.description === "primaryStyle");
  const secondary = perks?.styles.find((s) => s.description === "subStyle");
  const shards = perks?.statPerks;
  if (!primary || primary.selections.length !== 4 || !secondary || secondary.selections.length !== 2 || !shards) {
    return null;
  }
  return [
    primary.style,
    ...primary.selections.map((s) => s.perk),
    secondary.style,
    ...secondary.selections.map((s) => s.perk),
    shards.offense,
    shards.flex,
    shards.defense,
  ];
}

export function matchToRows(
  dto: MatchDto,
  platform: Platform,
  extra: { timeline?: TimelineDto; tierBracket?: string } = {},
): { match: MatchRow; participants: ParticipantRow[]; bans: BanRow[] } {
  const { info, metadata } = dto;
  const gameCreation = new Date(info.gameCreation);
  const builds = extra.timeline ? timelineToBuilds(extra.timeline) : undefined;

  const match: MatchRow = {
    matchId: metadata.matchId,
    platform,
    queueId: info.queueId,
    gameVersion: info.gameVersion,
    patch: patchOf(info.gameVersion),
    gameCreation,
    gameDuration: info.gameDuration,
    raw: slimMatch(dto),
    tierBracket: extra.tierBracket ?? null,
    hasTimeline: !!builds,
  };

  const bans = info.teams.flatMap((team) =>
    team.bans
      // championId -1 = time não baniu nessa vez.
      .filter((b) => b.championId > 0)
      .map((b): BanRow => ({
        matchId: metadata.matchId,
        teamId: team.teamId,
        pickTurn: b.pickTurn,
        championId: b.championId,
      })),
  );

  const participants = info.participants.map((p): ParticipantRow => {
    const primary = p.perks?.styles.find((s) => s.description === "primaryStyle");
    const secondary = p.perks?.styles.find((s) => s.description === "subStyle");
    const build = builds?.get(p.puuid);
    return {
      matchId: metadata.matchId,
      puuid: p.puuid,
      participantId: p.participantId,
      teamId: p.teamId,
      riotIdGameName: p.riotIdGameName || null,
      riotIdTagline: p.riotIdTagline || null,
      championId: p.championId,
      championName: p.championName,
      champLevel: p.champLevel,
      teamPosition: p.teamPosition ?? "",
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      goldEarned: p.goldEarned,
      damageToChampions: p.totalDamageDealtToChampions,
      visionScore: p.visionScore,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id,
      keystoneId: primary?.selections[0]?.perk ?? null,
      secondaryStyleId: secondary?.style ?? null,
      runes: runePage(p.perks),
      itemBuild: build?.itemBuild ?? null,
      skillOrder: build?.skillOrder ?? null,
      startItems: build?.startItems ?? null,
      queueId: info.queueId,
      gameCreation,
    };
  });

  return { match, participants, bans };
}
