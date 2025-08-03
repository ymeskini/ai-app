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
    .filter((message) => {
      if (message.parts && Array.isArray(message.parts)) {
        return message.parts.some((part) => {
          return (
            part.type === "text" && part.text && part.text.trim().length > 0
          );
        });
      }

      return false;
    })
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";

      let content = "";

      // Handle string content (most common case)
      if (typeof message.content === "string") {
        content = message.content;
      } else if (message.parts && Array.isArray(message.parts)) {
        content = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ");
      }

      return `<${role}>${content}</${role}>`;
    })
    .join("\n\n");

  return `Previous conversation history:\n${conversationHistory}`;
};
