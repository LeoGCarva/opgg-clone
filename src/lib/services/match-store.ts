import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchBans, matches, matchParticipants } from "@/lib/db/schema";
import type { matchToRows } from "./match-mapper";

type MatchRows = ReturnType<typeof matchToRows>;

/**
 * Grava partidas já convertidas. Com `replace`, apaga antes as que existirem — usado pelo
 * coletor para "promover" uma partida salva pelo perfil (sem timeline) para a versão completa.
 */
export async function saveMatches(rows: MatchRows[], { replace = false } = {}) {
  if (!rows.length) return;
  await db().transaction(async (tx) => {
    if (replace) {
      // Cascata remove participantes e bans.
      await tx.delete(matches).where(inArray(matches.matchId, rows.map((r) => r.match.matchId)));
    }
    // onConflictDoNothing: dois processos podem baixar a mesma partida ao mesmo tempo.
    await tx.insert(matches).values(rows.map((r) => r.match)).onConflictDoNothing();
    await tx.insert(matchParticipants).values(rows.flatMap((r) => r.participants)).onConflictDoNothing();
    const bans = rows.flatMap((r) => r.bans);
    if (bans.length) await tx.insert(matchBans).values(bans).onConflictDoNothing();
  });
}
