CREATE TYPE "public"."card_kind" AS ENUM('physical', 'digital');--> statement-breakpoint
CREATE TYPE "public"."nft_claim_status" AS ENUM('claimed');--> statement-breakpoint
CREATE TYPE "public"."nft_platform" AS ENUM('nba_top_shot', 'nfl_all_day', 'sorare');--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "kind" "card_kind" DEFAULT 'physical' NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "collection" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "platform" "nft_platform";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "tokenId" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "sourceUrl" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "claimStatus" "nft_claim_status";--> statement-breakpoint
ALTER TABLE "trade_item" ADD COLUMN "kind" "card_kind" DEFAULT 'physical' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_round_item" ADD COLUMN "kind" "card_kind" DEFAULT 'physical' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "card_owner_nft_token_idx" ON "card" USING btree ("ownerId","platform","tokenId") WHERE "card"."tokenId" is not null;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_digital_claim_check" CHECK (("card"."kind" = 'physical' and "card"."platform" is null and "card"."claimStatus" is null) or ("card"."kind" = 'digital' and "card"."platform" is not null and "card"."collection" is not null and "card"."claimStatus" = 'claimed'));