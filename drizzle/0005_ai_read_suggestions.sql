ALTER TABLE "card" ADD COLUMN "recognitionNote" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "suggestedTitle" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "suggestedCategory" "card_category";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "suggestedSetName" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "suggestedCardNumber" text;