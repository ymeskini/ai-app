import type { Message } from "ai";
import { createDataStreamResponse } from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";

import { upsertChat } from "~/server/db/chat";
import { streamFromDeepSearch } from "~/lib/deep-search";
import type { OurMessageAnnotation } from "~/lib/get-next-action";
import type {
  StreamTextFinishResult,
  SerializableMessageAnnotation,
} from "~/types/chat";
import { serializeAnnotation } from "~/types/chat";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;


export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create Langfuse trace early to track all operations
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });


  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat?: boolean;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId, isNewChat = false } = body;

      // Collect annotations in-memory
      const annotations: SerializableMessageAnnotation[] = [];

      // Create a new chat if isNewChat is true
      let newChatId: string | null = null;
      let currentChatId = chatId;

      if (isNewChat) {
        // Generate a new chat ID (using the provided chatId)
        newChatId = chatId;
        currentChatId = chatId;

        // Create the chat with the user's first message
        // Use the first message content as the title (truncated if too long)
        const firstMessage = messages[0];
        const title = firstMessage?.content
          ? typeof firstMessage.content === "string"
            ? firstMessage.content.slice(0, 50) +
              (firstMessage.content.length > 50 ? "..." : "")
            : "New Chat"
          : "New Chat";

        const createChatSpan = trace.span({
          name: "create-new-chat",
          input: {
            userId: session.user.id,
            chatId: chatId,
            title,
            messageCount: messages.length,
          },
        });

        const result = await upsertChat({
          userId: session.user.id,
          chatId: chatId,
          title,
          messages: messages,
        });

        createChatSpan.end({
          output: {
            chatId: result.id,
          },
        });
      }

      // Update trace with session ID now that we have the chat ID
      trace.update({
        sessionId: currentChatId,
      });

      // Create Langfuse trace with session and user information (updated with sessionId)
      // Note: sessionId will be updated once we have the current chat ID

      // Send the new chat ID to the frontend if a new chat was created
      if (newChatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: newChatId,
        });
      }

      // Wait for the result from the agent loop
      const result = await streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: (finishResult: StreamTextFinishResult) => {
          // Get the last message (which should be the user's message)
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage) {
            return;
          }

          // Create a new assistant message with the result and annotations
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: finishResult.text,
            parts: [{ type: "text", text: finishResult.text }],
            annotations: annotations,
          };

          // Add the assistant message to the messages array
          const updatedMessages = [...messages, assistantMessage];

          // Upsert the chat with updated messages (fire and forget)
          upsertChat({
            userId: session.user.id,
            chatId: currentChatId,
            title: messages[0]?.content
              ? typeof messages[0].content === "string"
                ? messages[0].content.slice(0, 50) +
                  (messages[0].content.length > 50 ? "..." : "")
                : "New Chat"
              : "New Chat",
            messages: updatedMessages,
          }).catch((error) => {
            console.error("Failed to persist chat:", error);
          });
        },
        writeMessageAnnotation: (annotation: OurMessageAnnotation) => {
          // Convert to serializable format and save in-memory
          const serializedAnnotation = serializeAnnotation(annotation);
          annotations.push(serializedAnnotation);
          // Send it to the client
          dataStream.writeMessageAnnotation(serializedAnnotation);
        },
      });

      // Once the result is ready, merge it into the data stream
      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
