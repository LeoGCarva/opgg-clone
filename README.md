# rubra

A League of Legends stats site inspired by op.gg and u.gg, built as a study project. It shows player profiles, global champion statistics, a Solo/Duo leaderboard, and a Worlds 2026 section.

The interface is in Brazilian Portuguese.

## Features

- **Player profiles:** rank, LP history, match history, most-played champions, and per-champion stats.
- **Player search:** autocomplete and search by Riot ID across 15 regions.
- **Champion tier list:** win, pick, and ban rates, filterable by role and rank bracket.
- **Champion pages:** runes, spells, items, skill order, and matchups.
- **Leaderboard:** Challenger, Grandmaster, and Master players in each region.
- **Worlds 2026:** schedule, series details, standings, and tournament stats.

## Tech stack

- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS v4
- PostgreSQL (Neon) with Drizzle ORM
- Zod for validation and Bottleneck for rate limiting
- Vitest and MSW for tests

## Getting started

You need Node.js, pnpm, a PostgreSQL database, and a [Riot API key](https://developer.riotgames.com). Development keys expire every 24 hours.

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env`, then fill in these values:

   | Variable | Required | Description |
   |---|---|---|
   | `DATABASE_URL` | Yes | Postgres connection string (the pooled string if you use Neon) |
   | `RIOT_API_KEY` | Yes | Your Riot API key |
   | `RIOT_RATE_LIMITS` | No | Rate limits, defaulting to the development key's `20:1,100:120` |
   | `LEAGUEPEDIA_USER` | For Worlds | Bot username, in the format `YourName@botname` |
   | `LEAGUEPEDIA_PASSWORD` | For Worlds | Bot password |

   For the Worlds section, create a bot password at [Special:BotPasswords](https://lol.fandom.com/wiki/Special:BotPasswords) with only "Basic rights". Without a login, the wiki API usually responds with `ratelimited`.

3. Apply the database migrations and start the app:

   ```bash
   pnpm db:migrate
   pnpm dev
   ```

4. Open <http://localhost:3000>.

## How data gets in

| Source | When it runs | What it stores |
|---|---|---|
| **Profile page** (`/lol/br/Name-TAG`) | First visit, the refresh button (2-minute cooldown), or "load more" | Account, rank, and the player's matches |
| **Collector** (`pnpm collect`) | Separate process, in a loop | Solo/Duo matches and, for the current patch, their timelines, by rank bracket |
| **Aggregator** (`pnpm aggregate`) | Every 30 minutes inside the collector, or manually | The `champion_*` tables behind the tier list |

The tier list stays empty until you collect and aggregate some matches:

```bash
pnpm collect            # BR, until you press Ctrl+C
pnpm collect br 10      # stops after 10 minutes
pnpm aggregate          # recalculates stats for the latest collected patch
```

Each match with a timeline takes 2 API requests, so a development key (100 requests every 2 minutes) collects about 25 matches per minute. That is enough for studying the project, but a reliable tier list needs tens of thousands of matches and a production key.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` / `build` / `start` | Run or build the Next.js app |
| `pnpm test` / `typecheck` / `lint` | Run Vitest, the type checker, or ESLint |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle commands |
| `pnpm riot:smoke ["Name#TAG"] [br]` | Test your Riot API key |
| `pnpm collect [br] [minutes]` | Collect matches |
| `pnpm aggregate [patch]` | Recalculate global stats |
| `pnpm db:prune [--yes]` | Delete collector matches from old patches, keeping the latest 3 |
| `pnpm db:slim-matches export` / `restore <file>` | One-off rebuild of `matches` with slimmer JSON (backup in `.backup/`) |

## Project structure

```text
src/lib/riot/        Riot API client (rate limiting, retries), routing, endpoints, types
src/lib/db/          Drizzle schema and connection
src/lib/services/    Profiles, match mappers, collector, aggregator, tiers
src/lib/esports/     Leaguepedia client and Worlds parsing, standings, and stats
src/lib/ddragon.ts   Static data from Data Dragon (champions, items, runes)
src/app/             Pages and routes
scripts/             Smoke test, collector, aggregator, and maintenance scripts
tests/               Vitest tests
```

[`CONTEXT.md`](CONTEXT.md) describes every feature in detail (in Portuguese).

## Credits

- Esports data: [Leaguepedia](https://lol.fandom.com) (CC BY-SA 3.0)
- Rank icons: League of Legends client "mini crests" (Riot Games), via [Community Dragon](https://raw.communitydragon.org)
- Champion, item, and rune images: Riot Games' Data Dragon

## Disclaimer

rubra isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
