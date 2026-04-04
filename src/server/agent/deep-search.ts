import type { UIMessage } from "ai";

import { runAgentLoop } from "./run-agent-loop.ts";
import type { SearchToolResult } from "./types.ts";

export const streamFromDeepSearch = async (opts: {
  messages: UIMessage[];
  langfuseTraceId?: string;
}): Promise<SearchToolResult> => {
  return runAgentLoop(opts.messages, {
    langfuseTraceId: opts.langfuseTraceId,
  });
};

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({ messages });
  await result.consumeStream();
  return result.text;
}
