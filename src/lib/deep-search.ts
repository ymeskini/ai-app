import {
  type Message,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "~/lib/run-agent-loop";
import type { OurMessageAnnotation } from "~/lib/get-next-action";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: unknown; // We'll ignore this for now as mentioned in the instructions
  telemetry: TelemetrySettings;
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<never, string>> => {
  // Extract the user query from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  const userQuery = lastMessage?.content ?? "";

  // Convert content to string if needed - for now just handle string content
  const queryString = typeof userQuery === 'string' ? userQuery : 'Please help me';

  // Extract langfuseTraceId from telemetry metadata
  const langfuseTraceId = opts.telemetry?.metadata?.langfuseTraceId as string | undefined;

  // Run the agent loop and return the result - now passing full message history
  return await runAgentLoop(queryString, opts.messages, 10, opts.writeMessageAnnotation, langfuseTraceId);
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {
      // No-op for evaluation purposes
      return;
    },
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
