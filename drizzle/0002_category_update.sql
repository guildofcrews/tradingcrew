-- Map old category values to NULL before changing the enum
UPDATE "card" SET "category" = NULL WHERE "category" = 'sports';--> statement-breakpoint
UPDATE "card" SET "category" = NULL WHERE "category" = 'other';--> statement-breakpoint

-- Add new enum values
ALTER TYPE "card_category" ADD VALUE IF NOT EXISTS 'basketball';--> statement-breakpoint
ALTER TYPE "card_category" ADD VALUE IF NOT EXISTS 'baseball';--> statement-breakpoint
ALTER TYPE "card_category" ADD VALUE IF NOT EXISTS 'football';
