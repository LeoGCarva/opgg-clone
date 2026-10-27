import Link from "next/link";
import { isTbd, type Series, type SeriesStatus, type Team } from "@/lib/esports/parse";
import { WORLDS_2026 } from "@/lib/esports/worlds";
import { formatShortDate, formatTime } from "./format";
import { TeamLabel } from "./team";

export const seriesHref = (series: Series) => `${WORLDS_2026.basePath}/match/${series.slug}`;

export function StatusBadge({ status, bestOf }: { status: SeriesStatus; bestOf: number }) {
  if (status === "finished") return <span className="text-xs text-muted">Encerrada</span>;
  if (status === "pending") return <span className="text-xs font-medium text-stat-orange">Em andamento</span>;
  return <span className="text-xs text-muted">Bo{bestOf}</span>;
}

function Score({ series, side }: { series: Series; side: 1 | 2 }) {
  const score = side === 1 ? series.score1 : series.score2;
  const won = series.winner === side;
  return (
    <span className={`w-5 text-center text-lg font-bold tabular-nums ${won ? "text-ink" : "text-muted"}`}>
      {score ?? "–"}
    </span>
  );
}

/** Linha do calendário: horário · time 1 · placar · time 2 · situação. */
export function SeriesRow({
  series,
  teams,
  status,
  label,
}: {
  series: Series;
  teams: Record<string, Team>;
  status: SeriesStatus;
  label: string;
}) {
  const lost = (side: 1 | 2) => series.winner != null && series.winner !== side;
  return (
    <Link
      href={seriesHref(series)}
      // Celular: 1ª linha horário · time · placar · time; 2ª linha situação · fase (via order).
      className="grid grid-cols-[3.25rem_1fr_auto_1fr] items-center gap-x-3 gap-y-1 border-t border-line px-3 py-3 first:border-t-0 hover:bg-canvas sm:grid-cols-[3.25rem_11.5rem_1fr_auto_1fr_6rem]"
    >
      <span className="text-sm tabular-nums text-muted">{formatTime(series.startsAt)}</span>
      <span className="order-2 col-span-3 truncate text-center text-xs text-muted sm:order-none sm:col-span-1 sm:text-left">
        {label}
      </span>
      <span className="flex min-w-0 justify-end">
        <TeamLabel name={series.team1} teams={teams} reverse dim={lost(1)} />
      </span>
      <span className="flex items-center gap-1">
        <Score series={series} side={1} />
        <span className="text-muted">:</span>
        <Score series={series} side={2} />
      </span>
      <span className="min-w-0">
        <TeamLabel name={series.team2} teams={teams} dim={lost(2)} />
      </span>
      <span className="order-1 sm:order-none sm:text-right">
        <StatusBadge status={status} bestOf={series.bestOf} />
      </span>
    </Link>
  );
}

/** Cartão compacto para a chave do mata-mata. */
export function BracketCard({ series, teams }: { series: Series; teams: Record<string, Team> }) {
  const line = (name: string, side: 1 | 2) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${series.winner && series.winner !== side ? "opacity-50" : ""}`}>
      <TeamLabel name={name} teams={teams} />
      {!isTbd(name) && <Score series={series} side={side} />}
    </div>
  );
  return (
    <Link href={seriesHref(series)} className="block border border-line bg-surface hover:border-line-strong">
      <div className="border-b border-line px-3 py-1 text-xs text-muted">
        {formatShortDate(series.startsAt)} · Bo{series.bestOf}
      </div>
      {line(series.team1, 1)}
      {line(series.team2, 2)}
    </Link>
  );
}
