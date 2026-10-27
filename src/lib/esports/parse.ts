// Conversão das linhas da Cargo (tudo string, campos com espaço no lugar de "_") para tipos.
// Funções puras — testadas em tests/esports-parse.test.ts.

export type CargoRow = Record<string, string | null>;

export type Team = { name: string; short: string; logo: string | null }; // name = nome de exibição

// page = página do time na wiki, que é como as séries e jogos se referem a ele
// ("LYON (2024 American Team)", com name "LYON"); logoFile = arquivo do logo na wiki.
export type TeamRow = Team & { page: string; logoFile: string | null };

export type SeriesStatus = "finished" | "upcoming" | "pending"; // pending = já começou, sem resultado

export type Series = {
  id: string; // MatchId da Leaguepedia
  slug: string; // usado na URL
  stage: string; // "Play-In", "Main Event"
  tab: string; // "Round 1", "Quarterfinals"...
  order: number; // N_MatchInTab
  startsAt: number; // ms UTC
  bestOf: number;
  team1: string;
  team2: string;
  score1: number | null;
  score2: number | null;
  winner: 1 | 2 | null;
};

export type GamePlayer = {
  name: string;
  team: string;
  side: 1 | 2;
  role: string; // "Top", "Jungle", "Mid", "Bot", "Support"
  champion: string; // nome em inglês
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  vision: number;
  items: (string | null)[]; // 6 posições, null = vazio
  trinket: string | null;
  keystone: string | null;
  secondaryTree: string | null;
  runes: string[];
  spells: string[];
};

export type TeamGameStats = {
  name: string;
  picks: string[];
  bans: string[];
  kills: number;
  gold: number;
  towers: number;
  dragons: number;
  barons: number;
  heralds: number;
  grubs: number;
};

export type Game = {
  id: string;
  seriesId: string;
  number: number; // jogo N da série
  startsAt: number;
  durationSec: number;
  patch: string;
  winner: 1 | 2; // 1 = lado azul (Team1 do scoreboard)
  blue: TeamGameStats;
  red: TeamGameStats;
  players: GamePlayer[];
};

// A Cargo devolve os campos com espaço no lugar do "_" ("DateTime UTC").
const get = (row: CargoRow, field: string) => row[field] ?? row[field.replace(/_/g, " ")] ?? "";

const int = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
};

const intOrNull = (value: string) => (value.trim() === "" ? null : int(value));

/** Lista separada por vírgula (picks, bans, feitiços, runas). */
export function parseList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Itens finais: separados por ";", com posições vazias preservadas; sempre 6 posições. */
export function parseItems(value: string | null | undefined): (string | null)[] {
  const items = (value ?? "").split(";").map((s) => s.trim() || null);
  return Array.from({ length: 6 }, (_, i) => items[i] ?? null);
}

/** "2026-10-15 18:00:00" (UTC) → timestamp em ms. */
export function parseUtc(value: string): number {
  return Date.parse(`${value.trim().replace(" ", "T")}Z`);
}

/** "26:01" → 1561 segundos. */
export function parseGameLength(value: string): number {
  const [m, s] = value.split(":").map((p) => int(p));
  return m * 60 + (s ?? 0);
}

