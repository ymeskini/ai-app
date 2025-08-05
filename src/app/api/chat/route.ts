import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  generateId,
  JsonToSseTransformStream,
} from "ai";
import { createResumableStreamContext } from "resumable-stream/ioredis";

import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/queries";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { chats } from "~/server/db/schema";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { streamFromDeepSearch } from "~/lib/deep-search";
import type { OurMessage } from "~/lib/types";
import { messageToString } from "~/lib/utils";
import { after } from "next/server";
import {
  getStreamId,
  setStreamId,
  streamPublisher,
  streamSubscriber,
} from "~/server/redis/redis";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

const streamContext = createResumableStreamContext({
  waitUntil: after,
  publisher: streamPublisher,
  subscriber: streamSubscriber,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<UIMessage>;
    chatId?: string;
  };

  const { messages, chatId } = body;

  if (!messages.length) {
    return new Response("No messages provided", { status: 400 });
  }

  // If no chatId is provided, create a new chat with the user's message
  let currentChatId = chatId;
  if (!currentChatId) {
    const newChatId = crypto.randomUUID();
    await upsertChat({
      userId: session.user.id,
      chatId: newChatId,
      title:
        messageToString(messages[messages.length - 1]!).slice(0, 50) + "...",
      messages: messages, // Only save the user's message initially
    });
    currentChatId = newChatId;
  } else {
    // Verify the chat belongs to the user
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, currentChatId),
    });
    if (!chat || chat.userId !== session.user.id) {
      return new Response("Chat not found or unauthorized", { status: 404 });
    }
  }

  const trace = langfuse.trace({
    sessionId: currentChatId,
    name: "chat",
    userId: session.user.id,
  });

  const streamId = generateId();

  await setStreamId({ chatId: currentChatId, streamId });

  const streamWithFinish = createUIMessageStream<OurMessage>({
    originalMessages: messages as OurMessage[],
    execute: async ({ writer }) => {
      // If this is a new chat, send the chat ID to the frontend
      if (!chatId) {
        writer.write({
          type: "data-new-chat-created",
          data: {
            chatId: currentChatId,
          },
          transient: true,
        });
      }

      const result = await streamFromDeepSearch({
        messages,
        langfuseTraceId: trace.id,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        writeMessagePart: writer.write,
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: finishedMessages }) => {
      // Save the complete chat history
      const lastMessage = finishedMessages[finishedMessages.length - 1];
      if (!lastMessage) {
        return;
      }

      await upsertChat({
        userId: session.user.id,
        chatId: currentChatId,
        title: messageToString(lastMessage).slice(0, 50) + "...",
        messages: finishedMessages,
      });

      await langfuse.flushAsync();
    },
  });

  const resumableStream = await streamContext.resumableStream(streamId, () =>
    streamWithFinish.pipeThrough(new JsonToSseTransformStream()),
  );

  return new Response(resumableStream);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("id is required", { status: 400 });
  }

  const streamId = await getStreamId(chatId);
  console.log(streamId);

  if (!streamId) {
    return new Response("No streams found", { status: 404 });
  }

  if (!streamId) {
    return new Response("No streams found", { status: 404 });
  }

  const emptyDataStream = createUIMessageStream({
    execute: () => {
      // This stream will be empty initially
    },
  });

  return new Response(
    await streamContext.resumableStream(streamId, () =>
      emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
    ),
  );
}
