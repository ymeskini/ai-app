import type { InferUITools, UIMessage } from "ai";
import type { searchWebTool } from "./run-agent-loop.ts";

export interface OurDataParts {
  "new-chat-created": { chatId: string };
}

export type OurMessage = UIMessage<
  never,
  OurDataParts,
  InferUITools<{ searchWeb: typeof searchWebTool }>
>;

export interface GuardrailResult {
  classification: "allow" | "refuse";
  reason?: string;
}
