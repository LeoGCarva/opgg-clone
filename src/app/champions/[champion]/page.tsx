import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BracketTabs, RoleTabs } from "@/components/champions/filters";
import { TierBadge } from "@/components/champions/tier-badge";
import { roleLabel, winRate, winRateClass } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import { championIdBySlug, championSlug, ddragonUrl, getStaticData, type StaticData } from "@/lib/ddragon";
import {
  GLOBAL_BRACKETS,
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
const pct = (games: number, total: number) => `${((games / total) * 100).toFixed(1)}%`;

async function ChampionContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ champion: slug }, { bracket: bracketParam, role: roleParam }] = await Promise.all([params, searchParams]);
  const data = await getStaticData();
  const championId = championIdBySlug(data, slug);
  if (!championId) notFound();

  const bracket = isGlobalBracket(bracketParam) ? bracketParam : "all";
  const details = await getChampionDetails(championId, bracket, isRole(roleParam) ? roleParam : undefined);
  const champion = data.champions[championId];
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
              {roleLabel(details.role)} · Patch {details.patch} · {GLOBAL_BRACKETS[bracket]}
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
        <ChampionBuild details={details} data={data} />
      )}
    </div>
  );
}

function ChampionBuild({ details, data }: { details: ChampionDetails; data: StaticData }) {
  const { builds, games } = details;
  const v = data.version;
  const item = (id: number) => (
    <GameIcon key={id} src={ddragonUrl.item(v, id)} alt={data.items[id]?.name ?? "Item"} size={36} />
  );
  const ids = (key: string) => key.split("-").map(Number);
  const sortedMatchups = [...details.matchups].sort((a, b) => b.wins / b.games - a.wins / a.games);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Runas">
        <Options options={builds.runes} total={games} render={(key) => {
          const [keystoneId, styleId] = ids(key);
          const keystone = data.runes[keystoneId];
          const style = data.runes[styleId];
          return (
            <span className="flex items-center gap-2">
              {keystone && <GameIcon src={ddragonUrl.rune(keystone.image)} alt={keystone.name} size={36} className="bg-ink" />}
              {style && <GameIcon src={ddragonUrl.rune(style.image)} alt={style.name} size={24} className="bg-ink p-0.5" />}
              <span className="text-sm text-ink-soft">{keystone?.name}</span>
            </span>
          );
        }} />
      </Card>

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
          <span className="flex items-center gap-2">
            {item(Number(key))}
            <span className="text-sm text-ink-soft">{data.items[Number(key)]?.name}</span>
          </span>
        )} />
      </Card>

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
      </Card>

      <Card title="Habilidades" className="lg:col-span-2">
        <Options options={builds.skills} total={games} render={(key) => (
          <span className="flex items-center gap-1.5 font-mono font-bold">
            {key.split("-").map((slot, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted">›</span>}
                <span className="bg-divider px-2 py-1">{SKILL_KEYS[slot]}</span>
              </span>
            ))}
          </span>
        )} />
        {builds.skill_path[0] && <SkillPath path={builds.skill_path[0].key} />}
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
          <span className="shrink-0 text-right text-xs">
            <span className={winRateClass(winRate(o.wins, o.games - o.wins))}>{winRate(o.wins, o.games - o.wins)}% WR</span>
            <span className="block text-muted">
              {pct(o.games, total)} · {o.games} jogos
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Grade de 15 níveis com a skill escolhida em cada um. */
function SkillPath({ path }: { path: string }) {
  const levels = path.split("-");
  return (
    <div className="overflow-x-auto pt-2">
      <table className="text-center font-mono text-xs">
        <tbody>
          {["1", "2", "3", "4"].map((slot) => (
            <tr key={slot}>
              <th className="pr-2 text-muted">{SKILL_KEYS[slot]}</th>
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
