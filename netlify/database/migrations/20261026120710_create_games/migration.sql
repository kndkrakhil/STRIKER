CREATE TABLE "games" (
	"code" text PRIMARY KEY,
	"board" jsonb NOT NULL,
	"turn" integer DEFAULT 1 NOT NULL,
	"winner" integer DEFAULT 0 NOT NULL,
	"line" jsonb NOT NULL,
	"moves" integer DEFAULT 0 NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"p1" text NOT NULL,
	"p2" text,
	"revision" integer DEFAULT 0 NOT NULL
);
