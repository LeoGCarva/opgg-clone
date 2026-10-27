CREATE TABLE "lp_history" (
	"puuid" text NOT NULL,
	"queue_type" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tier" text NOT NULL,
	"rank" text NOT NULL,
	"league_points" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	CONSTRAINT "lp_history_puuid_queue_type_recorded_at_pk" PRIMARY KEY("puuid","queue_type","recorded_at")
);
--> statement-breakpoint
ALTER TABLE "lp_history" ADD CONSTRAINT "lp_history_puuid_accounts_puuid_fk" FOREIGN KEY ("puuid") REFERENCES "public"."accounts"("puuid") ON DELETE cascade ON UPDATE no action;