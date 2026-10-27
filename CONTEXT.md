# CONTEXT — opgg clone

Visão geral de **todas** as funcionalidades da aplicação, separada em backend, frontend e banco
de dados. Para instalação e comandos, veja o [README](README.md).

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript ·
Tailwind v4 · Drizzle ORM + Postgres (Neon) · Bottleneck (rate limit) · Zod · Vitest + MSW.

**Fontes de dados externas:**
- **API da Riot** — contas, elos, partidas e timelines (`src/lib/riot/`).
- **Data Dragon** — imagens e dados estáticos por patch: campeões, itens, feitiços, runas
  (`src/lib/ddragon.ts`), mais a lista de filas da Riot.
- **Leaguepedia** (lol.fandom.com, API Cargo, CC BY-SA) — esports: calendário, placares,
  picks/bans e scoreboard por jogador do Worlds 2026 (`src/lib/esports/`). A API da Riot não
  tem partidas profissionais.

---

## Backend

Tudo roda no servidor (Server Components, Server Actions, Route Handler e scripts Node). A chave
da Riot nunca chega ao navegador.

### Configuração — `src/env.ts`
- Valida com Zod: `DATABASE_URL`, `RIOT_API_KEY` (prefixo `RGAPI-`), `RIOT_RATE_LIMITS`
  (padrão `20:1,100:120` = limites da chave de desenvolvimento) e, opcionais,
  `LEAGUEPEDIA_USER` / `LEAGUEPEDIA_PASSWORD` (bot password da Fandom).
- Lido sob demanda (`env()`), para testes e scripts importarem módulos sem precisar do `.env`.

### Cliente da Riot — `src/lib/riot/`
| Arquivo | Responsabilidade |
|---|---|
| `client.ts` | `fetch` com header `X-Riot-Token`; **rate limit por host** (Bottleneck, janelas encadeadas); retry em **429** respeitando `Retry-After` e em **5xx** com backoff (até 3x); erros tipados `RiotApiError`, `RiotNotFoundError` (404) e `RiotAuthError` (401/403 = chave inválida/expirada). Só os limiters ficam no `globalThis` (o rate limit sobrevive ao HMR); o cliente é recriado a cada carga do módulo, para lançar as classes de erro atuais (`instanceof` nas páginas) e pegar uma chave nova do `.env`. |
| `routing.ts` | 15 plataformas (`br1`, `na1`, `euw1`, `kr`...) → regiões (`americas`, `europe`, `asia`, `sea`); slugs de URL (`br`, `euw`...). `account-v1` nunca usa `sea`. |
| `riot-id.ts` | Lê `Nome#TAG` (entrada) e `Nome-TAG` (URL, corta no último hífen); valida tamanho do nome e tag; gera o slug. |
| `endpoints.ts` | Chamadas tipadas: conta por Riot ID / PUUID, invocador, elos do jogador, ligas Challenger/Grão-Mestre/Mestre, entradas por tier/divisão, IDs de partidas (com filtros), partida, timeline. |
| `types.ts` | DTOs da Riot (só os campos usados). |

### Dados estáticos — `src/lib/ddragon.ts`
- `getStaticData()` (com `'use cache'`, 1 dia) / `fetchStaticData()` (sem cache, para scripts):
  versão atual, campeões por id numérico, feitiços, itens (`nome`, `custo`, `tags`, `into`),
  runas e estilos, árvores de runas com as fileiras (`runeTrees`), nomes de filas (traduções próprias para as principais, incluindo as filas
  novas de Arena 1740/1750 que não estão na lista oficial).
- Helpers de URL de imagem (ícone de perfil, campeão, item, feitiço, runa), slug do campeão
  (`lucian`, `monkeyking`) e nome da fila.
- `STAT_SHARDS` / `STAT_SHARD_ROWS`: fragmentos (5001…5013) com nome e ícone, que não estão no
  `runesReforged.json`. `getChampionSpells(ddragonId)` (cache 1 dia): ícones e nomes de Q/W/E/R.
- `getNameIndex()` (cache 1 dia): **nome em inglês → id** de campeões, itens, feitiços e runas
  (lê o `en_US`), para os dados de esports. `nameKey` ignora acento, espaço e pontuação
  (`Kai'Sa` → `kaisa`); com nomes repetidos fica a versão de Summoner's Rift e o menor id.

