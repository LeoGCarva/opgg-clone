import type { leagueEntries } from "@/lib/db/schema";
import { tierLabel, winRate } from "./format";

type LeagueEntry = typeof leagueEntries.$inferSelect;

const TIER_COLORS: Record<string, string> = {
  IRON: "text-stone-400",
  BRONZE: "text-amber-700",
  SILVER: "text-slate-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-300",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-sky-300",
  MASTER: "text-fuchsia-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-amber-300",
};

export function RankCard({ title, entry }: { title: string; entry?: LeagueEntry }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
      {entry ? (
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className={`text-xl font-bold ${TIER_COLORS[entry.tier] ?? ""}`}>
              {tierLabel(entry.tier, entry.rank)}
            </p>
            <p className="text-sm text-zinc-300">{entry.leaguePoints} PDL</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-zinc-300">
              {entry.wins}V {entry.losses}D
            </p>
            <p className="text-zinc-500">{winRate(entry.wins, entry.losses)}% de vitórias</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-zinc-500">Unranked</p>
      )}
    </section>
  );
}
