import { describe, expect, it } from "vitest";
import { matchToRows, patchOf } from "@/lib/services/match-mapper";
import type { MatchDto, ParticipantDto } from "@/lib/riot/types";

function participant(overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    puuid: "p1",
    participantId: 1,
    teamId: 100,
    riotIdGameName: "Yukarina",
    riotIdTagline: "333",
    championId: 236,
    championName: "Lucian",
    champLevel: 16,
    teamPosition: "BOTTOM",
    win: true,
    kills: 19,
    deaths: 4,
    assists: 11,
    totalMinionsKilled: 200,
    neutralMinionsKilled: 12,
    goldEarned: 15000,
    totalDamageDealtToChampions: 40000,
    visionScore: 20,
    item0: 1, item1: 2, item2: 3, item3: 0, item4: 5, item5: 6, item6: 3340,
    summoner1Id: 4,
    summoner2Id: 7,
    perks: {
      styles: [
        { description: "primaryStyle", style: 8000, selections: [{ perk: 8005, var1: 0, var2: 0, var3: 0 }] },
        { description: "subStyle", style: 8300, selections: [] },
      ],
    },
    ...overrides,
  };
}

const dto: MatchDto = {
  metadata: { matchId: "BR1_1", participants: ["p1", "p2"] },
  info: {
    gameCreation: 1_700_000_000_000,
    gameDuration: 1680,
    gameVersion: "16.21.829.8620",
    queueId: 420,
    platformId: "BR1",
    participants: [participant(), participant({ puuid: "p2", participantId: 6, teamId: 200, win: false, riotIdGameName: "" })],
    teams: [],
  },
};

describe("matchToRows", () => {
  const { match, participants } = matchToRows(dto, "br1");

  it("monta a linha da partida com o patch curto", () => {
    expect(match).toMatchObject({
      matchId: "BR1_1",
      platform: "br1",
      queueId: 420,
      patch: "16.21",
      gameDuration: 1680,
      gameCreation: new Date(1_700_000_000_000),
    });
    expect(match.raw).toBe(dto);
  });

  it("gera uma linha por participante com campos derivados", () => {
    expect(participants).toHaveLength(2);
    expect(participants[0]).toMatchObject({
      matchId: "BR1_1",
      puuid: "p1",
      cs: 212,
      items: [1, 2, 3, 0, 5, 6, 3340],
      keystoneId: 8005,
      secondaryStyleId: 8300,
      damageToChampions: 40000,
      queueId: 420,
      gameCreation: new Date(1_700_000_000_000),
    });
  });

  it("guarda nome vazio como null", () => {
    expect(participants[1].riotIdGameName).toBeNull();
  });
});

describe("patchOf", () => {
  it("pega só major.minor", () => {
    expect(patchOf("16.21.829.8620")).toBe("16.21");
    expect(patchOf("15.1.1")).toBe("15.1");
  });
});
