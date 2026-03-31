CREATE TABLE "ai-app-template_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"start_line" integer,
	"end_line" integer,
	"heading_context_text" text,
	"heading_context_level" integer,
	"heading_line_number" integer,
	"character_count" integer NOT NULL,
	"word_count" integer NOT NULL,
	"embedding" vector(1024),
	"context_prefix" text,
	"search_vector" "tsvector",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_document" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"source_file_path" text NOT NULL,
	"page_type" text,
	"sidebar" text,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "chat_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "message_chat_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "message_order_idx";--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "role" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "ai-app-template_user" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_chunk" ADD CONSTRAINT "ai-app-template_chunk_document_id_ai-app-template_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."ai-app-template_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" DROP COLUMN "annotations";