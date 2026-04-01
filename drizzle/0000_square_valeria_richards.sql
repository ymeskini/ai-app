CREATE TABLE "ai-app-template_account" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "ai-app-template_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_session" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"image" varchar(255),
	"is_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "ai-app-template_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar(255) NOT NULL,
	"parts" json NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai-app-template_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "ai-app-template_account" ADD CONSTRAINT "ai-app-template_account_user_id_ai-app-template_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ai-app-template_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_session" ADD CONSTRAINT "ai-app-template_session_user_id_ai-app-template_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ai-app-template_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_chat" ADD CONSTRAINT "ai-app-template_chat_user_id_ai-app-template_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ai-app-template_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ADD CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ai-app-template_chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai-app-template_chunk" ADD CONSTRAINT "ai-app-template_chunk_document_id_ai-app-template_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."ai-app-template_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "ai-app-template_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "ai-app-template_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_chat_id_idx" ON "ai-app-template_message" USING btree ("chat_id");