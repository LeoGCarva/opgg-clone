import { ddragonUrl, type StaticData } from "@/lib/ddragon";
import type { ChampionBuild, Choice } from "@/lib/services/champion-build";
import type { PlayerChampionStats } from "@/lib/services/champion-stats";
import { kdaRatio, roleLabel, winRate, winRateClass } from "./format";
import { GameIcon } from "./game-icon";

type Props = {
  stats: PlayerChampionStats[];
  builds: Map<number, ChampionBuild>;
  data: StaticData;
};

/** Todos os campeões do jogador; cada linha abre a build que ele mais usa. */
export function ChampionTable({ stats, builds, data }: Props) {
  return (
    <div className="overflow-hidden border border-line">
      <div className="hidden grid-cols-[2rem_1fr_4rem_5rem_6rem_5rem_5rem] gap-3 bg-surface px-4 py-2 text-xs text-muted md:grid">
        <span>#</span>
        <span>Campeão</span>
        <span className="text-right">Jogos</span>
        <span className="text-right">Vitórias</span>
        <span className="text-right">KDA</span>
        <span className="text-right">CS/min</span>
        <span className="text-right">Dano</span>
      </div>
      {stats.map((s, i) => {
        const champion = data.champions[s.championId];
        const wr = winRate(s.wins, s.games - s.wins);
        const build = builds.get(s.championId);
        return (
          <details key={s.championId} className="group border-t border-line first:border-t-0 md:first:border-t">
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-sm hover:bg-canvas md:grid-cols-[2rem_1fr_4rem_5rem_6rem_5rem_5rem]">
              <span className="hidden text-muted md:block">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                <GameIcon
                  src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
                  alt={champion?.name ?? "Campeão"}
                  size={32}
                  className="rounded-full"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{champion?.name ?? s.championId}</span>
                  <span className="block text-xs text-muted">{roleLabel(s.role)}</span>
                </span>
                <span className="ml-auto text-muted transition group-open:rotate-90 md:ml-1">›</span>
              </span>
              <span className="text-right text-xs text-muted md:hidden">
                {s.games}j · <span className={winRateClass(wr)}>{wr}%</span> ·{" "}
                {kdaRatio(s.kills, s.deaths, s.assists)}
              </span>
              <span className="hidden text-right md:block">{s.games}</span>
              <span className={`hidden text-right md:block ${winRateClass(wr)}`}>
                {wr}%<span className="ml-1 text-xs text-muted">({s.wins}V)</span>
              </span>
              <span className="hidden text-right md:block">
                {kdaRatio(s.kills, s.deaths, s.assists)}
                <span className="block text-xs text-muted">
                  {s.kills.toFixed(1)}/{s.deaths.toFixed(1)}/{s.assists.toFixed(1)}
                </span>
              </span>
              <span className="hidden text-right md:block">{s.csPerMin.toFixed(1)}</span>
              <span className="hidden text-right md:block">{(s.damage / 1000).toFixed(1)}k</span>
            </summary>
            {build && <BuildDetails build={build} data={data} />}
          </details>
        );
      })}
    </div>
  );
}

function share(choice: Choice<unknown>, total: number) {
  return `${Math.round((choice.games / total) * 100)}% das partidas · ${winRate(choice.wins, choice.games - choice.wins)}% WR`;
}

function BuildDetails({ build, data }: { build: ChampionBuild; data: StaticData }) {
  const v = data.version;
  const keystone = build.runes ? data.runes[build.runes.value.keystoneId] : undefined;
  const secondary = build.runes ? data.runes[build.runes.value.secondaryStyleId] : undefined;

  return (
    <div className="grid gap-4 bg-surface px-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <BuildBlock title="Itens mais usados">
        {build.items.length ? (
          <div className="flex flex-wrap gap-1.5">
            {build.items.map((it) => (
              <div key={it.value} className="flex flex-col items-center gap-0.5">
                <GameIcon src={ddragonUrl.item(v, it.value)} alt={data.items[it.value]?.name ?? "Item"} size={32} />
                <span className="text-[10px] text-muted">{Math.round((it.games / build.games) * 100)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </BuildBlock>

      <BuildBlock title="Bota">
        {build.boots ? (
          <div className="flex items-center gap-2">
            <GameIcon src={ddragonUrl.item(v, build.boots.value)} alt={data.items[build.boots.value]?.name ?? "Bota"} size={32} />
            <span className="text-xs text-muted">
              {data.items[build.boots.value]?.name}
              <span className="block text-muted">{share(build.boots, build.games)}</span>
            </span>
          </div>
        ) : (
          <Empty text="Não terminou partidas com bota" />
        )}
      </BuildBlock>

      <BuildBlock title="Runas">
        {build.runes && keystone ? (
          <div className="flex items-center gap-2">
            <GameIcon src={ddragonUrl.rune(keystone.image)} alt={keystone.name} size={32} className="bg-ink" />
            {secondary && (
              <GameIcon src={ddragonUrl.rune(secondary.image)} alt={secondary.name} size={22} className="bg-ink p-0.5" />
            )}
            <span className="text-xs text-muted">
              {keystone.name}
              <span className="block text-muted">{share(build.runes, build.games)}</span>
            </span>
          </div>
        ) : (
          <Empty />
        )}
      </BuildBlock>

      <BuildBlock title="Feitiços">
        {build.spells ? (
          <div className="flex items-center gap-2">
            {build.spells.value.map((id) => {
              const spell = data.spells[id];
              return (
                <GameIcon
                  key={id}
                  src={spell ? ddragonUrl.spell(v, spell.image) : null}
                  alt={spell?.name ?? "Feitiço"}
                  size={28}
                />
              );
            })}
            <span className="text-xs text-muted">{share(build.spells, build.games)}</span>
          </div>
        ) : (
          <Empty />
        )}
      </BuildBlock>
    </div>
  );
}

function BuildBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text = "Sem dados suficientes" }: { text?: string }) {
  return <p className="text-xs text-muted">{text}</p>;
}
