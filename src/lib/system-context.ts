import type { Message } from "ai";

export type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
  summary?: string;
};

export type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

// Keep backward compatibility types
export type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

export type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

export type ScrapeResult = {
  url: string;
  result: string;
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all search actions and their scraped content
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The user's location context
   */
  private locationContext: string;
  /**
   * The messages exchanged in the chat
   */
  private messages: Message[];

  constructor(locationContext: string, messages: Message[]) {
    this.locationContext = locationContext;
    this.messages = messages;
  }

  shouldStop() {
    return this.step >= 10;
  }

  getStep() {
    return this.step;
  }

  incrementStep() {
    this.step++;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  // Backward compatibility methods - deprecated but kept for existing code
  reportQueries(queries: QueryResult[]) {
    // Convert old format to new format with empty scraped content
    queries.forEach((query) => {
      const searchEntry: SearchHistoryEntry = {
        query: query.query,
        results: query.results.map((result) => ({
          ...result,
          scrapedContent: "",
        })),
      };
      this.searchHistory.push(searchEntry);
    });
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    // Find the most recent search entry and update its scraped content
    if (this.searchHistory.length > 0) {
      const lastSearch = this.searchHistory[this.searchHistory.length - 1];
      scrapes.forEach((scrape) => {
        const matchingResult = lastSearch!.results.find(
          (result) => result.url === scrape.url,
        );
        if (matchingResult) {
          matchingResult.scrapedContent = scrape.result;
        }
      });
    }
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
              `<content_summary>`,
              result.summary ?? result.scrapedContent,
              `</content_summary>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  // Backward compatibility method - deprecated but kept for existing code
  getQueryHistory(): string {
    return this.getSearchHistory();
  }

  getMessagesHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `<${role}>${message.content}</${role}>`;
      })
      .join("\n\n");
  }

  getLocationContext(): string {
    return this.locationContext;
  }
}
