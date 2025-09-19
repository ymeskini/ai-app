import type { UIMessage } from "ai";
import type { Action } from "./get-next-action.ts";

type Source = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

export type OurMessage = UIMessage<
  never,
  {
    "new-action": Action;
    sources: Source[];
    usage: {
      totalTokens: number;
    };
    "new-chat-created": {
      chatId: string;
    };
  }
>;

export type GuardrailResult = {
  classification: "allow" | "refuse";
  reason?: string;
};
