import type { LanguageModelUsage, UIMessage } from "ai";
import { messageToString } from "../../lib/utils.ts";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  summary: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

// const toQueryResult = (query: SearchResult) =>
//   [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export type TokenUsage = {
  descriptor: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The message history
   */
  private readonly messages: UIMessage[];

  /**
   * The history of all queries searched and content scraped
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The most recent feedback from getNextAction
   */
  private lastFeedback: string | null = null;

  private usages: TokenUsage[] = [];

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

  shouldStop() {
    return this.step >= 4;
  }

  incrementStep() {
    this.step++;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  setLastFeedback(feedback: string) {
    this.lastFeedback = feedback;
  }

  getLastFeedback(): string | null {
    return this.lastFeedback;
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<summary>`,
              result.summary,
              `</summary>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  reportUsage(descriptor: string, usage: LanguageModelUsage) {
    this.usages.push({
      descriptor,
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
    });
  }

  getUsages(): TokenUsage[] {
    return this.usages;
  }
}
