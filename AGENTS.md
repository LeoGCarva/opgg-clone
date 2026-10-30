<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — rubra

Canonical, tool-agnostic guide for any AI assistant working in this repo. (`CLAUDE.md`, `.cursorrules`, etc. should just point here.)

Single Next.js app (not a monorepo): frontend, backend (Server Components/Actions, one Route Handler) and two standalone Node scripts (collector, aggregator) share `src/`.

## Read first
- `CONTEXT.md` — every feature, split into backend / frontend / database schema, plus the data flow. **Keep it in sync** when you add or change a feature, route, table or column.
- `README.md` — setup, env vars, scripts, how the collector works.
- `node_modules/next/dist/docs/` — Next 16 docs (see the block above). Read the relevant page before using caching, routing or Server Action APIs.

## Routing — where does a task go?

| Task about… | Where |
|---|---|
| Riot API calls, rate limit, retries, regions | `src/lib/riot/` (`client.ts`, `endpoints.ts`, `routing.ts`, `types.ts`) |
| Images / static game data (champions, items, runes, queue names) | `src/lib/ddragon.ts` |
| Player profile: refresh, load more, match history | `src/lib/services/profile.ts` + `src/app/lol/[region]/[riotId]/` |
| A player's champion stats / builds | `src/lib/services/champion-stats.ts`, `champion-build.ts` |
| Global stats: collector, aggregation, tiers | `src/lib/services/collector.ts`, `aggregate.ts`, `global-builds.ts`, `tiers.ts` + `scripts/` |
| Leaderboard (Challenger/GM/Master) | `src/lib/services/leaderboard.ts`, `leaderboard-data.ts` + `src/app/leaderboard/` + `src/components/leaderboard/` |
| Tier list / champion pages | `src/lib/services/global-stats.ts`, `tier-filters.ts` + `src/app/champions/` + `src/components/champions/` |
| Worlds 2026 (esports, Leaguepedia) | `src/lib/esports/` (`leaguepedia.ts`, `worlds.ts`, `parse.ts`, `standings.ts`, `tournament-stats.ts`, `icons.ts`) + `src/app/esports/worlds-2026/` + `src/components/esports/` |
| Search + autocomplete + recent searches | `src/components/search-form.tsx`, `src/lib/services/player-search.ts`, `src/app/api/search/route.ts`, `src/app/actions.ts`, `src/app/search/` (name without tag) |
| DB tables, columns, indexes | `src/lib/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |
| Converting Riot JSON → DB rows | `src/lib/services/match-mapper.ts`, `timeline-mapper.ts`, `match-store.ts` |

## Domain
League of Legends stats site, op.gg / u.gg style, built for learning. Two halves:
- **Per player** — look up a Riot ID (`Nome#TAG`), store their account, rank and matches; show history, most-played champions and the builds they use.
- **Global** — a separate **collector** crawls ranked Solo/Duo matches (with timelines) from Emerald+ players; an **aggregator** turns them into tier list, builds, skill orders and matchups per patch × elo bracket.

UI is **pt-BR**. Code identifiers in English; code comments in Portuguese (match the surrounding file).

