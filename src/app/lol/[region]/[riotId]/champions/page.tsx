import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlayerChampionsSkeleton } from "@/components/profile/profile-skeleton";
import { ChampionTable } from "@/components/profile/champion-table";
import { QueueTabs } from "@/components/profile/queue-tabs";
import { getStaticData } from "@/lib/ddragon";
import { parseRiotIdSlug } from "@/lib/riot/riot-id";
import { getPlayerChampionBuilds, getPlayerChampionStats } from "@/lib/services/champion-stats";
import { loadProfile, parseProfileRoute, RiotErrorBox } from "../shared";

type Props = PageProps<"/lol/[region]/[riotId]/champions">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const riotId = parseRiotIdSlug((await params).riotId);
  return { title: riotId ? `Campeões de ${riotId.gameName}#${riotId.tagLine} · rubra` : "rubra" };
}

export default function PlayerChampionsPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<PlayerChampionsSkeleton />}>
        <ChampionsContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ChampionsContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await connection();
  const [{ region, riotId: slug }, { queue: queueParam }] = await Promise.all([params, searchParams]);
  const { platform, riotId, queue, basePath } = parseProfileRoute(region, slug, queueParam);

  const [result, data] = await Promise.all([loadProfile(platform, riotId, { queue }), getStaticData()]);
  if (!result.ok) return <RiotErrorBox error={result.error} />;

  const { account } = result.profile;
  const [stats, builds] = await Promise.all([
    getPlayerChampionStats(account.puuid, { queue }),
    getPlayerChampionBuilds(account.puuid, data.items, { queue }),
  ]);
  const totalGames = stats.reduce((sum, s) => sum + s.games, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href={basePath} className="text-sm text-muted hover:text-ink-soft">
          ← {account.gameName}#{account.tagLine}
        </Link>
        <h1 className="text-2xl font-bold">Campeões</h1>
      </header>

      <QueueTabs basePath={`${basePath}/champions`} active={queue} />

      {stats.length ? (
        <ChampionTable stats={stats} builds={builds} data={data} />
      ) : (
        <p className="border border-line p-6 text-center text-muted">
          Nenhuma partida nessa fila.
        </p>
      )}

      <p className="text-center text-xs text-muted">
        Baseado em {totalGames} partida{totalGames === 1 ? "" : "s"} salva{totalGames === 1 ? "" : "s"}
        {queue === "all" && " (sem Arena e remakes)"}. Use &ldquo;Carregar mais&rdquo; no{" "}
        <Link href={basePath} className="text-link hover:underline">
          perfil
        </Link>{" "}
        para incluir partidas mais antigas.
      </p>
    </div>
  );
}
