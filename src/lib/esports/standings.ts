import { isTbd, type Series } from "./parse";

// Classificação da fase suíça e chaveamento do mata-mata, calculados a partir das séries.

export const SWISS_WINS = 3; // 3 vitórias classificam
export const SWISS_LOSSES = 3; // 3 derrotas eliminam

export type SwissStatus = "qualified" | "eliminated" | "alive";

export type SwissRow = {
  team: string;
  wins: number;
  losses: number;
  status: SwissStatus;
  results: ("W" | "L")[]; // em ordem cronológica
};

const STATUS_ORDER: Record<SwissStatus, number> = { qualified: 0, alive: 1, eliminated: 2 };

/** Fase suíça: séries cujo tab é "Round N". */
export function isSwissRound(tab: string): boolean {
  return /^Round \d+$/.test(tab);
}

export function swissStandings(series: Series[]): SwissRow[] {
  const rows = new Map<string, SwissRow>();
  const row = (team: string) => {
    let r = rows.get(team);
    if (!r) rows.set(team, (r = { team, wins: 0, losses: 0, status: "alive", results: [] }));
    return r;
  };

  const swiss = series.filter((s) => isSwissRound(s.tab)).sort((a, b) => a.startsAt - b.startsAt);
  for (const s of swiss) {
    if (isTbd(s.team1) || isTbd(s.team2)) continue;
    const [a, b] = [row(s.team1), row(s.team2)];
    if (!s.winner) continue;
    const [winner, loser] = s.winner === 1 ? [a, b] : [b, a];
    winner.wins++;
    winner.results.push("W");
    loser.losses++;
    loser.results.push("L");
  }

  for (const r of rows.values()) {
    r.status = r.wins >= SWISS_WINS ? "qualified" : r.losses >= SWISS_LOSSES ? "eliminated" : "alive";
  }

  return [...rows.values()].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.team.localeCompare(b.team),
  );
}

export const KNOCKOUT_TABS = ["Quarterfinals", "Semifinals", "Finals"] as const;

export type BracketRound = { tab: string; series: Series[] };

/** Agrupa séries pelos tabs pedidos, na ordem dada, cada um ordenado pela posição na chave. */
export function groupByTab(series: Series[], tabs: readonly string[]): BracketRound[] {
  return tabs
    .map((tab) => ({
      tab,
      series: series.filter((s) => s.tab === tab).sort((a, b) => a.order - b.order),
    }))
    .filter((r) => r.series.length > 0);
}

/** Tabs na ordem em que aparecem (para fases sem formato fixo, como o Play-In). */
export function tabsInOrder(series: Series[]): string[] {
  return [...new Set([...series].sort((a, b) => a.startsAt - b.startsAt).map((s) => s.tab))];
}
