import type { NextRequest } from "next/server";
import { tierLabel } from "@/components/profile/format";
import { ddragonUrl, getStaticData } from "@/lib/ddragon";
import { isRegionSlug, platformFromSlug } from "@/lib/riot/routing";
import { searchPlayers } from "@/lib/services/player-search";

export type SearchSuggestion = {
  gameName: string;
  tagLine: string;
  iconUrl: string | null;
  detail: string | null; // "Desafiante · 3575 PDL", "Nível 123" ou null
};

/** Autocomplete da busca: GET /api/search?q=yuk&region=br */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const region = request.nextUrl.searchParams.get("region") ?? "";
  if (!isRegionSlug(region)) {
    return Response.json({ error: "Região inválida" }, { status: 400 });
  }

  const [players, data] = await Promise.all([searchPlayers(platformFromSlug(region), q), getStaticData()]);
  const suggestions: SearchSuggestion[] = players.map((p) => ({
    gameName: p.gameName,
    tagLine: p.tagLine,
    iconUrl: p.profileIconId ? ddragonUrl.profileIcon(data.version, p.profileIconId) : null,
    detail: p.tier
      ? `${tierLabel(p.tier, p.rank ?? "")} · ${p.leaguePoints} PDL`
      : p.summonerLevel
        ? `Nível ${p.summonerLevel}`
        : null,
  }));

  return Response.json(
    { suggestions },
    // Cache curto no navegador: digitar, apagar e digitar de novo não refaz a busca.
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
