"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { RiotApiError, RiotAuthError, RiotNotFoundError } from "@/lib/riot/client";
import { PLATFORMS, type Platform } from "@/lib/riot/routing";
import {
  getLastRefreshedAt,
  isQueueFilter,
  loadOlderMatches,
  MATCHES_PAGE_SIZE,
  MAX_MATCHES_SHOWN,
  REFRESH_COOLDOWN_MS,
  refreshProfile,
} from "@/lib/services/profile";

export type RefreshState = { error?: string; message?: string };

function riotErrorMessage(err: unknown): string | null {
  if (err instanceof RiotAuthError) return "Chave da Riot inválida ou expirada.";
  // Refresh de conta salva com outra chave refaz a busca pelo Riot ID; 404 = o jogador trocou de nome.
  if (err instanceof RiotNotFoundError) return "Jogador não encontrado com esse Riot ID. Busque pelo nome atual.";
  if (err instanceof RiotApiError) return `A Riot respondeu ${err.status}. Tente de novo.`;
  return null;
}

// Usado com useActionState, que também passa (estadoAnterior, formData); aqui não precisamos deles.
export async function refreshAction(platform: string, puuid: string): Promise<RefreshState> {
  // Argumentos de Server Action chegam do cliente: validar sempre.
  if (!PLATFORMS.includes(platform as Platform)) return { error: "Região inválida." };

  const last = await getLastRefreshedAt(puuid);
  if (last) {
    const waitMs = REFRESH_COOLDOWN_MS - (Date.now() - last.getTime());
    if (waitMs > 0) {
      return { error: `Aguarde ${Math.ceil(waitMs / 1000)}s para atualizar de novo.` };
    }
  }

  try {
    const { newMatches } = await refreshProfile(platform as Platform, { puuid });
    refresh();
    return {
      message: newMatches
        ? `${newMatches} partida${newMatches > 1 ? "s" : ""} nova${newMatches > 1 ? "s" : ""}.`
        : "Nenhuma partida nova.",
    };
  } catch (err) {
    const error = riotErrorMessage(err);
    if (error) return { error };
    throw err;
  }
}

const PROFILE_PATH = /^\/lol\/[a-z]+\/[^/?#]+$/;

/** Baixa mais 20 partidas antigas e mostra mais 20 na lista (?n=). */
export async function loadMoreAction(
  platform: string,
  puuid: string,
  profilePath: string,
  queue: string,
  shown: number,
): Promise<RefreshState> {
  if (!PLATFORMS.includes(platform as Platform) || !PROFILE_PATH.test(profilePath) || !isQueueFilter(queue)) {
    return { error: "Requisição inválida." };
  }

  try {
    await loadOlderMatches(platform as Platform, puuid, queue);
  } catch (err) {
    const error = riotErrorMessage(err);
    if (error) return { error };
    throw err;
  }

  const params = new URLSearchParams();
  if (queue !== "all") params.set("queue", queue);
  params.set("n", String(Math.min(shown + MATCHES_PAGE_SIZE, MAX_MATCHES_SHOWN)));
  // redirect lança internamente, então fica fora do try.
  redirect(`${profilePath}?${params}`);
}
