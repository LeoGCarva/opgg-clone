import { describe, expect, it } from "vitest";
import { groupByTab, KNOCKOUT_TABS, swissStandings, tabsInOrder } from "@/lib/esports/standings";
import { series } from "./esports-fixtures";

describe("swissStandings", () => {
  it("conta V-D e marca classificados (3 V) e eliminados (3 D)", () => {
    const rows = swissStandings([
      series("A", "B", 1, "Round 1"),
      series("C", "D", 2, "Round 1"),
      series("A", "D", 1, "Round 2"),
      series("B", "C", 1, "Round 2"),
      series("A", "B", 1, "Round 3"),
      series("C", "D", 1, "Round 3"),
      series("B", "C", 2, "Round 4"),
      series("B", "D", null, "Round 5"), // ainda não jogada
    ]);

    expect(rows.map((r) => [r.team, r.wins, r.losses, r.status])).toEqual([
      ["A", 3, 0, "qualified"],
      ["C", 2, 2, "alive"],
      ["D", 1, 2, "alive"],
      ["B", 1, 3, "eliminated"],
    ]);
    expect(rows[3].results).toEqual(["L", "W", "L", "L"]);
  });

  it("ignora mata-mata e confrontos ainda a definir", () => {
    const rows = swissStandings([
      series("A", "B", 1, "Round 1"),
      series("A", "B", 1, "Quarterfinals"),
      series("TBD", "TBD", null, "Round 5"),
    ]);
    expect(rows.map((r) => [r.team, r.wins])).toEqual([
      ["A", 1],
      ["B", 0],
    ]);
  });
});

describe("chave", () => {
  it("agrupa o mata-mata na ordem quartas → semi → final, pulando rodadas vazias", () => {
    const list = [series("TBD", "TBD", null, "Semifinals"), series("A", "B", 1, "Quarterfinals"), series("C", "D", 2, "Quarterfinals")];
    const rounds = groupByTab(list, KNOCKOUT_TABS);
    expect(rounds.map((r) => [r.tab, r.series.length])).toEqual([
      ["Quarterfinals", 2],
      ["Semifinals", 1],
    ]);
  });

  it("lista os tabs na ordem do calendário", () => {
    expect(tabsInOrder([series("A", "B", 1, "Round 1"), series("A", "C", 1, "Round 2"), series("B", "C", 1, "Round 1")])).toEqual([
      "Round 1",
      "Round 2",
    ]);
  });
});
