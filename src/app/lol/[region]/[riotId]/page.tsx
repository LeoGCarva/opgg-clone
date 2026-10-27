import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChampionSummary } from "@/components/profile/champion-summary";
import { LoadMoreButton } from "@/components/profile/load-more-button";
import { MatchCard } from "@/components/profile/match-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { QueueTabs } from "@/components/profile/queue-tabs";
import { RankCard } from "@/components/profile/rank-card";
import { RememberSearch } from "@/components/remember-search";
import { ddragonUrl, getStaticData } from "@/lib/ddragon";
import { parseRiotIdSlug } from "@/lib/riot/riot-id";
import { getPlayerChampionStats } from "@/lib/services/champion-stats";
import { MATCHES_PAGE_SIZE, MAX_MATCHES_SHOWN } from "@/lib/services/profile";
import { loadMoreAction } from "./actions";
import { loadProfile, parseProfileRoute, RiotErrorBox } from "./shared";

type Props = PageProps<"/lol/[region]/[riotId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const riotId = parseRiotIdSlug((await params).riotId);
  return { title: riotId ? `${riotId.gameName}#${riotId.tagLine} · opgg clone` : "opgg clone" };
}

export default function ProfilePage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function parseLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return MATCHES_PAGE_SIZE;
  return Math.min(Math.max(n, MATCHES_PAGE_SIZE), MAX_MATCHES_SHOWN);
}

async function ProfileContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await connection(); // "há X minutos" depende da hora da requisição
  const [{ region, riotId: slug }, { queue: queueParam, n }] = await Promise.all([params, searchParams]);
  const route = parseProfileRoute(region, slug, queueParam);
  const { platform, queue, basePath } = route;
  const limit = parseLimit(n);

  const [result, data] = await Promise.all([
    loadProfile(platform, route.riotId, { queue, limit }),
    getStaticData(),
  ]);
  if (!result.ok) return <RiotErrorBox error={result.error} />;

  const { profile, now } = result;
  const { account, leagues, lpHistory, matches } = profile;
  const championStats = await getPlayerChampionStats(account.puuid, { queue });
  const championsHref = queue === "all" ? `${basePath}/champions` : `${basePath}/champions?queue=${queue}`;
  // Se veio a página cheia, pode haver mais partidas (no banco ou na Riot).
  const canLoadMore = matches.length >= limit && limit < MAX_MATCHES_SHOWN;

  return (
    <div className="space-y-8">
      <RememberSearch
        gameName={account.gameName}
        tagLine={account.tagLine}
        region={route.region}
        iconUrl={account.profileIconId ? ddragonUrl.profileIcon(data.version, account.profileIconId) : null}
      />
      <ProfileHeader account={account} version={data.version} now={now} />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <RankCard
            title="Ranqueada Solo/Duo"
            entry={leagues.find((l) => l.queueType === "RANKED_SOLO_5x5")}
            history={lpHistory.RANKED_SOLO_5x5}
          />
          <RankCard
            title="Ranqueada Flex"
            entry={leagues.find((l) => l.queueType === "RANKED_FLEX_SR")}
            history={lpHistory.RANKED_FLEX_SR}
          />
          <ChampionSummary stats={championStats} data={data} href={championsHref} />
        </aside>

        <section className="min-w-0 space-y-3">
          <QueueTabs basePath={basePath} active={queue} />
          {matches.length ? (
            matches.map((m) => (
              <MatchCard key={m.matchId} match={m} data={data} region={route.region} now={now} />
            ))
          ) : (
            <p className="border border-line p-6 text-center text-muted">
              Nenhuma partida nessa fila entre as últimas salvas.
            </p>
          )}
          {canLoadMore && (
            <LoadMoreButton
              action={loadMoreAction.bind(null, platform, account.puuid, basePath, queue, limit)}
            />
          )}
        </section>
      </div>

      <footer className="text-right text-xs">
        <Link href={`${basePath}/debug`} className="text-muted hover:text-muted">
          ver JSON cru da Riot
        </Link>
      </footer>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center gap-5">
        <div className="size-22 bg-divider" />
        <div className="h-8 w-56 bg-divider" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="h-24 bg-surface" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
