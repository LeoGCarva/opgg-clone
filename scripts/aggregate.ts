// Recalcula as estatísticas globais (tier list, builds, matchups) de um patch.
// Uso: pnpm aggregate [patch]   (padrão: patch mais recente coletado)
import { config } from "dotenv";
import { db } from "@/lib/db";
import { aggregatePatch, latestCollectedPatch } from "@/lib/services/aggregate";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const patch = process.argv[2] ?? (await latestCollectedPatch());
  if (!patch) {
    console.log("Nenhuma partida coletada ainda. Rode `pnpm collect` primeiro.");
    return;
  }
  const t = performance.now();
  const { totals, buildRows } = await aggregatePatch(patch);
  console.log(`Patch ${patch} agregado em ${Math.round(performance.now() - t)}ms`);
  console.table(totals.map((x) => ({ bracket: x.bracket, partidas: x.matches })));
  console.log(`${buildRows} linhas de build`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db().$client.end());
