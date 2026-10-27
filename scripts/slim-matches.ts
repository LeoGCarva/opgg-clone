// Reconstrói `matches` com o JSON enxuto (sem `challenges`/`missions`), devolvendo o espaço ao Neon.
// UPDATE/DELETE não devolvem espaço e VACUUM FULL precisa de uma cópia inteira da tabela, que não
// cabe no plano gratuito — por isso: backup local → TRUNCATE → reinsere enxuto.
//
// Uso:
//   pnpm db:slim-matches export              grava .backup/matches-<data>.jsonl.gz (só lê o banco)
//   pnpm db:slim-matches restore <arquivo>   esvazia `matches` e reinsere a partir do backup
//
// Pare o coletor antes do `restore`. Se o restore cair no meio, rode de novo com o mesmo arquivo:
// ele continua de onde parou. O backup nunca é apagado pelo script.
import { config } from "dotenv";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import postgres from "postgres";
import { slimMatch } from "@/lib/services/match-mapper";

config({ path: [".env.local", ".env"], quiet: true });

const BATCH = 200;
const FKS = [
  { table: "match_participants", name: "match_participants_match_id_matches_match_id_fk" },
  { table: "match_bans", name: "match_bans_match_id_matches_match_id_fk" },
];
// Todas as colunas de `matches`, com os tipos para o jsonb_to_recordset.
const COLUMNS = `match_id text, platform text, queue_id int, game_version text, patch text,
  game_creation timestamptz, game_duration int, raw jsonb, tier_bracket text, has_timeline boolean,
  created_at timestamptz`;
const COLUMN_NAMES = COLUMNS.split(",").map((c) => c.trim().split(" ")[0]).join(", ");

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, onnotice: () => {}, max: 1 });

async function countMatches() {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from matches`;
  return n;
}

async function dbSize() {
  const [{ size }] = await sql<{ size: string }[]>`select pg_size_pretty(pg_database_size(current_database())) as size`;
  return size;
}

async function* readBackup(file: string) {
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) if (line) yield JSON.parse(line) as Record<string, unknown>;
}

async function countBackup(file: string) {
  let n = 0;
  for await (const row of readBackup(file)) if (row.match_id) n++;
  return n;
}

async function exportMatches() {
  mkdirSync(".backup", { recursive: true });
  const file = `.backup/matches-${new Date().toISOString().slice(0, 10)}.jsonl.gz`;
  const gzip = createGzip();
  const done = once(gzip.pipe(createWriteStream(file)), "finish");

  let written = 0;
  let after = "";
  for (;;) {
    const rows = await sql`select * from matches where match_id > ${after} order by match_id limit ${BATCH}`;
    if (!rows.length) break;
    for (const row of rows) {
      if (!gzip.write(JSON.stringify(row) + "\n")) await once(gzip, "drain");
    }
    written += rows.length;
    after = rows[rows.length - 1].match_id;
    process.stdout.write(`\r  ${written} partidas`);
  }
  gzip.end();
  await done;

  const read = await countBackup(file);
  const total = await countMatches();
  console.log(`\nBackup: ${file} — ${read} linhas no arquivo, ${total} no banco.`);
  if (read !== total) throw new Error("Contagem diferente: o backup não está completo, não rode o restore.");
}

async function restoreMatches(file: string) {
  const expected = await countBackup(file);

  const fks = await sql`select conname from pg_constraint where conname in ${sql(FKS.map((f) => f.name))}`;
  if (fks.length) {
    // Primeira execução: o banco ainda está inteiro.
    const total = await countMatches();
    if (total !== expected) {
      throw new Error(`Backup tem ${expected} partidas e o banco ${total}. Gere um backup novo com \`export\`.`);
    }
    console.log(`Banco antes: ${await dbSize()}. Esvaziando matches…`);
    await sql.begin(async (tx) => {
      for (const fk of FKS) await tx.unsafe(`alter table ${fk.table} drop constraint if exists ${fk.name}`);
      await tx`truncate matches`;
    });
  } else {
    console.log("Chaves estrangeiras já removidas: continuando um restore interrompido.");
  }

  let batch: Record<string, unknown>[] = [];
  let inserted = 0;
  const flush = async () => {
    if (!batch.length) return;
    await sql`
      insert into matches (${sql.unsafe(COLUMN_NAMES)})
      select ${sql.unsafe(COLUMN_NAMES)} from jsonb_to_recordset(${sql.json(batch as postgres.JSONValue)}) as x(${sql.unsafe(COLUMNS)})
      on conflict do nothing`;
    inserted += batch.length;
    batch = [];
    process.stdout.write(`\r  ${inserted}/${expected} partidas`);
  };
  for await (const row of readBackup(file)) {
    batch.push({ ...row, raw: slimMatch(row.raw as Parameters<typeof slimMatch>[0]) });
    if (batch.length === BATCH) await flush();
  }
  await flush();

  const total = await countMatches();
  console.log(`\n${total} partidas no banco (backup: ${expected}).`);
  if (total !== expected) throw new Error("Faltam partidas: rode o restore de novo com o mesmo arquivo.");

  for (const fk of FKS) {
    await sql.unsafe(`alter table ${fk.table} add constraint ${fk.name} foreign key (match_id)
      references matches(match_id) on delete cascade on update no action`);
  }
  console.log(`Chaves estrangeiras recriadas. Banco agora: ${await dbSize()}.`);
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === "export") return exportMatches();
  if (command === "restore" && file) return restoreMatches(file);
  console.log("Uso: pnpm db:slim-matches export | restore <arquivo>");
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