### Esports (Worlds 2026) — `src/lib/esports/`
| Arquivo | O que faz |
|---|---|
| `leaguepedia.ts` | Cliente da API Cargo: **login com bot password** (sem login a wiki responde `ratelimited` quase sempre; cookies guardados à mão), 1 requisição por vez a cada 1,5 s, espera + nova tentativa (e novo login) quando limitado, paginação de 500 linhas, `cargoString` para escapar valores. `fileUrls` pega a URL direta (CDN) dos logos — `Special:FilePath` responde 403 para imagens embutidas. |
| `worlds.ts` | Config do torneio (páginas `2026 Season World Championship/…`) e leituras com `'use cache'` de 10 min: `getSchedule()` (séries + times com sigla e logo; times buscados pela página da wiki, pois a série usa `LYON (2024 American Team)` e o nome de exibição é `LYON`) e `getGames()` (todos os jogos + jogadores do torneio — as páginas filtram em memória). `load()` transforma erro em mensagem fora do cache. Rótulos em português de fase/rodada. |
| `parse.ts` | Funções puras: linhas Cargo (campos chegam com espaço no lugar de `_`) → `Series`, `Game`, `GamePlayer`, `Team`; listas, itens (6 posições, vazios preservados), duração, datas UTC, slug da série, situação (encerrada / próxima / em andamento). |
| `standings.ts` | Puro: fase suíça (V-D, 3 vitórias classificam, 3 derrotas eliminam), agrupamento de séries por rodada para a chave (quartas → semi → final) e para o Play-In. |
| `tournament-stats.ts` | Puro: por campeão escolhas, bans, presença, vitórias, WR, KDA; resumo (jogos, duração média, WR do lado azul, campeões escolhidos/banidos); ordenações. |
| `icons.ts` | Nome em inglês → ícone + nome em português do Data Dragon (sem ícone quando o nome é desconhecido). |

