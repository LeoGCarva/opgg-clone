import { notFound } from "next/navigation";
import { RiotApiError, RiotAuthError, RiotNotFoundError } from "@/lib/riot/client";
import { parseRiotIdSlug, type RiotId } from "@/lib/riot/riot-id";
import { isRegionSlug, platformFromSlug, type Platform } from "@/lib/riot/routing";
import { getProfile, isQueueFilter, refreshProfile, type QueueFilter } from "@/lib/services/profile";

// Código comum às páginas do jogador (perfil e campeões).

export function parseProfileRoute(region: string, slug: string, queueParam: unknown) {
  const riotId = parseRiotIdSlug(slug);
  if (!riotId || !isRegionSlug(region)) notFound();
  return {
    region,
    riotId,
    platform: platformFromSlug(region),
    basePath: `/lol/${region}/${slug}`,
    queue: (isQueueFilter(queueParam) ? queueParam : "all") as QueueFilter,
  };
}

/**
 * Lê do banco; se o jogador nunca foi buscado, busca na Riot e salva primeiro.
 * `now` acompanha os dados para calcular "há X minutos" com a hora da requisição.
 * Erros viram valor (não exceção) para a página decidir o que renderizar.
 */
export async function loadProfile(
  platform: Platform,
  riotId: RiotId,
  options: { queue: QueueFilter; limit?: number },
) {
  try {
    let profile = await getProfile(platform, riotId, options);
    if (!profile) {
      await refreshProfile(platform, { riotId });
      profile = await getProfile(platform, riotId, options);
    }
    if (!profile) notFound();
    return { ok: true as const, profile, now: Date.now() };
  } catch (error) {
    if (error instanceof RiotNotFoundError) notFound();
    if (error instanceof RiotApiError) return { ok: false as const, error };
    throw error;
  }
}

export function RiotErrorBox({ error }: { error: RiotApiError }) {
  return (
    <div className="rounded-md border border-red-900 bg-red-950/50 p-4 text-red-300">
      {error instanceof RiotAuthError
        ? "Chave da Riot inválida ou expirada. Gere outra no portal e atualize o .env."
        : `A API da Riot respondeu ${error.status}. Tente de novo em instantes.`}
    </div>
  );
}
