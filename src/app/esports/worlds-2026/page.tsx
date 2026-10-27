import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDay } from "@/components/esports/format";
import { SeriesRow } from "@/components/esports/series";
import { LeaguepediaErrorBox, pill, WorldsTabs } from "@/components/esports/worlds-tabs";
import { seriesStatus, type Series } from "@/lib/esports/parse";
import { getSchedule, load, stageLabel, tabLabel, WORLDS_2026 } from "@/lib/esports/worlds";

export const metadata: Metadata = { title: "Worlds 2026 · Calendário · rubra" };

// ?fase= → nome da fase na Leaguepedia
const STAGES = { "play-in": "Play-In", "main-event": "Main Event" } as const;
type StageParam = keyof typeof STAGES;
const isStage = (value: unknown): value is StageParam => typeof value === "string" && value in STAGES;

export default function WorldsCalendarPage({ searchParams }: PageProps<"/esports/worlds-2026">) {
  return (
    <>
      <WorldsTabs active="calendar" />
      <Suspense fallback={<div className="h-96 animate-pulse bg-surface" />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function loadCalendar() {
  await connection(); // a situação das séries depende da hora da requisição
  const result = await load(getSchedule);
  return { result, now: Date.now() };
}

async function Calendar({ searchParams }: Pick<PageProps<"/esports/worlds-2026">, "searchParams">) {
  const { fase } = await searchParams;
  const stage = isStage(fase) ? STAGES[fase] : undefined;
  const { result, now } = await loadCalendar();
  if (!result.ok) return <LeaguepediaErrorBox error={result.error} />;

  const { series, teams } = result.data;
  const shown = series.filter((s) => !stage || s.stage === stage);

  // Agrupa por dia (no fuso de Brasília), mantendo a ordem cronológica.
  const days = new Map<string, Series[]>();
  for (const s of shown) {
    const day = formatDay(s.startsAt);
    days.set(day, [...(days.get(day) ?? []), s]);
  }
  const next = shown.find((s) => seriesStatus(s, now) !== "finished");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex w-fit flex-wrap gap-1 border border-line bg-surface p-1">
          <Link href={WORLDS_2026.basePath} className={pill(!stage)}>
            Todas as fases
          </Link>
          {(Object.keys(STAGES) as StageParam[]).map((key) => (
            <Link key={key} href={`${WORLDS_2026.basePath}?fase=${key}`} className={pill(stage === STAGES[key])}>
              {stageLabel(STAGES[key])}
            </Link>
          ))}
        </nav>
        {next && (
          <a href="#proximas" className="text-sm text-link hover:underline">
            Ir para as próximas séries ↓
          </a>
        )}
      </div>

      {shown.length === 0 && <p className="text-muted">Nenhuma série encontrada.</p>}

      {[...days].map(([day, list]) => (
        <section key={day} id={next && list.includes(next) ? "proximas" : undefined} className="scroll-mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-ink-soft">{day}</h2>
          <div className="overflow-hidden border border-line">
            {list.map((s) => (
              <SeriesRow
                key={s.id}
                series={s}
                teams={teams}
                status={seriesStatus(s, now)}
                label={`${stageLabel(s.stage)} · ${tabLabel(s.tab)}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
