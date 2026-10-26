CREATE TABLE "bracket_totals" (
	"patch" text NOT NULL,
	"bracket" text NOT NULL,
	"matches" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bracket_totals_patch_bracket_pk" PRIMARY KEY("patch","bracket")
);
--> statement-breakpoint
CREATE TABLE "champion_bans" (
	"patch" text NOT NULL,
	"bracket" text NOT NULL,
	"champion_id" integer NOT NULL,
	"bans" integer NOT NULL,
	CONSTRAINT "champion_bans_patch_bracket_champion_id_pk" PRIMARY KEY("patch","bracket","champion_id")
);
--> statement-breakpoint
CREATE TABLE "champion_builds" (
	"patch" text NOT NULL,
	"bracket" text NOT NULL,
	"champion_id" integer NOT NULL,
	"role" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"games" integer NOT NULL,
	"wins" integer NOT NULL,
	CONSTRAINT "champion_builds_patch_bracket_champion_id_role_kind_key_pk" PRIMARY KEY("patch","bracket","champion_id","role","kind","key")
);
--> statement-breakpoint
CREATE TABLE "champion_matchups" (
	"patch" text NOT NULL,
	"bracket" text NOT NULL,
	"champion_id" integer NOT NULL,
	"role" text NOT NULL,
	"opponent_id" integer NOT NULL,
	"games" integer NOT NULL,
	"wins" integer NOT NULL,
	CONSTRAINT "champion_matchups_patch_bracket_champion_id_role_opponent_id_pk" PRIMARY KEY("patch","bracket","champion_id","role","opponent_id")
);
--> statement-breakpoint
CREATE TABLE "champion_stats" (
	"patch" text NOT NULL,
	"bracket" text NOT NULL,
	"champion_id" integer NOT NULL,
	"role" text NOT NULL,
	"games" integer NOT NULL,
	"wins" integer NOT NULL,
	CONSTRAINT "champion_stats_patch_bracket_champion_id_role_pk" PRIMARY KEY("patch","bracket","champion_id","role")
);
--> statement-breakpoint
CREATE TABLE "crawl_players" (
	"puuid" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"bracket" text NOT NULL,
	"next_crawl_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_crawled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_bans" (
	"match_id" text NOT NULL,
	"team_id" integer NOT NULL,
	"pick_turn" integer NOT NULL,
	"champion_id" integer NOT NULL,
	CONSTRAINT "match_bans_match_id_team_id_pick_turn_pk" PRIMARY KEY("match_id","team_id","pick_turn")
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "item_build" integer[];--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "skill_order" integer[];--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "start_items" integer[];--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tier_bracket" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "has_timeline" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match_bans" ADD CONSTRAINT "match_bans_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crawl_players_next_idx" ON "crawl_players" USING btree ("next_crawl_at");--> statement-breakpoint
CREATE INDEX "matches_stats_idx" ON "matches" USING btree ("patch","tier_bracket") WHERE "matches"."has_timeline";