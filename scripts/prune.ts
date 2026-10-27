// Retenção: mantém só os últimos patches coletados para o banco não crescer sem parar.
// Uso: pnpm db:prune         (só mostra o que apagaria)
//      pnpm db:prune --yes   (apaga)
//
// Apaga partidas do coletor de patches antigos — menos as que têm algum jogador com perfil no
// site (fazem parte do histórico dele) — e as estatísticas derivadas desses patches. O espaço
// liberado é reaproveitado pelas próximas partidas.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const KEEP_PATCHES = 3;
const DERIVED = ["champion_stats", "champion_bans", "champion_builds", "champion_matchups", "bracket_totals"];

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, onnotice: () => {}, max: 1 });

// `m` = matches. Partida do coletor, de patch fora dos mantidos, sem jogador com perfil.
const prunable = (keep: string[]) => sql`
  m.has_timeline and m.tier_bracket is not null and m.patch not in ${sql(keep)}
  and not exists (
    select 1 from match_participants p join accounts a on a.puuid = p.puuid where p.match_id = m.match_id
  )`;

async function main() {
  const apply = process.argv.includes("--yes");

  // Ordem pela data, não pelo texto do patch ("16.9" < "16.10").
  const keep = (
    await sql<{ patch: string }[]>`
      select patch from matches where has_timeline and tier_bracket is not null
      group by patch order by max(game_creation) desc limit ${KEEP_PATCHES}`
  ).map((r) => r.patch);
  if (!keep.length) {
    console.log("Nenhuma partida do coletor ainda: nada a fazer.");
    return;
  }
  console.log(`Patches mantidos: ${keep.join(", ")}`);

  const old = await sql<{ patch: string; n: number }[]>`
    select m.patch, count(*)::int as n from matches m where ${prunable(keep)} group by m.patch order by m.patch`;
  const derived = await Promise.all(
    DERIVED.map(async (table) => {
      const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(table)} where patch not in ${sql(keep)}`;
      return { table, n };
    }),
  );
  console.table([
    ...old.map((o) => ({ alvo: `partidas ${o.patch}`, linhas: o.n })),
    ...derived.map((d) => ({ alvo: d.table, linhas: d.n })),
  ]);

  if (!old.length && derived.every((d) => !d.n)) {
    console.log("Nada a apagar.");
    return;
  }
  if (!apply) {
    console.log("Simulação. Rode `pnpm db:prune --yes` para apagar.");
    return;
  }

  await sql.begin(async (tx) => {
    // Cascata remove participantes e bans.
    await tx`delete from matches m where ${prunable(keep)}`;
    for (const table of DERIVED) await tx`delete from ${tx(table)} where patch not in ${tx(keep)}`;
  });
  console.log("Apagado.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
