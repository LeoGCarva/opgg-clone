import { describe, expect, it } from "vitest";
import { groupByDay, matchTime } from "@/components/profile/format";

// 29/10/2026 (quinta) 15:00 em Brasília (UTC-3).
const now = Date.UTC(2026, 9, 29, 18, 0);
const at = (month: number, day: number, hour: number, minute = 0) => new Date(Date.UTC(2026, month, day, hour, minute));

describe("matchTime", () => {
  it("mostra tempo relativo para partidas de hoje", () => {
    expect(matchTime(at(9, 29, 17), now)).toBe("há 1 hora");
    expect(matchTime(at(9, 29, 17, 50), now)).toBe("há 10 minutos");
  });

  it("mostra o horário de Brasília para partidas de outros dias", () => {
    expect(matchTime(at(9, 28, 20, 14), now)).toBe("17:14");
  });

  it("usa o dia de Brasília, não o de UTC", () => {
    // 29/10 00:30 em Brasília = 03:30 UTC: ainda é hoje.
    expect(matchTime(at(9, 29, 3, 30), now)).toBe("há 14 horas");
    // 28/10 23:30 em Brasília = 29/10 02:30 UTC: já é ontem.
    expect(matchTime(at(9, 29, 2, 30), now)).toBe("23:30");
  });
});

describe("groupByDay", () => {
  const group = (dates: Date[]) =>
    groupByDay(dates, (d) => d, now).map((g) => ({ label: g.label, count: g.items.length }));

  it("separa hoje, ontem e dias anteriores, na ordem recebida", () => {
    expect(group([at(9, 29, 17), at(9, 29, 12), at(9, 28, 20), at(9, 27, 15), at(9, 27, 14)])).toEqual([
      { label: "Hoje", count: 2 },
      { label: "Ontem", count: 1 },
      { label: "ter., 27 de out.", count: 2 },
    ]);
  });

  it("agrupa pelo dia de Brasília", () => {
    // 29/10 02:30 UTC = 28/10 23:30 em Brasília.
    expect(group([at(9, 29, 2, 30), at(9, 28, 20)])).toEqual([{ label: "Ontem", count: 2 }]);
  });

  it("inclui o ano quando não é o ano atual", () => {
    expect(group([new Date(Date.UTC(2025, 11, 31, 15))])).toEqual([{ label: "qua., 31 de dez. de 2025", count: 1 }]);
  });
});
