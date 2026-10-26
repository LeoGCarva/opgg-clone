import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

function createClient() {
  return postgres(env().DATABASE_URL, {
    // O pooler do Neon (PgBouncer em modo transaction) não suporta prepared statements.
    prepare: false,
    max: 10,
  });
}

function createDb(client: postgres.Sql) {
  return drizzle({ client, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

// Só o pool de conexões fica no globalThis (para não abrir um pool novo a cada HMR do
// `next dev`). A instância do Drizzle NÃO: ela guarda um cache dos nomes de colunas por
// tabela, e se sobrevivesse ao HMR continuaria com o schema antigo depois de uma mudança
// em schema.ts — colunas novas viriam sem nome ("Cannot read properties of undefined").
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };
let instance: Db | undefined;

export function db(): Db {
  return (instance ??= createDb((globalForDb.pgClient ??= createClient())));
}

export { schema };
