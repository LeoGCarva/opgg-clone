// Testa a chave e o cliente contra a API real.
// Uso: pnpm riot:smoke ["Nome#TAG"] [br]
// Sem Riot ID, usa o 1º colocado do Challenger da região.
import { config } from "dotenv";
import { getRiotClient } from "@/lib/riot/client";
import { riotApi } from "@/lib/riot/endpoints";
import { parseRiotId } from "@/lib/riot/riot-id";
import { isRegionSlug, platformFromSlug } from "@/lib/riot/routing";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const input = args.find((a) => a.includes("#"));
  const slug = args.find((a) => !a.includes("#")) ?? "br";
  const riotId = input ? parseRiotId(input) : null;
  if ((input && !riotId) || !isRegionSlug(slug)) {
    console.error('Uso: pnpm riot:smoke ["Nome#TAG"] [br|na|euw|kr|...]');
    process.exitCode = 1;
    return;
  }

  const platform = platformFromSlug(slug);
  const api = riotApi();

  let account;
  if (riotId) {
    account = await api.getAccountByRiotId(platform, riotId);
  } else {
    const league = await api.getChallengerLeague(platform);
    const top = league.entries.toSorted((a, b) => b.leaguePoints - a.leaguePoints)[0];
    console.log("challenger", `${league.entries.length} jogadores; 1º com ${top.leaguePoints} PDL`);
    account = await api.getAccountByPuuid(platform, top.puuid);
  }
  console.log("account  ", account);

  const [summoner, leagues, ids] = await Promise.all([
    api.getSummonerByPuuid(platform, account.puuid),
    api.getLeagueEntriesByPuuid(platform, account.puuid),
    api.getMatchIds(platform, account.puuid, { count: 5 }),
  ]);
  console.log("summoner ", { level: summoner.summonerLevel, icon: summoner.profileIconId });
  console.log(
    "leagues  ",
    leagues.map((l) => `${l.queueType}: ${l.tier} ${l.rank} ${l.leaguePoints} PDL (${l.wins}V/${l.losses}D)`),
  );
  console.log("matchIds ", ids);

  if (ids[0]) {
    const match = await api.getMatch(platform, ids[0]);
    const me = match.info.participants.find((p) => p.puuid === account.puuid);
    console.log("última   ", {
      queueId: match.info.queueId,
      patch: match.info.gameVersion,
      campeão: me?.championName,
      kda: me && `${me.kills}/${me.deaths}/${me.assists}`,
      vitória: me?.win,
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getRiotClient().close());
