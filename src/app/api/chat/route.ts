import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { model } from "~/lib/model";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites, type CrawlResponse } from "~/lib/scraper";
import { checkRateLimit, incrementRequestCount } from "~/server/redis/redis";
import { upsertChat } from "~/server/db/chat";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limiting
  const { allowed, remainingRequests, isAdmin } = await checkRateLimit(
    session.user.id,
  );

  if (!allowed) {
    // Calculate when the daily limit will reset (end of day)
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message:
          "You have exceeded your daily request limit. Please try again tomorrow.",
        remainingRequests: 0,
        resetTime: endOfDay.toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-Rate-Limit-Limit": "5",
          "X-Rate-Limit-Remaining": "0",
          "X-Rate-Limit-Reset": endOfDay.toISOString(),
        },
      },
    );
  }

  // Increment request count (only if not admin to avoid unnecessary Redis calls)
  if (!isAdmin) {
    await incrementRequestCount(session.user.id);
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat?: boolean;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId, isNewChat = false } = body;

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

        await upsertChat({
          userId: session.user.id,
          chatId: chatId,
          title,
          messages: messages,
        });
      }

      // Create Langfuse trace with session and user information
      const trace = langfuse.trace({
        name: "chat",
        sessionId: currentChatId,
        userId: session.user.id,
      });

      // Send the new chat ID to the frontend if a new chat was created
      if (newChatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: newChatId,
        });
      }

      const result = streamText({
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        model,
        messages,
        system: `
          You are a helpful AI assistant with access to web search and web scraping capabilities.

          IMPORTANT RULE: You MUST use the scrapePages tool after using the searchWeb tool. This is mandatory - search snippets alone are not sufficient.

          When answering questions, you should:
              1. Use the searchWeb tool to find current and relevant information from the web
              2. ALWAYS follow up immediately with the scrapePages tool using 4-6 URLs from the search results to get complete content
              3. Select a diverse set of sources - choose URLs from different domains/websites to get varied perspectives
              4. Always cite your sources with inline links in your responses
              5. Provide comprehensive answers based on the full scraped content, not just search snippets
              6. If the user asks about recent events, current information, or anything that might benefit from web search, use both tools in sequence

          Workflow:
          1. searchWeb → get URLs and snippets
          2. scrapePages → scrape 4-6 diverse URLs from those results (MANDATORY)
          3. Answer based on complete scraped content from multiple sources

          Source Selection Guidelines:
          - Choose 4-6 URLs minimum per query
          - Prioritize different domains/websites for diverse perspectives
          - Include authoritative sources when available
          - Mix official sources with analysis/opinion pieces when relevant

          The scrapePages tool will:
          - Extract the full text content from web pages
          - Convert HTML to readable markdown format
          - Respect robots.txt restrictions
          - Handle rate limiting and retries automatically
          - Return detailed error messages if pages cannot be scraped

          Format your citations like this: [Source Title](URL) when referencing information from search results or scraped pages.
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
          scrapePages: {
            parameters: z.object({
              urls: z.array(z.string()).describe("Array of URLs to scrape and extract full content from"),
            }),
            execute: async ({ urls }: { urls: string[] }) => {
              const results = await bulkCrawlWebsites({
                urls,
                maxRetries: 3,
              });

              const processResult = (result: { url: string; result: CrawlResponse }) => {
                if (result.result.success) {
                  return {
                    url: result.url,
                    success: true,
                    content: result.result.data,
                    error: undefined,
                  };
                } else {
                  return {
                    url: result.url,
                    success: false,
                    content: undefined,
                    error: result.result.error,
                  };
                }
              };

              if (results.success) {
                return results.results.map(processResult);
              } else {
                return {
                  success: false,
                  error: results.error,
                  results: results.results.map(processResult),
                };
              }
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
            ? typeof firstMessage.content === "string"
              ? firstMessage.content.slice(0, 50) +
                (firstMessage.content.length > 50 ? "..." : "")
              : "New Chat"
            : "New Chat";

          await upsertChat({
            userId: session.user.id,
            chatId: chatId,
            title,
            messages: updatedMessages,
          });

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
    headers: {
      "X-Rate-Limit-Limit": "100",
      "X-Rate-Limit-Remaining": remainingRequests.toString(),
      "X-Rate-Limit-Admin": isAdmin.toString(),
    },
  });
}
