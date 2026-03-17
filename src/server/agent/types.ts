import type { InferUITools, UIMessage } from "ai";
import type { searchWebTool } from "./run-agent-loop.ts";

export type OurMessage = UIMessage<
  never,
  { "new-chat-created": { chatId: string } },
  InferUITools<{ searchWeb: typeof searchWebTool }>
>;

export type GuardrailResult = {
  classification: "allow" | "refuse";
  reason?: string;
};