/** "2026 Season World Championship/Main Event_Round 1_1" → "main-event-round-1-1". */
export function seriesSlug(matchId: string): string {
  const local = matchId.slice(matchId.indexOf("/") + 1);
  return local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const winnerOf = (value: string): 1 | 2 | null => (value === "1" ? 1 : value === "2" ? 2 : null);

export function parseSeries(row: CargoRow): Series {
  const id = get(row, "MatchId");
  const overview = get(row, "OverviewPage");
  return {
    id,
    slug: seriesSlug(id),
    stage: overview.slice(overview.indexOf("/") + 1),
    tab: get(row, "Tab"),
    order: int(get(row, "N_MatchInTab")),
    startsAt: parseUtc(get(row, "DateTime_UTC")),
    bestOf: int(get(row, "BestOf")) || 1,
    team1: get(row, "Team1"),
    team2: get(row, "Team2"),
    score1: intOrNull(get(row, "Team1Score")),
    score2: intOrNull(get(row, "Team2Score")),
    winner: winnerOf(get(row, "Winner")),
  };
}

export function seriesStatus(series: Series, now: number): SeriesStatus {
  if (series.winner) return "finished";
  return series.startsAt > now ? "upcoming" : "pending";
}

/** Time ainda não definido no chaveamento. */
export const isTbd = (team: string) => !team || team === "TBD";

/** O logo (URL) é resolvido depois, a partir de `logoFile` — ver fileUrls() em leaguepedia.ts. */
export function parseTeam(row: CargoRow): TeamRow {
  const page = get(row, "Page");
  const name = get(row, "Name") || shortFallback(page);
  return {
    page,
    name,
    short: get(row, "Short") || name,
    logo: null,
    logoFile: get(row, "Image") || null,
  };
}

/** Sigla quando o time não está na tabela Teams: "LYON (2024 American Team)" → "LYON". */
export function shortFallback(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "");
}

function parseTeamStats(row: CargoRow, n: 1 | 2): TeamGameStats {
  const f = (field: string) => get(row, `Team${n}${field}`);
  return {
    name: f(""),
    picks: parseList(f("Picks")),
    bans: parseList(f("Bans")),
    kills: int(f("Kills")),
    gold: int(f("Gold")),
    towers: int(f("Towers")),
    dragons: int(f("Dragons")),
    barons: int(f("Barons")),
    heralds: int(f("RiftHeralds")),
    grubs: int(f("VoidGrubs")),
  };
}

export function parsePlayer(row: CargoRow): GamePlayer {
  return {
    name: get(row, "Name") || get(row, "Link"),
    team: get(row, "Team"),
    side: get(row, "Side") === "2" ? 2 : 1,
    role: get(row, "Role"),
    champion: get(row, "Champion"),
    win: get(row, "PlayerWin") === "Yes",
    kills: int(get(row, "Kills")),
    deaths: int(get(row, "Deaths")),
    assists: int(get(row, "Assists")),
    cs: int(get(row, "CS")),
    gold: int(get(row, "Gold")),
    damage: int(get(row, "DamageToChampions")),
    vision: int(get(row, "VisionScore")),
    items: parseItems(get(row, "Items")),
    trinket: get(row, "Trinket") || null,
    keystone: get(row, "KeystoneRune") || null,
    secondaryTree: get(row, "SecondaryTree") || null,
    runes: parseList(get(row, "Runes")),
    spells: parseList(get(row, "SummonerSpells")),
  };
}

/** Junta os jogos (ScoreboardGames) com seus jogadores (ScoreboardPlayers), em ordem de rota. */
export function parseGames(gameRows: CargoRow[], playerRows: CargoRow[]): Game[] {
  const playersByGame = new Map<string, { roleNumber: number; player: GamePlayer }[]>();
  for (const row of playerRows) {
    const list = playersByGame.get(get(row, "GameId")) ?? [];
    list.push({ roleNumber: int(get(row, "Role_Number")), player: parsePlayer(row) });
    playersByGame.set(get(row, "GameId"), list);
  }

  return gameRows
    .map((row): Game => {
      const id = get(row, "GameId");
      const players = (playersByGame.get(id) ?? [])
        .sort((a, b) => a.player.side - b.player.side || a.roleNumber - b.roleNumber)
        .map((p) => p.player);
      return {
        id,
        seriesId: get(row, "MatchId"),
        number: int(get(row, "N_GameInMatch")),
        startsAt: parseUtc(get(row, "DateTime_UTC")),
        durationSec: parseGameLength(get(row, "Gamelength")),
        patch: get(row, "Patch"),
        winner: get(row, "Winner") === "2" ? 2 : 1,
        blue: parseTeamStats(row, 1),
        red: parseTeamStats(row, 2),
        players,
      };
    })
    .sort((a, b) => a.startsAt - b.startsAt || a.number - b.number);
}
