import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BracketTabs, RoleTabs, TierChips, ViewToggle } from "@/components/champions/filters";
import { href, type Query } from "@/components/champions/href";
import { TierBadge } from "@/components/champions/tier-badge";
import { TierSearch } from "@/components/champions/tier-search";
import { roleLabel } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import { championSlug, ddragonUrl, getStaticData, type StaticData } from "@/lib/ddragon";
import { getTierList, isGlobalBracket, isRole, type GlobalBracket } from "@/lib/services/global-stats";
import {
  filterTierEntries,
  isTierSort,
  parseTierFilter,
  tierFilterParam,
  TIER_SORTS,
  TIERS,
  type TierSort,
} from "@/lib/services/tier-filters";
import type { Tier, TierEntry } from "@/lib/services/tiers";

export const metadata: Metadata = { title: "Tier list de campeões · rubra" };

export default function ChampionsPage({ searchParams }: PageProps<"/champions">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<div className="mx-auto mt-8 h-96 max-w-[1240px] animate-pulse bg-surface" />}>
        <TierListContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

// Na tabela da tier list: vitória ≥ 52% em verde, < 49% em vermelho, o resto em ink.
function tierListWinClass(rate: number) {
  if (rate >= 0.52) return "text-win";
  if (rate < 0.49) return "text-loss";
  return "text-ink";
}
function tierListWinBar(rate: number) {
  if (rate >= 0.52) return "bg-win";
  if (rate < 0.49) return "bg-loss";
  return "bg-ink";
}
// Barra de 45% a 55% de vitória.
const barWidth = (rate: number) => `${Math.min(100, Math.max(4, (rate * 100 - 45) * 10))}%`;

async function TierListContent({ searchParams }: Pick<PageProps<"/champions">, "searchParams">) {
  const params = await searchParams;
  const bracket = isGlobalBracket(params.bracket) ? params.bracket : "all";
  const role = isRole(params.role) ? params.role : undefined;
  // "Por tier" é o padrão (sem parâmetro); a tabela é `?view=table`.
  const view = params.view === "table" ? "table" : "tiers";
  const viewQuery = view === "table" ? "table" : undefined;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 40) : "";
  const tiers = parseTierFilter(params.tier);
  const sort: TierSort = isTierSort(params.ordem) ? params.ordem : "tier";

  // `filters` vai junto nos links de rota/elo/visualização; `current` é a URL inteira.
  const filters: Query = { q: q || undefined, tier: tierFilterParam(tiers), ordem: sort === "tier" ? undefined : sort };
  const current: Query = { bracket: bracket === "all" ? undefined : bracket, role, view: viewQuery, ...filters };
  const filtered = !!(q || tiers.length);

  const [list, data] = await Promise.all([getTierList(bracket), getStaticData()]);
  const names = (id: number) => [data.champions[id]?.name, championSlug(data, id)].filter((n): n is string => !!n);
  const entries = list ? filterTierEntries(list.entries, { role, query: q, tiers, sort }, names) : [];

  return (
    <>
      <section className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-x-10 gap-y-4 px-6 pt-12 pb-8">
          <div className="flex flex-col gap-3">
            {list && (
              <p className="text-sm font-semibold text-muted">
                Patch {list.patch} · {list.totalMatches.toLocaleString("pt-BR")} partidas ranqueadas Solo/Duo
              </p>
            )}
            <h1 className="text-[clamp(48px,8vw,104px)] leading-[0.9]">Tier list</h1>
          </div>
          <p className="max-w-[360px] text-[15px] leading-normal text-pretty text-muted">
            Campeões ordenados por força no patch atual, a partir de taxa de vitória, escolha e banimento.
          </p>
        </div>
      </section>

      <section aria-label="Filtros" className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <RoleTabs basePath="/champions" active={role} bracket={bracket} view={viewQuery} query={filters} />
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
            <BracketTabs basePath="/champions" active={bracket} role={role} view={viewQuery} query={filters} />
            <ViewToggle basePath="/champions" active={view} bracket={bracket} role={role} query={filters} />
          </div>
        </div>
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-6 py-4">
          {/* Buscar volta rota/tier/ordem/visualização ao padrão; só o elo é mantido. */}
          <TierSearch basePath="/champions" defaultValue={q} query={{ bracket: current.bracket }} />
          <div className="lg:ml-auto">
            <TierChips basePath="/champions" active={tiers} query={{ ...current, tier: undefined }} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-6 pt-8 pb-20">
        {!list ? (
          <p className="border border-line bg-surface p-8 text-center text-muted">
            Ainda não há partidas coletadas. Rode <code className="text-ink">pnpm collect</code> para começar a
            coletar.
          </p>
        ) : filtered && !entries.length ? (
          <p className="border border-line bg-surface p-8 text-center text-muted">
            Nenhum campeão encontrado{q && <> para “{q}”</>}.{" "}
            <Link href={href("/champions", { ...current, q: undefined, tier: undefined })} className="font-semibold text-ink underline">
              Limpar filtros
            </Link>
          </p>
        ) : view === "tiers" ? (
          <TierBands entries={entries} data={data} bracket={bracket} tiers={tiers.length ? tiers : TIERS} hideEmpty={filtered} />
        ) : (
          <TierTable entries={entries} data={data} bracket={bracket} sort={sort} query={current} />
        )}

        {list && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 bg-win" aria-hidden="true" />
              Vitória a partir de 52%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 bg-loss" aria-hidden="true" />
              Vitória abaixo de 49%
            </span>
            <span>Mínimo de {list.minGames} partidas por campeão/rota</span>
          </div>
        )}
      </div>
    </>
  );
}

