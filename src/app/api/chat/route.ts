import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { model } from "~/lib/model";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

      const result = streamText({
        model,
        messages,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
