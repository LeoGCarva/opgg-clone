// Coletor do nível 2: baixa partidas ranqueadas (com timeline) de jogadores por elo e
// recalcula as estatísticas globais periodicamente.
// Uso: pnpm collect [br] [minutos]
//   Ctrl+C para parar (termina o jogador atual e agrega). Com [minutos], para sozinho.
import { config } from "dotenv";
import { db } from "@/lib/db";
import { fetchStaticData } from "@/lib/ddragon";
import { getRiotClient, RiotAuthError } from "@/lib/riot/client";
import { isRegionSlug, platformFromSlug } from "@/lib/riot/routing";
import { aggregatePatch } from "@/lib/services/aggregate";
import { BRACKETS, countPlayers, crawlNext, seedPlayers, type Bracket } from "@/lib/services/collector";
import { patchOf } from "@/lib/services/match-mapper";

config({ path: [".env.local", ".env"], quiet: true });

const AGGREGATE_EVERY_MS = 30 * 60_000;
const IDLE_SLEEP_MS = 30_000;

let stopping = false;
process.on("SIGINT", () => {
  if (stopping) process.exit(1);
  stopping = true;
  console.log("\nParando depois do jogador atual... (Ctrl+C de novo para forçar)");
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const time = () => new Date().toLocaleTimeString("pt-BR");

async function aggregate(patch: string) {
  const t = performance.now();
  const { totals, buildRows } = await aggregatePatch(patch);
  const summary = totals.map((x) => `${x.bracket}=${x.matches}`).join(" ");
  console.log(`[${time()}] agregado patch ${patch}: ${summary} · ${buildRows} linhas de build · ${Math.round(performance.now() - t)}ms`);
}

async function main() {
  const slug = process.argv[2] ?? "br";
  if (!isRegionSlug(slug)) throw new Error(`Região inválida: ${slug}`);
  const platform = platformFromSlug(slug);
  const minutes = Number(process.argv[3]);
  if (minutes > 0) {
    setTimeout(() => {
      stopping = true;
      console.log(`\n${minutes} min atingidos; parando depois do jogador atual...`);
    }, minutes * 60_000).unref();
  }

  const currentPatch = patchOf((await fetchStaticData()).version);
  console.log(`Coletor em ${platform}, patch ${currentPatch}. Ctrl+C para parar.`);

  if ((await countPlayers(platform)) === 0) {
    console.log("Fila vazia: buscando jogadores nas ligas...");
    console.log("Sementes:", await seedPlayers(platform));
  }

  let total = 0;
  let sinceAggregate = 0;
  let lastAggregate = Date.now();
  let idleRounds = 0;
  const brackets = Object.keys(BRACKETS) as Bracket[];

  for (let turn = 0; !stopping; turn++) {
    // Um jogador de cada bracket por vez.
    const result = await crawlNext(platform, brackets[turn % brackets.length], currentPatch);
    if (!result) {
      if (++idleRounds >= brackets.length) {
        console.log(`[${time()}] ninguém para coletar agora; aguardando...`);
        await sleep(IDLE_SLEEP_MS);
        idleRounds = 0;
      }
      continue;
    }
    idleRounds = 0;

    total += result.saved;
    sinceAggregate += result.saved;
    const extras = [
      result.otherPatch && `${result.otherPatch} de outro patch`,
      result.failed && `${result.failed} com erro`,
    ].filter(Boolean);
    console.log(
      `[${time()}] ${result.bracket.padEnd(11)} +${result.saved} partidas${extras.length ? ` (${extras.join(", ")})` : ""} · total ${total}`,
    );

    if (sinceAggregate > 0 && Date.now() - lastAggregate > AGGREGATE_EVERY_MS) {
      await aggregate(currentPatch);
      sinceAggregate = 0;
      lastAggregate = Date.now();
    }
  }

  if (sinceAggregate > 0) await aggregate(currentPatch);
}

main()
  .catch((err) => {
    if (err instanceof RiotAuthError) console.error("Chave da Riot inválida ou expirada. Atualize o .env.");
    else console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getRiotClient().close();
    await db().$client.end();
  });
