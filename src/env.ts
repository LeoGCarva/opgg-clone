import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  RIOT_API_KEY: z.string().startsWith("RGAPI-"),
  // "limite:janela_em_segundos" separados por vírgula. Padrão = chave de desenvolvimento.
  RIOT_RATE_LIMITS: z.string().default("20:1,100:120"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Lido sob demanda (e não no import) para que testes e scripts possam
// importar módulos sem precisar de todas as variáveis configuradas.
export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
