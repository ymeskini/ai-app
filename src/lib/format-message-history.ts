import type { Message } from "ai";

/**
 * Helper function to format message history for prompts
 * Handles AI SDK v4 message structure with optional parts array
 */
export const formatMessageHistory = (messages: Message[]): string => {
  if (messages.length <= 1) {
    return "No previous conversation history.";
  }
  
  // Format the conversation history excluding the current user message
  const conversationHistory = messages
    .slice(0, -1)
    .filter((message) => {
      // Handle string content (most common case)
      if (typeof message.content === "string") {
        return message.content && message.content.trim().length > 0;
      }
      
      // Handle parts array (AI SDK v4.2+ structure)
      if (message.parts && Array.isArray(message.parts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return message.parts.some((part: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          return part.type === "text" && part.text && typeof part.text === "string" && part.text.trim().length > 0;
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
      }
      // Handle parts array (AI SDK v4.2+ structure)
      else if (message.parts && Array.isArray(message.parts)) {
        content = message.parts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          .filter((part: any) => part.type === "text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          .map((part: any) => part.text as string)
          .join(" ");
      }
      // Fallback for unknown structures
      else {
        content = JSON.stringify(message.content);
      }
      
      return `<${role}>${content}</${role}>`;
    })
    .join("\n\n");

  return `Previous conversation history:\n${conversationHistory}`;
};
