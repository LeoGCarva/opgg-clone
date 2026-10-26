import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BracketTabs, RoleTabs } from "@/components/champions/filters";
import { TierBadge } from "@/components/champions/tier-badge";
import { roleLabel, winRateClass } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import { championSlug, ddragonUrl, getStaticData } from "@/lib/ddragon";
import { getTierList, isGlobalBracket, isRole } from "@/lib/services/global-stats";

export const metadata: Metadata = { title: "Tier list de campeões · opgg clone" };

export default function ChampionsPage({ searchParams }: PageProps<"/champions">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Tier list</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-zinc-900" />}>
        <TierListContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function TierListContent({ searchParams }: Pick<PageProps<"/champions">, "searchParams">) {
  const { bracket: bracketParam, role: roleParam } = await searchParams;
  const bracket = isGlobalBracket(bracketParam) ? bracketParam : "all";
  const role = isRole(roleParam) ? roleParam : undefined;

  const [list, data] = await Promise.all([getTierList(bracket), getStaticData()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
        <RoleTabs basePath="/champions" active={role} bracket={bracket} />
        <BracketTabs basePath="/champions" active={bracket} role={role} />
      </div>

      {!list ? (
        <p className="rounded-lg border border-zinc-800 p-8 text-center text-zinc-500">
          Ainda não há partidas coletadas. Rode <code className="text-zinc-300">pnpm collect</code> para
          começar a coletar.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            Patch {list.patch} · {list.totalMatches.toLocaleString("pt-BR")} partidas ranqueadas Solo/Duo ·
            mínimo de {list.minGames} partidas por campeão/rota
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-zinc-900 text-xs text-zinc-500">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
                  <th className="w-10 text-left">#</th>
                  <th className="w-12 text-left">Tier</th>
                  <th className="text-left">Campeão</th>
                  <th className="text-right">Vitórias</th>
                  <th className="text-right">Escolha</th>
                  <th className="text-right">Banimento</th>
                  <th className="text-right">Partidas</th>
                </tr>
              </thead>
              <tbody>
                {list.entries
                  .filter((e) => !role || e.role === role)
                  .map((e, i) => {
                    const champion = data.champions[e.championId];
                    const slug = championSlug(data, e.championId);
                    const query = new URLSearchParams({ role: e.role, ...(bracket !== "all" && { bracket }) });
                    return (
                      <tr key={`${e.championId}-${e.role}`} className="border-t border-zinc-800 hover:bg-zinc-900/60 [&>td]:px-3 [&>td]:py-2">
                        <td className="text-zinc-500">{i + 1}</td>
                        <td>
                          <TierBadge tier={e.tier} />
                        </td>
                        <td>
                          <Link href={`/champions/${slug}?${query}`} className="flex items-center gap-2.5 hover:underline">
                            <GameIcon
                              src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
                              alt={champion?.name ?? "Campeão"}
                              size={32}
                              className="rounded-full"
                            />
                            <span>
                              <span className="block font-medium">{champion?.name ?? e.championId}</span>
                              <span className="block text-xs text-zinc-500">{roleLabel(e.role)}</span>
                            </span>
                          </Link>
                        </td>
                        <td className={`text-right ${winRateClass(e.winRate * 100)}`}>{pct(e.winRate)}</td>
                        <td className="text-right text-zinc-300">{pct(e.pickRate)}</td>
                        <td className="text-right text-zinc-300">{pct(e.banRate)}</td>
                        <td className="text-right text-zinc-500">{e.games.toLocaleString("pt-BR")}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
