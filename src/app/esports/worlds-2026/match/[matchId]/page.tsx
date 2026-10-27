import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDay, formatTime } from "@/components/esports/format";
import { GameDetail } from "@/components/esports/game-detail";
import { StatusBadge } from "@/components/esports/series";
import { TeamLogo } from "@/components/esports/team";
import { LeaguepediaErrorBox, pill, WorldsTabs } from "@/components/esports/worlds-tabs";
import { getNameIndex, getStaticData } from "@/lib/ddragon";
import { makeIcons } from "@/lib/esports/icons";
import { isTbd, seriesStatus, type Series, type Team } from "@/lib/esports/parse";
import { getGames, getSchedule, load, stageLabel, tabLabel, WORLDS_2026 } from "@/lib/esports/worlds";

type Props = PageProps<"/esports/worlds-2026/match/[matchId]">;

export const metadata: Metadata = { title: "Worlds 2026 · Série · opgg clone" };

export default function WorldsMatchPage({ params, searchParams }: Props) {
  return (
    <>
      <WorldsTabs />
      <Suspense fallback={<div className="h-[40rem] animate-pulse bg-surface" />}>
        <MatchContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function loadMatch() {
  await connection(); // a situação da série depende da hora da requisição
  const result = await load(() => Promise.all([getSchedule(), getGames()]));
  return { result, now: Date.now() };
}

async function MatchContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ matchId }, { jogo }] = await Promise.all([params, searchParams]);
  const [{ result, now }, data, nameIndex] = await Promise.all([loadMatch(), getStaticData(), getNameIndex()]);
  if (!result.ok) return <LeaguepediaErrorBox error={result.error} />;

  const [{ series: allSeries, teams }, allGames] = result.data;
  const series = allSeries.find((s) => s.slug === matchId);
  if (!series) notFound();

  const games = allGames.filter((g) => g.seriesId === series.id).sort((a, b) => a.number - b.number);
  const selected = games.find((g) => String(g.number) === jogo) ?? games[0];
  const basePath = `${WORLDS_2026.basePath}/match/${series.slug}`;

  return (
    <div className="space-y-6">
      <SeriesHeader series={series} teams={teams} now={now} />

      {games.length === 0 ? (
        <p className="border border-line p-8 text-center text-muted">
          {seriesStatus(series, now) === "upcoming"
            ? "Esta série ainda não começou."
            : "Os jogos desta série ainda não têm estatísticas na Leaguepedia."}
        </p>
      ) : (
        <>
          <nav className="flex w-fit flex-wrap gap-1 border border-line bg-surface p-1">
            {games.map((g) => {
              const winner = g.winner === 1 ? g.blue.name : g.red.name;
              return (
                <Link
                  key={g.id}
                  href={g.number === 1 ? basePath : `${basePath}?jogo=${g.number}`}
                  className={pill(g === selected)}
                >
                  Jogo {g.number} <span className="text-xs text-muted">· {teams[winner]?.short ?? winner}</span>
                </Link>
              );
            })}
          </nav>
          <GameDetail game={selected} teams={teams} icons={makeIcons(data, nameIndex)} />
        </>
      )}
    </div>
  );
}

function SeriesHeader({ series, teams, now }: { series: Series; teams: Record<string, Team>; now: number }) {
  const side = (name: string, n: 1 | 2) => (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row ${n === 1 ? "sm:flex-row-reverse" : ""} ${
        series.winner && series.winner !== n ? "opacity-50" : ""
      }`}
    >
      <TeamLogo team={teams[name]} size={56} />
      <div className={`min-w-0 text-center ${n === 1 ? "sm:text-right" : "sm:text-left"}`}>
        <p className="truncate text-lg font-bold">{isTbd(name) ? "A definir" : (teams[name]?.short ?? name)}</p>
        <p className="hidden truncate text-xs text-muted sm:block">{isTbd(name) ? "" : (teams[name]?.name ?? name)}</p>
      </div>
    </div>
  );
  return (
    <div className="space-y-3 border border-line bg-surface p-4">
      <p className="text-center text-xs text-muted">
        {stageLabel(series.stage)} · {tabLabel(series.tab)} · {formatDay(series.startsAt)},{" "}
        {formatTime(series.startsAt)} · Bo{series.bestOf}
      </p>
      <div className="flex items-center gap-4">
        {side(series.team1, 1)}
        <div className="shrink-0 text-center">
          <p className="text-3xl font-bold tabular-nums">
            {series.score1 ?? "–"} <span className="text-muted">:</span> {series.score2 ?? "–"}
          </p>
          <StatusBadge status={seriesStatus(series, now)} bestOf={series.bestOf} />
        </div>
        {side(series.team2, 2)}
      </div>
    </div>
  );
}
