import type { InferUITools, StreamTextResult, UIMessage } from "ai";
import type { searchWebTool } from "./run-agent-loop.ts";

export interface OurDataParts {
  "new-chat-created": { chatId: string };
  [key: string]: unknown;
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

export type SearchToolResult = StreamTextResult<
  { searchWeb: typeof searchWebTool },
  never
>;
