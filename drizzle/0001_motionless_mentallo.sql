ALTER TABLE "ai-app-template_message" DROP CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ADD CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ai-app-template_chat"("id") ON DELETE cascade ON UPDATE no action;