import { tavily, type TavilySearchOptions } from "@tavily/core";
import { cacheWithRedis } from "~/server/redis/redis";
import { env } from "~/env";

export interface SearchAndScrapeResult {
  success: true;
  query: string;
  answer: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    scrapedContent: string;
    date: string;
    score?: number;
  }>;
}

export interface SearchAndScrapeError {
  success: false;
  error: string;
}

export type SearchAndScrapeResponse =
  | SearchAndScrapeResult
  | SearchAndScrapeError;

/**
 * Search and scrape using Tavily API - combines search and scrape in a single call
 */
export const tavilySearchAndScrape = cacheWithRedis(
  "tavilySearchAndScrape",
  async (
    query: string,
    options: TavilySearchOptions = {},
  ): Promise<SearchAndScrapeResponse> => {
    try {
      const tvly = tavily({
        apiKey: env.TAVILY_API_KEY,
      });

      const {
        includeAnswer = true,
        includeRawContent = false,
        maxTokens = 4000,
        includeImages = false,
        includeImageDescriptions = false,
        days,
        excludeDomains,
        includeDomains,
      } = options;

      const response = await tvly.search(query, {
        searchDepth: "advanced",
        maxResults: 3,
        includeAnswer,
        includeRawContent: includeRawContent ? "text" : false,
        maxTokens,
        includeImages,
        includeImageDescriptions,
        days,
        excludeDomains,
        includeDomains,
      });

      // Transform Tavily response to our expected format
      const results = response.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet:
          result.content.substring(0, 300) +
          (result.content.length > 300 ? "..." : ""),
        scrapedContent: result.rawContent ?? result.content,
        date: result.publishedDate || new Date().toISOString().split("T")[0]!,
        score: result.score,
      }));

      return {
        success: true,
        query: response.query,
        answer: response.answer ?? "",
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: `Tavily search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
);
