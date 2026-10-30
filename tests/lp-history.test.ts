import { describe, expect, it } from "vitest";
import { buildLpChart, divisionFloor, ladderValue, lpChangeByMatch, shouldRecord, type LpMatch, type LpPoint } from "@/lib/services/lp-history";

function point(day: number, tier: string, rank: string, leaguePoints: number, extra: Partial<LpPoint> = {}): LpPoint {
  return { tier, rank, leaguePoints, wins: 10, losses: 10, recordedAt: new Date(Date.UTC(2026, 9, day)), ...extra };
}

describe("ladderValue", () => {
  it("conta 100 por divisão e 400 por tier", () => {
    expect(ladderValue({ tier: "IRON", rank: "IV", leaguePoints: 0 })).toBe(0);
    expect(ladderValue({ tier: "IRON", rank: "I", leaguePoints: 50 })).toBe(350);
    expect(ladderValue({ tier: "DIAMOND", rank: "I", leaguePoints: 99 })).toBe(2799);
  });

  it("Mestre continua logo acima de Diamante I e GM/Desafiante usam a mesma escala", () => {
    expect(ladderValue({ tier: "MASTER", rank: "I", leaguePoints: 0 })).toBe(2800);
    expect(ladderValue({ tier: "GRANDMASTER", rank: "I", leaguePoints: 450 })).toBe(3250);
    expect(ladderValue({ tier: "CHALLENGER", rank: "I", leaguePoints: 1200 })).toBe(4000);
  });

  it("devolve null para tier ou divisão desconhecidos", () => {
    expect(ladderValue({ tier: "WOOD", rank: "I", leaguePoints: 0 })).toBeNull();
    expect(ladderValue({ tier: "GOLD", rank: "V", leaguePoints: 0 })).toBeNull();
  });

  it("divisionFloor é a divisão atual com 0 PDL", () => {
    expect(divisionFloor({ tier: "MASTER", rank: "I", leaguePoints: 99 })).toBe(2800);
    expect(divisionFloor({ tier: "EMERALD", rank: "II", leaguePoints: 44 })).toBe(2200);
  });
});

describe("shouldRecord", () => {
  const base = { tier: "MASTER", rank: "I", leaguePoints: 99, wins: 74, losses: 62 };

  it("grava a primeira foto e quando algo muda", () => {
    expect(shouldRecord(undefined, base)).toBe(true);
    expect(shouldRecord(base, { ...base, leaguePoints: 80 })).toBe(true);
    expect(shouldRecord(base, { ...base, wins: 75 })).toBe(true);
  });

  it("não repete uma foto igual", () => {
    expect(shouldRecord(base, { ...base })).toBe(false);
  });
});

describe("buildLpChart", () => {
  const size = { width: 200, height: 100, top: 0, bottom: 0 };

  it("precisa de pelo menos 2 fotos", () => {
    expect(buildLpChart([point(1, "MASTER", "I", 10)], size)).toBeNull();
  });

  it("calcula variação, pico e o fim no canto direito", () => {
    const chart = buildLpChart(
      [point(1, "DIAMOND", "I", 6), point(10, "MASTER", "I", 180), point(30, "MASTER", "I", 99)],
      size,
    )!;
    // Diamante I 6 PDL (2706) → Mestre 99 PDL (2899).
    expect(chart.delta).toBe(193);
    expect(chart.peak.point.leaguePoints).toBe(180);
    expect(chart.end.x).toBe(200);
    expect(chart.start.x).toBe(0);
    expect(chart.start.y).toBeGreaterThan(chart.end.y);
    expect(chart.path.startsWith("M0 ")).toBe(true);
    // O pico fica mais alto (y menor) que o fim.
    expect(chart.peak.y).toBeLessThan(chart.end.y);
  });

  it("mostra o piso da divisão só quando ele cabe no gráfico", () => {
    const crossing = buildLpChart([point(1, "DIAMOND", "I", 60), point(5, "MASTER", "I", 40)], size)!;
    expect(crossing.floorY).not.toBeNull();
    const above = buildLpChart([point(1, "MASTER", "I", 300), point(5, "MASTER", "I", 340)], size)!;
    expect(above.floorY).toBeNull();
  });

  it("ignora fotos com tier desconhecido", () => {
    expect(buildLpChart([point(1, "WOOD", "I", 0), point(2, "GOLD", "II", 10)], size)).toBeNull();
  });
});

