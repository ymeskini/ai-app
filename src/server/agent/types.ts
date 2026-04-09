import type { InferUITools, StreamTextResult, UIMessage } from "ai";
import type { ragSearchTool, searchWebTool } from "./run-agent-loop.ts";

export interface OurDataParts {
  "new-chat-created": { chatId: string };
  [key: string]: unknown;
}

export type AgentTools = {
  searchWeb: typeof searchWebTool;
  searchKnowledgeBase: typeof ragSearchTool;
};

export type OurMessage = UIMessage<
  never,
  OurDataParts,
  InferUITools<AgentTools>
>;

export interface GuardrailResult {
  classification: "allow" | "refuse";
  reason?: string;
}

export type SearchToolResult = StreamTextResult<AgentTools, never>;