### Serviços — `src/lib/services/`
| Arquivo | O que faz |
|---|---|
| `profile.ts` | **Perfil do jogador.** `refreshProfile` (Riot → banco: conta, elos e últimas 20 partidas; só baixa as que faltam). `loadOlderMatches` ("carregar mais": próximas 20 mais antigas que a mais antiga salva, por fila). `getProfile` (só banco: conta, elos, histórico de PDL dos últimos 30 dias por fila e N partidas com os 10 participantes de cada). O refresh grava uma foto em `lp_history` por fila ranqueada quando tier/divisão/PDL/V/D mudou. Filtros de fila `all/solo/flex`. Cooldown do botão Atualizar: 2 min. |
| `match-mapper.ts` | Converte a partida da Riot em linhas do banco: partida (patch curto `16.21`), 10 participantes (CS, itens, runa principal, estilo secundário...) e bans. Recebe opcionalmente a timeline e o bracket de elo. |
| `timeline-mapper.ts` | Extrai da timeline (~450 KB, não é guardada): ordem de compra dos itens (aplicando `ITEM_UNDO`), ordem de skills (ignora `EVOLVE`) e itens do primeiro minuto. |
| `match-store.ts` | Grava partidas + participantes + bans em transação, idempotente (`onConflictDoNothing`); modo `replace` promove uma partida do perfil para a versão com timeline. |
| `champion-stats.ts` | **Campeões de um jogador**: agregação SQL por campeão (jogos, vitórias, médias de K/D/A, CS, CS/min, dano, ouro, rota mais comum), sem remakes e sem Arena (filtrada pelo modo `CHERRY`). Builds por campeão. |
| `champion-build.ts` | Função pura que resume a build de um jogador num campeão: itens finais mais frequentes, bota, runa + estilo, par de feitiços. Define "item completo" (sem evolução, ≥ 2000 de ouro, não bota/consumível/totem). |
| `collector.ts` | **Coletor (nível 2).** `seedPlayers`: semeia a fila com Challenger/GM/Mestre (`master_plus`), Diamante I–IV e Esmeralda I–II. `crawlNext(bracket)`: pega o jogador mais antigo da fila daquele bracket, baixa as partidas Solo/Duo dos últimos 7 dias que faltam (partida + timeline se for do patch atual), reagenda em 6 h. |
| `aggregate.ts` | **Agregador.** Recalcula um patch inteiro numa transação: totais por bracket, estatísticas por campeão/rota, bans, confrontos diretos (mesma rota, time oposto) e builds. Toda partida conta no seu bracket e em `all`. Partidas sem `runes` preenchido têm a página lida de `matches.raw` na hora (sem backfill: reescrever as linhas estoura o limite de 1 GB do Neon). |
| `global-builds.ts` | Função pura: chaves de build por partida (`start`, `boots`, `core` = 3 primeiros itens completos em ordem, `item4`/`item5`/`item6` = 4º/5º/6º item completo contados um a um, `runes` = página completa, `spells`, `skills` = ordem de maximização, `skill_path` = 15 primeiros níveis) e contagem por bracket/campeão/rota. |
| `lp-history.ts` | Função pura do gráfico de PDL: escala contínua de elo (`ladderValue`: 100 por divisão, Mestre+ continua a partir de Mestre 0), quando gravar uma foto nova (`shouldRecord`) e o desenho do gráfico (`buildLpChart`: caminho SVG com x = tempo, variação, pico, ponto final e piso da divisão atual). |
| `tiers.ts` | Função pura: WR, pick rate, ban rate; score = WR ajustado para 50% com peso de 20 jogos + 0,5 × pick rate; tiers S+/S/A/B/C por percentil **dentro de cada rota**; mínimo de partidas = máx(5, 0,5% das partidas). |
| `tier-filters.ts` | Função pura: filtros da tier list em memória — rota, busca por nome (sem acento/pontuação, pelo nome em pt-BR ou id do Data Dragon), tiers (`?tier=S+,A`) e ordenação (`?ordem=vitoria|escolha|banimento|partidas`, padrão = tier). |
| `global-stats.ts` | Leituras das tabelas agregadas (com `'use cache'` de ~1 min): tier list por bracket; detalhes de um campeão (rotas disponíveis, resumo, top 3 de cada tipo de build, confrontos com ≥ 3 jogos). |
| `player-search.ts` | **Autocomplete.** Busca nomes por prefixo (ou nome exato + prefixo de tag quando há `#`) em contas salvas e participantes de partidas da mesma plataforma; um resultado por jogador (nome mais recente); quem tem perfil vem primeiro, com elo Solo/Duo. Escapa curingas do `LIKE`. `findPlayersByName` (busca sem tag): todos com o nome exato, sem diferenciar maiúsculas, até 50. |
| `leaderboard.ts` | Função pura: junta as ligas Desafiante/Grão-Mestre/Mestre em um ranking (tier, PDL, WR, jogos) com a posição geral; slugs de tier da URL; paginação. |
| `leaderboard-data.ts` | **Ranking.** `getLeaderboard` (`'use cache'` 10 min): as 3 ligas da Solo/Duo no host da plataforma. `resolveNames`: nomes por puuid do banco (`accounts` → `riot_ids` → partida mais recente); os que faltam vêm de account-v1 e são gravados em `riot_ids` — espera até ~6 s, o resto termina via `after()` e aparece na próxima visita; buscas iguais em andamento são reaproveitadas. |

### Server Actions
| Action | Arquivo | O que faz |
|---|---|---|
| `searchPlayer` | `src/app/actions.ts` | Valida região e `Nome#TAG`; redireciona para `/lol/{região}/{Nome-TAG}`. Sem `#` (nome de 3 a 16 caracteres), redireciona para `/search?region=&name=`; senão devolve erro. |
| `refreshAction` | `src/app/lol/[region]/[riotId]/actions.ts` | Botão Atualizar: confere cooldown no servidor, chama `refreshProfile`, `refresh()` da página; erros da Riot viram mensagem. |
| `loadMoreAction` | idem | "Carregar mais": `loadOlderMatches` e redirect para `?n=+20` (máx. 100), preservando a fila. Valida todos os argumentos (vêm do cliente). |

### Route Handler
- `GET /api/search?q=&region=` (`src/app/api/search/route.ts`): até 8 sugestões com
  `gameName`, `tagLine`, `iconUrl` e `detail` (elo ou nível). Região inválida → 400.
  `Cache-Control: private, max-age=30`.

