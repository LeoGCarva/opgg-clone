# opgg clone

Clone de estudo do op.gg / u.gg: perfil de jogadores, campeões mais jogados e estatísticas
globais de campeões (tier list, builds, runas, counters) a partir da API da Riot, e uma aba
do **Worlds 2026** com dados da [Leaguepedia](https://lol.fandom.com).

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 · Drizzle + Postgres (Neon) · Vitest.

## Configuração

1. `pnpm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (Neon, string *pooled*) e
   `RIOT_API_KEY` ([developer.riotgames.com](https://developer.riotgames.com) — a chave de
   desenvolvimento expira a cada 24h).
3. Opcional (aba Worlds): crie um bot password em
   [Special:BotPasswords](https://lol.fandom.com/wiki/Special:BotPasswords) só com "Basic rights"
   e preencha `LEAGUEPEDIA_USER` (`SeuNome@nomedobot`) e `LEAGUEPEDIA_PASSWORD` — sem login a
   API da wiki quase sempre responde `ratelimited`.
4. `pnpm db:migrate`
5. `pnpm dev` → http://localhost:3000

## Como os dados entram

| Origem | Quando | O que grava |
|---|---|---|
| **Perfil** (`/lol/br/Nome-TAG`) | 1ª visita, botão *Atualizar* (cooldown 2 min), *Carregar mais* | conta, elo, partidas do jogador |
| **Coletor** (`pnpm collect`) | processo separado, em loop | partidas Solo/Duo do patch atual **com timeline**, por elo |
| **Agregador** (`pnpm aggregate`) | a cada 30 min dentro do coletor, ou manual | tabelas `champion_*` usadas pela tier list |

### Coletor

```bash
pnpm collect            # BR, até Ctrl+C
pnpm collect br 10      # para sozinho depois de 10 minutos
pnpm aggregate          # recalcula as estatísticas do patch mais recente coletado
```

- Sementes: ligas Challenger/Grão-Mestre/Mestre (bracket `master_plus`), Diamante I–IV e
  Esmeralda I–II. Alterna um jogador de cada bracket por vez.
- Cada partida custa 2 requisições (partida + timeline). Com a chave de desenvolvimento
  (100 req / 2 min) isso dá ~25 partidas/min — o suficiente para estudar; uma tier list
  confiável precisa de dezenas de milhares de partidas (chave de produção).
- O coletor e o site usam limitadores separados; rodando os dois ao mesmo tempo a Riot
  pode responder 429, que o cliente trata esperando o `Retry-After`.
- A tier list e as páginas de campeão leem com cache de ~1 min; depois de agregar, os dados
  novos aparecem em seguida.

## Scripts

| | |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm test` · `typecheck` · `lint` | Vitest · tsc · ESLint |
| `pnpm db:generate` · `db:migrate` · `db:studio` | Drizzle |
| `pnpm riot:smoke ["Nome#TAG"] [br]` | testa a chave da Riot |
| `pnpm collect [br] [minutos]` · `pnpm aggregate [patch]` | estatísticas globais |
| `pnpm db:prune [--yes]` | apaga partidas do coletor de patches antigos (mantém os 3 últimos) |
| `pnpm db:slim-matches export \| restore <arquivo>` | reconstrução única de `matches` com o JSON enxuto (backup em `.backup/`) |

## Estrutura

```
src/lib/riot/        cliente HTTP (rate limit, retry), roteamento, endpoints, tipos
src/lib/db/          schema Drizzle e conexão
src/lib/services/    perfil, mappers de partida/timeline, coletor, agregador, tiers
src/lib/ddragon.ts   dados estáticos (campeões, itens, runas) do Data Dragon
src/app/lol/…        perfil do jogador, campeões do jogador, debug (JSON cru)
src/app/champions/…  tier list e página de campeão
src/lib/esports/     cliente da Leaguepedia, parse, classificação e estatísticas do Worlds
src/app/esports/…    Worlds 2026: calendário, série, classificação, estatísticas
scripts/             smoke test, coletor, agregador
```

## Créditos

Dados de esports: [Leaguepedia](https://lol.fandom.com) (CC BY-SA 3.0). Ícones de elo: "mini crests" do
cliente do LoL (Riot Games), obtidos via [Community Dragon](https://raw.communitydragon.org). Imagens de campeões,
itens e runas: Data Dragon da Riot Games. Projeto de estudo, sem vínculo com a Riot Games.
