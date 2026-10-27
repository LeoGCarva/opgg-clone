import { cacheLife } from "next/cache";
import { cargoQuery, cargoString, fileUrls, LeaguepediaError } from "./leaguepedia";
import { isTbd, parseGames, parseSeries, parseTeam, shortFallback, type Game, type Series, type Team } from "./parse";

// Worlds 2026 na Leaguepedia. Tudo vem de poucas consultas grandes (calendário, times, jogos,
// jogadores) com cache de 10 min — as páginas filtram em memória, sem nova requisição por série.

export const WORLDS_2026 = {
  title: "Worlds 2026",
  overviewPage: "2026 Season World Championship",
  wikiUrl: "https://lol.fandom.com/wiki/2026_Season_World_Championship",
  basePath: "/esports/worlds-2026",
} as const;

const WHERE = `OverviewPage LIKE ${cargoString(`${WORLDS_2026.overviewPage}%`)}`;

// Durante o torneio os resultados mudam a cada poucas horas; 10 min é suficiente.
const TOURNAMENT_CACHE = { stale: 300, revalidate: 600, expire: 86_400 };

export type Schedule = { series: Series[]; teams: Record<string, Team> };

export async function getSchedule(): Promise<Schedule> {
  "use cache";
  cacheLife(TOURNAMENT_CACHE);

  const rows = await cargoQuery({
    tables: "MatchSchedule",
    fields: "MatchId,OverviewPage,Tab,N_MatchInTab,DateTime_UTC,BestOf,Team1,Team2,Team1Score,Team2Score,Winner,IsNullified",
    where: WHERE,
    orderBy: "DateTime_UTC",
  });
  // Séries anuladas (ex.: refeitas) ficam fora.
  const series = rows.filter((r) => r.IsNullified !== "1").map(parseSeries);

  const names = [...new Set(series.flatMap((s) => [s.team1, s.team2]))].filter((n) => !isTbd(n));
  const teamRows = names.length
    ? await cargoQuery({
        tables: "Teams",
        fields: "_pageName=Page,Name,Short,Image",
        where: `_pageName IN (${names.map(cargoString).join(",")})`,
      })
    : [];

  const parsed = teamRows.map(parseTeam);
  const logos = await fileUrls(parsed.flatMap((t) => (t.logoFile ? [t.logoFile] : [])));

  const teams: Record<string, Team> = {};
  for (const name of names) teams[name] = { name: shortFallback(name), short: shortFallback(name), logo: null };
  for (const { page, logoFile, ...team } of parsed) {
    teams[page] = { ...team, logo: (logoFile && logos[logoFile]) || null };
  }
  return { series, teams };
}

export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheLife(TOURNAMENT_CACHE);

  const [games, players] = await Promise.all([
    cargoQuery({
      tables: "ScoreboardGames",
      fields:
        "GameId,MatchId,N_GameInMatch,DateTime_UTC,Gamelength,Patch,Winner,Team1,Team2,Team1Picks,Team2Picks,Team1Bans,Team2Bans,Team1Kills,Team2Kills,Team1Gold,Team2Gold,Team1Towers,Team2Towers,Team1Dragons,Team2Dragons,Team1Barons,Team2Barons,Team1RiftHeralds,Team2RiftHeralds,Team1VoidGrubs,Team2VoidGrubs",
      where: WHERE,
    }),
    cargoQuery({
      tables: "ScoreboardPlayers",
      fields:
        "GameId,Name,Link,Team,Side,Role,Role_Number,Champion,PlayerWin,Kills,Deaths,Assists,CS,Gold,DamageToChampions,VisionScore,Items,Trinket,KeystoneRune,SecondaryTree,Runes,SummonerSpells",
      where: WHERE,
    }),
  ]);
  return parseGames(games, players);
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

/** Fora do cache (erros não são cacheados): vira mensagem para a página em vez de quebrá-la. */
export async function load<T>(loader: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await loader() };
  } catch (error) {
    console.error("[worlds]", error);
    return {
      ok: false,
      error: error instanceof LeaguepediaError ? error.message : "Não foi possível carregar os dados da Leaguepedia.",
    };
  }
}

const STAGE_PT: Record<string, string> = { "Play-In": "Play-In", "Main Event": "Evento principal" };
const TAB_PT: Record<string, string> = {
  Quarterfinals: "Quartas de final",
  Semifinals: "Semifinais",
  Finals: "Final",
};

export const stageLabel = (stage: string) => STAGE_PT[stage] ?? stage;

/** "Round 3" → "Rodada 3" (fase suíça / Play-In), "Quarterfinals" → "Quartas de final". */
export function tabLabel(tab: string): string {
  return TAB_PT[tab] ?? tab.replace(/^Round (\d+)$/, "Rodada $1");
}
