import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WorldsListSkeleton } from "@/components/esports/skeletons";
import { pct } from "@/components/esports/format";
import { LeaguepediaErrorBox, pill, WorldsTabs } from "@/components/esports/worlds-tabs";
import { formatDuration, winRateClass } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import { getNameIndex, getStaticData } from "@/lib/ddragon";
import { makeIcons } from "@/lib/esports/icons";
import {
  CHAMPION_SORTS,
  championKda,
  championStats,
  isChampionSort,
  sortChampionStats,
  tournamentSummary,
  type ChampionSort,
} from "@/lib/esports/tournament-stats";
import { getGames, load, WORLDS_2026 } from "@/lib/esports/worlds";

export const metadata: Metadata = { title: "Worlds 2026 · Estatísticas · rubra" };

type Props = PageProps<"/esports/worlds-2026/stats">;

export default function WorldsStatsPage({ searchParams }: Props) {
  return (
    <>
      <WorldsTabs active="stats" />
      <Suspense fallback={<WorldsListSkeleton />}>
        <Stats searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Stats({ searchParams }: Pick<Props, "searchParams">) {
  const { ordem } = await searchParams;
  const sort: ChampionSort = isChampionSort(ordem) ? ordem : "presenca";
  const [result, data, nameIndex] = await Promise.all([load(getGames), getStaticData(), getNameIndex()]);
  if (!result.ok) return <LeaguepediaErrorBox error={result.error} />;

  const games = result.data;
  if (games.length === 0) return <p className="text-muted">Ainda não há jogos com estatísticas.</p>;

  const summary = tournamentSummary(games);
  const champions = sortChampionStats(championStats(games), sort);
  const icons = makeIcons(data, nameIndex);
  const cards = [
    ["Jogos", summary.games],
    ["Duração média", formatDuration(summary.avgDurationSec)],
    ["Vitórias do lado azul", pct(summary.blueWinRate)],
    ["Campeões escolhidos", summary.championsPicked],
    ["Campeões banidos", summary.championsBanned],
  ] as const;
  const href = (s: ChampionSort) => `${WORLDS_2026.basePath}/stats${s === "presenca" ? "" : `?ordem=${s}`}`;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-line bg-surface p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Ordenar por</span>
        <nav className="flex flex-wrap gap-1 border border-line bg-surface p-1">
          {(Object.keys(CHAMPION_SORTS) as ChampionSort[]).map((s) => (
            <Link key={s} href={href(s)} className={pill(s === sort)}>
              {CHAMPION_SORTS[s]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
              <th className="w-10 text-left">#</th>
              <th className="text-left">Campeão</th>
              <th className="text-right">Presença</th>
              <th className="text-right">Escolhas</th>
              <th className="text-right">Bans</th>
              <th className="text-right">Vitórias</th>
              <th className="text-right">KDA</th>
            </tr>
          </thead>
          <tbody>
            {champions.map((e, i) => {
              const champion = icons.champion(e.champion);
              const label = (
                <span className="flex items-center gap-2.5">
                  <GameIcon src={champion.src} alt={champion.name} size={32} className="rounded-full" />
                  <span className="font-medium">{champion.name}</span>
                </span>
              );
              return (
                <tr key={e.champion} className="border-t border-line hover:bg-canvas [&>td]:px-3 [&>td]:py-2">
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    {champion.slug ? (
                      <Link href={`/champions/${champion.slug}`} className="hover:underline">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                  </td>
                  <td className="text-right font-medium">{pct(e.presence)}</td>
                  <td className="text-right text-ink-soft">{e.picks}</td>
                  <td className="text-right text-ink-soft">{e.bans}</td>
                  <td className="text-right">
                    {e.picks ? (
                      <>
                        <span className={winRateClass(e.winRate * 100)}>{pct(e.winRate)}</span>
                        <span className="block text-xs text-muted">
                          {e.wins}V {e.picks - e.wins}D
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums text-ink-soft">
                    {e.picks ? championKda(e).toFixed(2) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
