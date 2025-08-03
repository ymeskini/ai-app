import { generateText } from "ai";
import type { Message } from "ai";
import * as Sentry from "@sentry/nextjs";
import { model } from "./model";

export const generateChatTitle = async (
  messages: Message[],
): Promise<string> => {
  try {
    const { text } = await generateText({
      model,
      system: `You are a chat title generator.
        You will be given a chat history, and you will need to generate a title for the chat.
        The title should be a single sentence that captures the essence of the chat.
        The title should be no more than 50 characters.
        The title should be in the same language as the chat history.
        `,
      prompt: `Here is the chat history:

        ${messages.map((m) => m.content).join("\n")}
      `,
    });

    return text.trim();
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    Sentry.captureException(error, {
      contexts: {
        chat_title_generation: {
          messages_count: messages.length,
          first_message_preview: messages[0]?.content?.toString().slice(0, 100),
        },
      },
    });
    // Fallback to the first message
    const firstMessage = messages[0];
    if (firstMessage?.content) {
      const content =
        typeof firstMessage.content === "string"
          ? firstMessage.content
          : "New Chat";
      return content.slice(0, 50) + (content.length > 50 ? "..." : "");
    }
    return "New Chat";
  }
};
