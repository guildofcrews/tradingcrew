CREATE TYPE "public"."trade_item_direction" AS ENUM('offer', 'request');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('proposed', 'accepted', 'completed', 'rejected', 'withdrawn', 'cancelled');--> statement-breakpoint
CREATE TABLE "gallery_share" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"granteeId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_share_no_self" CHECK ("gallery_share"."ownerId" <> "gallery_share"."granteeId")
);
--> statement-breakpoint
CREATE TABLE "trade_item" (
	"id" text PRIMARY KEY NOT NULL,
	"tradeId" text NOT NULL,
	"cardId" text,
	"direction" "trade_item_direction" NOT NULL,
	"title" text NOT NULL,
	"imageUrl" text NOT NULL,
	"category" "card_category"
);
--> statement-breakpoint
CREATE TABLE "trade" (
	"id" text PRIMARY KEY NOT NULL,
	"proposerId" text NOT NULL,
	"recipientId" text NOT NULL,
	"status" "trade_status" DEFAULT 'proposed' NOT NULL,
	"message" varchar(280),
	"statusReason" text,
	"parentTradeId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"respondedAt" timestamp,
	"proposerCompletedAt" timestamp,
	"recipientCompletedAt" timestamp,
	"completedAt" timestamp,
	"closedAt" timestamp,
	CONSTRAINT "trade_distinct_parties" CHECK ("trade"."proposerId" <> "trade"."recipientId")
);
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "lockedTradeId" text;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_granteeId_user_id_fk" FOREIGN KEY ("granteeId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_item" ADD CONSTRAINT "trade_item_tradeId_trade_id_fk" FOREIGN KEY ("tradeId") REFERENCES "public"."trade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_item" ADD CONSTRAINT "trade_item_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_proposerId_user_id_fk" FOREIGN KEY ("proposerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_recipientId_user_id_fk" FOREIGN KEY ("recipientId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_parentTradeId_trade_id_fk" FOREIGN KEY ("parentTradeId") REFERENCES "public"."trade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_share_pair_idx" ON "gallery_share" USING btree ("ownerId","granteeId");--> statement-breakpoint
CREATE INDEX "gallery_share_grantee_idx" ON "gallery_share" USING btree ("granteeId");--> statement-breakpoint
CREATE INDEX "trade_item_trade_idx" ON "trade_item" USING btree ("tradeId");--> statement-breakpoint
CREATE INDEX "trade_item_card_idx" ON "trade_item" USING btree ("cardId");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_item_trade_card_idx" ON "trade_item" USING btree ("tradeId","cardId");--> statement-breakpoint
CREATE INDEX "trade_recipient_status_idx" ON "trade" USING btree ("recipientId","status");--> statement-breakpoint
CREATE INDEX "trade_proposer_status_idx" ON "trade" USING btree ("proposerId","status");--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_lockedTradeId_trade_id_fk" FOREIGN KEY ("lockedTradeId") REFERENCES "public"."trade"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_locked_trade_idx" ON "card" USING btree ("lockedTradeId");