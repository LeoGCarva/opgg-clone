import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BracketCard } from "@/components/esports/series";
import { TeamLabel } from "@/components/esports/team";
import { LeaguepediaErrorBox, WorldsTabs } from "@/components/esports/worlds-tabs";
import type { Series, Team } from "@/lib/esports/parse";
import {
  groupByTab,
  isSwissRound,
  KNOCKOUT_TABS,
  swissStandings,
  tabsInOrder,
  type SwissStatus,
} from "@/lib/esports/standings";
import { getSchedule, load, tabLabel } from "@/lib/esports/worlds";

export const metadata: Metadata = { title: "Worlds 2026 · Classificação · opgg clone" };

export default function WorldsStandingsPage() {
  return (
    <>
      <WorldsTabs active="standings" />
      <Suspense fallback={<div className="h-96 animate-pulse bg-surface" />}>
        <Standings />
      </Suspense>
    </>
  );
}

const STATUS: Record<SwissStatus, { label: string; className: string }> = {
  qualified: { label: "Classificado", className: "text-win" },
  alive: { label: "Na disputa", className: "text-muted" },
  eliminated: { label: "Eliminado", className: "text-loss" },
};

async function Standings() {
  await connection(); // lê o cache a cada requisição em vez de pré-renderizar no build
  const result = await load(getSchedule);
  if (!result.ok) return <LeaguepediaErrorBox error={result.error} />;
  const { series, teams } = result.data;

  const mainEvent = series.filter((s) => s.stage === "Main Event");
  const playIn = series.filter((s) => s.stage === "Play-In");
  const swiss = swissStandings(mainEvent);
  const knockout = groupByTab(mainEvent, KNOCKOUT_TABS);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Fase suíça</h2>
          <p className="text-xs text-muted">3 vitórias classificam para as quartas · 3 derrotas eliminam</p>
        </div>
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
                <th className="w-10 text-left">#</th>
                <th className="text-left">Time</th>
                <th className="text-center">V-D</th>
                <th className="hidden text-left sm:table-cell">Resultados</th>
                <th className="text-right">Situação</th>
              </tr>
            </thead>
            <tbody>
              {swiss.map((row, i) => (
                <tr key={row.team} className="border-t border-line [&>td]:px-3 [&>td]:py-2">
                  <td className="text-muted">{i + 1}</td>
                  <td className="max-w-0 w-full">
                    <TeamLabel name={row.team} teams={teams} full />
                  </td>
                  <td className="text-center font-semibold tabular-nums">
                    {row.wins}-{row.losses}
                  </td>
                  <td className="hidden sm:table-cell">
                    <div className="flex gap-1">
                      {row.results.map((r, j) => (
                        <span
                          key={j}
                          className={`flex h-5 w-5 items-center justify-center text-[10px] font-bold ${
                            r === "W" ? "bg-win/10 text-win" : "bg-loss/10 text-loss"
                          }`}
                        >
                          {r === "W" ? "V" : "D"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`text-right text-xs font-medium ${STATUS[row.status].className}`}>
                    {STATUS[row.status].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BracketSection title="Mata-mata" rounds={knockout} teams={teams} />

      <BracketSection
        title="Play-In"
        rounds={groupByTab(playIn, tabsInOrder(playIn))}
        teams={teams}
      />

      <BracketSection
        title="Rodadas da fase suíça"
        rounds={groupByTab(mainEvent, tabsInOrder(mainEvent.filter((s) => isSwissRound(s.tab))))}
        teams={teams}
      />
    </div>
  );
}

function BracketSection({
  title,
  rounds,
  teams,
  note,
}: {
  title: string;
  rounds: { tab: string; series: Series[] }[];
  teams: Record<string, Team>;
  note?: string;
}) {
  if (rounds.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {rounds.map((round) => (
          <div key={round.tab} className="flex w-56 shrink-0 flex-col gap-3">
            <h3 className="text-sm font-medium text-muted">{tabLabel(round.tab)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.series.map((s) => (
                <BracketCard key={s.id} series={s} teams={teams} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
