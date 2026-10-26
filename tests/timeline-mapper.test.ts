import { describe, expect, it } from "vitest";
import type { TimelineDto, TimelineEventDto } from "@/lib/riot/types";
import { timelineToBuilds } from "@/lib/services/timeline-mapper";

function timeline(events: TimelineEventDto[]): TimelineDto {
  return {
    metadata: { matchId: "BR1_1", participants: ["a", "b"] },
    info: {
      frameInterval: 60000,
      participants: [
        { participantId: 1, puuid: "a" },
        { participantId: 2, puuid: "b" },
      ],
      // Divide em dois frames para garantir que a ordem entre frames é respeitada.
      frames: [
        { timestamp: 0, events: events.slice(0, 3) },
        { timestamp: 60000, events: events.slice(3) },
      ],
    },
  };
}

const buy = (participantId: number, itemId: number, timestamp: number): TimelineEventDto => ({
  type: "ITEM_PURCHASED", participantId, itemId, timestamp,
});
const skill = (participantId: number, skillSlot: number, levelUpType = "NORMAL"): TimelineEventDto => ({
  type: "SKILL_LEVEL_UP", participantId, skillSlot, levelUpType, timestamp: 1,
});

describe("timelineToBuilds", () => {
  const result = timelineToBuilds(
    timeline([
      buy(1, 1055, 5_000), // Lâmina de Doran
      buy(1, 2003, 6_000), // Poção
      { type: "ITEM_PURCHASED", participantId: 0, itemId: 9999, timestamp: 0 }, // evento do sistema
      buy(1, 1036, 300_000),
      { type: "ITEM_UNDO", participantId: 1, beforeId: 1036, afterId: 0, timestamp: 301_000 },
      buy(1, 1037, 302_000),
      { type: "ITEM_UNDO", participantId: 1, beforeId: 0, afterId: 0, timestamp: 303_000 }, // undo de venda
      { type: "ITEM_SOLD", participantId: 1, itemId: 1055, timestamp: 900_000 },
      skill(1, 1),
      skill(1, 3),
      skill(2, 2),
      skill(2, 1, "EVOLVE"),
      { type: "WARD_PLACED", participantId: 1, timestamp: 2 } as TimelineEventDto,
    ]),
  );

  it("mantém a ordem de compra e aplica os undos", () => {
    expect(result.get("a")!.itemBuild).toEqual([1055, 2003, 1037]);
  });

  it("separa os itens iniciais (primeiro minuto)", () => {
    expect(result.get("a")!.startItems).toEqual([1055, 2003]);
  });

  it("registra a ordem de skills ignorando evoluções", () => {
    expect(result.get("a")!.skillOrder).toEqual([1, 3]);
    expect(result.get("b")!.skillOrder).toEqual([2]);
  });

  it("ignora eventos do sistema e devolve listas vazias para quem não comprou nada", () => {
    expect(result.get("b")!.itemBuild).toEqual([]);
    expect([...result.keys()]).toEqual(["a", "b"]);
  });
});