describe("lpChangeByMatch", () => {
  // Fotos às 12h dos dias 1, 2, 3...; partidas de 30 min terminando no meio do intervalo.
  const snap = (day: number, tier: string, rank: string, lp: number, wins: number, losses: number): LpPoint => ({
    tier, rank, leaguePoints: lp, wins, losses, recordedAt: new Date(Date.UTC(2026, 9, day, 12)),
  });
  const game = (matchId: string, day: number, win: boolean, queueId = 420): LpMatch => ({
    matchId, queueId, win, gameCreation: new Date(Date.UTC(2026, 9, day, 20)), gameDuration: 1800,
  });

  it("dá o PDL exato quando há 1 jogo entre duas fotos", () => {
    const history = { RANKED_SOLO_5x5: [snap(1, "GOLD", "II", 40, 10, 10), snap(2, "GOLD", "II", 62, 11, 10), snap(3, "GOLD", "II", 44, 11, 11)] };
    const changes = lpChangeByMatch(history, [game("win", 1, true), game("loss", 2, false)]);
    expect(Object.fromEntries(changes)).toEqual({ win: 22, loss: -18 });
  });

  it("conta subida de divisão e de tier", () => {
    const history = {
      RANKED_SOLO_5x5: [snap(1, "GOLD", "III", 90, 10, 10), snap(2, "GOLD", "II", 10, 11, 10)],
      RANKED_FLEX_SR: [snap(1, "DIAMOND", "I", 85, 5, 5), snap(2, "MASTER", "I", 3, 6, 5)],
    };
    const changes = lpChangeByMatch(history, [game("a", 1, true), game("b", 1, true, 440)]);
    expect(Object.fromEntries(changes)).toEqual({ a: 20, b: 18 });
  });

  it("não mostra nada com vários jogos entre as fotos", () => {
    const history = { RANKED_SOLO_5x5: [snap(1, "GOLD", "II", 40, 10, 10), snap(2, "GOLD", "II", 50, 12, 11)] };
    expect(lpChangeByMatch(history, [game("a", 1, true)]).size).toBe(0);
  });

  it("não mostra nada se houver 2 partidas salvas no intervalo", () => {
    const history = { RANKED_SOLO_5x5: [snap(1, "GOLD", "II", 40, 10, 10), snap(2, "GOLD", "II", 62, 11, 10)] };
    const second = { ...game("b", 1, true), gameCreation: new Date(Date.UTC(2026, 9, 1, 14)) };
    expect(lpChangeByMatch(history, [game("a", 1, true), second]).size).toBe(0);
  });

  it("não mostra nada se o resultado da partida não bate com o V/D", () => {
    const history = { RANKED_SOLO_5x5: [snap(1, "GOLD", "II", 40, 10, 10), snap(2, "GOLD", "II", 62, 11, 10)] };
    expect(lpChangeByMatch(history, [game("a", 1, false)]).size).toBe(0);
  });

  it("descarta variações impossíveis para um jogo", () => {
    // Caso real: Mestre 99 → 161 com 1 vitória entre fotos de 2 dias.
    const history = { RANKED_SOLO_5x5: [snap(1, "MASTER", "I", 99, 74, 62), snap(2, "MASTER", "I", 161, 75, 62)] };
    expect(lpChangeByMatch(history, [game("a", 1, true)]).size).toBe(0);
  });

  it("ignora partidas fora do intervalo e de outra fila", () => {
    const history = { RANKED_SOLO_5x5: [snap(1, "GOLD", "II", 40, 10, 10), snap(2, "GOLD", "II", 62, 11, 10)] };
    expect(lpChangeByMatch(history, [game("depois", 2, true), game("flex", 1, true, 440)]).size).toBe(0);
  });
});
