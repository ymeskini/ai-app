import type { Message } from "ai";

/**
 * Helper function to format message history for prompts
 */
export const formatMessageHistory = (messages: Message[]): string => {
  if (messages.length <= 1) {
    return "No previous conversation history.";
  }

  // Format the conversation history excluding the current user message
  const conversationHistory = messages
    .slice(0, -1)
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      return `<${role}>${content}</${role}>`;
    })
    .join("\n\n");

  return `Previous conversation history:\n${conversationHistory}`;
};
