CREATE TABLE "riot_ids" (
	"puuid" text PRIMARY KEY NOT NULL,
	"game_name" text NOT NULL,
	"tag_line" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
