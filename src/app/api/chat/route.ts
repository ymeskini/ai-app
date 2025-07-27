import type { Message } from "ai";
import {
  createDataStreamResponse,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { checkRateLimit, incrementRequestCount } from "~/server/redis/redis";
import { checkGlobalRateLimit, recordRateLimit } from "~/server/redis/global-rate-limit";
import { upsertChat } from "~/server/db/chat";
import { streamFromDeepSearch } from "~/lib/deep-search";

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

  // Global rate limiting configuration
  const globalRateLimitConfig = {
    maxRequests: 1, // For testing: only 1 request
    windowMs: 5_000, // For testing: 5 seconds window
    keyPrefix: "global",
    maxRetries: 3,
  };

  // Check global rate limiting first
  const globalRateLimitSpan = trace.span({
    name: "check-global-rate-limit",
    input: globalRateLimitConfig,
  });

  const globalRateLimitCheck = await checkGlobalRateLimit(globalRateLimitConfig);

  globalRateLimitSpan.end({
    output: {
      allowed: globalRateLimitCheck.allowed,
      remaining: globalRateLimitCheck.remaining,
      totalHits: globalRateLimitCheck.totalHits,
      resetTime: globalRateLimitCheck.resetTime,
    },
  });

  if (!globalRateLimitCheck.allowed) {
    const retrySpan = trace.span({
      name: "global-rate-limit-retry",
      input: {
        resetTime: globalRateLimitCheck.resetTime,
        totalHits: globalRateLimitCheck.totalHits,
      },
    });

    const isAllowed = await globalRateLimitCheck.retry();

    retrySpan.end({
      output: {
        retrySuccessful: isAllowed,
      },
    });

    // If still not allowed after retries, fail the request
    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          error: "Global rate limit exceeded",
          message: "The system is currently experiencing high load. Please try again later.",
          resetTime: new Date(globalRateLimitCheck.resetTime).toISOString(),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-Global-Rate-Limit-Limit": globalRateLimitConfig.maxRequests.toString(),
            "X-Global-Rate-Limit-Remaining": globalRateLimitCheck.remaining.toString(),
            "X-Global-Rate-Limit-Reset": new Date(globalRateLimitCheck.resetTime).toISOString(),
          },
        },
      );
    }
  }

  // Record the global rate limit usage
  await recordRateLimit(globalRateLimitConfig);

  // Check rate limiting
  const rateLimitSpan = trace.span({
    name: "check-rate-limit",
    input: {
      userId: session.user.id,
    },
  });

  const { allowed, remainingRequests, isAdmin } = await checkRateLimit(
    session.user.id,
  );

  rateLimitSpan.end({
    output: {
      allowed,
      remainingRequests,
      isAdmin,
    },
  });

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
    const incrementSpan = trace.span({
      name: "increment-request-count",
      input: {
        userId: session.user.id,
      },
    });

    const newCount = await incrementRequestCount(session.user.id);

    incrementSpan.end({
      output: {
        newCount,
      },
    });
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
        onFinish: null, // We'll handle persistence later
      });

      // Once the result is ready, merge it into the data stream
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
