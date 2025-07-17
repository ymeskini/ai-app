DROP TABLE "ai-app-template_request";--> statement-breakpoint
ALTER TABLE "ai-app-template_chat" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "parts" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_user" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_order_idx" ON "ai-app-template_message" USING btree ("order");--> statement-breakpoint
ALTER TABLE "ai-app-template_message" DROP COLUMN IF EXISTS "content";--> statement-breakpoint
ALTER TABLE "ai-app-template_user" DROP COLUMN IF EXISTS "is_admin";