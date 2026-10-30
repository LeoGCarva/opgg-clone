import Link from "next/link";
import { ddragonUrl, type StaticData } from "@/lib/ddragon";
import type { PlayerChampionStats } from "@/lib/services/champion-stats";
import type { QueueFilter } from "@/lib/services/profile";
import { ChampionSummaryTabs } from "./champion-summary-tabs";
import { kdaRatio, winRate, winRateClass } from "./format";
import { GameIcon } from "./game-icon";

const SHOWN = 7;

/**
 * Card do perfil com os campeões mais jogados, com abas Todas/Solo/Flex próprias.
 * As três listas são renderizadas no servidor e só trocadas no cliente (o StaticData não vai para o navegador).
 */
export function ChampionSummary({
  stats,
  hrefs,
  initial,
  data,
}: {
  stats: Record<QueueFilter, PlayerChampionStats[]>;
  hrefs: Record<QueueFilter, string>;
  initial: QueueFilter;
  data: StaticData;
}) {
  const panels = {
    all: <ChampionList stats={stats.all} data={data} href={hrefs.all} />,
    solo: <ChampionList stats={stats.solo} data={data} href={hrefs.solo} />,
    flex: <ChampionList stats={stats.flex} data={data} href={hrefs.flex} />,
  };

  return (
    <section className="border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-muted">Campeões mais jogados</h2>
      <ChampionSummaryTabs initial={initial} panels={panels} />
    </section>
  );
}

function ChampionList({ stats, data, href }: { stats: PlayerChampionStats[]; data: StaticData; href: string }) {
  if (!stats.length) return <p className="mt-3 text-sm text-muted">Sem partidas nessa fila.</p>;

  return (
    <>
      <ul className="mt-3 space-y-2.5">
        {stats.slice(0, SHOWN).map((s) => {
          const champion = data.champions[s.championId];
          const wr = winRate(s.wins, s.games - s.wins);
          return (
            <li key={s.championId} className="flex items-center gap-3 text-sm">
              <GameIcon
                src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
                alt={champion?.name ?? "Campeão"}
                size={32}
                className="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{champion?.name ?? s.championId}</p>
                <p className="text-xs text-muted">{s.csPerMin.toFixed(1)} CS/min</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-ink-soft">{kdaRatio(s.kills, s.deaths, s.assists)}</p>
                <p className="text-muted">
                  <span className={winRateClass(wr)}>{wr}%</span> · {s.games}j
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href={href} className="mt-4 block text-center text-xs text-link hover:underline">
        Ver todos os campeões e builds
      </Link>
    </>
  );
}
