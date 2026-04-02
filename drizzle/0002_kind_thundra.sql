CREATE TABLE "ai-app-template_message_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"chunk_id" text NOT NULL,
	"relevance_score" real,
	"citation_number" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai-app-template_message_source" ADD CONSTRAINT "ai-app-template_message_source_message_id_ai-app-template_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai-app-template_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_message_source" ADD CONSTRAINT "ai-app-template_message_source_chunk_id_ai-app-template_chunk_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."ai-app-template_chunk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_source_message_id_idx" ON "ai-app-template_message_source" USING btree ("message_id");