## System facts
- **Stack:** Next.js 16 (App Router, **Cache Components** + Partial Prefetching on, Turbopack) · React 19 · TS 5 · Tailwind v4 · Drizzle 0.45 + `postgres` driver · Zod 4 · Bottleneck · Vitest 5 + MSW 3. **pnpm** only (`allowBuilds` in `pnpm-workspace.yaml`).
- **Env** (`src/env.ts`, Zod, read lazily via `env()`): `DATABASE_URL` (Neon **pooled** string), `RIOT_API_KEY`, optional `RIOT_RATE_LIMITS` (default `20:1,100:120`), optional `LEAGUEPEDIA_USER` / `LEAGUEPEDIA_PASSWORD` (Fandom bot password). Scripts load `.env.local` then `.env`.
- **Riot API:** server-side only — the key must never reach the browser. Platform hosts (`br1`…) for summoner/league; regional hosts (`americas`, `europe`, `asia`, `sea`) for account/match. Dev key = 100 req / 2 min and **expires every 24 h** (`401 Unknown apikey` → regenerate; a fresh key can take ~1 min to activate). Limits are counted per regional host, so collecting `br` + `euw` in parallel doesn't collide; `br` + `na` does. Never use multiple keys to dodge limits (against Riot policy). `getRiotClient()` keeps only the Bottleneck limiters on `globalThis` and recreates the client per module load — a client kept across HMR throws the *old* module's error classes, so `instanceof RiotNotFoundError` fails and a 404 leaks as a runtime error instead of `notFound()` (same trap as Drizzle below).
- **Riot data quirks:** Arena has several queues (1700, 1740, 1750…) — filter it by `info.gameMode = 'CHERRY'`, not queue id. Remake = `gameDuration < 210`. Patch = first two parts of `gameVersion` (`16.21`). `ITEM_UNDO.beforeId` is the undone item. PUUIDs are encrypted per API key project: one saved under another key gets `400 Exception decrypting` — re-resolve it by Riot ID (`refreshProfile` does).
- **Leaguepedia (esports):** Cargo API at `lol.fandom.com/api.php`, CC BY-SA — credit it on the pages. Anonymous access is almost always `ratelimited`, so the client logs in with a bot password; one request at a time. Returned field names use spaces instead of `_` (`DateTime UTC`). Series/games reference teams by **wiki page name** (`LYON (2024 American Team)`), so query `Teams` by `_pageName`. `Special:FilePath` image links return 403 when hotlinked — resolve CDN URLs with `fileUrls()`. Names are English → map to Data Dragon ids via `getNameIndex()`. Don't use the unofficial lolesports.com API (key embedded in their site).
- **Cache Components rules:** runtime data (`params`, `searchParams`, DB reads, uncached fetches) must sit inside `<Suspense>`; use `connection()` before time-dependent rendering; the React lint rule forbids `Date.now()` in components — compute it in the data loader. `'use cache'` + `cacheLife` for shareable data (Data Dragon 1 day, global stats ~1 min). `use cache` / `cacheLife` don't work in the Node scripts — use `fetchStaticData()` there, not `getStaticData()`.
- **DB:** `db()` in `src/lib/db/index.ts` keeps only the postgres pool on `globalThis`; the Drizzle instance is recreated per module load (it caches column names — keeping it across HMR broke queries after schema changes). `prepare: false` because of Neon's pooler. Columns are snake_case via `casing: "snake_case"`. Matches are immutable and keep the Riot JSON in `matches.raw` minus each participant's `challenges`/`missions` (`slimMatch()`, half the size, unused by the site). The free Neon project caps at 1 GB and Postgres never returns freed space by itself: `pnpm db:prune` drops collector matches older than the last 3 patches (keeping ones with a tracked `accounts` player); `pnpm db:slim-matches` is the one-time backup → truncate → reinsert that shrank the table; `champion_*` / `bracket_totals` are derived and fully rewritten per patch by the aggregator.
- **Lint:** ESLint 9 flat config (`eslint.config.mjs`, from create-next-app). `pnpm typecheck` runs `next typegen` first (route types like `PageProps<…>`).
- **Tests:** Vitest, **95 tests** as of 2026-10-27 — Riot client (MSW), Riot ID parsing, match/timeline mappers, build summaries, tiers, tier-list filters, leaderboard merge/pagination, LP history, search parsing, esports parsing/standings/stats/name index. DB queries and pages have no automated tests (verified manually / with a headless-browser script). No CI.

## Working rules
- Before saying something works: `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm build` for changes to routes, caching or config. For UI changes, look at the page (desktop **and** mobile width).
- Schema change → edit `schema.ts`, `pnpm db:generate`, review the SQL, `pnpm db:migrate`. Never edit an applied migration. Update `CONTEXT.md`.
- Server Action arguments come from the client — validate them (platform, paths, enums) like `src/app/lol/[region]/[riotId]/actions.ts` does.
- Pure logic (mappers, aggregation, tiers, parsing) lives in plain functions with unit tests; services do I/O around them.
- Riot errors are surfaced as messages (`RiotAuthError` → expired key, `RiotApiError` → status), never as a crashed page; `RiotNotFoundError` → `notFound()`.
- **Windows dev box:** shell is PowerShell (Git Bash also available). Stopping a backgrounded `pnpm dev` can leave the Next `node` child alive on port 3000 holding stale code — check `Get-NetTCPConnection -LocalPort 3000` and stop only a process you started. Memory is tight; don't run several dev servers.

## Commit conventions
- One-line **Conventional Commits** subject only — no body. E.g. `feat(search): add player autocomplete`, `fix(db): recreate drizzle instance on HMR`, `docs: add CONTEXT.md`.
- **Never** add `Co-authored-by`, "Generated with", or any trailer.

## Git
- Remote `origin` = `https://github.com/LeoGCarva/opgg-clone` (**public**), default branch `master`.
- `gh` CLI is installed (`C:\Program Files\GitHub CLI\gh.exe`, may not be on PATH in older shells) and authenticated — use it for GitHub ops (PRs, issues, releases).
- Work on a branch and open a PR to `master`.
- Never commit `.env` / `.env.local` (gitignored); `.env.example` is the template.