### Scripts (processos Node fora do Next) — `scripts/`
| Comando | O que faz |
|---|---|
| `pnpm riot:smoke ["Nome#TAG"] [br]` | Testa a chave e o cliente contra a API real (sem Riot ID usa o 1º do Challenger). |
| `pnpm collect [br] [minutos]` | Roda o coletor em loop alternando brackets; agrega a cada 30 min e ao parar; Ctrl+C termina limpo; com `minutos` para sozinho. |
| `pnpm aggregate [patch]` | Recalcula as estatísticas (padrão: patch mais recente coletado). |

---

## Frontend

Server Components por padrão; Client Components só onde há interação. Tema escuro, pt-BR,
layout responsivo (celular e desktop).

### Rotas
| Rota | Conteúdo |
|---|---|
| `/` | Título e busca grande com autocomplete. |
| `/search?region=&name=` | **Busca sem tag.** Lista os jogadores do banco com o nome exato na região (ícone e elo/nível de quem tem perfil salvo, etiqueta "Perfil salvo"), cada um linkando para o perfil; estado vazio explica que só aparecem jogadores já buscados ou vistos em partidas coletadas. |
| `/lol/[region]/[riotId]` | **Perfil.** Ícone, nível, Riot ID, "atualizado há X", botão **Atualizar** (cooldown 2 min). Cards de elo Solo/Duo e Flex (tier em português, PDL, V/D, WR e gráfico de PDL dos últimos 30 dias — aparece a partir da 2ª foto em `lp_history`). Card **Campeões mais jogados** (top 7). Abas de fila **Todas / Solo/Duo / Flex**. Lista de partidas: fila, tempo relativo, vitória/derrota/remake, duração, campeão + nível, feitiços, runas, K/D/A + KDA, CS e CS/min, 7 slots de item, os jogadores de cada time com link para o perfil. **Carregar mais** (até 100). 1ª visita a um jogador busca na Riot e salva; as seguintes leem só do banco. |
| `/lol/[region]/[riotId]/champions` | **Campeões do jogador.** Abas de fila; tabela com todos os campeões (jogos, WR, KDA, CS/min, dano); cada linha abre a build que ele mais usa (itens, bota, runas, feitiços). |
| `/lol/[region]/[riotId]/debug` | Respostas cruas da Riot em JSON (chama a API direto, sem banco) — para estudo. |
| `/champions` | **Tier list global.** Filtros de rota (Todas, Topo, Selva, Meio, Atirador, Suporte) e elo (Todos = Esmeralda+, Diamante, Mestre+ — com o ícone do elo; também na página do campeão; `?bracket=emerald` cai em Todos); visualização "Por tier" (padrão, faixas S+…C) ou "Tabela" (`?view=table`); colunas tier, campeão, WR, pick rate, ban rate, partidas; patch e tamanho da amostra. Campo de busca por nome (`?q=`, atualiza enquanto digita; sem JS funciona com Enter), chips de tier (`?tier=`) e cabeçalhos que ordenam a tabela (`?ordem=`); buscar volta rota/tier/ordem/visualização ao padrão (mantém o elo) e trocar rota/elo/visualização depois preserva a busca e os filtros; "Nenhum campeão encontrado" com link para limpar. Estado vazio orienta a rodar o coletor. |
| `/leaderboard` | **Ranking Solo/Duo.** Desafiante, Grão-Mestre e Mestre da região (`?region=`, padrão BR, seletor com as 15 regiões), abas de tier Desafiante (padrão, sem parâmetro) / Grão-Mestre / Mestre (`?tier=grao-mestre|mestre`; a contagem do topo é do tier exibido), 100 por página (`?page=`); colunas posição geral, jogador (link para o perfil; "Carregando nome…" enquanto o Riot ID não chega), tier, PDL, V/D e vitória. Erro da Riot vira mensagem. |
| `/esports/worlds-2026` | **Worlds 2026 · Calendário.** Séries agrupadas por dia (horário de Brasília), filtro de fase `?fase=play-in` / `main-event`, logos, placar com vencedor destacado, situação (encerrada / em andamento / próxima com o Bo), atalho para as próximas séries. |
| `/esports/worlds-2026/match/[matchId]` | **Série.** Placar, abas por jogo (`?jogo=N`); por lado: vitória/derrota, abates, ouro, torres, dragões, barões, arautos, vastilarvas, bans; os 5 jogadores com campeão, feitiços, runa principal + árvore secundária, KDA, CS/min, ouro, barra de dano e 6 itens + trinket. |
| `/esports/worlds-2026/standings` | **Classificação.** Tabela da fase suíça (V-D, resultados, situação), chave do mata-mata, Play-In e rodadas da suíça em colunas. |
| `/esports/worlds-2026/stats` | **Estatísticas.** Cartões de resumo e tabela de campeões (presença, escolhas, bans, WR, KDA) ordenável por `?ordem=`; o campeão linka para a página dele. |
| `/champions/[champion]` | **Página do campeão.** Tier, WR, pick, ban e partidas; abas das rotas em que é jogado e de elo; 2 páginas de runas com a árvore inteira (escolhidas acesas, demais apagadas, + fragmentos), feitiços, itens iniciais, bota, build principal (3 itens em ordem) + opções de 4º/5º/6º item, ordem de habilidades com ícones + grade dos 15 níveis, "bom contra" e "difícil contra". |

