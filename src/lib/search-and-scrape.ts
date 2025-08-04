import type { Message } from "ai";
import * as Sentry from "@sentry/nextjs";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { tavilySearchAndScrape } from "~/lib/tavily-search-scrape";
import type { SearchHistoryEntry } from "~/lib/system-context";
import { env } from "~/env";
import { summarizeURL } from "~/lib/summarize-url";

export type SearchMethod = "serper+scrape" | "tavily";
const SCRAP_METHOD: Exclude<SearchMethod, "auto"> = "tavily";

export interface SearchAndScrapeOptions {
  method?: SearchMethod;
  numResults?: number;
  maxRetries?: number;
}

/**
 * Unified search and scrape function that can use different methods
 */
export const searchAndScrape = async (
  query: string,
  messages: Message[],
  langfuseTraceId: string,
  options: SearchAndScrapeOptions = {},
  signal?: AbortSignal,
): Promise<SearchHistoryEntry> => {
  return Sentry.startSpan(
    {
      op: "ai.search_and_scrape",
      name: "Search and Scrape",
    },
    async (span) => {
      try {
        const {
          method = "auto",
          numResults = env.SEARCH_RESULTS_COUNT,
          maxRetries = 3,
        } = options;

        span.setAttribute("search.query", query);
        span.setAttribute("search.method", method);
        span.setAttribute("search.results_count", numResults);
        span.setAttribute("langfuse.trace_id", langfuseTraceId);

        // Determine which method to use

        span.setAttribute("search.actual_method", SCRAP_METHOD);

        if (SCRAP_METHOD === "tavily") {
          return await searchAndScrapeWithTavily(
            query,
            messages,
            langfuseTraceId,
            { numResults, maxRetries },
            span,
          );
        } else {
          return await searchAndScrapeWithSerper(
            query,
            messages,
            langfuseTraceId,
            { numResults, maxRetries },
            span,
            signal,
          );
        }
      } catch (error) {
        Sentry.captureException(error, {
          contexts: {
            search_and_scrape: {
              query,
              method: options.method,
              langfuse_trace_id: langfuseTraceId,
            },
          },
        });
        throw error;
      }
    },
  );
};

/**
 * Search and scrape using Tavily
 */
async function searchAndScrapeWithTavily(
  query: string,
  messages: Message[],
  langfuseTraceId: string,
  options: { numResults: number; maxRetries: number },
  span: { setAttribute: (key: string, value: string | number) => void },
): Promise<SearchHistoryEntry> {
  const { numResults } = options;

  const tavilyResult = await tavilySearchAndScrape(query, {
    maxResults: numResults,
    includeAnswer: true,
    maxTokens: 4000, // Reasonable limit for content
  });

  if (!tavilyResult.success) {
    throw new Error(tavilyResult.error);
  }

  span.setAttribute("scrape.urls_count", tavilyResult.results.length);
  span.setAttribute("scrape.successful_count", tavilyResult.results.length);

  // Summarize all URLs in parallel
  const summaryPromises = tavilyResult.results.map(async (result) => {
    // Only summarize if we have scraped content
    if (result.scrapedContent && result.scrapedContent.trim().length > 0) {
      try {
        const summary = await summarizeURL({
          conversation: messages
            .map((message) => {
              const role = message.role === "user" ? "User" : "Assistant";
              return `<${role}>${message.content}</${role}>`;
            })
            .join("\n\n"),
          scrapedContent: result.scrapedContent,
          searchMetadata: {
            date: result.date,
            title: result.title,
            url: result.url,
          },
          query,
          langfuseTraceId,
        });
        return {
          ...result,
          summary: summary,
        };
      } catch (error) {
        // If summarization fails, keep the original result
        console.error(`Failed to summarize ${result.url}:`, error);
        Sentry.captureException(error, {
          contexts: {
            url_summarization: {
              url: result.url,
              query,
            },
          },
        });
        return result;
      }
    }
    return result;
  });

  const resultsWithSummaries = await Promise.all(summaryPromises);

  return {
    query,
    results: resultsWithSummaries,
  };
}

/**
 * Search and scrape using Serper + traditional scraping
 */
async function searchAndScrapeWithSerper(
  query: string,
  messages: Message[],
  langfuseTraceId: string,
  options: { numResults: number; maxRetries: number },
  span: { setAttribute: (key: string, value: string | number) => void },
  signal?: AbortSignal,
): Promise<SearchHistoryEntry> {
  const { numResults, maxRetries } = options;

  // First, search for results
  const searchResults = await searchSerper(
    { q: query, num: numResults },
    signal,
  );

  const initialResults = searchResults.organic.map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    date: (result.date ?? new Date().toISOString().split("T")[0])!,
  }));

  // Extract URLs to scrape
  const urlsToScrape = initialResults.map((result) => result.url);
  span.setAttribute("scrape.urls_count", urlsToScrape.length);

  // Scrape all the URLs
  const scrapeResults = await bulkCrawlWebsites({
    urls: urlsToScrape,
    maxRetries,
  });

  // Process scrape results
  const processedScrapeResults: Record<string, string> = {};

  if (scrapeResults.success) {
    scrapeResults.results.forEach((result) => {
      if (result.result.success) {
        processedScrapeResults[result.url] = result.result.data;
      }
    });
  } else {
    // Handle partial failures
    scrapeResults.results.forEach((result) => {
      if (result.result.success) {
        processedScrapeResults[result.url] = result.result.data;
      }
    });
  }

  span.setAttribute(
    "scrape.successful_count",
    Object.keys(processedScrapeResults).length,
  );

  // Combine search results with scraped content
  const combinedResults = initialResults.map((result) => ({
    date: result.date,
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    scrapedContent: processedScrapeResults[result.url] ?? "",
  }));

  // Summarize all URLs in parallel
  const summaryPromises = combinedResults.map(async (result) => {
    // Only summarize if we have scraped content
    if (result.scrapedContent && result.scrapedContent.trim().length > 0) {
      try {
        const summary = await summarizeURL({
          conversation: messages
            .map((message) => {
              const role = message.role === "user" ? "User" : "Assistant";
              return `<${role}>${message.content}</${role}>`;
            })
            .join("\n\n"),
          scrapedContent: result.scrapedContent,
          searchMetadata: {
            date: result.date,
            title: result.title,
            url: result.url,
          },
          query,
          langfuseTraceId,
        });
        return {
          ...result,
          summary: summary,
        };
      } catch (error) {
        // If summarization fails, keep the original result
        console.error(`Failed to summarize ${result.url}:`, error);
        Sentry.captureException(error, {
          contexts: {
            url_summarization: {
              url: result.url,
              query,
            },
          },
        });
        return result;
      }
    }
    return result;
  });

  const resultsWithSummaries = await Promise.all(summaryPromises);

  return {
    query,
    results: resultsWithSummaries,
  };
}
