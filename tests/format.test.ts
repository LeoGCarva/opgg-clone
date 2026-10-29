import { describe, expect, it } from "vitest";
import { matchTime } from "@/components/profile/format";

// 29/10/2026 15:00 em Brasília (UTC-3).
const now = Date.UTC(2026, 9, 29, 18, 0);

describe("matchTime", () => {
  it("mostra tempo relativo para partidas de hoje", () => {
    expect(matchTime(new Date(Date.UTC(2026, 9, 29, 17, 0)), now)).toBe("há 1 hora");
    expect(matchTime(new Date(Date.UTC(2026, 9, 29, 17, 50)), now)).toBe("há 10 minutos");
  });

  it("usa o dia de Brasília, não o de UTC", () => {
    // 29/10 00:30 em Brasília = 03:30 UTC: ainda é hoje.
    expect(matchTime(new Date(Date.UTC(2026, 9, 29, 3, 30)), now)).toBe("há 14 horas");
    // 28/10 23:30 em Brasília = 29/10 02:30 UTC: já é ontem.
    expect(matchTime(new Date(Date.UTC(2026, 9, 29, 2, 30)), now)).toBe("28/10");
  });

  it("mostra a data para partidas de dias anteriores", () => {
    expect(matchTime(new Date(Date.UTC(2026, 9, 28, 20, 0)), now)).toBe("28/10");
    expect(matchTime(new Date(Date.UTC(2026, 0, 2, 12, 0)), now)).toBe("02/01");
  });

  it("inclui o ano quando não é o ano atual", () => {
    expect(matchTime(new Date(Date.UTC(2025, 11, 31, 12, 0)), now)).toBe("31/12/2025");
  });
});
