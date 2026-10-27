import { describe, expect, it } from "vitest";
import {
  parseGameLength,
  parseGames,
  parseItems,
  parseList,
  parseSeries,
  parseTeam,
  parseUtc,
  seriesSlug,
  seriesStatus,
} from "@/lib/esports/parse";
import { gameRow, playerRow, scheduleRow } from "./esports-fixtures";

describe("campos da Cargo", () => {
  it("separa listas e ignora vazios", () => {
    expect(parseList("Smite, Flash")).toEqual(["Smite", "Flash"]);
    expect(parseList("")).toEqual([]);
    expect(parseList(null)).toEqual([]);
  });

  it("mantém posições vazias dos itens e completa até 6", () => {
    expect(parseItems(";Edge of Night;Last Whisper")).toEqual([
      null,
      "Edge of Night",
      "Last Whisper",
      null,
      null,
      null,
    ]);
    expect(parseItems(null)).toEqual(Array(6).fill(null));
  });

  it("lê data UTC e duração", () => {
    expect(new Date(parseUtc("2026-10-15 18:00:00")).toISOString()).toBe("2026-10-15T18:00:00.000Z");
    expect(parseGameLength("26:01")).toBe(1561);
    expect(parseGameLength("38:41")).toBe(2321);
  });

  it("gera slug da série sem o nome do torneio", () => {
    expect(seriesSlug("2026 Season World Championship/Main Event_Round 1_1")).toBe("main-event-round-1-1");
    expect(seriesSlug("2026 Season World Championship/Play-In_Round 3_1")).toBe("play-in-round-3-1");
  });
});

describe("parseSeries", () => {
  it("converte uma série encerrada", () => {
    expect(parseSeries(scheduleRow)).toMatchObject({
      slug: "main-event-round-1-1",
      stage: "Main Event",
      tab: "Round 1",
      bestOf: 1,
      score1: 1,
      score2: 0,
      winner: 1,
    });
  });

  it("série sem resultado: próxima antes do horário, aguardando depois", () => {
    const s = parseSeries({ ...scheduleRow, Team1Score: "", Team2Score: "", Winner: "" });
    expect(s.score1).toBeNull();
    expect(seriesStatus(s, s.startsAt - 1)).toBe("upcoming");
    expect(seriesStatus(s, s.startsAt + 1)).toBe("pending");
    expect(seriesStatus(parseSeries(scheduleRow), 0)).toBe("finished");
  });
});

describe("parseTeam", () => {
  it("usa a sigla e guarda o arquivo do logo", () => {
    expect(parseTeam({ Page: "Gen.G", Name: "Gen.G", Short: "GEN", Image: "Gen.Glogo square.png" })).toEqual({
      page: "Gen.G",
      name: "Gen.G",
      short: "GEN",
      logo: null,
      logoFile: "Gen.Glogo square.png",
    });
  });

  it("sem nome nem sigla, usa a página sem o sufixo entre parênteses", () => {
    expect(parseTeam({ Page: "LYON (2024 American Team)", Name: "", Short: "", Image: "" })).toMatchObject({
      page: "LYON (2024 American Team)",
      name: "LYON",
      short: "LYON",
      logoFile: null,
    });
  });
});

describe("parseGames", () => {
  it("junta jogadores ao jogo, azul antes do vermelho e por rota", () => {
    const rows = [
      playerRow({ Name: "Chovy", Champion: "Akali", Role: "Mid", "Role Number": "3" }),
      playerRow({ Name: "Rookie", Team: "Invictus Gaming", Side: "1", Champion: "Aurora", "Role Number": "3", PlayerWin: "No" }),
      playerRow(),
    ];
    const [game] = parseGames([gameRow], rows);

    expect(game).toMatchObject({ number: 1, durationSec: 1561, patch: "26.20", winner: 2 });
    expect(game.blue).toMatchObject({ name: "Invictus Gaming", kills: 10, towers: 2, grubs: 2 });
    expect(game.red.picks).toEqual(["Ornn", "Qiyana", "Akali", "Corki", "Nautilus"]);
    expect(game.blue.bans).toContain("Renata Glasc");
    expect(game.players.map((p) => p.name)).toEqual(["Rookie", "Canyon", "Chovy"]);

    const canyon = game.players[1];
    expect(canyon).toMatchObject({ side: 2, win: true, kills: 8, deaths: 1, assists: 10, cs: 248 });
    expect(canyon.items[0]).toBeNull();
    expect(canyon.spells).toEqual(["Smite", "Flash"]);
    expect(canyon.runes).toHaveLength(9);
  });
});
