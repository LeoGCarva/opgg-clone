import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { pill } from "@/components/champions/filters";
import { href, type Query } from "@/components/champions/href";
import { RegionSelect } from "@/components/leaderboard/region-select";
import { tierLabel } from "@/components/profile/format";
import { TierIcon } from "@/components/profile/tier-icon";
import { GameIcon } from "@/components/profile/game-icon";
import { ddragonUrl, getStaticData } from "@/lib/ddragon";
import { RiotApiError } from "@/lib/riot/client";
import { toRiotIdSlug } from "@/lib/riot/riot-id";
import { isRegionSlug, platformFromSlug, REGION_SLUGS, type RegionSlug } from "@/lib/riot/routing";
import {
  isLeaderboardTier,
  LEADERBOARD_TIERS,
  paginate,
  type LeaderboardEntry,
  type LeaderboardTierSlug,
} from "@/lib/services/leaderboard";
import { getLeaderboard, resolveNames, type Leaderboard, type PlayerName } from "@/lib/services/leaderboard-data";

export const metadata: Metadata = { title: "Ranking Solo/Duo · rubra" };

const BASE = "/leaderboard";
const PER_PAGE = 100;
const TIER_TABS: { slug: LeaderboardTierSlug; label: string }[] = [
  { slug: "desafiante", label: "Desafiante" },
  { slug: "grao-mestre", label: "Grão-Mestre" },
  { slug: "mestre", label: "Mestre" },
];
// Desafiante é o padrão e fica fora da URL (como BR em `region`).
const tierParam = (tier: LeaderboardTierSlug) => (tier === "desafiante" ? undefined : tier);

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

/** Mensagem para erros da Riot. O erro pode atravessar o `'use cache'`, então confere também pelo nome. */
function riotErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error) || !(error instanceof RiotApiError || error.name.startsWith("Riot"))) return null;
  if (error.name === "RiotAuthError") return "Chave da Riot inválida ou expirada. Gere outra no portal e atualize o .env.";
  const status = (error as Partial<RiotApiError>).status;
  return `A API da Riot respondeu ${status ?? "com erro"}. Tente de novo em instantes.`;
}

async function LeaderboardContent({ searchParams }: Pick<PageProps<"/leaderboard">, "searchParams">) {
  const params = await searchParams;
  const region: RegionSlug = typeof params.region === "string" && isRegionSlug(params.region) ? params.region : "br";
  const tier: LeaderboardTierSlug = isLeaderboardTier(params.tier) ? params.tier : "desafiante";
  const platform = platformFromSlug(region);
  const regionParam = region === "br" ? undefined : region;

  let board: Leaderboard;
  let tierEntries: LeaderboardEntry[];
  let names: Map<string, PlayerName>;
  let page;
  try {
    board = await getLeaderboard(platform);
    tierEntries = board.entries.filter((e) => e.tier === LEADERBOARD_TIERS[tier]);
    page = paginate(tierEntries, Number(params.page ?? 1), PER_PAGE);
    names = await resolveNames(
      platform,
      page.items.map((e) => e.puuid),
    );
  } catch (error) {
    const message = riotErrorMessage(error);
    if (!message) throw error;
    return (
      <>
        <Header region={region} tier={tier} />
        <div className="mx-auto max-w-[1240px] px-6 pt-8 pb-20">
          <div className="border border-loss/40 bg-loss/10 p-4 text-loss">{message}</div>
        </div>
      </>
    );
  }
  const data = await getStaticData();

  return (
    <>
      <Header region={region} tier={tier} count={tierEntries.length} fetchedAt={board.fetchedAt} />
      <div className="mx-auto max-w-[1240px] px-6 pt-8 pb-20">
        {page.items.length === 0 ? (
          <p className="border border-line bg-surface p-8 text-center text-muted">Nenhum jogador neste tier.</p>
        ) : (
          <LeaderboardTable entries={page.items} names={names} region={region} version={data.version} />
        )}
        {page.pages > 1 && (
          <Pagination page={page.page} pages={page.pages} query={{ region: regionParam, tier: tierParam(tier) }} />
        )}
        <p className="mt-5 text-[13px] text-muted">
          Nomes que o site ainda não conhecia são buscados na Riot ao abrir a página; os que não chegaram a tempo
          aparecem na próxima visita.
        </p>
      </div>
    </>
  );
}

