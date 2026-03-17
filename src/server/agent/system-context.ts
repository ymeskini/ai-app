import type { UIMessage } from "ai";
import { messageToString } from "../../lib/utils.ts";

/** @deprecated Use ToolLoopAgent-based agent loop instead */
export class SystemContext {
  private readonly messages: UIMessage[];

  constructor(messages: UIMessage[]) {
    this.messages = messages;
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `<${role}>${messageToString(message)}</${role}>`;
      })
      .join("\n\n");
  }
}
