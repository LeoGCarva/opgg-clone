import { formatDuration, kdaRatio } from "@/components/profile/format";
import { GameIcon } from "@/components/profile/game-icon";
import type { Icons, IconRef } from "@/lib/esports/icons";
import type { Game, GamePlayer, Team, TeamGameStats } from "@/lib/esports/parse";
import { formatGold } from "./format";
import { TeamLogo } from "./team";

const ROLE_PT: Record<string, string> = { Top: "Topo", Jungle: "Selva", Mid: "Meio", Bot: "Atirador", Support: "Suporte" };

function Icon({ icon, size, className }: { icon: IconRef; size: number; className?: string }) {
  return <GameIcon src={icon.src} alt={icon.name} size={size} className={className} />;
}

/** Um jogo da série: placar dos dois lados, picks/bans, objetivos e os 10 jogadores. */
export function GameDetail({ game, teams, icons }: { game: Game; teams: Record<string, Team>; icons: Icons }) {
  const sides = [
    { side: 1 as const, stats: game.blue, label: "Lado azul", accent: "border-link/40" },
    { side: 2 as const, stats: game.red, label: "Lado vermelho", accent: "border-loss/40" },
  ];
  const maxDamage = Math.max(1, ...game.players.map((p) => p.damage));
  const minutes = game.durationSec / 60;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Jogo {game.number} · {formatDuration(game.durationSec)} · Patch {game.patch}
      </p>
      {sides.map(({ side, stats, label, accent }) => (
        <section key={side} className={`overflow-hidden border border-line border-l-4 ${accent}`}>
          <TeamHeader stats={stats} team={teams[stats.name]} label={label} won={game.winner === side} icons={icons} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="text-xs text-muted">
                <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:font-normal">
                  <th className="text-left">Jogador</th>
                  <th className="text-center">KDA</th>
                  <th className="text-right">CS</th>
                  <th className="text-right">Ouro</th>
                  <th className="w-32 text-left">Dano</th>
                  <th className="text-left">Itens</th>
                </tr>
              </thead>
              <tbody>
                {game.players
                  .filter((p) => p.side === side)
                  .map((p) => (
                    <PlayerRow key={p.name} player={p} icons={icons} maxDamage={maxDamage} minutes={minutes} />
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function TeamHeader({
  stats,
  team,
  label,
  won,
  icons,
}: {
  stats: TeamGameStats;
  team: Team | undefined;
  label: string;
  won: boolean;
  icons: Icons;
}) {
  const objectives = [
    ["Abates", stats.kills],
    ["Ouro", formatGold(stats.gold)],
    ["Torres", stats.towers],
    ["Dragões", stats.dragons],
    ["Barões", stats.barons],
    ["Arautos", stats.heralds],
    ["Vastilarvas", stats.grubs],
  ] as const;
  return (
    <div className="flex flex-col gap-3 bg-surface px-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <TeamLogo team={team} size={32} />
        <div>
          <p className="font-semibold">
            {team?.name ?? stats.name}{" "}
            <span className={`ml-1 text-xs font-bold ${won ? "text-win" : "text-loss"}`}>
              {won ? "VITÓRIA" : "DERROTA"}
            </span>
          </p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {objectives.map(([name, value]) => (
          <div key={name} className="flex gap-1">
            <dt className="text-muted">{name}</dt>
            <dd className="font-medium tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {stats.bans.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">Bans</span>
          {stats.bans.map((ban) => (
            <Icon key={ban} icon={icons.champion(ban)} size={24} className="opacity-60 grayscale" />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player: p,
  icons,
  maxDamage,
  minutes,
}: {
  player: GamePlayer;
  icons: Icons;
  maxDamage: number;
  minutes: number;
}) {
  const champion = icons.champion(p.champion);
  return (
    <tr className="border-t border-line [&>td]:px-3 [&>td]:py-2">
      <td>
        <div className="flex items-center gap-2">
          <Icon icon={champion} size={36} />
          <div className="grid grid-cols-2 gap-0.5">
            {p.spells.slice(0, 2).map((s) => (
              <Icon key={s} icon={icons.spell(s)} size={17} />
            ))}
            {p.keystone && <Icon icon={icons.rune(p.keystone)} size={17} className="rounded-full bg-ink" />}
            {p.secondaryTree && <Icon icon={icons.rune(p.secondaryTree)} size={17} className="p-0.5" />}
          </div>
          <div className="min-w-0" title={p.runes.join(", ")}>
            <p className="truncate font-medium">{p.name}</p>
            <p className="text-xs text-muted">
              {champion.name} · {ROLE_PT[p.role] ?? p.role}
            </p>
          </div>
        </div>
      </td>
      <td className="text-center">
        <p className="whitespace-nowrap tabular-nums">
          {p.kills} / <span className="text-loss">{p.deaths}</span> / {p.assists}
        </p>
        <p className="text-xs text-muted">{kdaRatio(p.kills, p.deaths, p.assists)}</p>
      </td>
      <td className="text-right tabular-nums">
        <p>{p.cs}</p>
        <p className="text-xs text-muted">{(p.cs / minutes).toFixed(1)}/min</p>
      </td>
      <td className="text-right tabular-nums text-ink-soft">{formatGold(p.gold)}</td>
      <td>
        <p className="text-xs tabular-nums text-ink-soft">{p.damage.toLocaleString("pt-BR")}</p>
        <div className="mt-1 h-1.5 bg-divider">
          <div className="h-full bg-stat-orange" style={{ width: `${(p.damage / maxDamage) * 100}%` }} />
        </div>
      </td>
      <td>
        <div className="flex gap-0.5">
          {p.items.map((item, i) => (
            <GameIcon
              key={i}
              src={item ? icons.item(item).src : null}
              alt={item ? icons.item(item).name : "Vazio"}
              size={26}
            />
          ))}
          <span className="ml-1">
            <GameIcon
              src={p.trinket ? icons.item(p.trinket).src : null}
              alt={p.trinket ? icons.item(p.trinket).name : "Sem trinket"}
              size={26}
              className="rounded-full"
            />
          </span>
        </div>
      </td>
    </tr>
  );
}
