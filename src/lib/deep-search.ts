import {
  type Message,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "~/lib/run-agent-loop";
import type { OurMessageAnnotation } from "~/lib/get-next-action";
import type { StreamTextFinishResult } from "~/types/chat";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  locationContext: string;
  onFinish: (finishResult: StreamTextFinishResult) => void;
  telemetry: TelemetrySettings;
  writeMessageAnnotation: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<never, string>> => {
  // Extract the user query from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  const userQuery = lastMessage?.content ?? "";

  // Convert content to string if needed - for now just handle string content
  const queryString =
    typeof userQuery === "string" ? userQuery : "Please help me";

  // Extract langfuseTraceId from telemetry metadata
  const langfuseTraceId = opts.telemetry.metadata?.langfuseTraceId as string;

  // Run the agent loop and return the result - now passing full message history
  return await runAgentLoop(
    queryString,
    opts.messages,
    opts.locationContext,
    3,
    opts.writeMessageAnnotation,
    langfuseTraceId,
    opts.onFinish,
  );
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    locationContext:
      "About the origin of user's request:\n- lat: unknown\n- lon: unknown\n- city: unknown\n- country: unknown",
    onFinish: () => {
      // No-op for evaluation purposes
      return;
    },
    telemetry: {
      isEnabled: false,
    },
    writeMessageAnnotation: () => {
      // No-op for evaluation purposes
      return;
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