Páginas de jogador inexistente mostram "Jogador não encontrado"; erros da Riot (chave
expirada, indisponibilidade) aparecem numa caixa de erro em vez de quebrar a página.

### Componentes principais — `src/components/`
| Componente | Papel |
|---|---|
| `search-form.tsx` (client) | Busca do header e da home: seletor de região + campo **combobox** com sugestões (debounce 200 ms, cancela requisições antigas), ↑/↓/Enter/Esc, clique fora fecha, ARIA completo. Campo vazio mostra **buscas recentes** (com botão de remover). Enter sem escolher sugestão faz a busca exata pela Server Action (sem tag → lista `/search`). |
| `use-player-suggestions.ts` | Hook que consulta `/api/search`. |
| `recent-searches.ts` / `remember-search.tsx` | Recentes no `localStorage` (máx. 5, protegido contra storage bloqueado, sincroniza entre abas). O perfil registra o jogador aberto — só jogadores que existem entram. |
| `profile/*` | Cabeçalho, cards de elo (com o gráfico de PDL dos últimos 30 dias e o ícone do elo — `tier-icon.tsx` usa os "mini crests" do cliente do LoL em `public/ranked/*.svg`, também no ranking, nas sugestões da busca e em `/search`), card de partida, abas de fila, botões Atualizar e Carregar mais, card e tabela de campeões, ícones (`GameIcon`), formatação (tempo relativo, duração, KDA, WR, tier e rota em português). |
| `champions/*` | Filtros de rota/elo/tier (`href.ts` monta os links), campo de busca da tier list (client component, debounce de 250 ms) e selo de tier. |
| `esports/*` | Abas do Worlds, logo/nome do time, linha do calendário e cartão da chave, detalhe do jogo, datas no fuso de Brasília. |

### Cache e renderização
- Perfil e páginas de jogador renderizam na requisição (dentro de `<Suspense>` com skeleton).
- Data Dragon em cache por 1 dia; tier list e página de campeão com cache de ~1 min (o
  agregador roda em outro processo e não consegue invalidar o cache do Next).
- Worlds: dados da Leaguepedia com cache de 10 min (≈ 6 requisições por renovação); as
  páginas usam `connection()` porque a situação das séries depende da hora.
- Ranking: ligas da Riot com cache de 10 min (3 requisições por região); nomes lidos por
  requisição.

---

## Banco de dados (Postgres / Neon, Drizzle)

Schema em `src/lib/db/schema.ts`, migrations em `drizzle/` (`pnpm db:generate` + `db:migrate`).
Nomes de colunas em snake_case. Conexão em `src/lib/db/index.ts` (pool no `globalThis`,
`prepare: false` por causa do pooler do Neon).