function championHref(data: StaticData, e: TierEntry, bracket: GlobalBracket) {
  const query = new URLSearchParams({ role: e.role, ...(bracket !== "all" && { bracket }) });
  return `/champions/${championSlug(data, e.championId)}?${query}`;
}

/** Cabeçalho que ordena a tabela; clicar no ativo volta para a ordem por tier. */
function SortHeader({ sort, active, query, className }: { sort: TierSort; active: TierSort; query: Query; className: string }) {
  const isActive = sort === active;
  return (
    <th className={className} aria-sort={isActive ? "descending" : undefined}>
      <Link
        href={href("/champions", { ...query, ordem: isActive || sort === "tier" ? undefined : sort })}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-ink ${isActive ? "text-ink" : ""}`}
      >
        {TIER_SORTS[sort]}
        <span aria-hidden="true" className={isActive ? "" : "invisible"}>
          ▼
        </span>
      </Link>
    </th>
  );
}

function TierTable({
  entries,
  data,
  bracket,
  sort,
  query,
}: {
  entries: TierEntry[];
  data: StaticData;
  bracket: GlobalBracket;
  sort: TierSort;
  query: Query;
}) {
  const header = (s: TierSort, className: string) => <SortHeader sort={s} active={sort} query={query} className={className} />;
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[820px] text-[15px]">
        <thead className="border-b-2 border-ink text-xs font-bold text-muted">
          <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:font-bold">
            <th className="w-14 text-left">#</th>
            <th className="text-left">Campeão</th>
            {header("tier", "w-20 text-left")}
            {header("vitoria", "w-40 text-left")}
            {header("escolha", "w-28 text-right")}
            {header("banimento", "w-32 text-right")}
            {header("partidas", "w-28 text-right")}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const champion = data.champions[e.championId];
            return (
              <tr key={`${e.championId}-${e.role}`} className="border-t border-divider hover:bg-canvas [&>td]:px-5 [&>td]:py-3">
                <td className="font-display text-lg font-extrabold text-muted">{i + 1}</td>
                <td>
                  <Link href={championHref(data, e, bracket)} className="flex items-center gap-3 hover:underline">
                    <GameIcon
                      src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
                      alt={champion?.name ?? "Campeão"}
                      size={44}
                      className="rounded-full"
                    />
                    <span>
                      <span className="block text-base font-bold">{champion?.name ?? e.championId}</span>
                      <span className="block text-[13px] text-muted">{roleLabel(e.role)}</span>
                    </span>
                  </Link>
                </td>
                <td>
                  <TierBadge tier={e.tier} />
                </td>
                <td>
                  <div className="flex flex-col gap-1.5">
                    <span className={`font-display text-base font-extrabold ${tierListWinClass(e.winRate)}`}>
                      {pct(e.winRate)}
                    </span>
                    <span className="h-1 bg-divider" aria-hidden="true">
                      <span className={`block h-1 ${tierListWinBar(e.winRate)}`} style={{ width: barWidth(e.winRate) }} />
                    </span>
                  </div>
                </td>
                <td className="text-right font-medium">{pct(e.pickRate)}</td>
                <td className="text-right font-medium">{pct(e.banRate)}</td>
                <td className="text-right text-muted">{e.games.toLocaleString("pt-BR")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TierBands({
  entries,
  data,
  bracket,
  tiers,
  hideEmpty,
}: {
  entries: TierEntry[];
  data: StaticData;
  bracket: GlobalBracket;
  tiers: readonly Tier[];
  hideEmpty: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {tiers.map((tier) => {
        const inTier = entries.filter((e) => e.tier === tier);
        if (hideEmpty && !inTier.length) return null;
        return (
          <section key={tier} aria-label={`Tier ${tier}`} className="flex min-h-24 border border-line bg-surface">
            <div className="flex w-[104px] shrink-0">
              <TierBadge tier={tier} size="lg" />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 px-5 py-4">
              {inTier.length === 0 && <span className="text-sm text-muted">Nenhum campeão neste tier.</span>}
              {inTier.map((e) => {
                const champion = data.champions[e.championId];
                return (
                  <Link
                    key={`${e.championId}-${e.role}`}
                    href={championHref(data, e, bracket)}
                    className="flex items-center gap-2.5 rounded-full border border-divider bg-canvas py-1.5 pr-3.5 pl-1.5 hover:border-ink"
                  >
                    <GameIcon
                      src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
                      alt=""
                      size={40}
                      className="rounded-full"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold">{champion?.name ?? e.championId}</span>
                      <span className={`text-xs font-semibold ${tierListWinClass(e.winRate)}`}>
                        {pct(e.winRate)} · {roleLabel(e.role)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
