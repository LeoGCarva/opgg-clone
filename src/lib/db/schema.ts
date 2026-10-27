import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { MatchDto } from "@/lib/riot/types";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Jogadores que já foram buscados no site. */
export const accounts = pgTable(
  "accounts",
  {
    puuid: text().primaryKey(),
    gameName: text().notNull(),
    tagLine: text().notNull(),
    platform: text().notNull(),
    profileIconId: integer(),
    summonerLevel: integer(),
    // Último "Atualizar" completo; usado para o cooldown.
    lastRefreshedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Não é unique: Riot IDs podem ser trocados e ficar desatualizados aqui.
    index("accounts_riot_id_idx").on(sql`lower(${t.gameName})`, sql`lower(${t.tagLine})`),
    // text_pattern_ops: permite usar o índice em `LIKE 'pref%'` (autocomplete) em qualquer collation.
    index("accounts_name_prefix_idx").on(sql`lower(${t.gameName}) text_pattern_ops`),
  ],
);

export const leagueEntries = pgTable(
  "league_entries",
  {
    puuid: text()
      .notNull()
      .references(() => accounts.puuid, { onDelete: "cascade" }),
    queueType: text().notNull(),
    tier: text().notNull(),
    rank: text().notNull(),
    leaguePoints: integer().notNull(),
    wins: integer().notNull(),
    losses: integer().notNull(),
    hotStreak: boolean().notNull().default(false),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.puuid, t.queueType] })],
);

/** Uma foto do elo a cada "Atualizar" em que algo mudou. Alimenta o gráfico de PDL do card de ranqueada. */
export const lpHistory = pgTable(
  "lp_history",
  {
    puuid: text()
      .notNull()
      .references(() => accounts.puuid, { onDelete: "cascade" }),
    queueType: text().notNull(),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    tier: text().notNull(),
    rank: text().notNull(),
    leaguePoints: integer().notNull(),
    wins: integer().notNull(),
    losses: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.puuid, t.queueType, t.recordedAt] })],
);

/** Partidas são imutáveis: baixadas uma vez e guardadas para sempre. */
export const matches = pgTable(
  "matches",
  {
    matchId: text().primaryKey(),
    platform: text().notNull(),
    queueId: integer().notNull(),
    gameVersion: text().notNull(),
    patch: text().notNull(),
    gameCreation: timestamp({ withTimezone: true }).notNull(),
    gameDuration: integer().notNull(),
    // JSON completo da Riot, para reprocessar no futuro sem gastar requisições.
    raw: jsonb().$type<MatchDto>().notNull(),
    // Preenchidos só pelo coletor (Fase B): elo do jogador-semente e se a timeline foi processada.
    tierBracket: text(),
    hasTimeline: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_queue_patch_idx").on(t.queueId, t.patch),
    index("matches_stats_idx").on(t.patch, t.tierBracket).where(sql`${t.hasTimeline}`),
  ],
);

export const matchBans = pgTable(
  "match_bans",
  {
    matchId: text()
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    teamId: integer().notNull(),
    pickTurn: integer().notNull(),
    championId: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.teamId, t.pickTurn] })],
);

/** Uma linha por jogador por partida (10 por partida). */
export const matchParticipants = pgTable(
  "match_participants",
  {
    matchId: text()
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    // Sem FK para accounts: a maioria dos participantes nunca foi buscada no site.
    puuid: text().notNull(),
    participantId: integer().notNull(),
    teamId: integer().notNull(),
    riotIdGameName: text(),
    riotIdTagline: text(),
    championId: integer().notNull(),
    championName: text().notNull(),
    champLevel: integer().notNull(),
    teamPosition: text().notNull(),
    win: boolean().notNull(),
    kills: integer().notNull(),
    deaths: integer().notNull(),
    assists: integer().notNull(),
    cs: integer().notNull(),
    goldEarned: integer().notNull(),
    damageToChampions: integer().notNull(),
    visionScore: integer().notNull(),
    items: integer().array().notNull(),
    summoner1Id: integer().notNull(),
    summoner2Id: integer().notNull(),
    keystoneId: integer(),
    secondaryStyleId: integer(),
    // Página completa: [árvore primária, 4 runas, árvore secundária, 2 runas, fragmentos ataque/flex/defesa].
    runes: integer().array(),
    // Extraídos da timeline (só partidas do coletor): compras em ordem, níveis de skill
    // (slot 1-4 = Q/W/E/R) e itens comprados no primeiro minuto.
    itemBuild: integer().array(),
    skillOrder: integer().array(),
    startItems: integer().array(),
    // Copiados de matches para listar o histórico sem join.
    queueId: integer().notNull(),
    gameCreation: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.puuid] }),
    index("match_participants_history_idx").on(t.puuid, t.gameCreation.desc()),
    index("match_participants_name_prefix_idx").on(sql`lower(${t.riotIdGameName}) text_pattern_ops`),
  ],
);

// ---- Fase B: coletor e estatísticas globais ----

/** Fila do coletor: jogadores cujas partidas serão baixadas. */
export const crawlPlayers = pgTable(
  "crawl_players",
  {
    puuid: text().primaryKey(),
    platform: text().notNull(),
    // Elo usado como "bracket" das partidas que esse jogador trouxer.
    bracket: text().notNull(),
    nextCrawlAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastCrawledAt: timestamp({ withTimezone: true }),
  },
  (t) => [index("crawl_players_next_idx").on(t.nextCrawlAt)],
);

// Tabelas abaixo são recalculadas pelo agregador (apaga o patch e reinsere).

export const bracketTotals = pgTable(
  "bracket_totals",
  {
    patch: text().notNull(),
    bracket: text().notNull(),
    matches: integer().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.patch, t.bracket] })],
);

export const championStats = pgTable(
  "champion_stats",
  {
    patch: text().notNull(),
    bracket: text().notNull(),
    championId: integer().notNull(),
    role: text().notNull(),
    games: integer().notNull(),
    wins: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.patch, t.bracket, t.championId, t.role] })],
);

export const championBans = pgTable(
  "champion_bans",
  {
    patch: text().notNull(),
    bracket: text().notNull(),
    championId: integer().notNull(),
    bans: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.patch, t.bracket, t.championId] })],
);

/** Escolhas mais comuns por campeão/rota; `kind` diz o que `key` representa. */
export const championBuilds = pgTable(
  "champion_builds",
  {
    patch: text().notNull(),
    bracket: text().notNull(),
    championId: integer().notNull(),
    role: text().notNull(),
    kind: text().notNull(), // start | boots | core | item4-6 | runes | spells | skills | skill_path
    key: text().notNull(), // ex.: core "3078-3042-3161", item4 "3036", runes = página completa, skills "1-3-2"
    games: integer().notNull(),
    wins: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.patch, t.bracket, t.championId, t.role, t.kind, t.key] })],
);

export const championMatchups = pgTable(
  "champion_matchups",
  {
    patch: text().notNull(),
    bracket: text().notNull(),
    championId: integer().notNull(),
    role: text().notNull(),
    opponentId: integer().notNull(),
    games: integer().notNull(),
    wins: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.patch, t.bracket, t.championId, t.role, t.opponentId] })],
);

/** Riot IDs resolvidos por puuid para o ranking (account-v1). Não é perfil salvo — isso fica em `accounts`. */
export const riotIds = pgTable("riot_ids", {
  puuid: text().primaryKey(),
  gameName: text().notNull(),
  tagLine: text().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
