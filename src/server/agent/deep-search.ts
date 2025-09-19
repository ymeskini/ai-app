import {
  type UIMessage,
  type StreamTextResult,
  type UIMessageStreamWriter,
} from "ai";
import { runAgentLoop } from "./run-agent-loop.ts";
import type { OurMessage } from "./types.ts";

export const streamFromDeepSearch = async (opts: {
  messages: UIMessage[];
  langfuseTraceId?: string;
  writeMessagePart?: UIMessageStreamWriter<OurMessage>["write"];
}): Promise<StreamTextResult<any, string>> => {
  return runAgentLoop(opts.messages, {
    langfuseTraceId: opts.langfuseTraceId,
    writeMessagePart: opts.writeMessagePart,
  });
};

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages,
    langfuseTraceId: undefined,
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
