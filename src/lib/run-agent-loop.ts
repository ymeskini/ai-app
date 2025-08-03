import type { StreamTextResult, Message } from "ai";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsitesWithJina } from "~/lib/scraper";
import {
  getNextAction,
  type OurMessageAnnotation,
} from "~/lib/get-next-action";
import { answerQuestion } from "~/lib/answer-question";
import {
  SystemContext,
  type SearchHistoryEntry,
  type SearchResult,
  type QueryResultSearchResult,
} from "~/lib/system-context";
import { env } from "~/env";
import type { StreamTextFinishResult } from "~/types/chat";
import { summarizeURL } from "~/lib/summarize-url";

/**
 * Combined search and scrape function that automatically scrapes the most relevant URLs
 */
export const searchAndScrape = async (
  query: string,
  messages: Message[],
  langfuseTraceId: string,
  signal?: AbortSignal,
): Promise<SearchHistoryEntry> => {
  // First, search for results
  const searchResults = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    signal,
  );

  const initialResults: QueryResultSearchResult[] = searchResults.organic.map(
    (result): QueryResultSearchResult => {
      return {
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        date: (result.date ?? new Date().toISOString().split("T")[0])!,
      };
    },
  );

  // Extract URLs to scrape (up to the number of search results we have)
  const urlsToScrape = initialResults.map((result) => result.url);

  // Scrape all the URLs
  const scrapeResults = await bulkCrawlWebsitesWithJina({
    urls: urlsToScrape,
    maxRetries: 3,
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

  // Combine search results with scraped content
  const combinedResults: SearchResult[] = initialResults.map((result) => ({
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
        const summary = await summarizeURL(
          {
            query,
            url: result.url,
            title: result.title,
            snippet: result.snippet,
            scrapedContent: result.scrapedContent,
            conversationHistory: messages,
          },
          langfuseTraceId,
        );
        return {
          ...result,
          summary: summary.summary,
        };
      } catch (error) {
        // If summarization fails, keep the original result
        console.error(`Failed to summarize ${result.url}:`, error);
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
};

/**
 * Main agent loop that continues until we have an answer or reach max steps
 */
export const runAgentLoop = async (
  userQuery: string,
  messages: Message[],
  locationContext: string,
  maxSteps = 10,
  writeMessageAnnotation: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId: string,
  onFinish: (finishResult: StreamTextFinishResult) => void,
): Promise<StreamTextResult<never, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(locationContext, messages);

  // A loop that continues until we have an answer or we've taken maxSteps actions
  while (ctx.getStep() < maxSteps) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, userQuery, langfuseTraceId);

    // Send annotation about the action we chose
    const stepIndex = ctx.getStep();
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: nextAction,
      });
    }

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      // Update status to loading
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "ACTION_UPDATE",
          stepIndex,
          status: "loading",
        });
      }

      try {
        const searchHistoryEntry = await searchAndScrape(
          nextAction.query,
          messages,
          langfuseTraceId,
        );

        // Report the combined search and scrape results
        ctx.reportSearch(searchHistoryEntry);

        // Update status to completed
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "completed",
          });
        }
      } catch (error) {
        // Update status to error
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "error",
            error: error instanceof Error ? error.message : "Search failed",
          });
        }
        throw error;
      }
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, userQuery, messages, {
        langfuseTraceId,
        onFinish,
      });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken maxSteps actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, userQuery, messages, {
    isFinal: true,
    langfuseTraceId,
    onFinish,
  });
};
