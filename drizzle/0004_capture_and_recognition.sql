CREATE TYPE "public"."card_recognition_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."card_review_status" AS ENUM('needs_review', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."card_scan_status" AS ENUM('cleaned', 'original');--> statement-breakpoint
CREATE TYPE "public"."recognition_log_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TABLE "card_recognition_log" (
	"id" text PRIMARY KEY NOT NULL,
	"cardId" text,
	"ownerId" text,
	"model" text NOT NULL,
	"generationId" text,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"costUsd" numeric(14, 8),
	"status" "recognition_log_status" NOT NULL,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "originalImageUrl" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "setName" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "cardNumber" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "officialImageUrl" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "preferKidPhoto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "reviewStatus" "card_review_status";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "recognitionStatus" "card_recognition_status";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "scanStatus" "card_scan_status";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "recognitionConfidence" real;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "recognitionAttempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "captureBatchId" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "detailsTouched" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "card_recognition_log" ADD CONSTRAINT "card_recognition_log_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_recognition_log" ADD CONSTRAINT "card_recognition_log_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recognition_log_card_idx" ON "card_recognition_log" USING btree ("cardId");--> statement-breakpoint
CREATE INDEX "recognition_log_created_idx" ON "card_recognition_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "card_owner_review_idx" ON "card" USING btree ("ownerId","reviewStatus");--> statement-breakpoint
CREATE INDEX "card_capture_batch_idx" ON "card" USING btree ("captureBatchId");