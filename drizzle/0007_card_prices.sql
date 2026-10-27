CREATE TYPE "public"."card_match_confidence" AS ENUM('high', 'medium', 'manual', 'none');--> statement-breakpoint
CREATE TABLE "card_price" (
	"tcgdexId" text NOT NULL,
	"variant" text NOT NULL,
	"marketUsd" numeric(12, 2),
	"lowUsd" numeric(12, 2),
	"midUsd" numeric(12, 2),
	"sourceUpdatedAt" timestamp,
	"fetchedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_price_tcgdexId_variant_pk" PRIMARY KEY("tcgdexId","variant")
);
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "tcgdexId" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "matchConfidence" "card_match_confidence";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "priceVariant" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "matchCandidates" jsonb;--> statement-breakpoint
CREATE INDEX "card_tcgdex_idx" ON "card" USING btree ("tcgdexId");--> statement-breakpoint
CREATE INDEX "card_match_confidence_idx" ON "card" USING btree ("matchConfidence");