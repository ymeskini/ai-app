import type { Message } from "ai";
import { formatMessageHistory } from "./format-message-history";

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

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  /**
   * The user's location context
   */
  private locationContext: string;
  /**
   * The messages exchanged in the chat
   */
  private messages: Message[];

  constructor(locationContext: string,  messages: Message[]) {
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

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getMessagesHistory(): string {
    return formatMessageHistory(this.messages);
  }

  getLocationContext(): string {
    return this.locationContext;
  }
}
