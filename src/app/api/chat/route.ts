import type { UIMessage } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { eq } from "drizzle-orm";
import { Langfuse } from "langfuse";
import { ulid } from "ulid";

import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/queries";
import { db } from "~/server/db";
import { chats } from "~/server/db/schema";
import { env } from "~/env";
import { streamFromDeepSearch } from "~/server/agent/deep-search";
import type { OurMessage } from "~/server/agent/types";
import { messageToString } from "~/lib/utils";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
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
    const newChatId = ulid();
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

  // cf. https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream#createuimessagestream
  // we use it to have onFinish callback
  const stream = createUIMessageStream<OurMessage>({
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
        writeMessagePart: writer.write.bind(writer),
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

  return createUIMessageStreamResponse({
    stream,
  });
}