### Tabelas do perfil
| Tabela | Chave | Colunas principais | Índices | Escrita / leitura |
|---|---|---|---|---|
| `accounts` | `puuid` | `game_name`, `tag_line`, `platform`, `profile_icon_id`, `summoner_level`, `last_refreshed_at` | `lower(nome), lower(tag)`; prefixo `lower(nome) text_pattern_ops` | escreve: refresh do perfil · lê: perfil, cooldown, autocomplete |
| `riot_ids` | `puuid` | `game_name`, `tag_line`, `updated_at` | — | escreve/lê: ranking (Riot IDs resolvidos por puuid; não é perfil salvo) |
| `league_entries` | `(puuid, queue_type)` | `tier`, `rank`, `league_points`, `wins`, `losses`, `hot_streak` | — | apagada e reinserida a cada refresh · lê: perfil, autocomplete |
| `lp_history` | `(puuid, queue_type, recorded_at)` | `tier`, `rank`, `league_points`, `wins`, `losses` | — | escreve: refresh do perfil (só Solo/Duo e Flex, só quando mudou) · lê: perfil (gráfico de PDL, 30 dias) |

### Tabelas de partidas (compartilhadas por perfil e coletor)
| Tabela | Chave | Colunas principais | Índices |
|---|---|---|---|
| `matches` | `match_id` | `platform`, `queue_id`, `game_version`, `patch`, `game_creation`, `game_duration`, `raw` (JSON completo da Riot), `tier_bracket`, `has_timeline` | `(queue_id, patch)`; `(patch, tier_bracket) WHERE has_timeline` |
| `match_participants` | `(match_id, puuid)` | time, Riot ID, campeão, nível, rota (`team_position`), vitória, K/D/A, `cs`, ouro, dano, visão, `items[7]`, feitiços, `keystone_id`, `secondary_style_id`, `runes[]` (página completa: árvore, 4 runas, árvore, 2 runas, 3 fragmentos; null em linhas antigas), `item_build[]`, `skill_order[]`, `start_items[]` (estes três só do coletor), `queue_id` e `game_creation` copiados | histórico `(puuid, game_creation desc)`; prefixo `lower(riot_id_game_name) text_pattern_ops` |
| `match_bans` | `(match_id, team_id, pick_turn)` | `champion_id` | — |

Partidas são imutáveis: baixadas uma vez e guardadas para sempre (o `raw` permite reprocessar
sem gastar requisições). `match_participants` e `match_bans` apagam em cascata com a partida.

### Tabelas do coletor e do agregador
| Tabela | Chave | Conteúdo |
|---|---|---|
| `crawl_players` | `puuid` | fila do coletor: `platform`, `bracket`, `next_crawl_at` (índice), `last_crawled_at` |
| `bracket_totals` | `(patch, bracket)` | nº de partidas — denominador de pick/ban rate |
| `champion_stats` | `(patch, bracket, champion_id, role)` | `games`, `wins` |
| `champion_bans` | `(patch, bracket, champion_id)` | `bans` |
| `champion_builds` | `(patch, bracket, champion_id, role, kind, key)` | `games`, `wins` por escolha (`kind` = start / boots / core / item4 / item5 / item6 / runes / spells / skills / skill_path) |
| `champion_matchups` | `(patch, bracket, champion_id, role, opponent_id)` | `games`, `wins` |

As cinco tabelas `champion_*`/`bracket_totals` são **derivadas**: o agregador apaga o patch e
reinsere tudo numa transação.

### Fluxo dos dados
```
Perfil (1ª visita / Atualizar / Carregar mais) ──► accounts, league_entries, lp_history, matches (+participantes, bans)
                                                        │  sem timeline, sem bracket
Coletor (pnpm collect) ──► crawl_players ──► matches com timeline + tier_bracket
                                                        │
Agregador (a cada 30 min / pnpm aggregate) ──► bracket_totals, champion_stats/bans/builds/matchups
                                                        │
Páginas: perfil e campeões do jogador leem matches/participantes · tier list e campeão leem as agregadas
Autocomplete lê accounts + match_participants
Ranking: ligas da Riot (cache 10 min) + nomes de accounts / riot_ids / match_participants; faltantes → account-v1 → riot_ids
```

---

## Testes — `tests/` (Vitest)
Cliente da Riot com MSW (roteamento, retry, erros, rate limit), Riot ID, mapper de partida,
mapper de timeline, build do jogador, builds globais e tiers, filtros da tier list, histórico de PDL (escala de elo, quando gravar, gráfico), ranking (junção das ligas e paginação), parser da busca; esports: parse
das linhas da Leaguepedia, fase suíça e chave, estatísticas do torneio, nomes em inglês → ids. As consultas ao
banco e as páginas são verificadas manualmente / com scripts de navegador.
