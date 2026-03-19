import type { InferUITools, UIMessage } from "ai";
import type { searchWebTool } from "./run-agent-loop.ts";

export type OurDataParts = {
  "new-chat-created": { chatId: string };
};

export type OurMessage = UIMessage<
  never,
  OurDataParts,
  InferUITools<{ searchWeb: typeof searchWebTool }>
>;

export type GuardrailResult = {
  classification: "allow" | "refuse";
  reason?: string;
};
