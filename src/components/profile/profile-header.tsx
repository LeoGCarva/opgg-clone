import { refreshAction } from "@/app/lol/[region]/[riotId]/actions";
import { ddragonUrl } from "@/lib/ddragon";
import type { Profile } from "@/lib/services/profile";
import { timeAgo } from "./format";
import { GameIcon } from "./game-icon";
import { RefreshButton } from "./refresh-button";

type Props = {
  account: Profile["account"];
  version: string;
  now: number;
};

export function ProfileHeader({ account, version, now }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-5">
      <div className="relative">
        <GameIcon
          src={account.profileIconId ? ddragonUrl.profileIcon(version, account.profileIconId) : null}
          alt="Ícone de perfil"
          size={88}
          className=""
        />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-2 border-ink bg-accent px-2 text-xs font-bold text-ink">
          {account.summonerLevel}
        </span>
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl sm:text-[56px]">
          {account.gameName}
          <span className="ml-2 font-sans text-2xl font-semibold normal-case tracking-normal text-muted">#{account.tagLine}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton action={refreshAction.bind(null, account.platform, account.puuid)} />
          {account.lastRefreshedAt && (
            <span className="text-xs text-muted">
              Atualizado {timeAgo(account.lastRefreshedAt, now)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
