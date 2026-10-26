"use server";

import { redirect } from "next/navigation";
import { parseRiotId, toRiotIdSlug } from "@/lib/riot/riot-id";
import { isRegionSlug } from "@/lib/riot/routing";

export type SearchState = { error?: string; riotId?: string };

export async function searchPlayer(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const input = String(formData.get("riotId") ?? "");
  const region = String(formData.get("region") ?? "");

  const riotId = parseRiotId(input);
  if (!riotId) {
    return { error: "Use o formato Nome#TAG (ex.: Yukarina#333).", riotId: input };
  }
  if (!isRegionSlug(region)) {
    return { error: "Região inválida.", riotId: input };
  }

  redirect(`/lol/${region}/${toRiotIdSlug(riotId)}`);
}
