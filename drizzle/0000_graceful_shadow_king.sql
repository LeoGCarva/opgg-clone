CREATE TABLE "accounts" (
	"puuid" text PRIMARY KEY NOT NULL,
	"game_name" text NOT NULL,
	"tag_line" text NOT NULL,
	"platform" text NOT NULL,
	"profile_icon_id" integer,
	"summoner_level" integer,
	"last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_entries" (
	"puuid" text NOT NULL,
	"queue_type" text NOT NULL,
	"tier" text NOT NULL,
	"rank" text NOT NULL,
	"league_points" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"hot_streak" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_entries_puuid_queue_type_pk" PRIMARY KEY("puuid","queue_type")
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"match_id" text NOT NULL,
	"puuid" text NOT NULL,
	"participant_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"riot_id_game_name" text,
	"riot_id_tagline" text,
	"champion_id" integer NOT NULL,
	"champion_name" text NOT NULL,
	"champ_level" integer NOT NULL,
	"team_position" text NOT NULL,
	"win" boolean NOT NULL,
	"kills" integer NOT NULL,
	"deaths" integer NOT NULL,
	"assists" integer NOT NULL,
	"cs" integer NOT NULL,
	"gold_earned" integer NOT NULL,
	"damage_to_champions" integer NOT NULL,
	"vision_score" integer NOT NULL,
	"items" integer[] NOT NULL,
	"summoner1_id" integer NOT NULL,
	"summoner2_id" integer NOT NULL,
	"keystone_id" integer,
	"secondary_style_id" integer,
	"queue_id" integer NOT NULL,
	"game_creation" timestamp with time zone NOT NULL,
	CONSTRAINT "match_participants_match_id_puuid_pk" PRIMARY KEY("match_id","puuid")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"match_id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"queue_id" integer NOT NULL,
	"game_version" text NOT NULL,
	"patch" text NOT NULL,
	"game_creation" timestamp with time zone NOT NULL,
	"game_duration" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_entries" ADD CONSTRAINT "league_entries_puuid_accounts_puuid_fk" FOREIGN KEY ("puuid") REFERENCES "public"."accounts"("puuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_riot_id_idx" ON "accounts" USING btree (lower("game_name"),lower("tag_line"));--> statement-breakpoint
CREATE INDEX "match_participants_history_idx" ON "match_participants" USING btree ("puuid","game_creation" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "matches_queue_patch_idx" ON "matches" USING btree ("queue_id","patch");