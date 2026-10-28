ALTER TYPE "public"."trade_status" ADD VALUE 'countered';--> statement-breakpoint
CREATE TABLE "trade_round_item" (
	"id" text PRIMARY KEY NOT NULL,
	"roundId" text NOT NULL,
	"cardId" text,
	"direction" "trade_item_direction" NOT NULL,
	"title" text NOT NULL,
	"imageUrl" text NOT NULL,
	"category" "card_category",
	"setName" text,
	"setCode" text,
	"cardNumber" text
);
--> statement-breakpoint
CREATE TABLE "trade_round" (
	"id" text PRIMARY KEY NOT NULL,
	"tradeId" text NOT NULL,
	"roundNumber" integer NOT NULL,
	"authorId" text NOT NULL,
	"message" varchar(280),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade" ADD COLUMN "turnUserId" text;--> statement-breakpoint
ALTER TABLE "trade_round_item" ADD CONSTRAINT "trade_round_item_roundId_trade_round_id_fk" FOREIGN KEY ("roundId") REFERENCES "public"."trade_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_round_item" ADD CONSTRAINT "trade_round_item_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_round" ADD CONSTRAINT "trade_round_tradeId_trade_id_fk" FOREIGN KEY ("tradeId") REFERENCES "public"."trade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_round" ADD CONSTRAINT "trade_round_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_round_item_round_idx" ON "trade_round_item" USING btree ("roundId");--> statement-breakpoint
CREATE INDEX "trade_round_item_card_idx" ON "trade_round_item" USING btree ("cardId");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_round_trade_number_idx" ON "trade_round" USING btree ("tradeId","roundNumber");--> statement-breakpoint
CREATE INDEX "trade_round_trade_idx" ON "trade_round" USING btree ("tradeId");--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_turnUserId_user_id_fk" FOREIGN KEY ("turnUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_turn_status_idx" ON "trade" USING btree ("turnUserId","status");--> statement-breakpoint
UPDATE "trade" SET "turnUserId" = "recipientId" WHERE "status" = 'proposed' AND "turnUserId" IS NULL;