function Header({
  region,
  tier,
  count,
  fetchedAt,
}: {
  region: RegionSlug;
  tier: LeaderboardTierSlug;
  count?: number;
  fetchedAt?: number;
}) {
  const regionParam = region === "br" ? undefined : region;
  const tierName = TIER_TABS.find((t) => t.slug === tier)!.label;
  return (
    <>
      <section className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-x-10 gap-y-4 px-6 pt-12 pb-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-muted">
              Solo/Duo · {region.toUpperCase()}
              {count != null && fetchedAt != null && (
                <>
                  {" "}
                  · {count.toLocaleString("pt-BR")} {count === 1 ? "jogador" : "jogadores"} no {tierName} · atualizado às{" "}
                  {timeFormat.format(fetchedAt)}
                </>
              )}
            </p>
            <h1 className="text-[clamp(48px,8vw,104px)] leading-[0.9]">Ranking</h1>
          </div>
          <p className="max-w-[360px] text-[15px] leading-normal text-pretty text-muted">
            Os melhores jogadores da região: Desafiante, Grão-Mestre e Mestre, por PDL. Atualiza a cada ~10 minutos.
          </p>
        </div>
      </section>

      <section aria-label="Filtros" className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <nav aria-label="Tier" className="flex flex-wrap gap-1.5">
            {TIER_TABS.map((t) => (
              <Link
                key={t.label}
                href={href(BASE, { region: regionParam, tier: tierParam(t.slug) })}
                aria-current={t.slug === tier ? "page" : undefined}
                className={`${pill(t.slug === tier)} gap-2`}
              >
                <TierIcon tier={LEADERBOARD_TIERS[t.slug]} size={20} />
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="lg:ml-auto">
            <RegionSelect basePath={BASE} regions={REGION_SLUGS} active={region} query={{ tier: tierParam(tier) }} />
          </div>
        </div>
      </section>
    </>
  );
}

// Vitória ≥ 55% em verde, < 50% em vermelho (no topo do ranking, 50% já é pouco).
function winClass(rate: number) {
  if (rate >= 0.55) return "text-win";
  if (rate < 0.5) return "text-loss";
  return "text-ink";
}
function winBar(rate: number) {
  if (rate >= 0.55) return "bg-win";
  if (rate < 0.5) return "bg-loss";
  return "bg-ink";
}
// Barra de 40% a 70% de vitória.
const barWidth = (rate: number) => `${Math.min(100, Math.max(4, (rate * 100 - 40) * (100 / 30)))}%`;

function LeaderboardTable({
  entries,
  names,
  region,
  version,
}: {
  entries: LeaderboardEntry[];
  names: Map<string, PlayerName>;
  region: RegionSlug;
  version: string;
}) {
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full text-[15px] sm:min-w-[720px]">
        <thead className="border-b-2 border-ink text-xs font-bold text-muted">
          <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:font-bold sm:[&>th]:px-5">
            <th className="w-10 text-left sm:w-14">#</th>
            <th className="text-left">Jogador</th>
            <th className="hidden w-32 text-left sm:table-cell">Tier</th>
            <th className="w-16 text-right sm:w-20">PDL</th>
            <th className="hidden w-28 text-right sm:table-cell">V / D</th>
            <th className="w-20 text-left sm:w-40">Vitória</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const name = names.get(e.puuid);
            const icon = name?.profileIconId ? ddragonUrl.profileIcon(version, name.profileIconId) : null;
            return (
              <tr key={e.puuid} className="border-t border-divider hover:bg-canvas [&>td]:px-3 [&>td]:py-2.5 sm:[&>td]:px-5">
                <td className="font-display text-lg font-extrabold text-muted">{e.position}</td>
                <td className="max-w-0 sm:max-w-none">
                  {name ? (
                    <Link href={`/lol/${region}/${toRiotIdSlug(name)}`} className="flex min-w-0 items-center gap-3 hover:underline">
                      <span className="hidden shrink-0 sm:block">
                        <GameIcon src={icon} alt="" size={36} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {name.gameName}
                          <span className="font-medium text-muted">#{name.tagLine}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[13px] text-muted sm:hidden">
                          <TierIcon tier={e.tier} size={14} />
                          {tierLabel(e.tier, "")}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3 text-muted">
                      <span className="hidden shrink-0 sm:block">
                        <GameIcon src={null} alt="" size={36} />
                      </span>
                      Carregando nome…
                    </span>
                  )}
                </td>
                <td className="hidden sm:table-cell">
                  <span className="flex items-center gap-2">
                    <TierIcon tier={e.tier} size={22} />
                    {tierLabel(e.tier, "")}
                  </span>
                </td>
                <td className="text-right font-display font-extrabold">{e.leaguePoints.toLocaleString("pt-BR")}</td>
                <td className="hidden text-right text-muted sm:table-cell">
                  <span className="text-win">{e.wins}</span> / <span className="text-loss">{e.losses}</span>
                </td>
                <td>
                  <div className="flex flex-col gap-1.5">
                    <span className={`font-display text-base font-extrabold ${winClass(e.winRate)}`}>{pct(e.winRate)}</span>
                    <span className="h-1 bg-divider" aria-hidden="true">
                      <span className={`block h-1 ${winBar(e.winRate)}`} style={{ width: barWidth(e.winRate) }} />
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Anterior · 1 … (atual ± 2) … última · Próxima. */
function Pagination({ page, pages, query }: { page: number; pages: number; query: Query }) {
  const link = (p: number) => href(BASE, { ...query, page: p === 1 ? undefined : String(p) });
  const shown = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  const arrow = "flex h-11 items-center border border-line-strong bg-surface px-4 text-sm font-semibold hover:border-ink";
  return (
    <nav aria-label="Páginas" className="mt-5 flex flex-wrap items-center gap-1.5">
      {page > 1 && (
        <Link href={link(page - 1)} className={arrow}>
          ← Anterior
        </Link>
      )}
      {shown.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - shown[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={link(p)} aria-current={p === page ? "page" : undefined} className={`${pill(p === page)} min-w-11 justify-center`}>
            {p}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={link(page + 1)} className={arrow}>
          Próxima →
        </Link>
      )}
    </nav>
  );
}
