import Link from "next/link";
import { ddragonUrl, queueName, type StaticData } from "@/lib/ddragon";
import { toRiotIdSlug } from "@/lib/riot/riot-id";
import type { RegionSlug } from "@/lib/riot/routing";
import type { Participant, ProfileMatch } from "@/lib/services/profile";
import { formatDuration, kdaClass, kdaRatio, timeAgo } from "./format";
import { GameIcon } from "./game-icon";

type Props = {
  match: ProfileMatch;
  data: StaticData;
  region: RegionSlug;
  now: number;
};

export function MatchCard({ match, data, region, now }: Props) {
  const { me } = match;
  const v = data.version;
  // Partidas com menos de ~3,5 min terminam em "remake" e não contam vitória/derrota.
  const remake = match.gameDuration < 210;
  const outcome = remake ? "Remake" : me.win ? "Vitória" : "Derrota";
  const tone = remake
    ? "border-l-line-strong bg-surface"
    : me.win
      ? "border-l-win bg-win/5"
      : "border-l-loss bg-loss/5";
  const champion = data.champions[me.championId];
  const minutes = match.gameDuration / 60;
  const teams = [100, 200].map((teamId) => match.participants.filter((p) => p.teamId === teamId));

  return (
    <article
      className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border border-line border-l-4 p-3 sm:grid-cols-[7rem_auto_1fr_auto] ${tone}`}
    >
      <div className="col-span-2 flex items-baseline gap-2 text-xs sm:col-span-1 sm:flex-col sm:gap-1">
        <span className="font-semibold text-ink">{queueName(data, match.queueId)}</span>
        <span className="text-muted">{timeAgo(match.gameCreation, now)}</span>
        <span className={me.win && !remake ? "font-semibold text-win" : remake ? "text-muted" : "text-loss"}>
          {outcome}
        </span>
        <span className="text-muted">{formatDuration(match.gameDuration)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <GameIcon
            src={champion ? ddragonUrl.champion(v, champion.image) : null}
            alt={champion?.name ?? me.championName}
            size={52}
            className="rounded-full"
          />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-ink px-1 text-[10px] text-white">
            {me.champLevel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-0.5">
          {[me.summoner1Id, me.summoner2Id].map((id, i) => {
            const spell = data.spells[id];
            return (
              <GameIcon
                key={`s${i}`}
                src={spell ? ddragonUrl.spell(v, spell.image) : null}
                alt={spell?.name ?? "Feitiço"}
                size={24}
              />
            );
          })}
          {[me.keystoneId, me.secondaryStyleId].map((id, i) => {
            const rune = id ? data.runes[id] : undefined;
            return (
              <GameIcon
                key={`r${i}`}
                src={rune ? ddragonUrl.rune(rune.image) : null}
                alt={rune?.name ?? "Runa"}
                size={24}
                className="bg-ink p-0.5"
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-2">
        <div className="flex items-baseline gap-4">
          <p className="whitespace-nowrap font-display text-lg font-extrabold [font-stretch:112%]">
            {me.kills} <span className="text-muted">/</span>{""}
            <span className="text-loss">{me.deaths}</span>{""}
            <span className="text-muted">/</span> {me.assists}
          </p>
          <div className="text-xs text-muted">
            <p className={`font-bold ${kdaClass(me.kills, me.deaths, me.assists)}`}>{kdaRatio(me.kills, me.deaths, me.assists)} KDA</p>
            <p>
              {me.cs} CS ({(me.cs / minutes).toFixed(1)}/min)
            </p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {me.items.map((id, i) => (
            <GameIcon
              key={i}
              src={id ? ddragonUrl.item(v, id) : null}
              alt={data.items[id]?.name ?? "Item"}
              size={26}
              className={i === 6 ? "ml-1 rounded-full" : ""}
            />
          ))}
        </div>
      </div>

      <div className="col-span-2 hidden grid-cols-2 gap-x-3 text-xs sm:col-span-1 sm:grid">
        {teams.map((team, t) => (
          <ul key={t} className="space-y-0.5">
            {team.map((p) => (
              <PlayerRow key={p.puuid} p={p} data={data} region={region} isMe={p.puuid === me.puuid} />
            ))}
          </ul>
        ))}
      </div>
    </article>
  );
}

function PlayerRow({
  p,
  data,
  region,
  isMe,
}: {
  p: Participant;
  data: StaticData;
  region: RegionSlug;
  isMe: boolean;
}) {
  const champion = data.champions[p.championId];
  const name = p.riotIdGameName ?? "?";
  return (
    <li className="flex w-28 items-center gap-1">
      <GameIcon
        src={champion ? ddragonUrl.champion(data.version, champion.image) : null}
        alt={champion?.name ?? p.championName}
        size={16}
      />
      {p.riotIdGameName && p.riotIdTagline && !isMe ? (
        <Link
          href={`/lol/${region}/${toRiotIdSlug({ gameName: p.riotIdGameName, tagLine: p.riotIdTagline })}`}
          className="truncate text-muted hover:text-ink hover:underline"
          title={`${p.riotIdGameName}#${p.riotIdTagline}`}
        >
          {name}
        </Link>
      ) : (
        <span className={`truncate ${isMe ? "font-semibold text-ink" : "text-muted"}`}>{name}</span>
      )}
    </li>
  );
}
