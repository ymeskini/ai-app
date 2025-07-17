import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { checkRateLimit, incrementRequestCount } from "~/server/redis/redis";
import { upsertChat } from "~/server/db/chat";

export const maxDuration = 60;


export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limiting
  const { allowed, remainingRequests, isAdmin } = await checkRateLimit(
    session.user.id
  );

  if (!allowed) {
    // Calculate when the daily limit will reset (end of day)
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "You have exceeded your daily request limit. Please try again tomorrow.",
        remainingRequests: 0,
        resetTime: endOfDay.toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Rate-Limit-Limit': '5',
          'X-Rate-Limit-Remaining': '0',
          'X-Rate-Limit-Reset': endOfDay.toISOString()
        }
      }
    );
  }

  // Increment request count (only if not admin to avoid unnecessary Redis calls)
  if (!isAdmin) {
    await incrementRequestCount(session.user.id);
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId } = body;

      // Create a new chat if chatId is not provided
      let currentChatId = chatId;
      if (!currentChatId) {
        // Generate a new chat ID
        currentChatId = crypto.randomUUID();

        // Create the chat with the user's first message
        // Use the first message content as the title (truncated if too long)
        const firstMessage = messages[0];
        const title = firstMessage?.content
          ? (typeof firstMessage.content === 'string'
              ? firstMessage.content.slice(0, 50) + (firstMessage.content.length > 50 ? '...' : '')
              : 'New Chat')
          : 'New Chat';

        await upsertChat({
          userId: session.user.id,
          chatId: currentChatId,
          title,
          messages: messages,
        });
      }

      const result = streamText({
        model,
        messages,
        system: `
          You are a helpful AI assistant with access to web search capabilities.
            When answering questions, you should:
              1. Use the searchWeb tool to find current and relevant information from the web
              2. Always cite your sources with inline links in your responses
              3. Provide comprehensive answers based on the search results
              4. If the user asks about recent events, current information, or anything that might benefit from web search, use the searchWeb tool
          Format your citations like this: [Source Title](URL) when referencing information from search results.
        `,
        maxSteps: 10,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }: { query: string }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Save the updated messages to the database
          const firstMessage = updatedMessages[0];
          const title = firstMessage?.content
            ? (typeof firstMessage.content === 'string'
                ? firstMessage.content.slice(0, 50) + (firstMessage.content.length > 50 ? '...' : '')
                : 'New Chat')
            : 'New Chat';

          await upsertChat({
            userId: session.user.id,
            chatId: currentChatId,
            title,
            messages: updatedMessages,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
    headers: {
      'X-Rate-Limit-Limit': '100',
      'X-Rate-Limit-Remaining': remainingRequests.toString(),
      'X-Rate-Limit-Admin': isAdmin.toString(),
    },
  });
}
