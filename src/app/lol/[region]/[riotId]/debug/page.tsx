import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonBlock } from "@/components/json-block";
import { RiotApiError, RiotAuthError, RiotNotFoundError } from "@/lib/riot/client";
import { riotApi } from "@/lib/riot/endpoints";
import { parseRiotIdSlug, type RiotId } from "@/lib/riot/riot-id";
import { isRegionSlug, platformFromSlug, type Platform } from "@/lib/riot/routing";
import type { MatchDto } from "@/lib/riot/types";

type Params = PageProps<"/lol/[region]/[riotId]/debug">["params"];

// Debug: chama a Riot direto (sem banco) e mostra as respostas cruas. Útil para estudar os dados.
export default function DebugPage({ params }: PageProps<"/lol/[region]/[riotId]/debug">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileData params={params} />
      </Suspense>
    </main>
  );
}

async function fetchProfile(platform: Platform, riotId: RiotId) {
  const api = riotApi();
  const account = await api.getAccountByRiotId(platform, riotId);
  const [summoner, leagues, matchIds] = await Promise.all([
    api.getSummonerByPuuid(platform, account.puuid),
    api.getLeagueEntriesByPuuid(platform, account.puuid),
    api.getMatchIds(platform, account.puuid, { count: 5 }),
  ]);
  const matches = await Promise.all(matchIds.map((id) => api.getMatch(platform, id)));
  return { account, summoner, leagues, matchIds, matches };
}

async function ProfileData({ params }: { params: Params }) {
  const { region, riotId: slug } = await params;
  const riotId = parseRiotIdSlug(slug);
  if (!riotId || !isRegionSlug(region)) notFound();

  const platform = platformFromSlug(region);
  const result = await fetchProfile(platform, riotId).then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  if (!result.ok) {
    const { error } = result;
    if (error instanceof RiotNotFoundError) notFound();
    if (error instanceof RiotAuthError) {
      return <ErrorBox>Chave da Riot inválida ou expirada. Gere outra no portal e atualize o .env.</ErrorBox>;
    }
    if (error instanceof RiotApiError) {
      return <ErrorBox>A API da Riot respondeu {error.status}. Tente de novo em instantes.</ErrorBox>;
    }
    throw error;
  }

  const { account, summoner, leagues, matchIds, matches } = result.data;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">
        {account.gameName}
        <span className="text-muted">#{account.tagLine}</span>
        <span className="ml-3 align-middle text-sm font-normal uppercase text-muted">
          {region} · {platform}
        </span>
      </h1>

      <Section title="Account" endpoint="account-v1 /accounts/by-riot-id">
        <JsonBlock data={account} />
      </Section>
      <Section title="Summoner" endpoint="summoner-v4 /summoners/by-puuid">
        <JsonBlock data={summoner} />
      </Section>
      <Section title="League entries" endpoint="league-v4 /entries/by-puuid">
        <JsonBlock data={leagues} />
      </Section>
      <Section title="Match IDs" endpoint="match-v5 /matches/by-puuid/{puuid}/ids?count=5">
        <JsonBlock data={matchIds} />
      </Section>
      <Section title="Matches" endpoint="match-v5 /matches/{matchId}">
        <div className="space-y-2">
          {matches.map((match) => (
            <details
              key={match.metadata.matchId}
              className="border border-line open:bg-surface"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm">
                <MatchSummary match={match} puuid={account.puuid} />
              </summary>
              <div className="px-4 pb-4">
                <JsonBlock data={match} />
              </div>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}

function MatchSummary({ match, puuid }: { match: MatchDto; puuid: string }) {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  const minutes = Math.round(match.info.gameDuration / 60);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3">
      <span className={me?.win ? "font-semibold text-win" : "font-semibold text-loss"}>
        {me?.win ? "Vitória" : "Derrota"}
      </span>
      <span>{me?.championName}</span>
      <span className="font-mono">
        {me?.kills}/{me?.deaths}/{me?.assists}
      </span>
      <span className="text-muted">
        fila {match.info.queueId} · {minutes} min · {match.metadata.matchId}
      </span>
    </span>
  );
}

function Section({
  title,
  endpoint,
  children,
}: {
  title: string;
  endpoint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
        {title}
        <code className="text-xs font-normal text-muted">{endpoint}</code>
      </h2>
      {children}
    </section>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-loss/40 bg-loss/10 p-4 text-loss">{children}</div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-64 bg-divider" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-surface" />
      ))}
    </div>
  );
}
