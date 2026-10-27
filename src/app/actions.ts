"use server";

import { redirect } from "next/navigation";
import { parseRiotId, toRiotIdSlug } from "@/lib/riot/riot-id";
import { isRegionSlug } from "@/lib/riot/routing";
import { exactNameInput } from "@/lib/services/player-search";

export type SearchState = { error?: string; riotId?: string };

export async function searchPlayer(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const input = String(formData.get("riotId") ?? "");
  const region = String(formData.get("region") ?? "");

  if (!isRegionSlug(region)) {
    return { error: "Região inválida.", riotId: input };
  }

  // Sem tag: lista os jogadores conhecidos com esse nome.
  if (!input.includes("#")) {
    if (!exactNameInput(input)) {
      return { error: "Digite um nome de 3 a 16 caracteres ou Nome#TAG.", riotId: input };
    }
    redirect(`/search?${new URLSearchParams({ region, name: input.trim() })}`);
  }

  const riotId = parseRiotId(input);
  if (!riotId) {
    return { error: "Use o formato Nome#TAG (ex.: Yukarina#333).", riotId: input };
  }
  redirect(`/lol/${region}/${toRiotIdSlug(riotId)}`);
}
