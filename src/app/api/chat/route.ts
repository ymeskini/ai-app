import type { Message } from "ai";
import { createDataStreamResponse } from "ai";
import { Langfuse } from "langfuse";
import { geolocation } from "@vercel/functions";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/chat";
import { streamFromDeepSearch } from "~/lib/deep-search";
import { generateChatTitle } from "~/lib/generate-chat-title";
import type { OurMessageAnnotation } from "~/lib/get-next-action";
import type {
  StreamTextFinishResult,
  SerializableMessageAnnotation,
} from "~/types/chat";
import { serializeAnnotation } from "~/types/chat";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

function getRequestLocationHints(requestHints: {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
}) {
  return `About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/chat",
    },
    async (span) => {
      try {
        const session = await auth();

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Set user context for Sentry
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        });

        // Mock geolocation headers for development
        if (process.env.NODE_ENV === "development") {
          request.headers.set("x-vercel-ip-country", "US");
          request.headers.set("x-vercel-ip-country-region", "CA");
          request.headers.set("x-vercel-ip-city", "San Francisco");
          request.headers.set("x-vercel-ip-latitude", "37.7749");
          request.headers.set("x-vercel-ip-longitude", "-122.4194");
        }

        // Get user's location from request
        const { longitude, latitude, city, country } = geolocation(request);

        const requestLocationHints = {
          longitude,
          latitude,
          city,
          country,
        };

        const locationContext = getRequestLocationHints(requestLocationHints);

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

        // Add attributes to Sentry span
        span.setAttribute("user.id", session.user.id);
        span.setAttribute("chat.id", body.chatId);
        span.setAttribute("chat.isNew", body.isNewChat ?? false);
        span.setAttribute("messages.count", body.messages.length);

        return createDataStreamResponse({
          execute: async (dataStream) => {
            try {
              const { messages, chatId, isNewChat = false } = body;

              // Collect annotations in-memory
              const annotations: SerializableMessageAnnotation[] = [];

              // Create a new chat if isNewChat is true
              let newChatId: string | null = null;
              let currentChatId = chatId;

              // Set up title generation promise
              let titlePromise: Promise<string>;
              if (isNewChat) {
                // Generate title in parallel with streaming
                titlePromise = generateChatTitle(messages);

                newChatId = chatId;
                currentChatId = chatId;

                const createChatSpan = trace.span({
                  name: "create-new-chat",
                  input: {
                    userId: session.user.id,
                    chatId: chatId,
                    title: "Generating...",
                    messageCount: messages.length,
                  },
                });

                // Create the chat with placeholder title
                const result = await upsertChat({
                  userId: session.user.id,
                  chatId: chatId,
                  title: "Generating...",
                  messages: messages,
                });

                createChatSpan.end({
                  output: {
                    chatId: result.id,
                  },
                });
              } else {
                // For existing chats, resolve empty string
                titlePromise = Promise.resolve("");
              }

              // Update trace with session ID now that we have the chat ID
              trace.update({
                sessionId: currentChatId,
              });

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
                locationContext,
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

                  // Handle title generation and chat update asynchronously (fire and forget)
                  titlePromise
                    .then((title) => {
                      upsertChat({
                        userId: session.user.id,
                        chatId: currentChatId,
                        ...(title ? { title } : {}), // Only save the title if it's not empty
                        messages: updatedMessages,
                      }).catch((error) => {
                        console.error("Failed to persist chat:", error);
                        Sentry.captureException(error);
                      });
                    })
                    .catch((error) => {
                      console.error("Failed to generate title:", error);
                      Sentry.captureException(error);
                      // Fallback: save without title update
                      upsertChat({
                        userId: session.user.id,
                        chatId: currentChatId,
                        messages: updatedMessages,
                      }).catch((error) => {
                        console.error("Failed to persist chat:", error);
                        Sentry.captureException(error);
                      });
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
            } catch (error) {
              Sentry.captureException(error);
              throw error;
            }
          },
          onError: (e) => {
            console.error(e);
            Sentry.captureException(e);
            return "Oops, an error occured!";
          },
        });
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}
