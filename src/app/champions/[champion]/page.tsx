import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BracketTabs, RoleTabs } from "@/components/champions/filters";
import { RunePage } from "@/components/champions/rune-page";
import { TierBadge } from "@/components/champions/tier-badge";
import { roleLabel, winRate, winRateClass } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import {
  championIdBySlug,
  championSlug,
  ddragonUrl,
  getChampionSpells,
  getStaticData,
  type ChampionSpell,
  type StaticData,
} from "@/lib/ddragon";
import {
  BRACKET_SCOPE,
  getChampionDetails,
  isGlobalBracket,
  isRole,
  type BuildOption,
  type ChampionDetails,
} from "@/lib/services/global-stats";

type Props = PageProps<"/champions/[champion]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { champion } = await params;
  const data = await getStaticData();
  const id = championIdBySlug(data, champion);
  const name = id ? data.champions[id].name : champion;
  return { title: `${name}: build, runas e counters · opgg clone` };
}

export default function ChampionPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse bg-surface" />}>
        <ChampionContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const SKILL_KEYS: Record<string, string> = { "1": "Q", "2": "W", "3": "E", "4": "R" };
const RUNE_PAGE_LENGTH = 11; // ver runePage() em match-mapper.ts
const pct = (games: number, total: number) => `${((games / total) * 100).toFixed(1)}%`;

async function ChampionContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ champion: slug }, { bracket: bracketParam, role: roleParam }] = await Promise.all([params, searchParams]);
  const data = await getStaticData();
  const championId = championIdBySlug(data, slug);
  if (!championId) notFound();

  const bracket = isGlobalBracket(bracketParam) ? bracketParam : "all";
  const champion = data.champions[championId];
  const [details, spells] = await Promise.all([
    getChampionDetails(championId, bracket, isRole(roleParam) ? roleParam : undefined),
    // Sem ícones das habilidades a página ainda funciona (cai nas letras).
    getChampionSpells(champion.image.replace(/\.png$/, "")).catch(() => null),
  ]);
  const basePath = `/champions/${slug}`;

  return (
    <div className="space-y-6">
      <Link href="/champions" className="text-sm text-muted hover:text-ink-soft">
        ← Tier list
      </Link>

      <header className="flex flex-wrap items-center gap-5">
        <GameIcon src={ddragonUrl.champion(data.version, champion.image)} alt={champion.name} size={80} className="" />
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            {champion.name}
            {details?.summary && <TierBadge tier={details.summary.tier} />}
          </h1>
          {details && (
            <p className="text-sm text-muted">
              {roleLabel(details.role)} · Patch {details.patch} · {BRACKET_SCOPE[bracket]}
            </p>
          )}
        </div>
        {details && (
          <dl className="ml-auto grid grid-cols-4 gap-6 text-center">
            <Stat label="Vitórias" value={pct(details.wins, details.games)} className={winRateClass(winRate(details.wins, details.games - details.wins))} />
            <Stat label="Escolha" value={details.summary ? `${(details.summary.pickRate * 100).toFixed(1)}%` : "—"} />
            <Stat label="Banimento" value={details.summary ? `${(details.summary.banRate * 100).toFixed(1)}%` : "—"} />
            <Stat label="Partidas" value={details.games.toLocaleString("pt-BR")} />
          </dl>
        )}
      </header>

      <div className="flex flex-col gap-2 lg:flex-row lg:justify-between">
        {details ? (
          <RoleTabs basePath={basePath} active={details.role} bracket={bracket} roles={details.roles.map((r) => r.role)} allowAll={false} />
        ) : (
          <span />
        )}
        <BracketTabs basePath={basePath} active={bracket} role={details?.role} />
      </div>

      {!details ? (
        <p className="border border-line p-8 text-center text-muted">
          Sem partidas de {champion.name} coletadas nesse elo ainda.
        </p>
      ) : (
        <ChampionBuild details={details} data={data} spells={spells} />
      )}
    </div>
  );
}

