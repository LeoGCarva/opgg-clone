import type { TimelineDto } from "@/lib/riot/types";

export type ParticipantTimeline = {
  itemBuild: number[]; // todas as compras, em ordem (inclui componentes e consumíveis)
  skillOrder: number[]; // slot de cada nível de skill: 1=Q 2=W 3=E 4=R
  startItems: number[]; // compras antes de sair da base no início
};

const START_WINDOW_MS = 60_000;

/** Extrai, por puuid, a ordem de compra de itens e de skills de uma timeline. */
export function timelineToBuilds(timeline: TimelineDto): Map<string, ParticipantTimeline> {
  const byParticipantId = new Map<number, ParticipantTimeline & { purchases: { itemId: number; at: number }[] }>();
  for (const p of timeline.info.participants) {
    byParticipantId.set(p.participantId, { itemBuild: [], skillOrder: [], startItems: [], purchases: [] });
  }

  const events = timeline.info.frames.flatMap((f) => f.events);
  for (const e of events) {
    const p = e.participantId ? byParticipantId.get(e.participantId) : undefined;
    if (!p) continue; // participantId 0 = eventos do sistema

    if (e.type === "ITEM_PURCHASED" && e.itemId) {
      p.purchases.push({ itemId: e.itemId, at: e.timestamp });
    } else if (e.type === "ITEM_UNDO" && e.beforeId) {
      // Desfaz a compra mais recente daquele item. (beforeId = 0 é undo de venda.)
      const i = p.purchases.findLastIndex((x) => x.itemId === e.beforeId);
      if (i !== -1) p.purchases.splice(i, 1);
    } else if (e.type === "SKILL_LEVEL_UP" && e.levelUpType === "NORMAL" && e.skillSlot) {
      // EVOLVE (Kai'Sa, Kha'Zix...) não é um ponto de skill.
      p.skillOrder.push(e.skillSlot);
    }
  }

  const result = new Map<string, ParticipantTimeline>();
  for (const { participantId, puuid } of timeline.info.participants) {
    const p = byParticipantId.get(participantId)!;
    result.set(puuid, {
      itemBuild: p.purchases.map((x) => x.itemId),
      skillOrder: p.skillOrder,
      startItems: p.purchases.filter((x) => x.at < START_WINDOW_MS).map((x) => x.itemId),
    });
  }
  return result;
}
