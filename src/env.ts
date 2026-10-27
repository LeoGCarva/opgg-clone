import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  RIOT_API_KEY: z.string().startsWith("RGAPI-"),
  // "limite:janela_em_segundos" separados por vírgula. Padrão = chave de desenvolvimento.
  RIOT_RATE_LIMITS: z.string().default("20:1,100:120"),
  // Bot password da Leaguepedia (lol.fandom.com/wiki/Special:BotPasswords). Sem login a API
  // Cargo responde "ratelimited" quase sempre.
  LEAGUEPEDIA_USER: z.string().optional(),
  LEAGUEPEDIA_PASSWORD: z.string().optional(),
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
