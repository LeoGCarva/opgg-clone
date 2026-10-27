// Funções puras do gráfico de PDL do card de ranqueada.

export const LP_HISTORY_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"] as const;
export const LP_HISTORY_DAYS = 30;

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"] as const;
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
const DIVISIONS = ["IV", "III", "II", "I"] as const;
// Mestre começa logo acima de Diamante I 100 PDL.
const APEX_BASE = TIER_ORDER.length * 400;

export type LadderState = { tier: string; rank: string; leaguePoints: number };
export type LpSnapshot = LadderState & { wins: number; losses: number };
export type LpPoint = LpSnapshot & { recordedAt: Date };

/**
 * Posição numa escala contínua: cada divisão vale 100. Mestre/GM/Desafiante dividem a
 * mesma escala (o PDL continua contando a partir de Mestre 0). `null` se o tier for desconhecido.
 */
export function ladderValue({ tier, rank, leaguePoints }: LadderState): number | null {
  if (APEX.has(tier)) return APEX_BASE + leaguePoints;
  const t = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  const d = DIVISIONS.indexOf(rank as (typeof DIVISIONS)[number]);
  if (t < 0 || d < 0) return null;
  return t * 400 + d * 100 + leaguePoints;
}

/** Piso da divisão atual (ex.: Mestre 0, Diamante II 0). */
export function divisionFloor(state: LadderState): number | null {
  return ladderValue({ ...state, leaguePoints: 0 });
}

/** Grava uma foto nova só quando algo mudou desde a última. */
export function shouldRecord(previous: LpSnapshot | undefined, next: LpSnapshot): boolean {
  if (!previous) return true;
  return (
    previous.tier !== next.tier ||
    previous.rank !== next.rank ||
    previous.leaguePoints !== next.leaguePoints ||
    previous.wins !== next.wins ||
    previous.losses !== next.losses
  );
}

export type LpChart = {
  path: string;
  /** Variação entre a primeira e a última foto da janela. */
  delta: number;
  peak: { x: number; y: number; point: LpPoint };
  end: { x: number; y: number };
  /** Altura da linha tracejada do piso da divisão atual; `null` se ficar fora do gráfico. */
  floorY: number | null;
};

/**
 * Monta o desenho do gráfico (coordenadas no viewBox `width`×`height`). Pontos em ordem
 * cronológica; o eixo x é o tempo. Precisa de pelo menos 2 fotos com tier conhecido.
 */
export function buildLpChart(
  points: LpPoint[],
  { width, height, top = 18, bottom = 6 }: { width: number; height: number; top?: number; bottom?: number },
): LpChart | null {
  const valued = points
    .map((p) => ({ point: p, value: ladderValue(p) }))
    .filter((p): p is { point: LpPoint; value: number } => p.value !== null);
  if (valued.length < 2) return null;

  const last = valued[valued.length - 1];
  const floor = divisionFloor(last.point);
  const values = valued.map((v) => v.value);
  // Margem de 12 PDL para a linha não encostar nas bordas.
  const lo = Math.min(...values) - 12;
  const hi = Math.max(...values) + 12;
  const t0 = valued[0].point.recordedAt.getTime();
  const span = last.point.recordedAt.getTime() - t0 || 1;

  const x = (at: Date) => ((at.getTime() - t0) / span) * width;
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (height - top - bottom);
  const round = (n: number) => Math.round(n * 10) / 10;

  const path = valued
    .map((v, i) => `${i ? "L" : "M"}${round(x(v.point.recordedAt))} ${round(y(v.value))}`)
    .join(" ");

  let peak = valued[0];
  for (const v of valued) if (v.value > peak.value) peak = v;

  return {
    path,
    delta: last.value - valued[0].value,
    peak: { x: round(x(peak.point.recordedAt)), y: round(y(peak.value)), point: peak.point },
    end: { x: round(x(last.point.recordedAt)), y: round(y(last.value)) },
    floorY: floor !== null && floor > lo && floor < hi ? round(y(floor)) : null,
  };
}