function ChampionBuild({
  details,
  data,
  spells,
}: {
  details: ChampionDetails;
  data: StaticData;
  spells: ChampionSpell[] | null;
}) {
  const { builds, games } = details;
  const v = data.version;
  const item = (id: number) => (
    <GameIcon key={id} src={ddragonUrl.item(v, id)} alt={data.items[id]?.name ?? "Item"} size={36} />
  );
  const ids = (key: string) => key.split("-").map(Number);
  const sortedMatchups = [...details.matchups].sort((a, b) => b.wins / b.games - a.wins / a.games);
  // Agregações antigas guardavam só "keystone-árvore"; só desenha páginas completas.
  const runePages = builds.runes.filter((o) => ids(o.key).length === RUNE_PAGE_LENGTH);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Runas" className="lg:col-span-2">
        {runePages.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {runePages.map((o) => (
              <div key={o.key} className="space-y-3 border border-line p-3">
                <OptionStats option={o} total={games} inline />
                <RunePage page={ids(o.key)} data={data} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sem dados suficientes</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-2">
        <Card title="Feitiços">
          <Options options={builds.spells} total={games} render={(key) => (
            <span className="flex gap-1">
              {ids(key).map((id) => {
                const spell = data.spells[id];
                return <GameIcon key={id} src={spell ? ddragonUrl.spell(v, spell.image) : null} alt={spell?.name ?? "Feitiço"} size={36} />;
              })}
            </span>
          )} />
        </Card>

        <Card title="Itens iniciais">
          <Options options={builds.start} total={games} render={(key) => <span className="flex gap-1">{ids(key).map((id, i) => <span key={i}>{item(id)}</span>)}</span>} />
        </Card>

        <Card title="Bota">
          <Options options={builds.boots} total={games} render={(key) => (
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0">{item(Number(key))}</span>
              <span className="truncate text-sm text-ink-soft">{data.items[Number(key)]?.name}</span>
            </span>
          )} />
        </Card>
      </div>

      <Card title="Build principal (3 primeiros itens)" className="lg:col-span-2">
        <Options options={builds.core} total={games} render={(key) => (
          <span className="flex items-center gap-1.5">
            {ids(key).map((id, i) => (
              <span key={id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted">›</span>}
                {item(id)}
              </span>
            ))}
          </span>
        )} />
        <div className="grid grid-cols-1 gap-4 border-t border-line pt-3 sm:grid-cols-3">
          {(["item4", "item5", "item6"] as const).map((kind, i) => (
            <div key={kind} className="min-w-0 space-y-2">
              <h3 className="text-xs text-muted">{i + 4}º item</h3>
              <Options options={builds[kind]} total={games} render={(key) => item(Number(key))} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Habilidades" className="lg:col-span-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="lg:w-72 lg:shrink-0">
            <Options options={builds.skills} total={games} render={(key) => (
              <span className="flex items-center gap-1.5 font-mono font-bold">
                {key.split("-").map((slot, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-muted">›</span>}
                    <SkillIcon slot={slot} spells={spells} version={v} size={36} />
                  </span>
                ))}
              </span>
            )} />
          </div>
          {builds.skill_path[0] && <SkillPath path={builds.skill_path[0].key} spells={spells} version={v} />}
        </div>
      </Card>

      <Card title="Bom contra">
        <Matchups list={sortedMatchups.slice(0, 5)} data={data} />
      </Card>
      <Card title="Difícil contra">
        <Matchups list={sortedMatchups.slice(-5).reverse()} data={data} />
      </Card>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-lg font-semibold ${className}`}>{value}</dd>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    // min-w-0: sem isso a grade de habilidades (larga) estica a coluna inteira no celular.
    <section className={`min-w-0 space-y-3 border border-line bg-surface p-4 ${className}`}>
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Options({ options, total, render }: { options: BuildOption[]; total: number; render: (key: string) => React.ReactNode }) {
  if (!options.length) return <p className="text-sm text-muted">Sem dados suficientes</p>;
  return (
    <ul className="space-y-2">
      {options.map((o) => (
        <li key={o.key} className="flex items-center justify-between gap-4">
          {render(o.key)}
          <OptionStats option={o} total={total} />
        </li>
      ))}
    </ul>
  );
}

function OptionStats({ option: o, total, inline = false }: { option: BuildOption; total: number; inline?: boolean }) {
  const wr = winRate(o.wins, o.games - o.wins);
  return (
    <span className={`shrink-0 text-xs ${inline ? "flex justify-between" : "text-right"}`}>
      <span className={winRateClass(wr)}>{wr}% WR</span>
      <span className={`text-muted ${inline ? "" : "block"}`}>
        {pct(o.games, total)} · {o.games} jogos
      </span>
    </span>
  );
}

/** Ícone da habilidade com a tecla no canto; sem dados do Data Dragon, só a letra. */
function SkillIcon({ slot, spells, version, size }: { slot: string; spells: ChampionSpell[] | null; version: string; size: number }) {
  const key = SKILL_KEYS[slot];
  const spell = spells?.find((s) => s.key === key);
  if (!spell) {
    return (
      <span className="flex items-center justify-center bg-divider font-mono font-bold" style={{ width: size, height: size }}>
        {key}
      </span>
    );
  }
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <GameIcon src={ddragonUrl.spell(version, spell.image)} alt={`${key} · ${spell.name}`} size={size} />
      <span className="absolute right-0 bottom-0 bg-ink px-0.5 font-mono text-[10px] leading-tight font-bold text-white">
        {key}
      </span>
    </span>
  );
}

/** Grade de 15 níveis com a skill escolhida em cada um. */
function SkillPath({ path, spells, version }: { path: string; spells: ChampionSpell[] | null; version: string }) {
  const levels = path.split("-");
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="text-center font-mono text-xs">
        <tbody>
          {["1", "2", "3", "4"].map((slot) => (
            <tr key={slot}>
              <th className="pr-2">
                <SkillIcon slot={slot} spells={spells} version={version} size={24} />
              </th>
              {levels.map((s, i) => (
                <td key={i} className="p-0.5">
                  <span
                    className={`flex size-6 items-center justify-center ${
                      s === slot ? (slot === "4" ? "bg-stat-orange text-white" : "bg-ink text-white") : "bg-divider text-transparent"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Matchups({ list, data }: { list: ChampionDetails["matchups"]; data: StaticData }) {
  if (!list.length) return <p className="text-sm text-muted">Sem confrontos suficientes (mín. 3 partidas)</p>;
  return (
    <ul className="space-y-2">
      {list.map((m) => {
        const opponent = data.champions[m.opponentId];
        const wr = winRate(m.wins, m.games - m.wins);
        return (
          <li key={m.opponentId} className="flex items-center gap-3 text-sm">
            <GameIcon
              src={opponent ? ddragonUrl.champion(data.version, opponent.image) : null}
              alt={opponent?.name ?? "Campeão"}
              size={28}
              className="rounded-full"
            />
            <Link href={`/champions/${championSlug(data, m.opponentId)}`} className="flex-1 hover:underline">
              {opponent?.name ?? m.opponentId}
            </Link>
            <span className={winRateClass(wr)}>{wr}%</span>
            <span className="w-16 text-right text-xs text-muted">{m.games} jogos</span>
          </li>
        );
      })}
    </ul>
  );
}
