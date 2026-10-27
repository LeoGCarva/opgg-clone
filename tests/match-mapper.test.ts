import { describe, expect, it } from "vitest";
import { matchToRows, patchOf, runePage, slimMatch } from "@/lib/services/match-mapper";
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
    expect(match.raw).toEqual(slimMatch(dto));
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

describe("slimMatch", () => {
  const heavy = { ...participant(), challenges: { kda: 7.5 }, missions: { playerScore0: 1 } } as ParticipantDto;
  const full: MatchDto = { ...dto, info: { ...dto.info, participants: [heavy] } };

  it("remove challenges e missions e mantém o resto", () => {
    const [p] = slimMatch(full).info.participants;
    expect(p).not.toHaveProperty("challenges");
    expect(p).not.toHaveProperty("missions");
    expect(p).toEqual(participant());
    expect(slimMatch(full).info.gameVersion).toBe(dto.info.gameVersion);
  });

  it("não altera a partida original", () => {
    slimMatch(full);
    expect(full.info.participants[0]).toHaveProperty("challenges");
  });
});

describe("runePage", () => {
  const sel = (perk: number) => ({ perk, var1: 0, var2: 0, var3: 0 });

  it("monta a página completa na ordem árvore, runas, fragmentos", () => {
    expect(
      runePage({
        styles: [
          { description: "primaryStyle", style: 8000, selections: [8005, 9111, 9104, 8014].map(sel) },
          { description: "subStyle", style: 8300, selections: [8304, 8345].map(sel) },
        ],
        statPerks: { offense: 5005, flex: 5008, defense: 5011 },
      }),
    ).toEqual([8000, 8005, 9111, 9104, 8014, 8300, 8304, 8345, 5005, 5008, 5011]);
  });

  it("devolve null para páginas incompletas", () => {
    expect(runePage(participant().perks)).toBeNull();
    expect(runePage(undefined)).toBeNull();
  });
});

describe("patchOf", () => {
  it("pega só major.minor", () => {
    expect(patchOf("16.21.829.8620")).toBe("16.21");
    expect(patchOf("15.1.1")).toBe("15.1");
  });
});
